"""
Name: setup.py
Purpose: Interactively generate the .env configuration and provision Hive SSO credentials with state recovery.
Created: 2026-04-03
Author: Michael K. Steinberg
"""

import secrets
from pathlib import Path
from typing import Dict

import typer
from InquirerPy import inquirer
from InquirerPy.validator import EmptyInputValidator

try:
    import pyhive
except ImportError:
    pyhive = None

app = typer.Typer(help="MADASH Environment Setup CLI")
TMP_ENV_FILE = Path(".env.tmp")
FINAL_ENV_FILE = Path(".env")


def load_tmp_state() -> dict[str, str]:
    """
    Loads the temporary environment state from disk.

    Args:
        None

    Returns:
        dict[str, str]: A dictionary containing the loaded key-value pairs.
    """
    state: Dict[str, str] = {}
    if TMP_ENV_FILE.exists():
        with open(TMP_ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    state[key] = value
    return state


def save_tmp_state(state: dict[str, str]) -> None:
    """
    Saves the current environment state to the temporary file.

    Args:
        state (dict[str, str]): The dictionary of key-value pairs to save.

    Returns:
        None
    """
    with open(TMP_ENV_FILE, "w", encoding="utf-8") as f:
        for key, value in state.items():
            f.write(f"{key}={value}\n")


def generate_hive_credentials(
    api_url: str, app_name: str, redirect_uri: str, verify: bool
) -> tuple[str, str]:
    """
    Registers the service with Hive SSO and retrieves client keys.

    Args:
        api_url (str): The base URL of the Hive API.
        app_name (str): The name of the application to register.
        redirect_uri (str): The redirect URI for the OAuth callback.
        verify (bool): Whether to verify SSL certificates during registration.

    Returns:
        tuple[str, str]: A tuple containing the Client ID and Client Secret.

    Raises:
        ImportError: If the pyhive library is unavailable.
        RuntimeError: If the SSO registration fails.
    """
    if not pyhive:
        raise ImportError("The 'pyhive' library is not installed or accessible.")

    typer.echo(f"Registering '{app_name}' with Hive SSO at {api_url}...")

    try:
        client = pyhive.HiveClient.from_sso(hive_url=api_url, verify=verify)
        keys = client.register_sso_service(
            service_name=app_name, redirect_uris=redirect_uri
        )

        client_id = keys.get("client_id")
        client_secret = keys.get("client_secret")

        if not client_id or not client_secret:
            raise ValueError(
                "Registration succeeded, but keys were missing from the response."
            )

        return client_id, client_secret
    except Exception as e:
        raise RuntimeError(f"SSO Registration failed: {e}")


@app.command()
def setup() -> None:
    """
    Interactively prompts the user for configuration values, managing state persistence.

    Args:
        None

    Returns:
        None
    """
    typer.secho("Starting MADASH Environment Setup...", fg=typer.colors.CYAN, bold=True)

    if FINAL_ENV_FILE.exists():
        overwrite = inquirer.confirm(
            message=".env file already exists. Overwrite?", default=False
        ).execute()

        if not overwrite:
            typer.secho("Setup aborted.", fg=typer.colors.YELLOW)
            raise typer.Exit()

    state = load_tmp_state()
    if state:
        typer.secho("Resuming from previous partial setup.", fg=typer.colors.GREEN)

    def prompt_and_save(key: str, message: str, default_val: str) -> str:
        current_val = state.get(key, default_val)
        answer = inquirer.text(
            message=message, default=current_val, validate=EmptyInputValidator()
        ).execute()
        state[key] = answer
        save_tmp_state(state)
        return answer

    for secret_key in [
        "WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY",
        "NEXTAUTH_SECRET",
        "JWT_SECRET",
        "SYM_ENC_KEY",
    ]:
        if secret_key not in state:
            state[secret_key] = secrets.token_hex(32)
    save_tmp_state(state)

    try:
        domain = prompt_and_save(
            "MADASH_DOMAIN",
            "Which domain will MADASH sit on? (e.g., 127.0.0.1:3002):",
            "127.0.0.1:3002",
        )
        scheme = "http" if "127.0.0.1" in domain or "localhost" in domain else "https"
        state["NEXTAUTH_URL"] = f"{scheme}://{domain}"
        save_tmp_state(state)

        ws_port = prompt_and_save(
            "NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT",
            "WebSocket Session Server Port:",
            "28199",
        )
        ws_host = prompt_and_save(
            "NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST",
            "WebSocket Session Server Host:",
            "127.0.0.1",
        )

        hive_api_url = prompt_and_save(
            "NEXT_PUBLIC_HIVE_URL", "Hive API URL:", "https://hive.org"
        )
        reject_unauthorized = prompt_and_save(
            "NODE_TLS_REJECT_UNAUTHORIZED",
            "Node TLS Reject Unauthorized (0 for dev, 1 for prod):",
            "0",
        )
        app_name = prompt_and_save(
            "HIVE_APP_NAME", "Application Name for Hive SSO Registration:", "MADASH"
        )

        redirect_uri_default = f"{state['NEXTAUTH_URL']}/api/auth/callback/hive"
        redirect_uri = prompt_and_save(
            "HIVE_REDIRECT_URI", "Hive SSO Redirect URI:", redirect_uri_default
        )

        verify_ssl = reject_unauthorized == "1"

        client_id, client_secret = generate_hive_credentials(
            hive_api_url, app_name, redirect_uri, verify_ssl
        )
        state["HIVE_CLIENT_ID"] = client_id
        state["HIVE_CLIENT_SECRET"] = client_secret
        typer.secho(
            "Successfully generated Hive SSO credentials.", fg=typer.colors.GREEN
        )

        hive_prometheus_url = inquirer.text(
            message="Hive Prometheus base URL (optional, for status dashboard; Enter to skip):",
            default=state.get("HIVE_PROMETHEUS_URL", ""),
        ).execute()
        state["HIVE_PROMETHEUS_URL"] = hive_prometheus_url.strip()
        save_tmp_state(state)

    except (KeyboardInterrupt, Exception) as e:
        typer.secho(f"\nSetup interrupted or failed: {e}", fg=typer.colors.RED)
        typer.secho(
            f"Progress saved to {TMP_ENV_FILE}. Run setup again to resume.",
            fg=typer.colors.YELLOW,
        )
        raise typer.Exit(code=1)

    env_content = (
        f"MADASH_DOMAIN={state['MADASH_DOMAIN']}\n"
        f"NEXTAUTH_URL={state['NEXTAUTH_URL']}\n"
        f"NEXTAUTH_SECRET={state['NEXTAUTH_SECRET']}\n"
        f"JWT_SECRET={state['JWT_SECRET']}\n"
        f"SYM_ENC_KEY={state['SYM_ENC_KEY']}\n"
        f"NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT={state['NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT']}\n"
        f"NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST={state['NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST']}\n"
        f"WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY={state['WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY']}\n"
        f"NEXT_PUBLIC_HIVE_URL={state['NEXT_PUBLIC_HIVE_URL']}\n"
        f"NODE_TLS_REJECT_UNAUTHORIZED={state['NODE_TLS_REJECT_UNAUTHORIZED']}\n"
        f"HIVE_CLIENT_ID={state['HIVE_CLIENT_ID']}\n"
        f"HIVE_CLIENT_SECRET={state['HIVE_CLIENT_SECRET']}\n"
        f"HIVE_PROMETHEUS_URL={state.get('HIVE_PROMETHEUS_URL', '')}\n"
    )

    FINAL_ENV_FILE.write_text(env_content)
    if TMP_ENV_FILE.exists():
        TMP_ENV_FILE.unlink()

    typer.secho(
        f"Successfully wrote configuration to {FINAL_ENV_FILE.absolute()}",
        fg=typer.colors.GREEN,
        bold=True,
    )


if __name__ == "__main__":
    app()
