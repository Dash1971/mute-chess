#!/usr/bin/env python3
"""Reconstruct the exact native patch, excluding downloaded engine networks."""
from pathlib import Path
import subprocess
import sys

def patch_for(root):
    root = Path(root).resolve()
    git = ['git', '-c', f'safe.directory={root}', '-C', str(root)]
    patch = subprocess.check_output(git + ['diff', '--binary', '--', '.', ':!public/lifat/nnue/'])
    files = ['app/NoSweatService.scala', 'app/controllers/NoSweat.scala',
        'app/views/noSweatLogin.scala', 'public/nosweat-roster.json']
    files += [str(p.relative_to(root)) for p in (root / 'public/nosweat').glob('*') if p.suffix in {'.svg', '.css'}]
    for name in sorted(files):
        result = subprocess.run(git + ['diff', '--no-index', '--binary', '--', '/dev/null', name], cwd=root, capture_output=True)
        if result.returncode != 1:
            raise RuntimeError(f'Could not reconstruct native source: {name}')
        patch += result.stdout
    return patch

if __name__ == '__main__':
    sys.stdout.buffer.write(patch_for(sys.argv[1]))
