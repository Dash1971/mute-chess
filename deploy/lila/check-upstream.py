#!/usr/bin/env python3
"""Require an explicit, current rationale for every file in our native patches."""
import json
from pathlib import Path, PurePosixPath
import re
import sys


def relative_path(value):
    if not isinstance(value, str) or not value or PurePosixPath(value).is_absolute() or any(
        part in ("..", ".") or any(char in part for char in "*?[]")
        for part in value.split("/")
    ):
        raise ValueError(f"Expected an exact relative path: {value!r}")
    return value


def patch_files(text):
    headers = [line for line in text.splitlines() if line.startswith("diff --git ")]
    paths = []
    for header in headers:
        match = re.fullmatch(r"diff --git a/(\S+) b/(\S+)", header)
        if not match or match[1] != match[2]:
            raise ValueError(f"Review renamed/quoted patch paths explicitly: {header}")
        paths.append(relative_path(match[2]))
    if not paths or len(paths) != len(set(paths)):
        raise ValueError("Patch must contain unique file entries")
    return set(paths)


def validate(manifest, root):
    if manifest.get("schemaVersion") != 1 or not manifest.get("repositories"):
        raise ValueError("Missing departure-register schema/repositories")
    pins = (root / ".github/workflows/checks.yml").read_text()
    build = (root / "deploy/lila/README.md").read_text()
    repositories = set()
    summary = {}
    for repo in manifest["repositories"]:
        name = repo["id"]
        if name in repositories:
            raise ValueError(f"Duplicate repository: {name}")
        repositories.add(name)
        revision = repo["revision"]
        if not re.fullmatch(r"[0-9a-f]{40}", revision) or revision not in pins or revision not in build:
            raise ValueError(f"Upstream pin disagrees with CI/build documentation: {name}")
        actual = patch_files((root / relative_path(repo["patch"])).read_text())
        declared = set()
        areas = set()
        for area in repo["areas"]:
            if not area.get("rationale", "").strip() or not area.get("verification") or not area.get("files"):
                raise ValueError(f"Missing rationale, verification or files: {name}/{area.get('id')}")
            if area["id"] in areas:
                raise ValueError(f"Duplicate departure area: {name}/{area['id']}")
            areas.add(area["id"])
            for path in area["files"]:
                relative_path(path)
                if path in declared:
                    raise ValueError(f"Duplicate registered native file: {name}/{path}")
                declared.add(path)
        missing, stale = actual - declared, declared - actual
        if missing or stale:
            raise ValueError(f"{name}: undocumented native files={sorted(missing)}; stale entries={sorted(stale)}")
        summary[name] = {"revision": revision, "patchedFiles": len(actual), "areas": len(areas)}
    return summary


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    try:
        result = validate(json.loads((root / "deploy/lila/upstream-departures.json").read_text()), root)
    except (ValueError, KeyError, TypeError) as error:
        sys.exit(str(error))
    print(json.dumps(result, indent=2))
