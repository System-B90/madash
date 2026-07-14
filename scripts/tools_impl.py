"""
Name: tools_impl.py
Purpose: Implementation for the root tools.py CLI - dev server lifecycle, status checks,
         and thin wraps around npm/docker scripts, optimized for agentic (token-efficient) use.
Created: 2026-07-15
Author: Michael K. Steinberg
"""

import socket
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

import typer

app = typer.Typer(help="Madash dev-ops helper CLI.", no_args_is_help=True)

ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = ROOT / "scripts" / ".tools"
DEV_PID_FILE = STATE_DIR / "dev.pid"
DEV_LOG_FILE = STATE_DIR / "dev.log"
WS_PID_FILE = STATE_DIR / "ws.pid"
WS_LOG_FILE = STATE_DIR / "ws.log"

DEV_PORT = 3000
WS_PORT = 28199


def get_domain() -> str:
    env_path = ROOT / ".env"
    if env_path.exists():
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("NEXTAUTH_URL="):
                    val = line.split("=", 1)[1].strip()
                    # Strip protocol
                    return val.replace("https://", "").replace("http://", "")
        except Exception:
            pass
    return "localhost"


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, **kwargs)


def _spawn_background(cmd: list[str], log_file: Path, pid_file: Path) -> int:
    """Starts a detached background process, logs its output, and records its PID."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    creationflags = 0
    if sys.platform == "win32":
        creationflags = (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        )
    with log_file.open("w", encoding="utf-8") as log:
        proc = subprocess.Popen(
            cmd,
            cwd=ROOT,
            stdout=log,
            stderr=subprocess.STDOUT,
            creationflags=creationflags,
        )
    pid_file.write_text(str(proc.pid), encoding="utf-8")
    return proc.pid


def _pid_alive(pid: int) -> bool:
    if sys.platform == "win32":
        result = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True
        )
        return str(pid) in result.stdout
    try:
        import os

        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _kill_pid(pid: int) -> None:
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)
    else:
        import os
        import signal

        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass


def _read_pid(pid_file: Path) -> int | None:
    if not pid_file.exists():
        return None
    try:
        return int(pid_file.read_text(encoding="utf-8").strip())
    except ValueError:
        return None


def _port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((host, port)) == 0


def _https_ok(host: str) -> tuple[bool, str]:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with urllib.request.urlopen(f"https://{host}", timeout=3, context=ctx) as resp:
            return resp.status < 500, str(resp.status)
    except urllib.error.HTTPError as e:
        return e.code < 500, str(e.code)
    except Exception as e:  # noqa: BLE001 - report any connection failure as down
        return False, str(e)


dev_app = typer.Typer(help="Local dev server lifecycle.", no_args_is_help=False)
app.add_typer(dev_app, name="dev")


@dev_app.callback(invoke_without_command=True)
def dev_main(
    ctx: typer.Context,
    docker: bool = typer.Option(
        False,
        "--docker",
        help="Boot the full docker compose stack (npm run docker:dev) instead of local dev.",
    ),
) -> None:
    """Backgrounds the dev servers and returns immediately."""
    if ctx.invoked_subcommand is not None:
        return

    if docker:
        # Full containerized stack
        _run(["npm", "run", "docker:dev"])
        typer.echo("docker:dev stack started.")
    else:
        # Local proxy up in Docker
        _run(["npm", "run", "proxy:up"], check=True)

        # Start UI Next.js dev server on the host
        ui_pid = _spawn_background(
            ["npm", "run", "next:dev"], DEV_LOG_FILE, DEV_PID_FILE
        )
        typer.echo(f"npm:run:next:dev pid={ui_pid} log={DEV_LOG_FILE}")

        # Start WebSocket session server on the host
        ws_pid = _spawn_background(
            ["npm", "run", "session:dev"], WS_LOG_FILE, WS_PID_FILE
        )
        typer.echo(f"npm:run:session:dev pid={ws_pid} log={WS_LOG_FILE}")


@dev_app.command("status")
def dev_status() -> None:
    """Reports whether the dev servers and HTTPS proxy are up."""
    domain = get_domain()

    fe_port_up = _port_in_use(DEV_PORT)
    ws_port_up = _port_in_use(WS_PORT)
    https_up, https_detail = _https_ok(domain)

    typer.echo(f"next:{'up' if fe_port_up else 'down'} port={DEV_PORT}")
    typer.echo(f"websocket:{'up' if ws_port_up else 'down'} port={WS_PORT}")
    typer.echo(
        f"proxy:{'up' if https_up else 'down'} https://{domain} -> {https_detail}"
    )
    if not (fe_port_up and ws_port_up and https_up):
        raise typer.Exit(1)


@dev_app.command("stop")
def dev_stop() -> None:
    """Stops the background dev processes started by this tool."""
    # Stop UI
    ui_pid = _read_pid(DEV_PID_FILE)
    ui_stopped = bool(ui_pid and _pid_alive(ui_pid))
    if ui_stopped:
        _kill_pid(ui_pid)
    DEV_PID_FILE.unlink(missing_ok=True)

    # Stop WS
    ws_pid = _read_pid(WS_PID_FILE)
    ws_stopped = bool(ws_pid and _pid_alive(ws_pid))
    if ws_stopped:
        _kill_pid(ws_pid)
    WS_PID_FILE.unlink(missing_ok=True)

    # Stop Docker Proxy
    _run(
        ["docker", "compose", "-f", "deploy/docker-compose.local.yml", "down"],
        check=False,
    )

    typer.echo(f"ui_stopped={ui_stopped} ws_stopped={ws_stopped}")


docker_app = typer.Typer(help="Docker compose stack wraps.", no_args_is_help=True)
app.add_typer(docker_app, name="docker")


@docker_app.command("down")
def docker_down() -> None:
    """Stops the prod/dev docker compose stack."""
    _run(["npm", "run", "docker:down"], check=True)


@docker_app.command("nuke")
def docker_nuke() -> None:
    """Stops the stack and removes volumes (wipes all docker volume data)."""
    _run(["npm", "run", "docker:nuke"], check=True)


@app.command("lint")
def lint(fix: bool = typer.Option(False, "--fix", help="Apply autofixes.")) -> None:
    """Runs ESLint over src/ and session-server/."""
    _run(["npm", "run", "lint:fix" if fix else "lint"], check=True)


if __name__ == "__main__":
    app()
