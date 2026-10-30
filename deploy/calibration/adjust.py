#!/usr/bin/env python3
"""Preview by default; explicit guarded maintenance commands for a later approved run."""
import argparse
import csv
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile

from rating_plan import ADJUSTMENT_ID, build, now, require, validate

HERE = Path(__file__).resolve().parent
WRITERS = ('app', 'adapter', 'ws', 'gateway')
PENDING = Path('/var/lib/nosweatchess-calibration/pending')
DROPIN = '[Service]\nExecStartPre=/usr/bin/test ! -e /var/lib/nosweatchess-calibration/pending\n'


def command(*args, env=None):
    return subprocess.run(args, text=True, capture_output=True, check=True, timeout=120, env=env).stdout.strip()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export(plan, output):
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
    path = output / 'plan.json'
    path.write_text(json.dumps(plan, indent=2) + '\n')
    with (output / 'preview.csv').open('w', newline='') as out:
        writer = csv.writer(out)
        writer.writerow(['id', 'name', 'speed', 'mode', 'games', 'before', 'after',
                         'rd_before', 'rd_after', 'reference', 'fallback', 'speed_delta'])
        for row in plan['rows']:
            for c in row['changes']:
                ref = c['reference'] or {}
                writer.writerow([row['id'], row['name'], c['speed'], c['mode'], c['games'], c['before'], c['after'],
                                 c['rdBefore'], c['rdAfter'], ref.get('used'), ref.get('fallback'), ref.get('delta')])
    (output / 'SHA256').write_text(sha(path) + '\n')
    derived = sum(c['speed'] == 'standard' for r in plan['rows'] for c in r['changes'])
    return {'plan': str(path), 'sha256': sha(path), 'identities': 44, 'poolRatings': 176,
            'derivedStandardSnapshots': derived, 'applied': False}


def maintenance():
    for role in WRITERS:
        props = dict(line.split('=', 1) for line in command('systemctl', 'show',
                     'nosweatchess-' + role, '-p', 'LoadState', '-p', 'ActiveState').splitlines())
        require(props == {'LoadState': 'loaded', 'ActiveState': 'inactive'}, 'Stop public writers first: ' + role)
    units = command('systemctl', 'list-units', '--all', '--no-legend', '--plain', 'nosweat-study*')
    require(all(line.split()[2] in ('inactive', 'failed') for line in units.splitlines() if line.strip()),
            'Study worker/supervisor still running')
    require(not Path('/etc/nosweatchess/study.conf').exists(), 'Study configuration still enabled')


def guard(plan_hash):
    PENDING.parent.mkdir(mode=0o755, exist_ok=True)
    require(PENDING.parent.stat().st_uid == 0 and PENDING.parent.stat().st_mode & 0o022 == 0,
            'Unsafe maintenance directory')
    record = {'id': ADJUSTMENT_ID, 'planSha256': plan_hash}
    if PENDING.exists():
        require(json.loads(PENDING.read_text()) == record, 'Different incomplete adjustment')
    else:
        with PENDING.open('x') as out:
            json.dump(record, out)
            out.flush()
            os.fsync(out.fileno())
    for role in WRITERS:
        directory = Path('/etc/systemd/system') / ('nosweatchess-' + role + '.service.d')
        directory.mkdir(mode=0o755, exist_ok=True)
        path = directory / '90-rating-adjustment.conf'
        if path.exists():
            require(path.read_text() == DROPIN, 'Conflicting maintenance drop-in')
        else:
            with path.open('x') as out:
                out.write(DROPIN)
            path.chmod(0o644)
    command('systemctl', 'daemon-reload')


def unguard(plan_hash):
    require(json.loads(PENDING.read_text()) == {'id': ADJUSTMENT_ID, 'planSha256': plan_hash},
            'Wrong maintenance record')
    # Remove the marker only after complete exact DB verification. Drop-ins remain
    # harmless when it is absent, including across a subsequent deployment/reboot.
    PENDING.unlink()


