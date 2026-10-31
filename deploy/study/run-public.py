#!/usr/bin/env python3
"""Root-only, one-shot supervisor for an owner-authorized public rating trial.

Run only from the verified main release. This intentionally creates real public
rated games. It never resets/imports perfs. A dated, explicit validation continuation is
permitted only after the original run completes cleanly, never after failure.
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
import datetime as dt
import math
from continuation import PROFILE as CONTINUATION_PROFILE, DEADLINE as CONTINUATION_DEADLINE, ADMISSION_END as CONTINUATION_ADMISSION_END, FILES as PREDECESSOR_FILES, validate_predecessor, continuation_storage_usage, copy_verified_evidence


PROFILES = {
    'pilot-10-v1': {'workers': 1, 'cpu': '200%', 'memory': '1400M'},
    'ramp-22-v1': {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    'calibration-200-v1': {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    'strength-predictor-v1': {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    CONTINUATION_PROFILE: {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
}

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


def quiesce_gateway(command, sleep, active_count, capture_evidence):
    """Close admissions and refuse active games before taking any baseline."""
    command('systemctl', 'stop', 'nosweatchess-gateway')
    sleep(3)
    if active_count():
        raise RuntimeError('Admission race: preserve the newly active game')
    capture_evidence()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-ratings', action='store_true', required=True)
    parser.add_argument('--run', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--profile', choices=tuple(PROFILES), default='pilot-10-v1')
    parser.add_argument('--resume-validation', type=Path, help='Closed original evidence directory; never a failed run')
    args = parser.parse_args()
    if bool(args.resume_validation) != (args.profile == CONTINUATION_PROFILE):
        raise SystemExit('Continuation requires its explicit profile and predecessor directory')
    plan = PROFILES[args.profile]
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
    existing = mongo('db.nosweat_study_game.countDocuments({runId:' + json.dumps(args.run) + '})')
    continuation = None
    if args.resume_validation:
        predecessor = args.resume_validation.resolve()
        if predecessor != Path('/srv/nosweatchess/study') / args.run:
            raise SystemExit('Expected the original public evidence directory')
        native_records = mongo('db.nosweat_study_game.find({runId:' + json.dumps(args.run) + '}).toArray().map(d=>({id:d._id,white:d.whiteSlug,black:d.blackSlug,speed:d.speed,state:d.state,result:JSON.parse(d.result)}))')
        integrity_audit = json.loads(command('/opt/nosweatchess/venv/bin/python',
            str(Path(__file__).with_name('audit.py')), str(predecessor)))
        continuation = validate_predecessor(predecessor, args.run, native_records,
                                             int(time.time()*1000), integrity_audit)
        if health().get('status') != 200:
            raise SystemExit('Public service is not healthy')
    elif existing:
        raise SystemExit('Existing run ID; no automatic reseed/resume')
    parent = Path('/srv/nosweatchess/study')
    parent.mkdir(mode=0o750, exist_ok=True)
    account = grp.getgrnam('nosweat-adapter')
    os.chown(parent, 0, account.gr_gid)
    parent.chmod(0o750)
    output = parent / (args.run + '-validation-continuation' if continuation else args.run)
    output.mkdir(mode=0o750, exist_ok=False)
    if continuation:
        # Sticky root-owned parent: worker can create its own logs, but cannot
        # replace root-owned receipts or the protected predecessor directory.
        os.chown(output, 0, account.gr_gid)
        output.chmod(0o750)
        protected_predecessor = output / 'predecessor'
        protected_predecessor.mkdir(mode=0o750)
        os.chown(protected_predecessor, 0, account.gr_gid)
        for name in (*PREDECESSOR_FILES, *(game_id+'.pgn' for game_id in continuation['predecessorPgnSha256'])):
            target = protected_predecessor / name
            expected = continuation['predecessorFiles'].get(name, continuation['predecessorPgnSha256'].get(name.removesuffix('.pgn')))
            copy_verified_evidence(predecessor/name, target, expected)
            os.chown(target, 0, account.gr_gid)
            target.chmod(0o640)
        for name, value in (('continuation.json', continuation), ('integrity-audit.json', integrity_audit)):
            target = output/name
            target.write_text(json.dumps(value, indent=2)+'\n')
            os.chown(target, 0, account.gr_gid)
            target.chmod(0o640)
        # Reserve all root-written names before allowing worker-owned files.
        # Sticky ownership then prevents replacement with links or other files.
        for name, payload in (('resources.jsonl', ''), ('supervisor.json', '{"phase":"preparing"}\n'),
                              ('public-bot-perfs-before.json', '[]\n'), ('public-interval-games.json', '[]\n')):
            target = output/name
            with target.open('x') as stream:
                stream.write(payload)
            os.chown(target, 0, account.gr_gid)
            target.chmod(0o640)
        output.chmod(0o1770)
    else:
        command('chown', 'nosweat-adapter:nosweat-adapter', str(output))
    before_storage = None
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
    if continuation:
        deadline = CONTINUATION_DEADLINE
        if int(time.time()*1000) >= CONTINUATION_ADMISSION_END:
            raise SystemExit('Owner continuation admission window has closed')
    elif args.profile == 'strength-predictor-v1':
        deadline = int(dt.datetime.fromisoformat('2026-10-31T10:34:39+00:00').timestamp()*1000)
        if int(time.time()*1000) >= deadline - 30*60000:
            raise SystemExit('Owner deadline leaves no admission window')
    runtime_seconds = math.ceil((deadline-int(time.time()*1000))/1000)
    worker = 'nosweat-study-' + args.run + ('-validation-continuation' if continuation else '')
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

    def evidence_bytes(directory):
        total = 0
        for path in directory.rglob('*'):
            if path.is_symlink():
                raise RuntimeError('Linked study evidence is not allowed')
            if path.is_file():
                total += path.stat().st_size
        return total

    def capture_quiescent_evidence():
        nonlocal before_storage
        if continuation:
            interval = mongo('db.game5.find({_id:{$nin:db.nosweat_study_game.find({runId:' + json.dumps(args.run) + '},{_id:1}).toArray().map(d=>d._id)},$or:[{ca:{$gte:new Date(' + str(continuation['predecessorEnded']) + ')}},{ua:{$gte:new Date(' + str(continuation['predecessorEnded']) + ')}}]},{_id:1,us:1,s:1,ca:1,ua:1,ra:1}).limit(10001).toArray()')
            if len(interval) > 10000:
                raise RuntimeError('Interval-public-game evidence exceeds reviewed bound')
            (output / 'public-interval-games.json').write_text(json.dumps(interval, indent=2)+'\n')
        (output / 'public-bot-perfs-before.json').write_text(json.dumps(mongo(
            'db.user_perf.find({_id:{$in:db.user4.find({noSweatBot:true},{_id:1}).toArray().map(u=>u._id)}}).sort({_id:1}).toArray()'), indent=2))
        before_storage = mongo('db.stats().storageSize + db.stats().indexSize')
        if continuation and continuation_storage_usage(before_storage, evidence_bytes(predecessor), evidence_bytes(output)) > 1024**3:
            raise RuntimeError('Conservative continuation storage budget exceeded before launch')

    try:
        # Block gateway admissions briefly, then recheck before restarting writers.
        quiesce_gateway(command, time.sleep, active_count, capture_quiescent_evidence)
        command('systemctl', 'stop', 'nosweatchess-app')
        study_conf.write_text('nosweat.study {\n enabled = true\n publicRatings = true\n runId = ' + json.dumps(args.run) +
                              '\n profile = ' + json.dumps(args.profile) + '\n startedEpochMillis = ' + str(started) +
                              ('\n continuationAdmitted = ' + str(continuation['admittedAtResume']) if continuation else '') + '\n}\n')
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
                '--property=Restart=no', '--property=RuntimeMaxSec='+str(runtime_seconds), '--property=TimeoutStopSec=20',
                '--property=MemoryMax=' + plan['memory'], '--property=CPUQuota=' + plan['cpu'], '--property=NoNewPrivileges=yes',
                '--property=ProtectSystem=strict', '--property=ProtectHome=yes',
                '--property=ReadWritePaths=' + str(output), '--property=UMask=0077',
                '--property=EnvironmentFile=/etc/nosweatchess/adapter.env',
                '--setenv=PYTHONDONTWRITEBYTECODE=1', '--setenv=STUDY_RUN_ID=' + args.run,
                '--setenv=STUDY_PUBLIC_RATINGS=true', '--setenv=STUDY_WORKERS=' + str(plan['workers']), '--setenv=STUDY_MAIN_COMMIT=' + args.commit,
                '--setenv=STUDY_OUTPUT=' + str(output),
                *(['--setenv=STUDY_PREDECESSOR=' + str(protected_predecessor)] if continuation else []),
                '--working-directory=' + str(release / 'lila-adapter'),
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
                if continuation:
                    sample['conservativeStudyStorageBytes'] = continuation_storage_usage(
                        sample['mongo']['storage'], evidence_bytes(predecessor), evidence_bytes(output))
                    if sample['conservativeStudyStorageBytes'] > 1024 ** 3:
                        reason = 'one-GiB-conservative-continuation-limit'
                else:
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
        (output / 'supervisor.json').write_text(json.dumps({'run': args.run, 'commit': args.commit, 'profile': args.profile, 'inferenceBudget': plan,
            'reason': reason, 'started': started, 'ended': int(time.time() * 1000),
            'configurationRestored': modified, 'continuation': continuation}, indent=2))
        print(json.dumps({'phase': 'stopped', 'reason': reason, 'run': args.run}), flush=True)


if __name__ == '__main__':
    main()
