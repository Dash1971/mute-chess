#!/usr/bin/env python3
"""Check out and verify the exact native fork source used by a build."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import xml.etree.ElementTree as ET

PIN = Path(__file__).with_name("native-pin.json")
WORKFLOW = ".github/workflows/mute.yml"
NETWORKS = (
    "public/lifat/nnue/nn-61e7af4bb97d.nnue",
    "public/lifat/nnue/nn-1a298aa575a0.nnue",
)


def read_pin(path=PIN):
    pin = json.loads(Path(path).read_text())
    if set(pin) != {"repository", "commit", "upstreamBase"}:
        raise ValueError("Native pin must contain repository, commit and upstreamBase")
    if not isinstance(pin["repository"], str) or not pin["repository"].startswith("https://github.com/"):
        raise ValueError("Native repository must be a GitHub HTTPS URL")
    for name in ("commit", "upstreamBase"):
        if not isinstance(pin[name], str) or not re.fullmatch(r"[0-9a-f]{40}", pin[name]):
            raise ValueError(f"Native {name} must be a full commit SHA")
    return pin


def git(root, *args):
    return subprocess.check_output(
        ["git", "-c", f"safe.directory={Path(root).resolve()}", "-C", str(root), *args]
    )


def verify_checkout(root, pin):
    root = Path(root).resolve()
    commit = git(root, "rev-parse", "HEAD").decode().strip()
    if commit != pin["commit"]:
        raise ValueError("Native checkout HEAD differs from native-pin.json")
    dirty = []
    for entry in git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all").split(b"\0"):
        if not entry:
            continue
        status, name = entry[:2].decode(), os.fsdecode(entry[3:])
        if status == "??" and (name == "public/nosweat/nostr.js" or name.startswith("public/nosweat/analysis/")):
            # The existing browser/analysis asset verifiers check these against
            # the matching Mute sources and download pins before installation.
            continue
        if status == " M" and name in NETWORKS:
            pointer = git(root, "show", f"{commit}:{name}").decode()
            fields = dict(line.split(" ", 1) for line in pointer.strip().splitlines())
            path = root / name
            if path.is_symlink() or path.stat().st_size != int(fields["size"]):
                raise ValueError("Downloaded Stockfish network differs from its pinned LFS object: " + name)
            with path.open("rb") as file:
                if hashlib.file_digest(file, "sha256").hexdigest() != fields["oid"].removeprefix("sha256:"):
                    raise ValueError("Downloaded Stockfish network differs from its pinned LFS object: " + name)
            continue
        dirty.append(os.fsdecode(entry))
    if dirty:
        raise ValueError("Native checkout has unapproved changes: " + json.dumps(dirty))
    return {"nativeCommit": commit, "nativeTree": git(root, "rev-parse", "HEAD^{tree}").decode().strip()}


def verify_release(root, pin, release):
    identity = verify_checkout(root, pin)
    if any(release.get(key) != value for key, value in identity.items()) or release.get("upstreamLila") != pin["upstreamBase"]:
        raise ValueError("Native fork identity differs from the verified main release")
    return identity


def verify_mute_archive(path, main, payload_files=None):
    with Path(path).open("rb") as file:
        commit = subprocess.check_output(["git", "get-tar-commit-id"], stdin=file, text=True).strip()
    if commit != main:
        raise ValueError("Mute source archive differs from the verified main release")
    if payload_files:
        with tarfile.open(path) as archive:
            for source, payload in payload_files.items():
                member = archive.getmember(source)
                if not member.isfile() or archive.extractfile(member).read() != Path(payload).read_bytes():
                    raise ValueError(f"Payload file differs from verified Mute source: {source}")


def checkout(root, pin, source=None):
    root = Path(root).resolve()
    if not root.exists():
        root.mkdir(parents=True)
    if not (root / ".git").exists():
        if any(root.iterdir()):
            raise ValueError("Refusing to initialize a nonempty native source directory")
        subprocess.run(["git", "init", "--quiet", str(root)], check=True)
    elif git(root, "status", "--porcelain", "--untracked-files=all").strip():
        # Preparing an existing generated build checkout is permitted only at
        # the same pin. Never discard or silently migrate a dirty old checkout.
        verify_checkout(root, pin)
    env = dict(os.environ, GIT_LFS_SKIP_SMUDGE="1")
    subprocess.run(["git", "-C", str(root), "fetch", "--quiet", "--depth=1",
                    source or pin["repository"], pin["commit"], pin["upstreamBase"]], env=env, check=True)
    subprocess.run(["git", "-C", str(root), "checkout", "--quiet", "--detach", pin["commit"]], env=env, check=True)
    return verify_checkout(root, pin)


def changed_files(root, pin):
    names = git(root, "diff", "--no-renames", "--name-only", "-z", pin["upstreamBase"], pin["commit"]).split(b"\0")
    return {os.fsdecode(name) for name in names if name and os.fsdecode(name) != WORKFLOW}


def restore_generated_i18n(root):
    """Retain the existing build's checked restoration of generated declarations."""
    root = Path(root)
    path = root / "ui/@types/lichess/i18n.d.ts"
    generated = path.read_text()
    bootstrap = git(root, "show", "HEAD:ui/@types/lichess/i18n.d.ts").decode()
    keys = {e.attrib["name"]: e.text for e in ET.parse(root / "translation/source/site.xml").getroot()
            if e.attrib.get("name", "").startswith("mute")}
    pattern = r"    /\*\* ([^\n]*) \*/\n    (mute\w+): (?:string|I18nFormat);\n"
    if dict((key, text) for text, key in re.findall(pattern, generated)) != keys or re.sub(pattern, "", generated) != bootstrap:
        raise ValueError("Generated i18n declarations differ beyond the expected Mute keys")
    path.write_text(bootstrap)
    return {"generatedI18nCheckedAndRestored": True}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("checkout", "verify", "restore-i18n"))
    parser.add_argument("root", type=Path)
    parser.add_argument("--pin", type=Path, default=PIN)
    args = parser.parse_args()
    pin = read_pin(args.pin)
    if args.action == "restore-i18n":
        result = restore_generated_i18n(args.root)
    else:
        result = checkout(args.root, pin) if args.action == "checkout" else verify_checkout(args.root, pin)
    print(json.dumps(result))
