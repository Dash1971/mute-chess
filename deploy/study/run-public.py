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
import hashlib
import stat
from continuation import PROFILE as CONTINUATION_PROFILE, DEADLINE as CONTINUATION_DEADLINE, ADMISSION_END as CONTINUATION_ADMISSION_END, FILES as PREDECESSOR_FILES, validate_predecessor, continuation_storage_usage, copy_verified_evidence, create_protected_directory

ESTABLISHMENT_PROFILE = 'rating-establishment-v1'
ESTABLISHMENT_RUN = 'r20261031n163'
ESTABLISHMENT_START = int(dt.datetime.fromisoformat('2026-10-31T13:30:00+00:00').timestamp()*1000)
ESTABLISHMENT_ADMISSION_END = int(dt.datetime.fromisoformat('2026-10-31T21:00:00+00:00').timestamp()*1000)
ESTABLISHMENT_DEADLINE = int(dt.datetime.fromisoformat('2026-10-31T21:30:00+00:00').timestamp()*1000)
ESTABLISHMENT_ROSTER_SHA256 = 'ac9cb13a2c2e6b59daf1c7d09a74527da7c07fcdd166ea2d0389e72c5d669296'
ESTABLISHMENT_SPLIT_SHA256 = '3e954c26ab3671fabbfe27c4f85b86c0d7b131109175aad21f478d9cc0f8f65c'
BACKUP_MAX_AGE_MS = 15 * 60000


