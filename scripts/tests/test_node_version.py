"""
Name: test_node_version.py
Purpose: Regression test for #76 -- CI workflows and Docker base images must
    run the same Node major (24), so CI tests what the image ships.
Created: 2026-10-03
Author: Michael K. Steinberg
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NODE_MAJOR = "24"


def _workflow_versions() -> list[str]:
    found: list[str] = []
    for wf in (ROOT / ".github" / "workflows").glob("*.yml"):
        found += re.findall(r'node-version:\s*"?(\d+)', wf.read_text(encoding="utf-8"))
    return found


def _docker_versions() -> list[str]:
    found: list[str] = []
    for df in (ROOT / "Dockerfile", ROOT / "session-server" / "Dockerfile.websocket"):
        found += re.findall(r"FROM node:(\d+)", df.read_text(encoding="utf-8"))
    return found


def test_workflows_use_node_24() -> None:
    versions = _workflow_versions()
    assert versions
    assert set(versions) == {NODE_MAJOR}


def test_docker_images_use_node_24() -> None:
    versions = _docker_versions()
    assert versions
    assert set(versions) == {NODE_MAJOR}


def test_types_node_matches_runtime() -> None:
    pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    assert (
        re.sub(r"^\D*", "", pkg["devDependencies"]["@types/node"]).split(".")[0]
        == NODE_MAJOR
    )
