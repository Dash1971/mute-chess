#!/usr/bin/env python3
"""Verify the remaining small WebSocket patch against its build checkout."""
from pathlib import Path
import subprocess
import sys


def verify(root, expected):
    root = Path(root).resolve()
    git = ['git', '-c', f'safe.directory={root}', '-C', str(root)]
    actual = subprocess.check_output(git + ['diff', '--binary', '--', '.'])
    files = subprocess.check_output(git + ['ls-files', '--others', '--exclude-standard', '-z']).split(b'\0')
    for name in sorted(name for name in files if name):
        result = subprocess.run(git + ['diff', '--no-index', '--binary', '--', '/dev/null', name.decode()],
                                cwd=root, capture_output=True)
        if result.returncode != 1:
            raise ValueError('Could not read WebSocket source: ' + name.decode())
        actual += result.stdout
    if actual != Path(expected).read_bytes():
        raise ValueError('WebSocket build source differs from its reviewed patch')


if __name__ == '__main__':
    verify(sys.argv[1], sys.argv[2])
