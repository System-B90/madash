"""
Name: hadas.py
Purpose: `madash hadas` — the call-to-Hadas board (/api/call-to-hadas): list
         open calls, call students (one by one or as a group), mark a call as
         told, and remove it.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

import typer

from madash.commands._common import show
from madash.commands.hive import fetch_students_with_rooms
from madash.context import state
from madash.output import abort, success

app = typer.Typer(help="Call students to Hadas (the call board).", no_args_is_help=True)

_PATH = "/api/call-to-hadas"

# The UI form defaults the expiry to six hours out, rounded up to 5 minutes.
DEFAULT_EXPIRY = timedelta(hours=6)

_RELATIVE = re.compile(r"^\+(\d+)([mh])$")
_CLOCK = re.compile(r"^(\d{1,2}):(\d{2})$")


def default_expiry(now: datetime) -> datetime:
    later = now + DEFAULT_EXPIRY
    minutes_up = (5 - later.minute % 5) % 5
    return (later + timedelta(minutes=minutes_up)).replace(second=0, microsecond=0)


def parse_expiry(value: str | None, *, now: datetime | None = None) -> datetime:
    """`+90m` / `+2h`, a clock time `HH:MM` (today, or tomorrow once it has
    passed), or an ISO datetime. Naive values are local time."""
    now = now or datetime.now().astimezone()
    if value is None:
        return default_expiry(now)
    if match := _RELATIVE.match(value):
        amount, unit = int(match.group(1)), match.group(2)
        return now + (
            timedelta(minutes=amount) if unit == "m" else timedelta(hours=amount)
        )
    if match := _CLOCK.match(value):
        hour, minute = int(match.group(1)), int(match.group(2))
        if hour > 23 or minute > 59:
            raise typer.BadParameter(f"{value!r} is not a time of day.")
        at = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        return at if at > now else at + timedelta(days=1)
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise typer.BadParameter(
            f"Expected +90m, +2h, HH:MM or an ISO datetime, got {value!r}."
        ) from exc
    return parsed if parsed.tzinfo else parsed.astimezone()


def _iso_utc(moment: datetime) -> str:
    """The wire form the UI sends (dayjs serialises to UTC ISO with ms)."""
    utc = moment.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"


def resolve_students(selectors: list[str]) -> list[dict[str, Any]]:
    """Map Hive ids, student numbers or usernames to the student records the
    board stores (the same shape the UI's students provider builds)."""
    students = fetch_students_with_rooms()
    resolved = []
    for selector in selectors:
        matches = [
            s
            for s in students
            if selector
            in (str(s["hiveId"]), str(s.get("bisId")), s.get("username") or "")
        ]
        if not matches:
            abort(f"No student matches {selector!r} (Hive id, number or username).")
        if len(matches) > 1:
            abort(f"{selector!r} matches more than one student; use the Hive id.")
        match = matches[0]
        resolved.append(
            {
                "hiveId": match["hiveId"],
                "name": match["name"],
                "room": match["room"],
                "bisId": match.get("bisId"),
                "type": "student",
            }
        )
    return resolved


def _rows(calls: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for call in calls.values():
        who = (
            call["student"]["name"]
            if call.get("type") == "student"
            else ", ".join(s["name"] for s in call.get("students", []))
        )
        rows.append(
            {
                "callId": call["callId"],
                "type": call.get("type"),
                "who": who,
                "reason": call.get("reason"),
                "expires": call.get("expirationTime"),
                "state": call.get("state"),
            }
        )
    return rows


@app.command("list")
def list_calls(
    state_filter: str = typer.Option(
        None, "--state", help="Only calls in this state (requested / told)."
    ),
) -> None:
    """List the open calls to Hadas."""
    with state.client() as client:
        calls = client.get(_PATH) or {}
    if state_filter:
        calls = {k: v for k, v in calls.items() if v.get("state") == state_filter}
    show(calls if state.as_json else _rows(calls), title="Called to Hadas")


@app.command("call")
def call(
    students: list[str] = typer.Argument(
        ..., help="Students to call: Hive id, student number or username."
    ),
    reason: str = typer.Option(..., "--reason", "-r", help="Why they are called."),
    expires: str = typer.Option(
        None,
        "--expires",
        "-e",
        help="When the call lapses: +90m, +2h, HH:MM or ISO (default: 6h).",
    ),
    group: bool = typer.Option(
        False, "--group", help="One shared call for all of them, not one each."
    ),
) -> None:
    """Call one or more students to Hadas."""
    payload = {
        "students": resolve_students(students),
        "reason": reason,
        "expirationTime": _iso_utc(parse_expiry(expires)),
        "groupCall": group,
    }
    with state.client() as client:
        message = client.put(_PATH, json=payload)
    success(message or "Called.")


@app.command("told")
def told(call_id: str = typer.Argument(..., help="The call's callId.")) -> None:
    """Mark a call as told (the student got the message)."""
    set_state(call_id, "told")


@app.command("state")
def set_state(
    call_id: str = typer.Argument(..., help="The call's callId."),
    new_state: str = typer.Argument(..., help="requested or told."),
) -> None:
    """Set a call's state."""
    if new_state not in ("requested", "told"):
        raise typer.BadParameter("State must be 'requested' or 'told'.")
    with state.client() as client:
        message = client.post(_PATH, json={"callId": call_id, "state": new_state})
    success(message or f"State set to {new_state}.")


@app.command("remove")
def remove(call_id: str = typer.Argument(..., help="The call's callId.")) -> None:
    """Remove a call from the board."""
    with state.client() as client:
        message = client.delete(_PATH, json={"callId": call_id})
    success(message or "Removed.")
