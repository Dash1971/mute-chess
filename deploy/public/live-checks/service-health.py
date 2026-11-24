"""CRITICAL: existing activation health checks; no starts/stops or admissions changes."""
from pathlib import Path
import http.client
import json
import os
import subprocess

assert os.geteuid() == 0
units = ['nosweatchess-app', 'nosweatchess-adapter', 'nosweatchess-ws', 'nosweatchess-gateway', 'nosweatchess-mongo', 'nosweatchess-redis', 'nosweatchess-gif', 'nosweatchess-isolation', 'nosweat-cloudflared']
for unit in units:
    subprocess.run(['systemctl', 'is-active', '--quiet', unit], check=True)
token = next(line.split('=', 1)[1].strip().strip('"') for line in Path('/etc/nosweatchess/adapter.env').read_text().splitlines() if line.startswith('ADAPTER_TOKEN='))
c = http.client.HTTPConnection('127.0.0.1', 29665, timeout=10)
c.request('GET', '/health', headers={'Authorization': 'Bearer ' + token})
r = c.getresponse()
assert r.status == 200 and json.loads(r.read()).get('ok') is True
c.close()
print(json.dumps({'passed': True, 'class': 'critical', 'activeServices': units, 'adapterHealth': True}))
