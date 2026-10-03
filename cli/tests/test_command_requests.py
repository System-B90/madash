"""
Name: test_command_requests.py
Purpose: Wire contracts for every madash command: the request each one puts on
         the wire (method, path, body) against a stub server, and what it makes
         of the answer -- plus the live `madrat watch` loop.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest
from rich.console import Console
from wire_types import Raw

HIVE_STUDENTS = [
    {"id": 7, "username": "alice", "display_name": "אליס", "number": 101},
    {"id": 8, "username": "bob", "display_name": "בוב", "number": 102},
]
HIVE_CLASSES = [
    {"id": 1, "name": "A1", "type": "Room", "users": [7]},
    {"id": 2, "name": "Squad", "type": "Student Group", "users": [7, 8]},
]


def _json(result):
    return json.loads(result.stdout)


# --- madrat ----------------------------------------------------------------------


def test_madrat_get_reads_the_message(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/madrat", "# שלום")

    result = run_cli(stub, "madrat", "get")

    assert stub.last().path == "/api/madrat"
    assert _json(result) == "# שלום"


def test_madrat_get_plain_prints_the_raw_text(stub_app, run_cli_table):
    stub = stub_app()
    stub.envelope("GET", "/api/madrat", "**bold**")

    result = run_cli_table(stub, "madrat", "get", "--plain")

    assert result.stdout.strip() == "**bold**"


def test_madrat_get_renders_markdown(stub_app, run_cli_table):
    stub = stub_app()
    stub.envelope("GET", "/api/madrat", "**bold**")

    result = run_cli_table(stub, "madrat", "get")

    assert "bold" in result.stdout
    assert "**" not in result.stdout


def test_madrat_set_posts_the_raw_text_body(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("POST", "/api/madrat", None)

    result = run_cli(stub, "madrat", "set", "חדש **היום**")

    assert result.exit_code == 0, result.output
    # /api/madrat reads request.text(): the body is the text itself, not JSON.
    assert stub.last().method == "POST"
    assert stub.last().body == "חדש **היום**"


def test_madrat_set_from_a_file(stub_app, run_cli, tmp_path):
    stub = stub_app()
    stub.envelope("POST", "/api/madrat", None)
    message = tmp_path / "msg.md"
    message.write_text("# from file\n", encoding="utf-8")

    run_cli(stub, "madrat", "set", "--file", str(message))

    assert stub.last().body == "# from file\n"


def test_madrat_set_from_stdin(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("POST", "/api/madrat", None)

    run_cli(stub, "madrat", "set", "--file", "-", input="piped")

    assert stub.last().body == "piped"


def test_madrat_set_needs_exactly_one_source(stub_app, run_cli, tmp_path):
    stub = stub_app()

    assert run_cli(stub, "madrat", "set").exit_code == 1
    assert (
        run_cli(stub, "madrat", "set", "x", "--file", str(tmp_path / "f")).exit_code
        == 1
    )
    assert stub.requests == []


def test_madrat_clear_posts_an_empty_body(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("POST", "/api/madrat", None)

    run_cli(stub, "madrat", "clear")

    assert stub.last().method == "POST"
    assert stub.last().body is None  # no body bytes at all


# --- madrat watch (live) ---------------------------------------------------------


@pytest.fixture
def recorded_console(monkeypatch):
    from madash_cli.commands import madrat

    console = Console(record=True, width=80, force_terminal=True, color_system=None)
    monkeypatch.setattr(madrat, "console", console)
    return console


def _sequence(*answers):
    answers = list(answers)

    def fetch():
        answer = answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    return fetch


def test_watch_redraws_with_the_latest_message(recorded_console):
    from madash_cli.commands import madrat

    sleeps = []
    madrat.watch_loop(
        interval=1.5,
        plain=True,
        fetch=_sequence("first", "first", "second"),
        sleep=sleeps.append,
        iterations=3,
    )

    screen = recorded_console.export_text()
    assert "second" in screen
    assert "updated" in screen
    # Sleeps between polls, never after the last one.
    assert sleeps == [1.5, 1.5]


def test_watch_survives_a_failed_poll_and_keeps_the_last_message(recorded_console):
    from madash_cli.commands import madrat
    from madash_cli.errors import ApiError

    madrat.watch_loop(
        interval=0,
        plain=True,
        fetch=_sequence("steady", ApiError("NetworkError", "down")),
        sleep=lambda _: None,
        iterations=2,
    )

    screen = recorded_console.export_text()
    assert "steady" in screen
    assert "retrying" in screen


def test_watch_shows_an_empty_board(recorded_console):
    from madash_cli.commands import madrat

    madrat.watch_loop(
        interval=0, plain=False, fetch=_sequence(""), sleep=None, iterations=1
    )

    assert "(no message)" in recorded_console.export_text()


def test_watch_json_prints_one_line_per_change(capsys):
    from madash_cli.commands import madrat

    madrat.watch_json_lines(
        interval=0,
        fetch=_sequence("a", "a", "b"),
        sleep=lambda _: None,
        iterations=3,
    )

    lines = [json.loads(line) for line in capsys.readouterr().out.splitlines()]
    assert [line["text"] for line in lines] == ["a", "b"]
    assert all("at" in line for line in lines)


def test_watch_command_polls_the_server_until_interrupted(
    stub_app, run_cli_table, monkeypatch
):
    """End to end: the command fetches /api/madrat and Ctrl+C exits cleanly."""
    from madash_cli.commands import madrat

    stub = stub_app()
    stub.envelope("GET", "/api/madrat", "live!")
    polls = []

    def interrupt_on_second_sleep(seconds):
        polls.append(seconds)
        if len(polls) == 2:
            raise KeyboardInterrupt

    monkeypatch.setattr(madrat.time, "sleep", interrupt_on_second_sleep)

    result = run_cli_table(stub, "madrat", "watch", "--interval", "0.5")

    assert result.exit_code == 0
    assert [r.path for r in stub.requests] == ["/api/madrat", "/api/madrat"]
    assert polls == [0.5, 0.5]


# --- hadas -----------------------------------------------------------------------


def _hive_stub(stub_app):
    stub = stub_app()
    stub.envelope("GET", "/api/hive/students", HIVE_STUDENTS)
    stub.envelope("GET", "/api/hive/classes", HIVE_CLASSES)
    stub.envelope("PUT", "/api/call-to-hadas", "נקראו")
    return stub


def test_hadas_call_sends_the_ui_payload(stub_app, run_cli):
    stub = _hive_stub(stub_app)

    result = run_cli(
        stub,
        "hadas",
        "call",
        "alice",
        "102",
        "--reason",
        "שיחה",
        "--expires",
        "2030-01-02T10:00:00+00:00",
    )

    assert result.exit_code == 0, result.output
    assert stub.last().method == "PUT"
    assert stub.last().body == {
        "students": [
            {
                "hiveId": 7,
                "name": "אליס",
                "room": "A1",
                "bisId": 101,
                "type": "student",
            },
            {
                "hiveId": 8,
                "name": "בוב",
                "room": "Unknown",
                "bisId": 102,
                "type": "student",
            },
        ],
        "reason": "שיחה",
        "expirationTime": "2030-01-02T10:00:00.000Z",
        "groupCall": False,
    }


def test_hadas_call_group(stub_app, run_cli):
    stub = _hive_stub(stub_app)

    run_cli(stub, "hadas", "call", "7", "8", "-r", "x", "--group")

    assert stub.last().body["groupCall"] is True


@pytest.mark.parametrize("who", ["nobody", "99"])
def test_hadas_call_unknown_student_fails_before_calling(stub_app, run_cli, who):
    stub = _hive_stub(stub_app)

    result = run_cli(stub, "hadas", "call", who, "-r", "x")

    assert result.exit_code == 1
    assert all(r.method == "GET" for r in stub.requests)


def test_hadas_list_summarises_each_call(stub_app, run_cli_table):
    stub = stub_app()
    stub.envelope(
        "GET",
        "/api/call-to-hadas",
        {
            "s-1": {
                "callId": "s-1",
                "type": "student",
                "student": {"name": "אליס"},
                "reason": "r",
                "expirationTime": "2030-01-01T00:00:00.000Z",
                "state": "requested",
            },
            "g-1": {
                "callId": "g-1",
                "type": "group",
                "students": [{"name": "אליס"}, {"name": "בוב"}],
                "reason": "r",
                "expirationTime": "2030-01-01T00:00:00.000Z",
                "state": "told",
            },
        },
    )

    result = run_cli_table(stub, "hadas", "list")

    assert "s-1" in result.stdout and "g-1" in result.stdout
    assert "בוב" in result.stdout


def test_hadas_list_filters_by_state(stub_app, run_cli):
    stub = stub_app()
    stub.envelope(
        "GET",
        "/api/call-to-hadas",
        {"a": {"callId": "a", "state": "told"}, "b": {"callId": "b", "state": "x"}},
    )

    assert list(_json(run_cli(stub, "hadas", "list", "--state", "told"))) == ["a"]


def test_hadas_told_and_state(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("POST", "/api/call-to-hadas", "ok")

    run_cli(stub, "hadas", "told", "c-1")
    assert stub.last().body == {"callId": "c-1", "state": "told"}

    run_cli(stub, "hadas", "state", "c-1", "requested")
    assert stub.last().body == {"callId": "c-1", "state": "requested"}


def test_hadas_state_rejects_an_unknown_state(stub_app, run_cli):
    stub = stub_app()

    assert run_cli(stub, "hadas", "state", "c-1", "lost").exit_code != 0
    assert stub.requests == []


def test_hadas_remove(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("DELETE", "/api/call-to-hadas", "removed")

    run_cli(stub, "hadas", "remove", "c-1")

    assert stub.last().method == "DELETE"
    assert stub.last().body == {"callId": "c-1"}


def test_hadas_errors_surface_the_server_message(stub_app, run_cli):
    from madash_cli.errors import ApiError

    stub = stub_app()
    stub.route(
        "DELETE",
        "/api/call-to-hadas",
        {
            "status": -1,
            "error": {"name": "CallToHadasError", "message": "הקריאה לא קיימת."},
        },
    )

    with pytest.raises(ApiError, match="הקריאה לא קיימת"):
        run_cli(stub, "hadas", "remove", "c-1")


# --- expiry parsing ----------------------------------------------------------------

NOW = datetime(2030, 1, 1, 10, 2, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, datetime(2030, 1, 1, 16, 5, tzinfo=timezone.utc)),
        ("+90m", NOW + timedelta(minutes=90)),
        ("+2h", NOW + timedelta(hours=2)),
        ("12:30", datetime(2030, 1, 1, 12, 30, tzinfo=timezone.utc)),
        ("09:00", datetime(2030, 1, 2, 9, 0, tzinfo=timezone.utc)),
        ("2030-05-05T08:00:00+00:00", datetime(2030, 5, 5, 8, tzinfo=timezone.utc)),
    ],
)
def test_parse_expiry(value, expected):
    from madash_cli.commands.hadas import parse_expiry

    assert parse_expiry(value, now=NOW) == expected


@pytest.mark.parametrize("value", ["soon", "25:00", "+3d"])
def test_parse_expiry_rejects_garbage(value):
    import typer
    from madash_cli.commands.hadas import parse_expiry

    with pytest.raises(typer.BadParameter):
        parse_expiry(value, now=NOW)


# --- journal -----------------------------------------------------------------------

JOURNAL = {
    "id": "j",
    "date": "2030-01-01",
    "customName": "",
    "tasks": [{"id": "t1", "title": "x", "isCompleted": False}],
    "isReadOnly": False,
}


def test_journal_get_sends_the_date(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/journal", JOURNAL)

    run_cli(stub, "journal", "get", "--date", "2030-01-01")

    assert stub.last().query == {"date": ["2030-01-01"]}


def test_journal_get_defaults_to_today(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/journal", JOURNAL)

    run_cli(stub, "journal", "get")

    today = datetime.now(timezone.utc).astimezone().date().isoformat()
    assert stub.last().query == {"date": [today]}


def test_journal_get_rejects_a_bad_date(stub_app, run_cli):
    assert run_cli(stub_app(), "journal", "get", "-d", "tomorrow").exit_code != 0


def test_journal_done_saves_the_ticked_task(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/journal", JOURNAL)
    stub.envelope("POST", "/api/journal", JOURNAL)

    run_cli(stub, "journal", "done", "t1", "-d", "2030-01-01")

    assert stub.last().method == "POST"
    assert stub.last().body["tasks"][0]["isCompleted"] is True


def test_journal_undo_and_rename(stub_app, run_cli):
    stub = stub_app()
    stub.envelope(
        "GET", "/api/journal", {**JOURNAL, "tasks": [{"id": "t1", "isCompleted": True}]}
    )
    stub.envelope("POST", "/api/journal", JOURNAL)

    run_cli(stub, "journal", "undo", "t1")
    assert stub.last().body["tasks"][0]["isCompleted"] is False

    run_cli(stub, "journal", "rename", "יום ספורט")
    assert stub.last().body["customName"] == "יום ספורט"


def test_journal_refuses_to_edit_a_past_day(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/journal", {**JOURNAL, "isReadOnly": True})

    assert run_cli(stub, "journal", "rename", "x").exit_code == 1
    assert all(r.method == "GET" for r in stub.requests)


def test_journal_unknown_task_fails(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/journal", JOURNAL)

    assert run_cli(stub, "journal", "done", "nope").exit_code == 1


def test_journal_update_posts_the_file(stub_app, run_cli, tmp_path):
    stub = stub_app()
    stub.envelope("POST", "/api/journal", JOURNAL)
    path = tmp_path / "j.json"
    path.write_text(json.dumps(JOURNAL), encoding="utf-8")

    run_cli(stub, "journal", "update", str(path))

    assert stub.last().body == JOURNAL


def test_journal_update_needs_a_date(stub_app, run_cli, tmp_path):
    path = tmp_path / "j.json"
    path.write_text("{}", encoding="utf-8")

    assert run_cli(stub_app(), "journal", "update", str(path)).exit_code == 1


# --- status ------------------------------------------------------------------------

SERVICES = [{"id": "bluz", "state": "up", "latencyMs": 12, "history": [1, 2]}]


def test_status_services_drops_the_latency_history_in_tables(stub_app, run_cli_table):
    stub = stub_app()
    stub.envelope("GET", "/api/status/services", SERVICES)

    result = run_cli_table(stub, "status", "services")

    assert "bluz" in result.stdout
    assert "history" not in result.stdout


@pytest.mark.parametrize(
    ("command", "path"),
    [
        ("toilet-queue", "/api/status/hive/toilet-queue"),
        ("open-helps", "/api/status/hive/open-helps"),
    ],
)
def test_status_single_tiles(stub_app, run_cli, command, path):
    stub = stub_app()
    stub.envelope("GET", path, {"x": 1})

    assert _json(run_cli(stub, "status", command)) == {"x": 1}
    assert stub.last().path == path


def test_status_all(stub_app, run_cli):
    stub = stub_app()
    stub.envelope("GET", "/api/status/services", SERVICES)
    stub.envelope("GET", "/api/status/hive/toilet-queue", {"waiting": 1, "out": 2})
    stub.envelope("GET", "/api/status/hive/open-helps", {"count": 3})

    board = _json(run_cli(stub, "status", "all"))

    assert board == {
        "services": SERVICES,
        "toiletQueue": {"waiting": 1, "out": 2},
        "openHelps": 3,
    }


# --- hive --------------------------------------------------------------------------


def test_hive_students_carry_their_room(stub_app, run_cli):
    stub = _hive_stub(stub_app)

    rows = _json(run_cli(stub, "hive", "students", "--room", "A1"))

    assert rows == [
        {
            "hiveId": 7,
            "username": "alice",
            "name": "אליס",
            "bisId": 101,
            "room": "A1",
            "status": None,
        }
    ]


def test_hive_students_raw(stub_app, run_cli):
    stub = _hive_stub(stub_app)

    assert _json(run_cli(stub, "hive", "students", "--raw")) == HIVE_STUDENTS


def test_hive_classes_table_counts_members(stub_app, run_cli_table):
    stub = _hive_stub(stub_app)

    result = run_cli_table(stub, "hive", "classes")

    assert "Squad" in result.stdout
    assert "members" in result.stdout


def test_hive_avatar_writes_the_image(stub_app, run_cli, tmp_path):
    stub = stub_app()
    stub.route("GET", "/api/avatars/7", Raw(b"jpeg-bytes", "image/jpeg"))
    out = tmp_path / "a.jpg"

    result = run_cli(stub, "hive", "avatar", "7", "-o", str(out))

    assert result.exit_code == 0, result.output
    assert out.read_bytes() == b"jpeg-bytes"


# --- open, health, auth ------------------------------------------------------------


@pytest.mark.parametrize(
    ("page", "path"), [("dashboard", "/"), ("journal", "/journal")]
)
def test_open_prints_page_urls(stub_app, run_cli, page, path):
    stub = stub_app()

    assert run_cli(stub, "open", page, "--print").stdout.strip() == f"{stub.url}{path}"


def test_open_launches_a_browser(stub_app, run_cli, monkeypatch):
    from madash_cli.commands import misc

    opened = []
    monkeypatch.setattr(misc.webbrowser, "open", opened.append)
    stub = stub_app()

    run_cli(stub, "open")

    assert opened == [f"{stub.url}/"]


def test_open_rejects_an_unknown_page(stub_app, run_cli):
    assert run_cli(stub_app(), "open", "nowhere").exit_code == 1


def test_health(stub_app, run_cli):
    stub = stub_app()
    stub.route("GET", "/api/health", {"status": "ok"})
    assert run_cli(stub, "health").exit_code == 0

    stub.route("GET", "/api/health", {"status": "nope"})
    assert run_cli(stub, "health").exit_code == 1


def test_whoami(stub_app, run_cli):
    from madash_cli.errors import NotAuthenticatedError

    stub = stub_app()
    stub.route("GET", "/api/auth/session", {"user": {"name": "מדריך"}})
    assert _json(run_cli(stub, "auth", "whoami")) == {"name": "מדריך"}

    stub.route("GET", "/api/auth/session", {})
    with pytest.raises(NotAuthenticatedError):
        run_cli(stub, "auth", "whoami")


def test_ws_ticket_reads_the_bare_ticket(stub_app, run_cli):
    stub = stub_app()
    stub.route("GET", "/api/ws-ticket", {"ticket": "abc"})

    assert _json(run_cli(stub, "auth", "ws-ticket")) == {"ticket": "abc"}


def test_ws_ticket_unauthorized_means_not_logged_in(stub_app, run_cli):
    from madash_cli.errors import NotAuthenticatedError

    stub = stub_app()
    stub.route("GET", "/api/ws-ticket", Raw(b"Unauthorized", "text/plain"), status=401)

    with pytest.raises(NotAuthenticatedError):
        run_cli(stub, "auth", "ws-ticket")
