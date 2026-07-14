import os
import sys
import secrets
from pathlib import Path

# Add pyhive to python path if we need to import it
try:
    from pyhive import HiveClient
except ImportError:
    print("Error: PyHiveLMS is not installed. Please run: pip install PyHiveLMS")
    sys.exit(1)


def main():
    hive_url = os.environ.get("NEXT_PUBLIC_HIVE_URL", "https://hive.org")
    domain_name = os.environ.get("MADASH_DOMAIN", "madash.bis")
    nextauth_url = f"https://{domain_name}"

    print(f"Registering Madash SSO service with Hive at {hive_url}...")
    try:
        # Hive is initialized with admin/Password1 in CI setup.
        with HiveClient(
            "admin", "Password1", hive_url, verify=False, timeout=10
        ) as client:
            sso_credentials = client.register_sso_service(
                service_name="Madash CI",
                redirect_uris=f"{nextauth_url}/api/auth/callback/hive",
            )
            hive_client_id = sso_credentials["client_id"]
            hive_client_secret = sso_credentials["client_secret"]
            print(f"SSO Registration successful. Client ID: {hive_client_id}")
    except Exception as e:
        print(f"Failed to register SSO with Hive: {e}")
        sys.exit(1)

    ws_auth_key = secrets.token_hex(32)
    nextauth_secret = secrets.token_hex(32)

    env_content = f"""NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_PORT=443
NEXT_PUBLIC_WEBSOCKET_SESSION_SERVER_HOST={domain_name}
WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY={ws_auth_key}
NEXT_PUBLIC_HIVE_URL={hive_url}
NODE_TLS_REJECT_UNAUTHORIZED=0

NEXTAUTH_URL={nextauth_url}
NEXTAUTH_SECRET={nextauth_secret}
HIVE_CLIENT_ID={hive_client_id}
HIVE_CLIENT_SECRET={hive_client_secret}

HIVE_PROMETHEUS_URL={hive_url}/prometheus
"""
    Path(".env").write_text(env_content, encoding="utf-8")
    print("Created .env file for CI environment successfully.")


if __name__ == "__main__":
    main()
