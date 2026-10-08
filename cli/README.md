# madash

Drive madash from the terminal: everything the dashboard does, scriptable — including a
live view of the madrat message.

```bash
pip install madash --extra-index-url https://system-b90.github.io/.github/pypi/
madash login          # opens the browser, hands the session back to the CLI
madash madrat watch   # the madrat message, updating live
```

## Commands

| Command                                                                                  | UI equivalent                                                                            |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `madash login` / `logout` / `auth config` / `auth whoami` / `auth ws-ticket`             | Log in with Hive (browser hand-off)                                                      |
| `madash madrat get [--plain]`                                                            | Madrat message box                                                                       |
| `madash madrat watch [-n SECONDS] [--plain]`                                             | The message box, live — redraws in place on every change (`--json`: one line per change) |
| `madash madrat set "text"` / `set --file msg.md` (`-` = stdin) / `clear`                 | Editing the madrat message                                                               |
| `madash hadas list [--state requested\|told]`                                            | Call-to-Hadas board                                                                      |
| `madash hadas call <student>... --reason R [--expires +2h\|HH:MM\|ISO] [--group]`        | Call students (Hive id, number or username)                                              |
| `madash hadas told <callId>` / `state <callId> <state>` / `remove <callId>`              | Board actions                                                                            |
| `madash journal get [-d DATE]` / `rename NAME` / `done ID` / `undo ID` / `update FILE`   | Journal                                                                                  |
| `madash status services\|toilet-queue\|open-helps\|all`                                  | System status board                                                                      |
| `madash hive students [--room R] [--status S] [--raw]` / `classes` / `avatar ID -o FILE` | Hive data behind the board                                                               |
| `madash open [dashboard\|journal]`                                                       | Open a page in the browser                                                               |
| `madash health`                                                                          | Container liveness probe                                                                 |
| `madash interactive`                                                                     | Menu over every command above                                                            |

Global flags work in any position: `--json`, `-q/--quiet`, `--url`, `--insecure`,
`--timeout`. Configuration resolves flags > `MADASH_URL` / `MADASH_TOKEN` /
`MADASH_INSECURE` (env or a cwd `.env`) > the config file `madash login` writes.

## Development

```bash
pip install -e ./cli
pytest cli/tests -q
```

The version lives in `madash/__init__.py` and is bumped together with the app by
`python -m sb90_deploy publish` (see `deploy/app.json` `release.manifests`).
