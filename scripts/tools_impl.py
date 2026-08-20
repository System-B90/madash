"""
Name: tools_impl.py
Purpose: Implementation for the root tools.py CLI - dev server lifecycle, status checks,
         and thin wraps around npm/docker scripts, optimized for agentic (token-efficient) use.
Created: 2026-07-15
Author: Michael K. Steinberg
"""

import subprocess
from pathlib import Path

import sb90_devops as devops
import typer

app = typer.Typer(help="Madash dev-ops helper CLI.", no_args_is_help=True)

ROOT = Path(__file__).resolve().parent.parent


def load_env() -> None:
    env_path = ROOT / ".env"
    if env_path.exists():
        try:
            import os

            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()
                    # Strip surrounding quotes if present
                    if val.startswith(('"', "'")) and val.endswith(val[0]):
                        val = val[1:-1]
                    if key not in os.environ:
                        os.environ[key] = val
        except Exception:
            pass


load_env()
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


# These wrap sb90_devops so every call site keeps passing repo-relative paths
# instead of threading ROOT through by hand. The helper bodies themselves used
# to live here, copy-pasted from Bluz's tools_impl.py — see System-B90/Bluz#226.
def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return devops.run(cmd, cwd=ROOT, **kwargs)


def _spawn_background(cmd: list[str], log_file: Path, pid_file: Path) -> int:
    return devops.spawn_background(cmd, log_file=log_file, pid_file=pid_file, cwd=ROOT)


_pid_alive = devops.pid_alive
_kill_pid = devops.kill_pid
_read_pid = devops.read_pid
_port_in_use = devops.port_in_use
_https_ok = devops.https_ok


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
