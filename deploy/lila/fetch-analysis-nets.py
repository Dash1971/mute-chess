#!/usr/bin/env python3
"""Fetch standard-chess Stockfish nets against the pinned Lila LFS objects."""
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

root = Path(sys.argv[1]).resolve() / "sources/lila"
revision = "b551752d2a0e7a63459d9812825d95a633a98737"
for name in ("nn-61e7af4bb97d.nnue", "nn-1a298aa575a0.nnue"):
    relative = "public/lifat/nnue/" + name
    pointer = subprocess.check_output(
        ["git", "show", f"{revision}:{relative}"], cwd=root, text=True
    )
    fields = dict(line.split(" ", 1) for line in pointer.strip().splitlines())
    expected_hash = fields["oid"].removeprefix("sha256:")
    expected_size = int(fields["size"])
    destination = root / relative
    if destination.stat().st_size == expected_size:
        if hashlib.sha256(destination.read_bytes()).hexdigest() == expected_hash:
            print(name, "already verified")
            continue
    temporary = destination.with_suffix(".nnue.part")
    request = urllib.request.Request(
        f"https://media.githubusercontent.com/media/lichess-org/lila/{revision}/{relative}",
        headers={"User-Agent": "MuteChess-private-development"},
    )
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            digest.update(chunk)
            output.write(chunk)
    if size != expected_size or digest.hexdigest() != expected_hash:
        temporary.unlink()
        raise RuntimeError(f"LFS verification failed for {name}")
    os.replace(temporary, destination)
    print(name, size, expected_hash, "verified")
