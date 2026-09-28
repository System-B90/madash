"""
Name: ci_setup.py
Purpose: CI-only .env generation: registers madash as a Hive SSO app with the
         CI admin account and writes .env through sb90_deploy's envfile writer.
"""

import os
import secrets
import sys

from sb90_deploy import envfile, hive

# Hive is initialized with admin/Password1 in CI setup.
CI_ADMIN = ("admin", "Password1")


def register_sso(hive_url: str, redirect_uri: str) -> tuple[str, str]:
    """Non-interactive SSO registration; hive.register_sso would prompt."""
    with hive.api_client(hive_url, *CI_ADMIN) as client:
        credentials = client.register_sso_service(
            service_name="Madash CI", redirect_uris=redirect_uri
        )
    return credentials["client_id"], credentials["client_secret"]


def main() -> None:
    hive_url = os.environ.get("NEXT_PUBLIC_HIVE_URL", "https://hive.org")
    domain_name = os.environ.get("MADASH_DOMAIN", "madash.dev")
    nextauth_url = f"https://{domain_name}"

    print(f"Registering Madash SSO service with Hive at {hive_url}...")
    try:
        client_id, client_secret = register_sso(
            hive_url, f"{nextauth_url}/api/auth/callback/hive"
        )
    except Exception as e:  # noqa: BLE001 - any failure here must abort CI setup
        print(f"Failed to register SSO with Hive: {e}")
        sys.exit(1)
    print(f"SSO Registration successful. Client ID: {client_id}")

    envfile.write(
        ".env",
        {
            "NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT": "443",
            "NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST": domain_name,
            "WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY": secrets.token_hex(32),
            "NEXT_PUBLIC_HIVE_URL": hive_url,
            "NODE_TLS_REJECT_UNAUTHORIZED": "0",
            "NEXTAUTH_URL": nextauth_url,
            "NEXTAUTH_SECRET": secrets.token_hex(32),
            "HIVE_CLIENT_ID": client_id,
            "HIVE_CLIENT_SECRET": client_secret,
            "HIVE_PROMETHEUS_URL": f"{hive_url}/prometheus",
            # Sibling services on the status board; unset in CI (tiles show
            # "not configured").
            "BLUZ_URL": "",
            "PEEKABOO_URL": "",
        },
    )
    print("Created .env file for CI environment successfully.")


if __name__ == "__main__":
    main()
