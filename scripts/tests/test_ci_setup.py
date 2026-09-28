"""
Name: test_ci_setup.py
Purpose: ci_setup.py writes the same .env keys/values as before the move to
         sb90_deploy's envfile writer (hex secrets stay unquoted).
"""

from typing import Any, Self

import ci_setup
import pytest
from sb90_deploy import envfile


class _FakeClient:
    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_exc: object) -> None:
        return None

    def register_sso_service(self, **kwargs: Any) -> dict[str, str]:
        assert kwargs == {
            "service_name": "Madash CI",
            "redirect_uris": "https://madash.dev/api/auth/callback/hive",
        }
        return {"client_id": "cid", "client_secret": "s3cr3t"}


def test_writes_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Any) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("NEXT_PUBLIC_HIVE_URL", "https://hive.test")
    monkeypatch.delenv("MADASH_DOMAIN", raising=False)
    seen: list[tuple[str, ...]] = []

    def fake_api_client(*args: str) -> _FakeClient:
        seen.append(args)
        return _FakeClient()

    monkeypatch.setattr(ci_setup.hive, "api_client", fake_api_client)
    ci_setup.main()

    assert seen == [("https://hive.test", "admin", "Password1")]
    env = envfile.read(str(tmp_path / ".env"))
    assert env["HIVE_CLIENT_ID"] == "cid"
    assert env["HIVE_CLIENT_SECRET"] == "s3cr3t"
    assert env["NEXTAUTH_URL"] == "https://madash.dev"
    assert env["HIVE_PROMETHEUS_URL"] == "https://hive.test/prometheus"
    assert env["BLUZ_URL"] == ""
    text = (tmp_path / ".env").read_text(encoding="utf-8")
    secret = env["NEXTAUTH_SECRET"]
    assert len(secret) == 64
    assert f"NEXTAUTH_SECRET={secret}\n" in text  # hex secrets written bare


def test_exits_when_registration_fails(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    monkeypatch.chdir(tmp_path)

    def broken(*_args: str) -> _FakeClient:
        raise ConnectionError("hive down")

    monkeypatch.setattr(ci_setup.hive, "api_client", broken)
    with pytest.raises(SystemExit):
        ci_setup.main()
    assert not (tmp_path / ".env").exists()
