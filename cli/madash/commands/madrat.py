"""
Name: madrat.py
Purpose: `madash madrat` — the madrat message board (/api/madrat): read it,
         replace it, clear it, and watch it update live in the terminal.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import typer
from rich.console import Group
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.text import Text

from madash.commands._common import show
from madash.context import state
from madash.errors import CliError
from madash.output import abort, console, success

app = typer.Typer(
    help="The madrat message (read, edit, watch live).", no_args_is_help=True
)

_PATH = "/api/madrat"

# How often `watch` polls. The UI is pushed updates over the session
# WebSocket; the CLI polls instead -- one cheap GET of an in-memory string, and
# no dependency on the session server's ticket/heartbeat protocol.
DEFAULT_INTERVAL_SECONDS = 2.0


def _now() -> datetime:
    """Local wall-clock time, timezone-aware."""
    return datetime.now(UTC).astimezone()


def fetch_message() -> str:
    with state.client() as client:
        return client.get(_PATH) or ""


def _post_message(text: str) -> None:
    with state.client() as client:
        # The route reads the raw request body as the new text, not JSON.
        client.post_text(_PATH, text)


def render_message(text: str, *, plain: bool = False):
    """The message as the message box shows it: rendered Markdown (Hebrew
    right-to-left layout is left to the terminal). `plain` shows it verbatim."""
    if not text.strip():
        return Text("(no message)", style="dim")
    return Text(text) if plain else Markdown(text)


@app.command("get")
def get_message(
    plain: bool = typer.Option(
        False, "--plain", help="Print the raw text instead of rendered Markdown."
    ),
) -> None:
    """Show the current madrat message."""
    text = fetch_message()
    if state.as_json:
        show(text)
    elif plain:
        typer.echo(text)
    else:
        console.print(render_message(text))


def _read_new_text(text: str | None, file: Path | None) -> str:
    if text is not None and file is not None:
        abort("Pass the message text or --file, not both.")
    if file is not None:
        if str(file) == "-":
            return sys.stdin.read()
        try:
            return file.read_text(encoding="utf-8")
        except OSError as exc:
            abort(f"Could not read {file}: {exc}")
    if text is None:
        abort("Pass the new message text, or --file (use - for stdin).")
    return text


@app.command("set")
def set_message(
    text: str = typer.Argument(None, help="The new message (Markdown)."),
    file: Path = typer.Option(
        None, "--file", "-f", help="Read the message from a file (- for stdin)."
    ),
) -> None:
    """Replace the madrat message. Everyone watching sees it immediately."""
    _post_message(_read_new_text(text, file))
    success("Madrat message updated.")


@app.command("clear")
def clear_message() -> None:
    """Empty the madrat message."""
    _post_message("")
    success("Madrat message cleared.")


def _frame(text: str, *, plain: bool, updated: datetime | None, error: str | None):
    subtitle = (
        f"updated {updated:%H:%M:%S}" if updated else "waiting for the first update"
    )
    if error:
        subtitle = f"[red]{error}[/red] - retrying"
    body = render_message(text, plain=plain)
    return Panel(
        Group(body),
        title="[bold]madrat[/bold]",
        subtitle=f"{subtitle} - Ctrl+C to stop",
        border_style="cyan",
    )


def watch_loop(
    *,
    interval: float,
    plain: bool,
    fetch=None,
    sleep=None,
    iterations: int | None = None,
) -> None:
    """Poll the message and redraw in place whenever it changes.

    `fetch`, `sleep` and `iterations` exist for tests; a real run loops until
    Ctrl+C. A failed poll keeps the last good message on screen and says so in
    the footer instead of ending the watch -- a restarting server should not
    kill a board someone left open.
    """
    fetch = fetch or fetch_message
    sleep = sleep or time.sleep
    text = ""
    updated: datetime | None = None
    error: str | None = None
    with Live(
        _frame(text, plain=plain, updated=None, error=None),
        console=console,
        refresh_per_second=4,
        transient=False,
    ) as live:
        count = 0
        while iterations is None or count < iterations:
            count += 1
            try:
                latest = fetch()
                error = None
                if latest != text or updated is None:
                    text, updated = latest, _now()
            except CliError as exc:
                error = str(exc)
            live.update(_frame(text, plain=plain, updated=updated, error=error))
            if iterations is None or count < iterations:
                sleep(interval)


def watch_json_lines(
    *, interval: float, fetch=None, sleep=None, iterations=None
) -> None:
    """--json form of watch: one JSON line per change, for piping."""
    fetch = fetch or fetch_message
    sleep = sleep or time.sleep
    last: str | None = None
    count = 0
    while iterations is None or count < iterations:
        count += 1
        text = fetch()
        if text != last:
            print(
                json.dumps(
                    {"at": _now().isoformat(timespec="seconds"), "text": text},
                    ensure_ascii=False,
                ),
                flush=True,
            )
            last = text
        if iterations is None or count < iterations:
            sleep(interval)


@app.command("watch")
def watch(
    interval: float = typer.Option(
        DEFAULT_INTERVAL_SECONDS,
        "--interval",
        "-n",
        min=0.2,
        help="Seconds between checks.",
    ),
    plain: bool = typer.Option(
        False, "--plain", help="Show the raw text instead of rendered Markdown."
    ),
) -> None:
    """Show the madrat message live, updating in place as it changes.

    With --json, prints one JSON line per change instead (for scripts).
    """
    try:
        if state.as_json:
            watch_json_lines(interval=interval)
        else:
            watch_loop(interval=interval, plain=plain)
    except KeyboardInterrupt:
        raise typer.Exit() from None
