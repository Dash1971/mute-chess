#!/usr/bin/env python3
"""Print the deployable main revision; reject dirty, unmerged or unchecked code."""
import json
from pathlib import Path
import subprocess

def command(*args):
    return subprocess.check_output(args, text=True).strip()

root = Path(__file__).resolve().parents[2]
subprocess.run(['git', '-C', str(root), 'fetch', 'origin', 'main'], check=True)
branch = command('git', '-C', str(root), 'branch', '--show-current')
commit = command('git', '-C', str(root), 'rev-parse', 'HEAD')
remote = command('git', '-C', str(root), 'rev-parse', 'origin/main')
if branch != 'main' or commit != remote:
    raise SystemExit('Deploy only the current origin/main revision, checked out on main')
if command('git', '-C', str(root), 'status', '--porcelain'):
    raise SystemExit('Refusing to deploy a dirty checkout')
runs = json.loads(command('gh', 'run', 'list', '--repo', 'Dash1971/no-sweat-chess',
    '--workflow', 'checks.yml', '--commit', commit, '--event', 'push', '--limit', '5',
    '--json', 'status,conclusion,headSha'))
if not any(run['headSha'] == commit and run['status'] == 'completed' and run['conclusion'] == 'success' for run in runs):
    raise SystemExit('The main push workflow must finish successfully before deployment')
print(commit)
