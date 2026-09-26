"""
Name: test_tools_impl_env.py
Purpose: Unit tests for tools_impl's .env parsing, domain resolution and the
         dev-process lifecycle (madash#34).
Created: 2026-09-19
Author: Michael K. Steinberg
"""

import os
from pathlib import Path

import pytest
import tools_impl


def _reload_with_root(monkeypatch: pytest.MonkeyPatch, root: Path):
    """Re-imports tools_impl with ROOT pointed at a temp dir.

    ROOT and the STATE_DIR paths are module-scope constants derived from the
    real file location, so a temp repo only takes effect on a fresh import.
    """
    monkeypatch.setattr(tools_impl, "ROOT", root)
    return tools_impl


class TestLoadEnv:
    """`load_env` runs at import time and must never take the CLI down."""

    def _load(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, text: str):
        (tmp_path / ".env").write_text(text, encoding="utf-8")
        _reload_with_root(monkeypatch, tmp_path)
        tools_impl.load_env()

    def test_sets_a_simple_pair(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        self._load(monkeypatch, tmp_path, "MADASH_TEST_KEY=value\n")

        assert os.environ["MADASH_TEST_KEY"] == "value"

    def test_strips_surrounding_double_quotes(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        self._load(monkeypatch, tmp_path, 'MADASH_TEST_KEY="quoted value"\n')

        assert os.environ["MADASH_TEST_KEY"] == "quoted value"

    def test_strips_surrounding_single_quotes(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        self._load(monkeypatch, tmp_path, "MADASH_TEST_KEY='quoted value'\n")

        assert os.environ["MADASH_TEST_KEY"] == "quoted value"

    def test_keeps_a_value_containing_equals_signs(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        # Secrets are frequently base64 and end in "=" padding; splitting on
        # every "=" would truncate them.
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        self._load(monkeypatch, tmp_path, "MADASH_TEST_KEY=abc==def=\n")

        assert os.environ["MADASH_TEST_KEY"] == "abc==def="

    def test_skips_comments_and_blank_lines(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        monkeypatch.delenv("MADASH_COMMENTED", raising=False)
        self._load(
            monkeypatch,
            tmp_path,
            "\n# MADASH_COMMENTED=nope\n\n   \nMADASH_TEST_KEY=value\n",
        )

        assert os.environ["MADASH_TEST_KEY"] == "value"
        assert "MADASH_COMMENTED" not in os.environ

    def test_skips_lines_without_an_equals_sign(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        self._load(monkeypatch, tmp_path, "GARBAGE LINE\nMADASH_TEST_KEY=value\n")

        assert os.environ["MADASH_TEST_KEY"] == "value"

    def test_does_not_override_an_existing_variable(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        # A real environment variable beats the file, so CI secrets are not
        # clobbered by a stray .env in the checkout.
        monkeypatch.setenv("MADASH_TEST_KEY", "from-environment")
        self._load(monkeypatch, tmp_path, "MADASH_TEST_KEY=from-file\n")

        assert os.environ["MADASH_TEST_KEY"] == "from-environment"

    def test_trims_whitespace_around_key_and_value(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        monkeypatch.delenv("MADASH_TEST_KEY", raising=False)
        self._load(monkeypatch, tmp_path, "  MADASH_TEST_KEY  =  value  \n")

        assert os.environ["MADASH_TEST_KEY"] == "value"

    def test_missing_file_is_a_no_op(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        _reload_with_root(monkeypatch, tmp_path)

        tools_impl.load_env()  # must not raise

    def test_an_unreadable_file_is_swallowed(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        # load_env runs at import; a broken .env must not stop the CLI from
        # starting, which is why the bare `except Exception` is there.
        (tmp_path / ".env").write_bytes(b"\xff\xfe\x00invalid utf-8")
        _reload_with_root(monkeypatch, tmp_path)

        tools_impl.load_env()


class TestGetDomain:
    def _domain(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, text: str):
        (tmp_path / ".env").write_text(text, encoding="utf-8")
        _reload_with_root(monkeypatch, tmp_path)
        return tools_impl.get_domain()

    def test_strips_the_https_scheme(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        assert (
            self._domain(monkeypatch, tmp_path, "NEXTAUTH_URL=https://madash.dev\n")
            == "madash.dev"
        )

    def test_strips_the_http_scheme(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        assert (
            self._domain(monkeypatch, tmp_path, "NEXTAUTH_URL=http://madash.dev\n")
            == "madash.dev"
        )

    def test_keeps_a_port(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        assert (
            self._domain(
                monkeypatch, tmp_path, "NEXTAUTH_URL=https://madash.dev:8443\n"
            )
            == "madash.dev:8443"
        )

    def test_ignores_other_keys(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        assert (
            self._domain(
                monkeypatch,
                tmp_path,
                "OTHER=https://elsewhere\nNEXTAUTH_URL=https://madash.dev\n",
            )
            == "madash.dev"
        )

    def test_falls_back_to_localhost_without_the_key(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        assert self._domain(monkeypatch, tmp_path, "OTHER=1\n") == "localhost"

    def test_falls_back_to_localhost_without_a_file(
        self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
    ) -> None:
        _reload_with_root(monkeypatch, tmp_path)

        assert tools_impl.get_domain() == "localhost"


class TestDevStop:
    """Pid-file lifecycle: stale pid, live pid, missing file."""

    @pytest.fixture
    def state(self, monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
        state_dir = tmp_path / "scripts" / ".tools"
        state_dir.mkdir(parents=True)
        monkeypatch.setattr(tools_impl, "ROOT", tmp_path)
        monkeypatch.setattr(tools_impl, "STATE_DIR", state_dir)
        monkeypatch.setattr(tools_impl, "DEV_PID_FILE", state_dir / "dev.pid")
        monkeypatch.setattr(tools_impl, "WS_PID_FILE", state_dir / "ws.pid")
        monkeypatch.setattr(tools_impl, "_run", lambda *a, **k: None)
        return state_dir

    def _stub_process_helpers(
        self,
        monkeypatch: pytest.MonkeyPatch,
        *,
        alive: set[int],
        killed: list[int],
    ) -> None:
        monkeypatch.setattr(
            tools_impl,
            "_read_pid",
            lambda path: int(path.read_text()) if path.exists() else None,
        )
        monkeypatch.setattr(tools_impl, "_pid_alive", lambda pid: pid in alive)
        monkeypatch.setattr(tools_impl, "_kill_pid", lambda pid: killed.append(pid))

    def test_kills_a_live_process_and_removes_its_pid_file(
        self,
        state: Path,
        monkeypatch: pytest.MonkeyPatch,
        capsys: pytest.CaptureFixture,
    ) -> None:
        (state / "dev.pid").write_text("111")
        (state / "ws.pid").write_text("222")
        killed: list[int] = []
        self._stub_process_helpers(monkeypatch, alive={111, 222}, killed=killed)

        tools_impl.dev_stop()

        assert sorted(killed) == [111, 222]
        assert not (state / "dev.pid").exists()
        assert not (state / "ws.pid").exists()
        assert "ui_stopped=True ws_stopped=True" in capsys.readouterr().out

    def test_a_stale_pid_is_reported_as_not_stopped(
        self,
        state: Path,
        monkeypatch: pytest.MonkeyPatch,
        capsys: pytest.CaptureFixture,
    ) -> None:
        # The process died without cleaning up. Nothing is killed (the pid may
        # have been recycled by an unrelated process), but the file still goes.
        (state / "dev.pid").write_text("111")
        killed: list[int] = []
        self._stub_process_helpers(monkeypatch, alive=set(), killed=killed)

        tools_impl.dev_stop()

        assert killed == []
        assert not (state / "dev.pid").exists()
        assert "ui_stopped=False" in capsys.readouterr().out

    def test_missing_pid_files_are_not_an_error(
        self,
        state: Path,
        monkeypatch: pytest.MonkeyPatch,
        capsys: pytest.CaptureFixture,
    ) -> None:
        self._stub_process_helpers(monkeypatch, alive=set(), killed=[])

        tools_impl.dev_stop()

        assert "ui_stopped=False ws_stopped=False" in capsys.readouterr().out

    def test_stops_the_proxy_stack_even_with_no_pids(
        self, state: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # The docker proxy is not tracked by a pid file, so it has to be torn
        # down unconditionally or it survives `dev stop`.
        calls: list[list[str]] = []
        monkeypatch.setattr(tools_impl, "_run", lambda cmd, **kwargs: calls.append(cmd))
        self._stub_process_helpers(monkeypatch, alive=set(), killed=[])

        tools_impl.dev_stop()

        assert calls == [
            [
                "docker",
                "compose",
                "-f",
                "deploy/docker-compose.local.yml",
                "down",
            ]
        ]

    def test_one_live_and_one_stale_are_reported_separately(
        self,
        state: Path,
        monkeypatch: pytest.MonkeyPatch,
        capsys: pytest.CaptureFixture,
    ) -> None:
        (state / "dev.pid").write_text("111")
        (state / "ws.pid").write_text("222")
        killed: list[int] = []
        self._stub_process_helpers(monkeypatch, alive={111}, killed=killed)

        tools_impl.dev_stop()

        assert killed == [111]
        assert "ui_stopped=True ws_stopped=False" in capsys.readouterr().out


class TestDockerCommands:
    def test_docker_down_delegates_to_the_npm_script(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        calls: list[tuple[list[str], dict]] = []
        monkeypatch.setattr(
            tools_impl, "_run", lambda cmd, **kwargs: calls.append((cmd, kwargs))
        )

        tools_impl.docker_down()

        assert calls[0][0] == ["npm", "run", "docker:down"]
        assert calls[0][1] == {"check": True}

    def test_lint_passes_fix_through(self, monkeypatch: pytest.MonkeyPatch) -> None:
        calls: list[list[str]] = []
        monkeypatch.setattr(tools_impl, "_run", lambda cmd, **kwargs: calls.append(cmd))

        tools_impl.lint(fix=True)

        assert any("lint" in " ".join(cmd) for cmd in calls)
