#!/usr/bin/env python3
"""Export the pinned native application with the existing patch serializer."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


PIN = Path(__file__).with_name("native-pin.json")
WORKFLOW = ".github/workflows/mute.yml"
SPEC = importlib.util.spec_from_file_location(
    "native_source", Path(__file__).parents[1] / "public/native-source.py"
)
native_source = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(native_source)


def read_pin(path):
    pin = json.loads(Path(path).read_text())
    if set(pin) != {"repository", "commit", "upstreamBase"}:
        raise ValueError("Native pin must contain repository, commit and upstreamBase")
    if not isinstance(pin["repository"], str) or not pin["repository"].startswith("https://github.com/"):
        raise ValueError("Native repository must be a GitHub HTTPS URL")
    for name in ("commit", "upstreamBase"):
        if not isinstance(pin[name], str) or not re.fullmatch(r"[0-9a-f]{40}", pin[name]):
            raise ValueError(f"Native {name} must be a full commit SHA")
    return pin


def export_patch(pin, source=None):
    # All checkout/reset operations are confined to this disposable directory.
    # --source reuses an already fetched repository in CI or an offline check.
    with tempfile.TemporaryDirectory(prefix="mute-native-export-") as directory:
        root = Path(directory)
        git = ["git", "-c", "core.autocrlf=false", "-C", str(root)]
        env = dict(os.environ, GIT_LFS_SKIP_SMUDGE="1")

        def run(*args):
            return subprocess.run(git + list(args), check=True, stdout=subprocess.DEVNULL, env=env)

        run("init", "--quiet")
        # Git's automatic abbreviation grows with the object database. The
        # compatibility patch uses seven-character minimum object IDs.
        run("config", "core.abbrev", "7")
        repository = str(source) if source is not None else pin["repository"]
        run("fetch", "--quiet", "--no-tags", "--depth=1", "--", repository, pin["commit"])
        run("checkout", "--quiet", "--detach", pin["commit"])
        available = subprocess.run(
            git + ["cat-file", "-e", pin["upstreamBase"] + "^{commit}"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        if available.returncode:
            run("fetch", "--quiet", "--no-tags", "--depth=1", "--", repository, pin["upstreamBase"])

        # Owner-approved #363 exception: this one GitHub test file is repository
        # metadata, not an application departure. Do not exclude other paths.
        workflow = root / WORKFLOW
        if workflow.exists():
            upstream_workflow = subprocess.run(
                git + ["cat-file", "-e", pin["upstreamBase"] + ":" + WORKFLOW],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            if upstream_workflow.returncode == 0:
                raise ValueError("Review the workflow exception: upstream now owns that path")
            workflow.unlink()
        run("reset", "--quiet", "--mixed", pin["upstreamBase"])
        return native_source.patch_for(root)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pin", type=Path, default=PIN)
    parser.add_argument("--source", help="Existing Git repository containing both pinned commits")
    parser.add_argument("--output", type=Path, help="Write here instead of standard output")
    args = parser.parse_args()
    patch = export_patch(read_pin(args.pin), args.source)
    if args.output:
        args.output.write_bytes(patch)
    else:
        sys.stdout.buffer.write(patch)


if __name__ == "__main__":
    main()