PROFILES = {
    'pilot-10-v1': {'workers': 1, 'cpu': '200%', 'memory': '1400M'},
    'ramp-22-v1': {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    'calibration-200-v1': {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    'strength-predictor-v1': {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    CONTINUATION_PROFILE: {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
    ESTABLISHMENT_PROFILE: {'workers': 2, 'cpu': '400%', 'memory': '2000M'},
}


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def json_digest(value, sort_keys=True):
    """Fingerprint plain Mongo JSON, never time-adjusted API Glicko values."""
    def normalize(item):
        if isinstance(item, float) and item.is_integer():
            return int(item)
        if isinstance(item, dict):
            return {key: normalize(v) for key, v in item.items()}
        if isinstance(item, list):
            return [normalize(v) for v in item]
        return item
    data = json.dumps(normalize(value), sort_keys=sort_keys, separators=(',', ':'),
                      ensure_ascii=False, allow_nan=False).encode()
    return hashlib.sha256(data).hexdigest()


def dated_limits(profile, run, now):
    """Original dates remain immutable; the new experiment is not a resume."""
    if profile == ESTABLISHMENT_PROFILE:
        require(run == ESTABLISHMENT_RUN, 'Establishment requires its unique owner-approved new run ID')
        require(ESTABLISHMENT_START <= now < ESTABLISHMENT_ADMISSION_END,
                'Outside the dated establishment admission window; preparation counts within eight hours')
        return ESTABLISHMENT_ADMISSION_END, ESTABLISHMENT_DEADLINE
    if profile == CONTINUATION_PROFILE:
        require(now < CONTINUATION_ADMISSION_END, 'Owner continuation admission window has closed')
        return CONTINUATION_ADMISSION_END, CONTINUATION_DEADLINE
    if profile == 'strength-predictor-v1':
        deadline = int(dt.datetime.fromisoformat('2026-10-31T10:34:39+00:00').timestamp()*1000)
        admission = deadline - 30*60000
        require(now < admission, 'Owner deadline leaves no admission window')
        return admission, deadline
    return now+75*60000, now+90*60000


def validate_establishment_source(release):
    adapter = Path(release)/'lila-adapter'
    names = ('roster.json', 'experiment-roster.json', 'experiment-manifest.json')
    for name in names:
        path = adapter/name
        require(path.is_file() and not path.is_symlink() and stat.S_IMODE(path.stat().st_mode) == 0o644,
                'Study source roster/manifest must be regular0644 files readable by production UID: '+name)
    roster = json.loads((adapter/'roster.json').read_text()) + json.loads((adapter/'experiment-roster.json').read_text())
    manifest = json.loads((adapter/'experiment-manifest.json').read_text())
    require(len(roster) == 250 and len({bot['id'] for bot in roster}) == 250,
            'Establishment requires the exact250 existing identities')
    split = {key: manifest[key] for key in ('existingIds', 'trainingIds', 'heldoutIds')}
    require(len(split['existingIds']) == 44 and len(split['trainingIds']) == 200 and len(split['heldoutIds']) == 50
            and not set(split['trainingIds']) & set(split['heldoutIds'])
            and set(split['trainingIds']) | set(split['heldoutIds']) == {bot['id'] for bot in roster},
            'Establishment population/split differs from the approved source')
    require(json_digest(roster, sort_keys=False) == manifest['combinedRosterSha256'] == ESTABLISHMENT_ROSTER_SHA256
            and json_digest(split) == ESTABLISHMENT_SPLIT_SHA256, 'Existing frozen policy/split hashes changed')
    user_ids = sorted(bot['username'].lower() for bot in roster)
    require(len(set(user_ids)) == 250, 'Duplicate native BOT account ID')
    return roster, manifest


def native_perfs_query(roster):
    """Use this exact query for both backup receipt and launch fingerprint."""
    ids = sorted(bot['username'].lower() for bot in roster)
    return 'db.user_perf.find({_id:{$in:' + json.dumps(ids, separators=(',', ':')) + '}}).sort({_id:1}).toArray()'


def native_users_query(roster):
    ids = sorted(bot['username'].lower() for bot in roster)
    return ('db.user4.find({_id:{$in:' + json.dumps(ids, separators=(',', ':')) +
            '}},{_id:1,noSweatBot:1,enabled:1,title:1,noSweatSeedVersion:1}).sort({_id:1}).toArray()')


def validate_native_bots(roster, users, perfs):
    expected = {bot['username'].lower() for bot in roster}
    require(len(users) == len(perfs) == 250 and {u['_id'] for u in users} == {p['_id'] for p in perfs} == expected,
            'Exactly250 existing native BOT users/perfs are required; never provision missing study accounts')
    require(all(u.get('noSweatBot') is True and u.get('enabled') is True and u.get('title') == 'BOT'
                and isinstance(u.get('noSweatSeedVersion'), str) and u['noSweatSeedVersion'] for u in users),
            'Existing BOT identity/seed metadata is incomplete; do not initialize or reseed it')
    for perf in perfs:
        for speed in ('blitz', 'rapid'):
            value = perf.get(speed)
            require(isinstance(value, dict) and isinstance(value.get('gl'), dict)
                    and isinstance(value.get('nb'), int) and not isinstance(value['nb'], bool) and value['nb'] >= 0,
                    'Missing native earned perf; do not create a prior')
            require(all(isinstance(value['gl'].get(key), (int, float)) and not isinstance(value['gl'][key], bool)
                        and math.isfinite(value['gl'][key]) for key in ('r', 'd', 'v')),
                    'Invalid native Glicko values')
    return json_digest(sorted(perfs, key=lambda p: p['_id']))


def verify_establishment_snapshot(roster, users, perfs, backup):
    fingerprint = validate_native_bots(roster, users, perfs)
    require(fingerprint == backup['nativeBotPerfsSha256'],
            'Current earned native perfs differ from the consistent backup; never restore/reseed them')
    return fingerprint


def load_fresh_backup(path, target_main, now, expected_uid=0, backup_root=Path('/srv/nosweatchess/backups')):
    """Read authenticated-encryption/off-host receipt; never read a key/plain dump."""
    path = Path(path)
    require(path.is_file() and not path.is_symlink() and path.stat().st_uid == expected_uid
            and not path.stat().st_mode & 0o022, 'Fresh backup receipt must be root-owned and non-writable to group/other')
    receipt = json.loads(path.read_text())
    require(receipt.get('schemaVersion') == 'night163-prelaunch-backup-v1'
            and receipt.get('runId') == ESTABLISHMENT_RUN and receipt.get('profile') == ESTABLISHMENT_PROFILE
            and receipt.get('targetMain') == target_main, 'Fresh backup receipt run/profile/target source mismatch')
    require(re.fullmatch(r'[0-9a-f]{40}', receipt.get('previousMain', '')) is not None,
            'Backup must separately identify its previous live source')
    require(receipt.get('rosterSha256') == ESTABLISHMENT_ROSTER_SHA256
            and receipt.get('splitSha256') == ESTABLISHMENT_SPLIT_SHA256
            and re.fullmatch(r'[0-9a-f]{64}', receipt.get('nativeBotPerfsSha256', '')) is not None,
            'Fresh backup roster/split/native snapshot fingerprint missing or changed')
    times = []
    for key in ('completedAtUtc', 'offHostVerifiedAtUtc'):
        value = dt.datetime.fromisoformat(receipt[key].replace('Z', '+00:00'))
        require(value.tzinfo is not None, 'Backup times require an explicit timezone')
        times.append(int(value.timestamp()*1000))
    require(ESTABLISHMENT_START <= times[0] <= times[1] <= now
            and now-times[0] <= BACKUP_MAX_AGE_MS, 'Consistent/off-host backup is not fresh within fifteen minutes')
    require(receipt.get('consistent') is True and receipt.get('databaseUnlockedVerified') is True
            and receipt.get('offHostVerified') is True, 'Consistent unlocked/off-host backup proof required')
    expected = receipt.get('encryptedSnapshotSha256', '')
    require(re.fullmatch(r'[0-9a-f]{64}', expected) is not None and receipt.get('offHostCopySha256') == expected,
            'Encrypted backup/off-host hashes differ')
    snapshot = Path(receipt['encryptedSnapshotPath'])
    require(snapshot.is_absolute() and snapshot.suffix == '.enc' and snapshot.is_file() and not snapshot.is_symlink()
            and snapshot.resolve().parent == Path(backup_root).resolve(), 'Expected a regular encrypted snapshot in the backup directory')
    require(snapshot.stat().st_size > 0 and snapshot.stat().st_size == receipt.get('encryptedSnapshotBytes'),
            'Encrypted snapshot size mismatch')
    digest = hashlib.sha256()
    with snapshot.open('rb') as source:
        for block in iter(lambda: source.read(1024*1024), b''):
            digest.update(block)
    require(digest.hexdigest() == expected, 'Encrypted snapshot bytes changed')
    return receipt


def protected_output_files(output, gid, payloads, chown=None):
    """Explicit modes survive root's0077 umask; sticky parent protects receipts."""
    chown = chown or os.chown
    chown(output, 0, gid)
    output.chmod(0o750)
    for name, value in payloads.items():
        require(Path(name).name == name, 'Root receipt name must be a basename')
        target = output/name
        with target.open('x') as stream:
            stream.write(value if isinstance(value, str) else json.dumps(value, indent=2)+'\n')
        chown(target, 0, gid)
        target.chmod(0o640)
    output.chmod(0o1770)

def command(*args, check=True):
    return subprocess.run(args, text=True, capture_output=True, check=check, timeout=30).stdout.strip()


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
    parser.add_argument('--fresh-backup-receipt', type=Path,
                        help='Root-owned consistent/off-host backup proof, required only for the dated new establishment run')
    args = parser.parse_args()
    establishment = args.profile == ESTABLISHMENT_PROFILE
    if bool(args.resume_validation) != (args.profile == CONTINUATION_PROFILE):
        raise SystemExit('Continuation requires its explicit profile and predecessor directory')
    if bool(args.fresh_backup_receipt) != establishment:
        raise SystemExit('The new establishment run requires its own fresh backup receipt; old profiles do not accept it')
    admission_end, deadline = dated_limits(args.profile, args.run, int(time.time()*1000))
    plan = PROFILES[args.profile]
    if os.geteuid() != 0 or not re.fullmatch(r'[a-z][a-z0-9_]{2,31}', args.run):
        raise SystemExit('Root and a safe run ID are required')
    if not re.fullmatch(r'[0-9a-f]{40}', args.commit):
        raise SystemExit('Exact verified main revision required')
    os.umask(0o077)
    release = Path('/opt/nosweatchess/current').resolve()
    release_metadata = json.loads((release / 'RELEASE.json').read_text())
    if release_metadata['gitCommit'] != args.commit:
        raise SystemExit('Live release differs from verified main')
    night_roster, night_backup = None, None
    if establishment:
        require(release_metadata.get('sourceVerified') is True and release_metadata.get('branch') == 'main',
                'Establishment requires a source-verified main release')
        night_roster, _ = validate_establishment_source(release)
        night_backup = load_fresh_backup(args.fresh_backup_receipt, args.commit, int(time.time()*1000))
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
        value = mongo('Number(db.game5.countDocuments({s:{$in:[10,20]}}))')
        require(type(value) is int and value >= 0, 'Unknown native active-game count')
        return value

    if active_count():
        raise SystemExit('Active games; do not interrupt them')
    existing = mongo('Number(db.nosweat_study_game.countDocuments({runId:' + json.dumps(args.run) + '}))')
    require(type(existing) is int and existing >= 0, 'Unknown existing native study-record count')
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
    if establishment:
        current_perfs = mongo(native_perfs_query(night_roster))
        verify_establishment_snapshot(night_roster, mongo(native_users_query(night_roster)), current_perfs, night_backup)
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
        protected_predecessor = create_protected_directory(output / 'predecessor', account.gr_gid)
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
    elif establishment:
        protected_output_files(output, account.gr_gid, {
            'resources.jsonl': '', 'supervisor.json': {'phase': 'preparing'},
            'public-bot-perfs-before.json': [], 'night-preflight.json': {'phase': 'preparing'},
            'fresh-backup-receipt.json': night_backup})
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
    admission_end, deadline = dated_limits(args.profile, args.run, started)
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
        if establishment:
            # This is raw, persisted Mongo data, not API perfs whose RD inflates
            # with elapsed time. The backup producer uses this exact same query.
            backup = load_fresh_backup(args.fresh_backup_receipt, args.commit, int(time.time()*1000))
            perfs = mongo(native_perfs_query(night_roster))
            fingerprint = verify_establishment_snapshot(night_roster, mongo(native_users_query(night_roster)), perfs, backup)
            (output/'night-preflight.json').write_text(json.dumps({
                'runId': args.run, 'targetMain': args.commit, 'profile': args.profile,
                'rosterSha256': ESTABLISHMENT_ROSTER_SHA256, 'splitSha256': ESTABLISHMENT_SPLIT_SHA256,
                'nativeBotPerfsSha256': fingerprint, 'nativeBots': 250,
                'checkedAtUtc': dt.datetime.now(dt.timezone.utc).isoformat(),
                'freshBackupAndOffHostVerified': True, 'nativeRatingsWritten': False}, indent=2)+'\n')
        else:
            perfs = mongo('db.user_perf.find({_id:{$in:db.user4.find({noSweatBot:true},{_id:1}).toArray().map(u=>u._id)}}).sort({_id:1}).toArray()')
        (output / 'public-bot-perfs-before.json').write_text(json.dumps(perfs, indent=2))
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
        if establishment:
            # Time spent preparing/restarting the app never extends the window.
            dated_limits(args.profile, args.run, int(time.time()*1000))
            runtime_seconds = math.floor((deadline-int(time.time()*1000))/1000)
            require(runtime_seconds > 0, 'No authorized worker runtime remains')
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
    except BaseException:
        if establishment:
            reason = 'supervisor-error' if launched else 'pre-public-preparation-failed'
        raise
    finally:
        if launched:
            command('systemctl', 'stop', worker, check=False)
            try:
                stop_native()
            except (OSError, RuntimeError):
                # Native watchdog also aborts study games after heartbeat expiry/deadline.
                reason = 'stop-requires-review' if establishment else reason or 'stop-requires-review'
        if modified:
            configuration.write_text(original)
            study_conf.unlink(missing_ok=True)
            # stop_native restores capacity in memory; avoid restarting any new human game.
            if not active_count():
                command('systemctl', 'restart', 'nosweatchess-app')
        command('systemctl', 'start', 'nosweatchess-app', 'nosweatchess-gateway')
        (output / 'supervisor.json').write_text(json.dumps({'run': args.run, 'commit': args.commit, 'profile': args.profile, 'inferenceBudget': plan,
            'reason': reason, 'started': started, 'ended': int(time.time() * 1000),
            'configurationRestored': modified, 'continuation': continuation,
            **({'ownerPreparationStarted': ESTABLISHMENT_START, 'admissionEnd': admission_end,
                'deadline': deadline, 'freshBackupReceiptRequired': True} if establishment else {})}, indent=2))
        print(json.dumps({'phase': 'stopped', 'reason': reason, 'run': args.run}), flush=True)


if __name__ == '__main__':
    main()
