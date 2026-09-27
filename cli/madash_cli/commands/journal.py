"""
Name: journal.py
Purpose: `madash journal` — the daily journal (/api/journal): read a day's
         journal, rename it, and tick tasks off.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import typer

from madash_cli.commands._common import read_json_file, show
from madash_cli.context import state
from madash_cli.output import abort, success

app = typer.Typer(help="The daily journal.", no_args_is_help=True)

_PATH = "/api/journal"

DATE_OPTION = typer.Option(None, "--date", "-d", help="YYYY-MM-DD (default: today).")


def _day(value: str | None) -> str:
    if value is None:
        return datetime.now(UTC).astimezone().date().isoformat()
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise typer.BadParameter(f"Expected YYYY-MM-DD, got {value!r}.") from exc


def fetch_journal(day: str) -> dict[str, Any]:
    with state.client() as client:
        return client.get(_PATH, params={"date": day}) or {}


def _save(journal: dict[str, Any]) -> dict[str, Any]:
    if journal.get("isReadOnly"):
        abort(f"The journal for {journal.get('date')} is read-only (past day).")
    with state.client() as client:
        return client.post(_PATH, json=journal)


@app.command("get")
def get_journal(day: str = DATE_OPTION) -> None:
    """Show a day's journal."""
    show(fetch_journal(_day(day)), title="Journal")


@app.command("rename")
def rename(
    name: str = typer.Argument(..., help="The journal's custom name."),
    day: str = DATE_OPTION,
) -> None:
    """Set a day's journal name."""
    journal = fetch_journal(_day(day))
    journal["customName"] = name
    show(_save(journal), title="Journal")
    success("Journal renamed.")


def _set_task_done(task_id: str, day: str | None, done: bool) -> None:
    journal = fetch_journal(_day(day))
    tasks = journal.get("tasks") or []
    task = next((t for t in tasks if str(t.get("id")) == task_id), None)
    if task is None:
        abort(f"No task {task_id!r} in the journal for {journal.get('date')}.")
    task["isCompleted"] = done
    show(_save(journal), title="Journal")
    success(f"Task {task_id} marked {'done' if done else 'not done'}.")


@app.command("done")
def done(task_id: str = typer.Argument(...), day: str = DATE_OPTION) -> None:
    """Mark a task completed."""
    _set_task_done(task_id, day, True)


@app.command("undo")
def undo(task_id: str = typer.Argument(...), day: str = DATE_OPTION) -> None:
    """Mark a task not completed."""
    _set_task_done(task_id, day, False)


@app.command("update")
def update(
    file: Path = typer.Argument(..., help="JSON file with the journal to save."),
) -> None:
    """Save a whole journal from a JSON file (as `journal get --json` prints)."""
    journal = read_json_file(file, what="journal")
    if not isinstance(journal, dict) or not journal.get("date"):
        abort("The journal JSON needs at least a `date`.")
    show(_save(journal), title="Journal")
    success("Journal saved.")
