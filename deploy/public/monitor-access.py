#!/usr/bin/python3 -I
"""Fixed privileged operations for a forced-command SSH monitoring identity."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import subprocess
import sys
import tempfile

UNITS = tuple('nosweatchess-' + role + '.service' for role in
              ('gateway', 'app', 'ws', 'adapter', 'mongo', 'redis', 'isolation')) + (
                  'nosweat-cloudflared.service',)
STOP_UNITS = ('nosweat-cloudflared.service',) + tuple(
    'nosweatchess-' + role + '.service' for role in ('gateway', 'adapter', 'ws', 'app'))
STATE = Path('/var/lib/nosweatchess-security')
LATCH = STATE / 'contained'
ACTIONS = ('status', 'logs', 'contain-public', 'emergency-poweroff')
ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LANG': 'C.UTF-8'}


def run(argv, timeout=12):
    # Bound child output before decoding untrusted journal message bodies.
    def limit_output():
        resource.setrlimit(resource.RLIMIT_FSIZE, (512000, 512000))
    with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
        result = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=stdout,
                                stderr=stderr, timeout=timeout, env=ENV,
                                preexec_fn=limit_output)
        stdout.seek(0)
        stderr.seek(0)
        return {'returncode': result.returncode,
                'output': stdout.read(200000).decode('utf-8', errors='replace'),
                'error': stderr.read(1000).decode('utf-8', errors='replace')}


def redact(message):
    message = re.sub(r'(?i)(bearer\s+)\S+', r'\1[REDACTED]', message)
    message = re.sub(r'(?i)((?:authorization|cookie|token|secret|password|nsec|private.key)'
                     r'\s*[=:]\s*)[^\s,;]+', r'\1[REDACTED]', message)
    message = re.sub(r'\b(?:nsec1[a-z0-9]+|[0-9a-fA-F]{64})\b', '[REDACTED]', message)
    return message[:600]


def journal(kernel=False):
    args = ['/usr/bin/journalctl', '--no-pager', '--utc', '--output=json',
            '--since=-10min', '--lines=250']
    if kernel:
        args.append('--dmesg')
    else:
        for unit in (*UNITS, 'ssh.service'):
            args.extend(('-u', unit))
        # sudo is not always attributed to ssh.service.
        args.extend(('+', 'SYSLOG_IDENTIFIER=sudo', '+', 'SYSLOG_IDENTIFIER=nosweat-monitor'))
    result = run(args)
    events = []
    for line in result['output'].splitlines():
        try:
            event = json.loads(line)
            selected = {key: event[key] for key in (
                '__CURSOR', '__REALTIME_TIMESTAMP', '_BOOT_ID', '_SYSTEMD_UNIT',
                '_UID', '_PID', 'PRIORITY', 'SYSLOG_IDENTIFIER') if key in event}
            selected['MESSAGE'] = redact(str(event.get('MESSAGE', '')))
            events.append(selected)
        except (ValueError, TypeError):
            continue
    return {'untrusted_log_content': True, 'redaction_is_best_effort': True,
            'events': events, 'window_minutes': 10, 'limit': 250,
            'possibly_truncated': len(events) >= 250 or len(result['output']) >= 200000,
            'returncode': result['returncode']}


def policy_shape(value):
    if isinstance(value, list):
        return [policy_shape(item) for item in value]
    if isinstance(value, dict):
        return {k: policy_shape(v) for k, v in value.items()
                if k not in ('packets', 'bytes', 'handle', 'metainfo')}
    return value


def status():
    properties = ('Id', 'ActiveState', 'SubState', 'MainPID', 'NRestarts', 'Result',
                  'ExecMainStatus', 'MemoryCurrent', 'MemoryMax')
    units = run(['/usr/bin/systemctl', 'show', *UNITS, *(
        '-p' + item for item in properties)])
    nft = run(['/usr/sbin/nft', '-j', 'list', 'table', 'inet', 'nosweatchess_isolation'])
    shape = policy_shape(json.loads(nft['output'])) if nft['returncode'] == 0 else None
    sensors = {}
    for pattern in ('/sys/class/hwmon/hwmon*/temp*_input',
                    '/sys/class/hwmon/hwmon*/fan*_input'):
        import glob
        for name in glob.glob(pattern)[:32]:
            try:
                sensors[name] = int(Path(name).read_text().strip())
            except (OSError, ValueError):
                pass
    filesystem = os.statvfs('/srv/nosweatchess')
    hashes = {}
    paths = [Path('/etc/nosweatchess/isolation.nft'),
             Path('/opt/nosweatchess/current/RELEASE.json'),
             Path('/usr/local/sbin/nosweat-monitor'),
             Path('/usr/local/libexec/nosweat-monitor-dispatch'),
             Path('/etc/ssh/sshd_config.d/01-nosweat-monitor.conf'),
             Path('/etc/sudoers.d/nosweat-monitor'),
             Path('/etc/ssh/authorized_keys/nosweat-monitor')]
    paths += [Path('/etc/systemd/system') / unit for unit in UNITS]
    paths += [Path('/etc/systemd/system') / (unit + '.d') / 'containment.conf'
              for unit in UNITS if unit != 'nosweatchess-isolation.service']
    for path in paths:
        if path.is_file():
            hashes[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    backups = list(Path('/srv/nosweatchess/backups').glob('*.enc'))
    return {'units': units, 'containment_latched': LATCH.exists(),
            'boot_id': Path('/proc/sys/kernel/random/boot_id').read_text().strip(),
            'isolation_present': shape is not None,
            'isolation_shape_sha256': hashlib.sha256(json.dumps(
                shape, sort_keys=True).encode()).hexdigest() if shape else None,
            'listeners': run(['/usr/bin/ss', '-H', '-lnt']),
            'tunnel_ready': run(['/usr/bin/curl', '--fail', '--silent', '--show-error',
                                '--max-time', '4', 'http://127.0.0.1:20241/ready']),
            'disk_available_bytes': filesystem.f_bavail * filesystem.f_frsize,
            'disk_available_inodes': filesystem.f_favail,
            'sensor_raw_values': sensors, 'integrity_sha256': hashes,
            'latest_backup_mtime': max((p.stat().st_mtime for p in backups), default=None)}


def contain(poweroff=False):
    # Root-only, persistent, and applied before stopping any service.
    with (STATE / 'action.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if not LATCH.exists():
            with LATCH.open('x') as target:
                os.chmod(LATCH, 0o600)
                target.write(datetime.datetime.now(datetime.timezone.utc).isoformat() + '\n')
                target.flush()
                os.fsync(target.fileno())
            directory_fd = os.open(STATE, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        action = 'emergency-poweroff' if poweroff else 'contain-public'
        run(['/usr/bin/logger', '-t', 'nosweat-monitor', '--', 'requested ' + action])
        try:
            stopped = run(['/usr/bin/systemctl', 'stop', *STOP_UNITS], timeout=40)
        except subprocess.TimeoutExpired:
            stopped = {'returncode': 124, 'error': 'stop timed out; latch retained'}
        result = {'action': action, 'containment_latched': True, 'stop': stopped}
        if poweroff:
            result['poweroff'] = run(['/usr/bin/systemctl', 'poweroff'])
        else:
            result['units_after'] = run(['/usr/bin/systemctl', 'show', *STOP_UNITS,
                                         '-pId', '-pActiveState', '-pSubState'])
        return result


def dispatch(command):
    # Exact matching: no tokenization, shell, user paths, arguments or subcommands.
    if command not in ACTIONS:
        return None
    return ['/usr/bin/sudo', '-n', '/usr/local/sbin/nosweat-monitor', command]


def main():
    if Path(sys.argv[0]).name == 'nosweat-monitor-dispatch':
        argv = dispatch(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
        if argv is None:
            print('{"error":"Only status, logs, contain-public and emergency-poweroff are allowed"}')
            return 64
        os.execve(argv[0], argv, ENV)
    if os.geteuid() != 0 or len(sys.argv) != 2 or sys.argv[1] not in ACTIONS:
        print('{"error":"Denied"}')
        return 64
    os.umask(0o077)
    action = sys.argv[1]
    try:
        if action == 'status':
            result = status()
        elif action == 'logs':
            result = {'services': journal(), 'kernel': journal(kernel=True)}
        else:
            result = contain(poweroff=action == 'emergency-poweroff')
        result['collected_at_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(json.dumps(result, ensure_ascii=True))
        return 0
    except (OSError, ValueError, subprocess.SubprocessError):
        print('{"error":"Operation failed; consult operator logs; no automatic recovery"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
