"""
Name: hive.py
Purpose: `madash hive` — the Hive data the dashboard is built from: students
         (with the room the UI shows), classes, and avatars.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import typer

from madash.commands._common import LIMIT_OPTION, OFFSET_OPTION, show, write_file
from madash.context import state
from madash.output import abort, success

app = typer.Typer(help="Hive students, classes and avatars.", no_args_is_help=True)

# Hive's ClassTypeEnum value for a physical room.
_ROOM_CLASS_TYPE = "Room"


def fetch_students_with_rooms() -> list[dict[str, Any]]:
    """Students as the UI's students provider shapes them: Hive id, display
    name, student number and the room class they belong to."""
    with state.client() as client:
        raw = client.get("/api/hive/students") or []
        classes = client.get("/api/hive/classes") or []
    room_of: dict[int, str] = {}
    for item in classes:
        if item.get("type") == _ROOM_CLASS_TYPE:
            for user_id in item.get("users", []):
                room_of[user_id] = item.get("name")
    return [
        {
            "hiveId": s["id"],
            "username": s.get("username"),
            "name": s.get("display_name"),
            "bisId": s.get("number"),
            "room": room_of.get(s["id"], "Unknown"),
            "status": s.get("status"),
        }
        for s in raw
    ]


@app.command("students")
def students(
    room: str = typer.Option(None, "--room", help="Only students in this room."),
    status: str = typer.Option(None, "--status", help="Only this Hive status."),
    raw: bool = typer.Option(
        False, "--raw", help="Hive's full user records instead of the summary."
    ),
    limit: int = LIMIT_OPTION,
    offset: int = OFFSET_OPTION,
) -> None:
    """List students (clearance: hanich)."""
    if raw:
        with state.client() as client:
            rows = client.get("/api/hive/students") or []
    else:
        rows = fetch_students_with_rooms()
    if room:
        rows = [r for r in rows if r.get("room") == room]
    if status:
        rows = [r for r in rows if r.get("status") == status]
    show(rows, title="Students", limit=limit, offset=offset)


@app.command("classes")
def classes(limit: int = LIMIT_OPTION, offset: int = OFFSET_OPTION) -> None:
    """List Hive classes (rooms and groups)."""
    with state.client() as client:
        rows = client.get("/api/hive/classes") or []
    if not state.as_json:
        rows = [
            {k: c.get(k) for k in ("id", "name", "type")}
            | {"members": len(c.get("users", []))}
            for c in rows
        ]
    show(rows, title="Classes", limit=limit, offset=offset)


@app.command("avatar")
def avatar(
    hive_id: int = typer.Argument(..., help="The user's Hive id."),
    output: Path = typer.Option(..., "--output", "-o", help="File to write."),
) -> None:
    """Download a user's Hive avatar image."""
    with state.client() as client:
        data = client.get(f"/api/avatars/{hive_id}")
    if not data:
        abort(f"No avatar for Hive id {hive_id}.")
    if isinstance(data, str):
        data = data.encode("utf-8")
    write_file(output, data, what="avatar")
    success(f"Saved avatar to {output}")
