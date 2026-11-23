#!/usr/bin/env python3
"""Require an explicit, current rationale for every native fork departure and remaining patch file."""
import argparse
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import sys
import subprocess
import tempfile

spec = importlib.util.spec_from_file_location("native_fork", Path(__file__).with_name("native-fork.py"))
native_fork = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native_fork)


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


def native_files(pin, source=None):
    if source is not None:
        return native_fork.changed_files(source, pin)
    with tempfile.TemporaryDirectory(prefix="mute-departures-") as directory:
        subprocess.run(["git", "init", "--quiet", "--bare", directory], check=True)
        subprocess.run(["git", "-C", directory, "fetch", "--quiet", "--depth=1",
                        pin["repository"], pin["commit"], pin["upstreamBase"]], check=True)
        return native_fork.changed_files(directory, pin)


def validate_derived_copies(repo, pin, source=None):
    copies = []
    for area in repo["areas"]:
        for copied, origin in area.get("derivedCopies", {}).items():
            if relative_path(copied) not in area["files"]:
                raise ValueError(f"Unregistered derived copy: {copied}")
            upstream = relative_path(origin["derivedFrom"])
            blob = origin["upstreamBlob"]
            if not re.fullmatch(r"[0-9a-f]{40}", blob):
                raise ValueError(f"Invalid reviewed upstream blob: {copied}")
            copies.append((copied, upstream, blob))
    if not copies:
        return
    if source is None:
        with tempfile.TemporaryDirectory(prefix="mute-derived-") as directory:
            subprocess.run(["git", "init", "--quiet", "--bare", directory], check=True)
            subprocess.run(["git", "-C", directory, "fetch", "--quiet", "--depth=1",
                            pin["repository"], pin["upstreamBase"]], check=True)
            return validate_derived_copies(repo, pin, Path(directory))
    for copied, upstream, reviewed in copies:
        actual = subprocess.run(["git", "-C", str(source), "rev-parse", "--verify",
                                 f'{pin["upstreamBase"]}:{upstream}'], capture_output=True, text=True)
        if actual.returncode or actual.stdout.strip() != reviewed:
            raise ValueError(f"Upstream source changed for {copied}: compare {upstream}, port applicable "
                             "changes and update its reviewed upstreamBlob")


def validate(manifest, root, native=None):
    if manifest.get("schemaVersion") != 1 or not manifest.get("repositories"):
        raise ValueError("Missing departure-register schema/repositories")
    pins = (root / ".github/workflows/checks.yml").read_text()
    build = (root / "deploy/lila/README.md").read_text()
    native_pin = native_fork.read_pin(root / "deploy/lila/native-pin.json")
    repositories = set()
    summary = {}
    for repo in manifest["repositories"]:
        name = repo["id"]
        if name in repositories:
            raise ValueError(f"Duplicate repository: {name}")
        repositories.add(name)
        revision = repo["revision"]
        valid_pin = revision == native_pin["upstreamBase"] if name == "lila" else revision in pins and revision in build
        if not re.fullmatch(r"[0-9a-f]{40}", revision) or not valid_pin:
            raise ValueError(f"Upstream pin disagrees with CI/build documentation: {name}")
        actual = native_files(native_pin, native) if name == "lila" else patch_files((root / relative_path(repo["patch"])).read_text())
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
        if name == "lila":
            validate_derived_copies(repo, native_pin, native)
        summary[name] = {"revision": revision, "patchedFiles": len(actual), "areas": len(areas)}
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", type=Path, help="Already fetched native Git repository")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    try:
        result = validate(json.loads((root / "deploy/lila/upstream-departures.json").read_text()), root, args.native)
    except (ValueError, KeyError, TypeError) as error:
        sys.exit(str(error))
    print(json.dumps(result, indent=2))
