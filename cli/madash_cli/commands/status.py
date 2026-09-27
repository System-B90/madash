"""
Name: status.py
Purpose: `madash status` — the system status board ("מצב העולם"): sibling
         service health, Hive Prometheus load, the toilet queue and open help
         requests.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

from typing import Any

import typer

from madash_cli.commands._common import show
from madash_cli.context import state

app = typer.Typer(help="The system status board.", no_args_is_help=True)

_SERVICES = "/api/status/services"
_PROMETHEUS = "/api/status/hive-prometheus"
_TOILET = "/api/status/hive/toilet-queue"
_HELPS = "/api/status/hive/open-helps"


def _service_rows(services: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # `history` is the latency graph's samples -- noise in a table.
    return [
        {k: v for k, v in service.items() if k != "history"} for service in services
    ]


@app.command("services")
def services() -> None:
    """Health of the sibling services (Bluz, Peek-a-boo)."""
    with state.client() as client:
        data = client.get(_SERVICES) or []
    show(data if state.as_json else _service_rows(data), title="Services")


@app.command("prometheus")
def prometheus() -> None:
    """Whether Hive's Prometheus is reachable and overloaded."""
    with state.client() as client:
        show(client.get(_PROMETHEUS), title="Hive Prometheus")


@app.command("toilet-queue")
def toilet_queue() -> None:
    """Students waiting for / out at the toilet."""
    with state.client() as client:
        show(client.get(_TOILET), title="Toilet queue")


@app.command("open-helps")
def open_helps() -> None:
    """How many Hive help requests are open."""
    with state.client() as client:
        show(client.get(_HELPS), title="Open helps")


@app.command("all")
def all_status() -> None:
    """The whole board in one go."""
    with state.client() as client:
        board = {
            "services": client.get(_SERVICES) or [],
            "prometheus": client.get(_PROMETHEUS),
            "toiletQueue": client.get(_TOILET),
            "openHelps": (client.get(_HELPS) or {}).get("count"),
        }
    if not state.as_json:
        board["services"] = {
            s["id"]: s.get("state") for s in _service_rows(board["services"])
        }
    show(board, title="Status")
