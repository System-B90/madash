"""
Name: setup.py
Purpose: Interactive CLI script to generate the .env configuration file for Madash.
Created: 2026-04-09
Author: Michael K. Steinberg
"""

import re
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import typer
    from dotenv import dotenv_values
    from InquirerPy import inquirer
except ImportError as e:
    print(f"Error: Missing required dependency '{e.name}'.", file=sys.stderr)
    print("Please install the required packages by running:\n", file=sys.stderr)
    print("    pip install typer InquirerPy python-dotenv\n", file=sys.stderr)
    sys.exit(1)

try:
    from pyhive import HiveClient
except ImportError:
    HiveClient = None

app = typer.Typer(help="Madash interactive environment setup utility.")


def get_cert_cn(cert_path: Path) -> str:
    """
    Extracts the Common Name (CN) from an X.509 certificate using OpenSSL.

    Args:
        cert_path (Path): Path to the certificate file.

    Returns:
        str: The extracted Common Name, or an empty string if extraction fails.
    """
    if not shutil.which("openssl"):
        return ""

    try:
        result = subprocess.run(
            ["openssl", "x509", "-noout", "-subject", "-in", str(cert_path)],
            capture_output=True,
            text=True,
            check=True,
        )
        match = re.search(r"CN\s*=\s*([^,\n]+)", result.stdout)
        if match:
            return match.group(1).strip()
    except subprocess.CalledProcessError:
        pass

    return ""


def handle_ssl_certs(domain_name: str):
    """
    Manages the creation and validation of SSL certificates for the provided domain.

    Args:
        domain_name (str): The expected domain name for the certificate CN.
    """
    ssl_dir = Path("ssl")
    ssl_dir.mkdir(exist_ok=True)

    cert_path = ssl_dir / "cert.pem"
    key_path = ssl_dir / "key.pem"
    needs_cert = True

    if cert_path.exists() and key_path.exists():
        existing_cn = get_cert_cn(cert_path)
        if existing_cn == domain_name:
            typer.secho(
                f"Valid certificates found for {domain_name}.", fg=typer.colors.GREEN
            )
            needs_cert = False
        else:
            typer.secho(
                f"Warning: Existing certificate CN ('{existing_cn}') does not match expected domain ('{domain_name}').",
                fg=typer.colors.YELLOW,
            )

    if needs_cert:
        generate = inquirer.confirm(
            message=f"Generate self-signed SSL certificates for {domain_name}?",
            default=True,
        ).execute()

        if generate:
            if not shutil.which("openssl"):
                typer.secho(
                    "Error: 'openssl' command not found. Cannot generate certificates.",
                    fg=typer.colors.RED,
                )
                return

            typer.echo("Generating certificates...")
            try:
                subprocess.run(
                    [
                        "openssl",
                        "req",
                        "-x509",
                        "-newkey",
                        "rsa:4096",
                        "-keyout",
                        str(key_path),
                        "-out",
                        str(cert_path),
                        "-sha256",
                        "-days",
                        "365",
                        "-nodes",
                        "-subj",
                        f"/CN={domain_name}",
                    ],
                    check=True,
                    capture_output=True,
                )
                typer.secho(
                    "Successfully generated self-signed certificates.",
                    fg=typer.colors.GREEN,
                )
            except subprocess.CalledProcessError as e:
                typer.secho(
                    f"Failed to generate certificates: {e.stderr.decode()}",
                    fg=typer.colors.RED,
                )


@app.command()
def generate_env():
    """
    Interactively prompts for configuration values, generates secure secrets,
    registers the SSO service with Hive, validates/generates SSL certs,
    and writes the variables to a local .env file.
    """
    typer.echo("Starting Madash interactive environment setup...")

    env_path = Path(".env")
    existing_env = dotenv_values(env_path) if env_path.exists() else {}

    existing_nextauth_url = existing_env.get("NEXTAUTH_URL", "")
    default_domain = ""
    if existing_nextauth_url:
        default_domain = existing_nextauth_url.replace("https://", "").replace(
            "http://", ""
        )

    default_hive_url = existing_env.get("NEXT_PUBLIC_HIVE_URL", "https://hive.org")

    domain_name = inquirer.text(
        message="Enter the domain name for Madash (e.g., madash.example.com):",
        default=default_domain,
    ).execute()

    # Handle SSL Validation and Generation
    handle_ssl_certs(domain_name)

    hive_url = inquirer.text(
        message="Enter Hive URL (NEXT_PUBLIC_HIVE_URL):", default=default_hive_url
    ).execute()

    nextauth_url = f"https://{domain_name}"
    ws_host = domain_name
    ws_port = "443"
    node_tls = "0"

    ws_auth_key = existing_env.get(
        "WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY"
    ) or secrets.token_hex(32)
    nextauth_secret = existing_env.get("NEXTAUTH_SECRET") or secrets.token_hex(32)

    hive_prometheus_url = f"{hive_url.rstrip('/')}/prometheus"

    hive_client_id = existing_env.get("HIVE_CLIENT_ID", "")
    hive_client_secret = existing_env.get("HIVE_CLIENT_SECRET", "")

    register_sso = True
    if (
        hive_client_id
        and hive_client_secret
        and hive_client_id != "MANUAL_ENTRY_REQUIRED"
    ):
        register_sso = inquirer.confirm(
            message="Existing Hive SSO credentials found. Re-register?", default=False
        ).execute()

    if register_sso:
        if HiveClient is None:
            typer.secho(
                "Warning: 'pyhive' module not found. Hive SSO registration skipped.",
                fg=typer.colors.YELLOW,
            )
            hive_client_id = "MANUAL_ENTRY_REQUIRED"
            hive_client_secret = "MANUAL_ENTRY_REQUIRED"
        else:
            typer.echo(f"Registering Madash SSO service with Hive at {hive_url}...")
            try:
                client = HiveClient.from_sso(hive_url=hive_url, verify=False)
                sso_credentials = client.register_sso_service(
                    service_name="Madash",
                    redirect_uris=f"{nextauth_url}/api/auth/callback/hive",
                )
                hive_client_id = sso_credentials.get("client_id", "ERROR_FETCHING_ID")
                hive_client_secret = sso_credentials.get(
                    "client_secret", "ERROR_FETCHING_SECRET"
                )
                typer.secho("Hive SSO registration successful.", fg=typer.colors.GREEN)
            except Exception as e:
                typer.secho(f"Failed to register Hive SSO: {e}", fg=typer.colors.RED)
                hive_client_id = "MANUAL_ENTRY_REQUIRED"
                hive_client_secret = "MANUAL_ENTRY_REQUIRED"

    env_content = f"""WEBSOCKET_SESSION_SERVER_PORT={ws_port}
WEBSOCKET_SESSION_SERVER_HOST={ws_host}
WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY={ws_auth_key}
NEXT_PUBLIC_HIVE_URL={hive_url}
NODE_TLS_REJECT_UNAUTHORIZED={node_tls}

NEXTAUTH_URL={nextauth_url}
NEXTAUTH_SECRET={nextauth_secret}
HIVE_CLIENT_ID={hive_client_id}
HIVE_CLIENT_SECRET={hive_client_secret}

HIVE_PROMETHEUS_URL={hive_prometheus_url}
"""

    env_path.write_text(env_content, encoding="utf-8")

    typer.secho(f"Successfully generated {env_path.resolve()}", fg=typer.colors.GREEN)


if __name__ == "__main__":
    app()
