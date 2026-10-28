#!/usr/bin/env python3
"""Install reviewed forced-command monitoring access; never restart the chess app."""
import argparse
import datetime
import ipaddress
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import sys

SOURCE = Path(__file__).with_name('monitor-access.py')
USER = 'nosweat-monitor'
UNITS = tuple('nosweatchess-' + role + '.service' for role in
              ('gateway', 'app', 'ws', 'adapter', 'mongo', 'redis', 'isolation')) + (
                  'nosweat-cloudflared.service',)
STATE = Path('/var/lib/nosweatchess-security')


def run(*argv):
    return subprocess.check_output(argv, text=True, stderr=subprocess.STDOUT)


def key_line(key, address):
    parts = key.strip().split()
    if len(parts) < 2 or parts[0] != 'ssh-ed25519':
        raise ValueError('Expected an ED25519 public key')
    ipaddress.ip_address(address)
    return (f'restrict,from="{address}",command="/usr/local/libexec/nosweat-monitor-dispatch" '
            + ' '.join(parts[:2]) + ' nosweat-monitor-mbp\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-key', required=True, type=Path)
    parser.add_argument('--source-ip', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('Run as root after review/merge/verify-main')
    authorized = key_line(args.public_key.read_text(), args.source_ip)
    run('/usr/bin/ssh-keygen', '-lf', str(args.public_key))
    run('/usr/sbin/sshd', '-t')
    before = run('/usr/sbin/sshd', '-T')
    allow = next(line.split()[1:] for line in before.splitlines() if line.startswith('allowusers '))
    if 'dash' not in allow:
        raise SystemExit('Expected current dash administration access')
    if 'permituserenvironment no' not in before.splitlines():
        raise SystemExit('Require SSH user environments disabled before installing access')
    try:
        account = pwd.getpwnam(USER)
        if account.pw_uid < 1 or account.pw_uid >= 1000 or account.pw_shell != '/bin/sh':
            raise SystemExit('Existing monitor identity differs; inspect before continuing')
    except KeyError:
        run('/usr/sbin/useradd', '--system', '--user-group', '--no-create-home',
            '--home-dir', '/nonexistent', '--shell', '/bin/sh', USER)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path('/var/backups') / ('nosweat-monitor-access-' + stamp)
    backup.mkdir(mode=0o700)
    os.chown(backup, 0, 0)
    changed = []

    def write(path, content, mode=0o644):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            shutil.copy2(path, backup / str(len(changed)))
        changed.append((path, path.exists()))
        temporary = path.with_name(path.name + '.nosweat-new')
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode)
        with os.fdopen(fd, 'w') as stream:
            stream.write(content)
        os.chown(temporary, 0, 0)
        os.chmod(temporary, mode)
        os.replace(temporary, path)

    try:
        STATE.mkdir(mode=0o700, exist_ok=True)
        os.chown(STATE, 0, 0)
        os.chmod(STATE, 0o700)
        for path in ('/usr/local/sbin/nosweat-monitor', '/usr/local/libexec/nosweat-monitor-dispatch'):
            write(path, SOURCE.read_text(), 0o755)
        # sshd checks authorized keys using the target user's read permissions.
        # This is public material; root ownership prevents account-side edits.
        write('/etc/ssh/authorized_keys/nosweat-monitor', authorized, 0o644)
        sudo = ('Defaults:nosweat-monitor env_reset\n'
                'nosweat-monitor ALL=(root) NOPASSWD: ' + ', '.join(
                    '/usr/local/sbin/nosweat-monitor ' + action for action in
                    ('status', 'logs', 'contain-public', 'emergency-poweroff')) + '\n')
        write('/etc/sudoers.d/nosweat-monitor', sudo, 0o440)
        run('/usr/sbin/visudo', '-cf', '/etc/sudoers.d/nosweat-monitor')
        config = '''# Dedicated forced-command identity; retain existing global AllowUsers entries.
AllowUsers nosweat-monitor
Match User nosweat-monitor
    AuthorizedKeysFile /etc/ssh/authorized_keys/nosweat-monitor
    AuthenticationMethods publickey
    ForceCommand /usr/local/libexec/nosweat-monitor-dispatch
    DisableForwarding yes
    PermitTTY no
    PermitUserRC no
    PasswordAuthentication no
    KbdInteractiveAuthentication no
Match all
'''
        write('/etc/ssh/sshd_config.d/01-nosweat-monitor.conf', config)
        # No service is stopped or started; these conditions apply on future activation.
        for unit in UNITS:
            if unit == 'nosweatchess-isolation.service':
                continue  # Never prevent the security guard from loading.
            write('/etc/systemd/system/' + unit + '.d/containment.conf',
                  '[Unit]\nConditionPathExists=!/var/lib/nosweatchess-security/contained\n')
        run('/usr/sbin/sshd', '-t')
        after = run('/usr/sbin/sshd', '-T')
        after_allow = next(line.split()[1:] for line in after.splitlines() if line.startswith('allowusers '))
        if not set(allow).issubset(after_allow) or USER not in after_allow:
            raise RuntimeError('SSH allow-list validation failed')
        effective = run('/usr/sbin/sshd', '-T', '-C',
                        f'user={USER},host=mbp,addr={args.source_ip}')
        for expected in ('disableforwarding yes', 'permittty no', 'permituserrc no',
                         'forcecommand /usr/local/libexec/nosweat-monitor-dispatch'):
            if expected not in effective.splitlines():
                raise RuntimeError('SSH restriction validation failed: ' + expected)
        run('/usr/bin/systemctl', 'daemon-reload')
        run('/usr/bin/systemctl', 'reload', 'ssh.service')
    except Exception:
        for index, (path, existed) in reversed(list(enumerate(changed))):
            if existed:
                shutil.copy2(backup / str(index), path)
            else:
                path.unlink(missing_ok=True)
        run('/usr/bin/systemctl', 'daemon-reload')
        run('/usr/sbin/sshd', '-t')
        run('/usr/bin/systemctl', 'reload', 'ssh.service')
        raise
    print('Installed restricted monitor access; chess services not restarted. Backup: ' + str(backup))


if __name__ == '__main__':
    main()