class Live:
    def __init__(self, commit):
        require(os.geteuid() == 0, 'Root required')
        self.release = Path('/opt/nosweatchess/current').resolve()
        info = json.loads((self.release / 'RELEASE.json').read_text())
        require(info['gitCommit'] == commit and info['branch'] == 'main' and info['sourceVerified'],
                'Exact verified-main release required')
        require(json.loads((self.release / 'corresponding-source/RELEASE.json').read_text()) == info,
                'Installed source/release attestation differs')
        require(HERE == self.release / 'corresponding-source/deployment/calibration',
                'Run installed verified-main tooling only')
        require(not Path('/var/lib/nosweatchess-security/contained').exists(), 'Security containment is active')
        self.lock = open('/run/lock/mute-chess-release.lock', 'a')
        fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.node = '/opt/nosweatchess/tools/node'
        self.shell = '/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js'
        self.uri = 'mongodb://127.0.0.1:27019/nosweat'
        self.roster = json.loads((self.release / 'lila-adapter/roster.json').read_text())
        self.state = Path('/srv/nosweatchess/calibration')
        self.state.mkdir(mode=0o700, exist_ok=True)
        require(self.state.stat().st_uid == 0 and self.state.stat().st_mode & 0o077 == 0, 'Unsafe state directory')

    def mongo(self, request):
        with tempfile.NamedTemporaryFile(mode='w', dir=self.state, suffix='.json') as out:
            json.dump(request, out)
            out.flush()
            env = dict(os.environ, MUTE_ADJUST_REQUEST=out.name)
            return json.loads(command(self.node, self.shell, self.uri, '--quiet', '--file',
                                      str(HERE / 'database.js'), env=env))

    def backup(self, plan_path):
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + secrets.token_hex(4)
        cipher = Path('/srv/nosweatchess/backups') / ('pre-rating-adjustment-' + stamp + '.enc')
        archive = self.state / ('snapshot-' + stamp + '.archive.gz')
        try:
            command('/opt/nosweatchess/tools/mongotools/bin/mongodump', '--host', '127.0.0.1',
                    '--port', '27019', '--db', 'nosweat', '--gzip', '--archive=' + str(archive))
            command(self.node, str(HERE.parent / 'public/backup-crypt.mjs'), 'encrypt', str(archive), str(cipher))
        finally:
            archive.unlink(missing_ok=True)
        return {'path': str(cipher), 'sha256': sha(cipher), 'planSha256': sha(plan_path), 'createdAtUtc': now()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('preview', 'plan', 'prepare', 'apply', 'resume', 'restore', 'finish', 'verify'))
    parser.add_argument('--commit', required=True)
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--reference', type=Path)
    parser.add_argument('--roster', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--plan', type=Path)
    parser.add_argument('--sha256')
    args = parser.parse_args()
    os.umask(0o077)
    if args.mode == 'preview':
        require(all((args.snapshot, args.reference, args.roster, args.output)), 'Preview inputs/output required')
        result = build(json.loads(args.snapshot.read_text()), json.loads(args.roster.read_text()),
                       json.loads(args.reference.read_text()), args.commit, now())
        print(json.dumps(export(result, args.output)))
        return
    live = Live(args.commit)
    if args.mode == 'plan':
        maintenance()
        require(not PENDING.exists(), 'Incomplete adjustment; recover original plan')
        require(args.reference, 'Reviewed reference snapshot required')
        result = build(live.mongo({'mode': 'snapshot'}), live.roster, json.loads(args.reference.read_text()),
                       args.commit, now())
        output = live.state / ('plan-' + secrets.token_hex(8))
        print(json.dumps(export(result, output)))
        return
    require(args.plan and args.sha256 and sha(args.plan) == args.sha256, 'Reviewed exact plan hash required')
    plan_text = args.plan.read_text()
    plan = json.loads(plan_text)
    validate(plan, live.roster)
    require(plan['sourceCommit'] == args.commit, 'Plan belongs to another release')
    request = {'planJson': plan_text, 'planSha256': args.sha256}
    record = live.mongo(dict(request, mode='record'))
    if args.mode == 'verify':
        print(json.dumps(live.mongo(dict(request, mode='verify'))))
        return
    maintenance()
    if args.mode == 'prepare':
        require(not record and not PENDING.exists(), 'Already prepared/applied; use explicit recovery')
        age = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(plan['createdAtUtc'])).total_seconds()
        require(0 <= age <= 86400, 'Plan expired; regenerate and review')
        # Back up only after the complete reviewed before-image is rechecked.
        require(live.mongo({'mode': 'snapshot'}) == plan['snapshot'], 'Snapshot changed; regenerate plan')
        receipt = live.backup(args.plan)
        live.mongo(dict(request, mode='prepare', backup=receipt))
        print(json.dumps({'status': 'prepared', 'ratingsUnchanged': True, 'backup': receipt,
                          'next': 'Copy encrypted backup off-host, verify its hash, then explicitly apply.'}))
        return
    require(record and record['planSha256'] == args.sha256, 'Original audit/plan required; prepare first')
    backup = Path(record['backup']['path'])
    require(backup.is_file() and backup.stat().st_uid == 0 and backup.stat().st_mode & 0o077 == 0 and
            sha(backup) == record['backup']['sha256'],
            'Original encrypted backup missing/changed')
    if args.mode == 'apply':
        require(record['status'] == 'prepared', 'Already started/completed; use explicit recovery')
    if args.mode == 'resume':
        require(record['status'] in ('prepared', 'applying'), 'Already completed/reversing; do not apply twice')
    if args.mode == 'finish':
        require(record['status'] in ('applied', 'rolled-back'), 'Incomplete database operation')
    guard(args.sha256)
    if args.mode != 'finish':
        mode = 'restore' if args.mode == 'restore' else 'resume'
        live.mongo(dict(request, mode=mode))
    result = live.mongo(dict(request, mode='verify'))
    unguard(args.sha256)
    print(json.dumps({**result, 'writersRemainStopped': True, 'backup': record['backup']}))


if __name__ == '__main__':
    main()
