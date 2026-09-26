"""
Name: setup.py
Purpose: Interactive wizard that writes Madash's .env, issues TLS certificates
    and registers Madash as a Hive SSO application.
Created: 2026-04-09
Author: Michael K. Steinberg

The shared parts — keeping existing secrets and foreign keys (MADASH_VERSION
from install, HIVE_NETWORK_NAME from link-hive), the domain/port questions,
TLS, Hive SSO registration with browser/password/retry fallbacks — live in
sb90-deploy (System-B90/deploy-py). This file asks Madash's own questions.

Runs from the bundle root (./install.sh runs it; re-run with
`python3 bootstrap.py setup`) and from a checkout (`python scripts/setup.py`,
with sb90-deploy installed from scripts/requirements.txt).
"""

import sys
from pathlib import Path

try:
    from sb90_deploy.spec import AppSpec
    from sb90_deploy.wizard import Wizard
except ImportError:
    print(
        "Error: sb90-deploy is not installed. In a release bundle, run ./install.sh;\n"
        "in a checkout: pip install -r scripts/requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)


def _spec() -> AppSpec:
    """app.json sits beside setup.py in a bundle and under deploy/ in a checkout."""
    here = Path(__file__).resolve().parent
    for candidate in (here / "app.json", here.parent / "deploy" / "app.json"):
        if candidate.is_file():
            return AppSpec.load(str(candidate))
    raise SystemExit("app.json not found next to setup.py or in deploy/")


def main() -> None:
    w = Wizard(_spec())

    domain = w.domain(example="madash.example.com")
    w.ports()
    # nginx reads /etc/nginx/ssl/{cert,key}.pem, mounted from ./ssl.
    w.tls(domain, ssl_dir="ssl", cert_name="cert.pem", key_name="key.pem")

    hive_url = w.ask(
        "NEXT_PUBLIC_HIVE_URL", "Hive URL (NEXT_PUBLIC_HIVE_URL)", "https://hive.org"
    )
    w.set("HIVE_PROMETHEUS_URL", f"{hive_url.rstrip('/')}/prometheus")
    # Sibling services shown on the status board; blank leaves the tile "not configured".
    w.ask("BLUZ_URL", "Bluz URL for the status board (BLUZ_URL, blank to skip)")
    w.ask("PEEKABOO_URL", "Peek-a-Boo URL for the status board (PEEKABOO_URL, blank to skip)")

    w.set("WEBSOCKET_SESSION_SERVER_PORT", "443")
    w.set("WEBSOCKET_SESSION_SERVER_HOST", domain)
    w.generated("WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY")
    w.set("NODE_TLS_REJECT_UNAUTHORIZED", "0")
    w.generated("NEXTAUTH_SECRET")

    w.sso(hive_url)
    w.write()


if __name__ == "__main__":
    main()
