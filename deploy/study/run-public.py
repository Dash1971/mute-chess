#!/usr/bin/env python3
"""Root-only, one-shot supervisor for an owner-authorized public rating trial.

Run only from the verified main release. This intentionally creates real public
rated games. It never resets/imports perfs and does not extend/restart a run.
"""
import argparse
import fcntl
import grp
import http.client
import json
import os
from pathlib import Path
import re
import subprocess
import time


def command(*args, check=True):
    return subprocess.run(args, text=True, capture_output=True, check=check).stdout.strip()


def health():
    before = time.monotonic()
    conn = http.client.HTTPConnection('127.0.0.1', 29660, timeout=3)
    try:
        conn.request('GET', '/club/me', headers={'Host': 'mutechess.org'})
        response = conn.getresponse()
        response.read()
        return {'status': response.status, 'ms': (time.monotonic() - before) * 1000}
    finally:
        conn.close()


def properties(unit):
    text = command('systemctl', 'show', unit, '-p', 'ActiveState', '-p', 'ExecMainStatus',
                   '-p', 'CPUUsageNSec', '-p', 'MemoryCurrent', '-p', 'MemoryPeak')
    return dict(line.split('=', 1) for line in text.splitlines())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-ratings', action='store_true', required=True)
    parser.add_argument('--run', required=True)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0 or not re.fullmatch(r'[a-z][a-z0-9_]{2,31}', args.run):
        raise SystemExit('Root and a safe run ID are required')
    if not re.fullmatch(r'[0-9a-f]{40}', args.commit):
        raise SystemExit('Exact verified main revision required')
    os.umask(0o077)
    release = Path('/opt/nosweatchess/current').resolve()
    if json.loads((release / 'RELEASE.json').read_text())['gitCommit'] != args.commit:
        raise SystemExit('Live release differs from verified main')
    if Path('/var/lib/nosweatchess-security/contained').exists():
        raise SystemExit('Containment is active')
    lock = open('/run/lock/mute-chess-release.lock', 'a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    node = '/opt/nosweatchess/tools/node'
    shell = '/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js'
    uri = 'mongodb://127.0.0.1:27019/nosweat'

    def mongo(js):
        return json.loads(command(node, shell, uri, '--quiet', '--eval', 'print(JSON.stringify(' + js + '))'))

    def active_count():
        return mongo('db.game5.countDocuments({s:{$in:[10,20]}})')

    if active_count():
        raise SystemExit('Active games; do not interrupt them')
    if mongo('db.nosweat_study_game.countDocuments({runId:' + json.dumps(args.run) + '})'):
        raise SystemExit('Existing run ID; no automatic reseed/resume')
    parent = Path('/srv/nosweatchess/study')
    parent.mkdir(mode=0o750, exist_ok=True)
    account = grp.getgrnam('nosweat-adapter')
    os.chown(parent, 0, account.gr_gid)
    parent.chmod(0o750)
    output = parent / args.run
    output.mkdir(mode=0o750, exist_ok=False)
    command('chown', 'nosweat-adapter:nosweat-adapter', str(output))
    (output / 'public-bot-perfs-before.json').write_text(json.dumps(mongo(
        'db.user_perf.find({_id:{$in:db.user4.find({noSweatBot:true},{_id:1}).toArray().map(u=>u._id)}}).sort({_id:1}).toArray()'), indent=2))
    before_storage = mongo('db.stats().storageSize + db.stats().indexSize')
    configuration = Path('/etc/nosweatchess/application.conf')
    original = configuration.read_text()
    marker = '\ninclude file("/etc/nosweatchess/study.conf")\n'
    study_conf = Path('/etc/nosweatchess/study.conf')
    if marker in original or study_conf.exists():
        raise SystemExit('Previous study configuration requires explicit review')
    env = dict(line.split('=', 1) for line in Path('/etc/nosweatchess/adapter.env').read_text().splitlines() if '=' in line)
    token = env['ADAPTER_TOKEN']
    started = int(time.time() * 1000)
    deadline = started + 90 * 60000
    worker = 'nosweat-study-' + args.run
    metrics = output / 'resources.jsonl'
    reason = None
    launched = False
    modified = False

    def stop_native():
        conn = http.client.HTTPConnection('127.0.0.1', 29663, timeout=5)
        try:
            conn.request('POST', '/club/internal/study/stop', json.dumps({'runId': args.run}),
                         {'Host': 'mutechess.org', 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
            response = conn.getresponse()
            response.read()
            if response.status != 200:
                raise RuntimeError('Native study stop HTTP ' + str(response.status))
        finally:
            conn.close()

    try:
        # Block gateway admissions briefly, then recheck before restarting writers.
        command('systemctl', 'stop', 'nosweatchess-gateway')
        time.sleep(3)
        if active_count():
            raise RuntimeError('Admission race: preserve the newly active game')
        command('systemctl', 'stop', 'nosweatchess-app')
        study_conf.write_text('nosweat.study {\n enabled = true\n publicRatings = true\n runId = ' + json.dumps(args.run) +
                              '\n startedEpochMillis = ' + str(started) + '\n}\n')
        study_conf.chmod(0o644)  # No secrets; app must read explicit scope/budget.
        configuration.write_text(original + marker)
        modified = True
        command('systemctl', 'start', 'nosweatchess-app', 'nosweatchess-gateway')
        for _ in range(90):
            try:
                if health()['status'] == 200:
                    break
            except OSError:
                pass
            time.sleep(2)
        else:
            raise RuntimeError('Native app did not become ready')
        command('systemd-run', '--unit', worker, '--uid=nosweat-adapter', '--gid=nosweat-adapter',
                '--property=Restart=no', '--property=RuntimeMaxSec=5400', '--property=TimeoutStopSec=20',
                '--property=MemoryMax=1400M', '--property=CPUQuota=200%', '--property=NoNewPrivileges=yes',
                '--property=ProtectSystem=strict', '--property=ProtectHome=yes',
                '--property=ReadWritePaths=' + str(output), '--property=UMask=0077',
                '--property=EnvironmentFile=/etc/nosweatchess/adapter.env',
                '--setenv=PYTHONDONTWRITEBYTECODE=1', '--setenv=STUDY_RUN_ID=' + args.run,
                '--setenv=STUDY_PUBLIC_RATINGS=true', '--setenv=STUDY_MAIN_COMMIT=' + args.commit,
                '--setenv=STUDY_OUTPUT=' + str(output), '--working-directory=' + str(release / 'lila-adapter'),
                node, str(release / 'lila-adapter/study.mjs'))
        launched = True
        print(json.dumps({'phase': 'running', 'run': args.run, 'deadline': deadline, 'output': str(output)}), flush=True)
        failures = 0
        tick = 0
        while int(time.time() * 1000) < deadline:
            state = properties(worker)
            try:
                check = health()
            except OSError as error:
                check = {'error': type(error).__name__}
            failures = failures + 1 if check.get('status') != 200 or check.get('ms', 0) > 2500 else 0
            sample = {'at': int(time.time() * 1000), 'health': check, 'worker': state,
                      'services': {role: properties('nosweatchess-' + role) for role in ('app', 'adapter', 'ws', 'mongo', 'redis', 'gateway')}}
            if tick % 6 == 0:
                sample['mongo'] = mongo('({storage:db.stats().storageSize + db.stats().indexSize, ops:db.serverStatus().opcounters})')
                growth = sample['mongo']['storage'] - before_storage
                size = sum(p.stat().st_size for p in output.iterdir() if p.is_file())
                if growth + size > 1024 ** 3:
                    reason = 'one-GiB-growth-limit'
            with metrics.open('a') as out:
                out.write(json.dumps(sample) + '\n')
            if failures >= 3:
                reason = 'sustained-public-health-degradation'
            if state.get('ActiveState') not in ('active', 'activating'):
                reason = 'completed' if state.get('ExecMainStatus') == '0' else 'worker-failed'
                break
            if reason:
                break
            tick += 1
            time.sleep(10)
        if reason is None:
            reason = 'absolute-deadline'
    finally:
        if launched:
            command('systemctl', 'stop', worker, check=False)
            try:
                stop_native()
            except (OSError, RuntimeError):
                # Native watchdog also aborts study games after heartbeat expiry/deadline.
                reason = reason or 'stop-requires-review'
        if modified:
            configuration.write_text(original)
            study_conf.unlink(missing_ok=True)
            # stop_native restores capacity in memory; avoid restarting any new human game.
            if not active_count():
                command('systemctl', 'restart', 'nosweatchess-app')
        command('systemctl', 'start', 'nosweatchess-app', 'nosweatchess-gateway')
        (output / 'supervisor.json').write_text(json.dumps({'run': args.run, 'commit': args.commit,
            'reason': reason, 'started': started, 'ended': int(time.time() * 1000),
            'configurationRestored': modified}, indent=2))
        print(json.dumps({'phase': 'stopped', 'reason': reason, 'run': args.run}), flush=True)


if __name__ == '__main__':
    main()
