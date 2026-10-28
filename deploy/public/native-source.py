#!/usr/bin/env python3
"""Reconstruct the exact native patch, excluding downloaded engine networks."""
from pathlib import Path
import subprocess
import sys

def patch_for(root):
    root = Path(root).resolve()
    git = ['git', '-c', f'safe.directory={root}', '-C', str(root)]
    patch = subprocess.check_output(git + ['diff', '--binary', '--', '.', ':!public/lifat/nnue/'])
    # Include all new source files, including native extension modules/tests.
    files = subprocess.check_output(git + ['ls-files', '--others', '--exclude-standard'], text=True).splitlines()
    files = [name for name in files if name != 'public/nosweat/nostr.js' and
        not name.startswith(('public/lifat/nnue/', 'public/nosweat/analysis/'))]
    for name in sorted(files):
        result = subprocess.run(git + ['diff', '--no-index', '--binary', '--', '/dev/null', name], cwd=root, capture_output=True)
        if result.returncode != 1:
            raise RuntimeError(f'Could not reconstruct native source: {name}')
        patch += result.stdout
    return patch

if __name__ == '__main__':
    sys.stdout.buffer.write(patch_for(sys.argv[1]))
