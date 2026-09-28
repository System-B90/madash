# Default dev TLS cert

`cert.pem` (leaf + root chain) and `key.pem` are signed by the
[System-B90 Dev Root CA](https://github.com/System-B90/.github/tree/main/dev-ca).
Trust that root once and `https://madash.dev` loads without warnings.

- CN `madash.dev`; SANs `madash.dev`, `*.madash.dev`, `madash.localhost`,
  `localhost`, `127.0.0.1`, `127.0.0.8`, `::1`
- Valid until 2028-12-30

`scripts/setup.py` copies these into `ssl/` when it is empty; e2e CI does the same.
**The key is public and dev-only.** Release bundles don't include this directory,
so production always gets its own cert.
