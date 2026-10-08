"""
Name: misc.py
Purpose: `madash open` — open a madash page in the browser.
Created: 2026-09-27
Author: Michael K. Steinberg
"""

from __future__ import annotations

import webbrowser

import typer

from madash.context import state
from madash.output import abort, success

# Page name -> path. Everything the pages show is also reachable through the
# data commands; this is for putting the board itself on a screen.
PAGES = {"dashboard": "/", "journal": "/journal"}


def open_page(
    page: str = typer.Argument("dashboard", help=f"One of: {', '.join(PAGES)}."),
    print_only: bool = typer.Option(
        False, "--print", help="Print the URL instead of opening a browser."
    ),
) -> None:
    """Open a madash page in the browser."""
    if page not in PAGES:
        abort(f"Unknown page {page!r}. Pick one of: {', '.join(PAGES)}.")
    url = f"{state.config.require_url()}{PAGES[page]}"
    if print_only:
        typer.echo(url)
        return
    webbrowser.open(url)
    success(f"Opened {url}")
