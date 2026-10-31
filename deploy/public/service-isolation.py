#!/usr/bin/env python3
"""Configure Linux identities, filesystem access and local network boundaries.

Run only from a verified main revision, with all public services stopped.
This changes service configuration, not the selected application release.
"""
import argparse
import importlib.util
import json
import ipaddress
import os
from pathlib import Path
import pwd
import secrets
import socket
import stat
import subprocess

ROLES = ('gateway', 'app', 'ws', 'adapter', 'mongo', 'redis', 'gif')
USERS = {role: 'nosweat-' + role for role in ROLES}
PORTS = {'gateway': (29663, 29664), 'app': (27019, 16380, 29665, 6175),
         'ws': (27019, 16380), 'adapter': (29663,), 'mongo': (), 'redis': (), 'gif': ()}
UNITS = ['nosweatchess-' + role + '.service' for role in ROLES]


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def activate_policy():
    # RemainAfterExit keeps the old rules active across installations. Starting
    # an already-active oneshot does not rerun ExecStart; reload applies the file.
    run('systemctl', 'enable', '--now', 'nosweatchess-isolation')
    run('systemctl', 'reload', 'nosweatchess-isolation')


def accounts():
    result = {}
    for role, name in USERS.items():
        try:
            account = pwd.getpwnam(name)
        except KeyError:
            run('useradd', '--system', '--user-group', '--no-create-home',
                '--home-dir', '/nonexistent', '--shell', '/usr/sbin/nologin', name)
            account = pwd.getpwnam(name)
        if account.pw_uid == 0 or account.pw_uid >= 1000 or account.pw_shell != '/usr/sbin/nologin':
            raise RuntimeError('Unexpected existing service account: ' + name)
        result[role] = account
    return result


def lightning_addresses():
    addresses = set()
    for host in ('walletofsatoshi.com', 'livingroomofsatoshi.com'):
        for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM):
            address = ipaddress.ip_address(item[4][0])
            if not address.is_global:
                raise RuntimeError('Lightning provider resolved to a non-public address')
            addresses.add(str(address))
    if not addresses:
        raise RuntimeError('Lightning provider addresses unavailable')
    return tuple(sorted(addresses))


def policy(uids, connector_uid, payment_ips=()):
    lines = [
        'destroy table inet nosweatchess_isolation',
        'table inet nosweatchess_isolation {',
        ' chain output {',
        '  type filter hook output priority -10; policy accept;',
        '  ct state established,related accept',
    ]
    # The database and private adapter reject new connections from every other UID,
    # including private development services. Root retains the administration path.
    for family, destination in [('ip', '127.0.0.1'), ('ip6', '::1')]:
        for ports, allowed in [((27019, 16380), (0, uids['app'], uids['ws'])),
                               ((29665,), (0, uids['app'])),
                               ((6175,), (0, uids['app']))]:
            ps = ', '.join(map(str, ports))
            ids = ', '.join(map(str, allowed))
            lines.append(f'  {family} daddr {destination} tcp dport {{ {ps} }} meta skuid != {{ {ids} }} counter reject')
    for role, ports in PORTS.items():
        uid = uids[role]
        if ports:
            ps = ', '.join(map(str, ports))
            lines.append(f'  meta skuid {uid} ip daddr 127.0.0.1 tcp dport {{ {ps} }} accept')
        if role == 'adapter' and payment_ips:
            for family, version in [('ip', 4), ('ip6', 6)]:
                ips = [str(ipaddress.ip_address(ip)) for ip in payment_ips
                       if ipaddress.ip_address(ip).version == version]
                if ips:
                    lines.append(f'  meta skuid {uid} {family} daddr {{ {", ".join(ips)} }} tcp dport 443 accept')
            for transport in ('tcp', 'udp'):
                lines.append(f'  meta skuid {uid} ip daddr {{ 127.0.0.53, 127.0.0.54 }} {transport} dport 53 accept')
        lines.append(f'  meta skuid {uid} counter reject')
    lines += [
        f'  meta skuid {connector_uid} ip daddr 127.0.0.1 tcp dport 29660 accept',
        f'  meta skuid {connector_uid} ip daddr {{ 127.0.0.53, 127.0.0.54 }} udp dport 53 accept',
        f'  meta skuid {connector_uid} ip daddr {{ 127.0.0.53, 127.0.0.54 }} tcp dport 53 accept',
        f'  meta skuid {connector_uid} ip daddr {{ 198.41.192.0/24, 198.41.200.0/24 }} udp dport 7844 accept',
        f'  meta skuid {connector_uid} ip daddr {{ 198.41.192.0/24, 198.41.200.0/24 }} tcp dport 7844 accept',
        f'  meta skuid {connector_uid} counter reject',
        ' }', '}', '',
    ]
    return '\n'.join(lines)


def unit(role, payment_ips=()):
    base = '/opt/nosweatchess'
    current = base + '/current'
    etc = '/etc/nosweatchess'
    data = '/srv/nosweatchess'
    java = '/usr/lib/jvm/java-21-openjdk-amd64/bin/java'
    commands = {
        'mongo': (f'{base}/tools/mongodb/bin/mongod --bind_ip 127.0.0.1 --port 27019 --dbpath {data}/mongo --wiredTigerCacheSizeGB 0.25', data + '/mongo', '1G', ''),
        'redis': (f'{base}/tools/redis/usr/bin/redis-server {etc}/redis.conf', data + '/redis', '256M', f'Environment=LD_LIBRARY_PATH={base}/tools/redis/usr/lib/x86_64-linux-gnu\n'),
        'app': (f'{java} -Xms256m -Xmx2g -XX:ActiveProcessorCount=3 -Dlogger.file={etc}/logback.xml -Dconfig.file={etc}/application.conf -Dplay.server.dir={current}/lila -Dplay.mode=prod -cp {current}/lila/lib/* lila.app.Lila {current}/lila', current + '/lila', '3G', ''),
        'ws': (f'{java} -Xms64m -Xmx384m -XX:ActiveProcessorCount=2 -Dlogback.configurationFile={etc}/logback.xml -Dconfig.file={etc}/ws.conf -cp {current}/ws/lib/* lila.ws.LilaWs', current + '/ws', '768M', ''),
        'adapter': (f'{base}/tools/node --max-old-space-size=256 {current}/lila-adapter/server.mjs', current + '/lila-adapter', '1536M', f'EnvironmentFile={etc}/adapter.env\n'),
        'gateway': (f'{base}/tools/node --max-old-space-size=96 {current}/gateway.mjs', current, '192M', ''),
        'gif': (f'{current}/gif/lila-gif --bind 127.0.0.1:6175', current + '/gif', '768M', 'Environment=TOKIO_WORKER_THREADS=2\nCPUQuota=100%\n'),
    }
    command, working, memory, extra = commands[role]
    if role == 'adapter':
        extra += ''.join(f'IPAddressAllow={ipaddress.ip_address(ip)}\n' for ip in payment_ips)
    dependencies = 'After=network.target nosweatchess-isolation.service\nRequires=nosweatchess-isolation.service\n'
    if role in ('app', 'ws', 'adapter'):
        dependencies += 'After=nosweatchess-mongo.service nosweatchess-redis.service\nRequires=nosweatchess-mongo.service nosweatchess-redis.service\n'
    if role == 'gateway':
        dependencies += 'After=nosweatchess-app.service nosweatchess-ws.service\nRequires=nosweatchess-app.service nosweatchess-ws.service\n'
    if role == 'app':
        dependencies += 'After=nosweatchess-gif.service\nRequires=nosweatchess-gif.service\n'
    writable = f'ReadWritePaths={data}/{role}\n' if role in ('mongo', 'redis') else ''
    inaccessible = [data + '/' + item for item in ('mongo', 'redis', 'backups', 'restore-check') if item != role]
    if role in ('gateway', 'adapter', 'mongo', 'gif'):
        inaccessible.append(etc)
    else:
        inaccessible += [etc + '/backup.key', etc + '/adapter.env']
    return f'''[Unit]
Description=Mute Chess isolated {role}
{dependencies}
[Service]
User={USERS[role]}
Group={USERS[role]}
WorkingDirectory={working}
Restart=on-failure
RestartSec=5
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=yes
ProtectProc=invisible
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
RestrictNamespaces=yes
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
CapabilityBoundingSet=
IPAddressDeny=any
IPAddressAllow=localhost
InaccessiblePaths={' '.join(inaccessible)}
{writable}RuntimeDirectory=nosweatchess-{role}
RuntimeDirectoryMode=0700
Environment=PYTHONDONTWRITEBYTECODE=1
UMask=0077
TasksMax=512
MemoryMax={memory}
{extra}ExecStart={command}

[Install]
WantedBy=multi-user.target
'''


def secure(path, uid=0, gid=0, mode=0o600):
    if path.is_symlink():
        raise RuntimeError('Refusing symlink: ' + str(path))
    os.chown(path, uid, gid)
    path.chmod(mode)


def configure(root=Path('/')):
    if root == Path('/'):
        spec = importlib.util.spec_from_file_location('gif_renderer', Path(__file__).with_name('gif-renderer.py'))
        renderer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(renderer)
        renderer.verify_installed(Path('/opt/nosweatchess/current/gif'))
    people = accounts()
    at = lambda path: root / path.lstrip('/')
    etc = at('/etc/nosweatchess')
    data = at('/srv/nosweatchess')
    secure(etc, mode=0o711)
    secure(data, mode=0o711)
    for role in ('mongo', 'redis'):
        directory = data / role
        for path in [directory, *directory.rglob('*')]:
            secure(path, people[role].pw_uid, people[role].pw_gid,
                   0o700 if path.is_dir() else 0o600)
    for name in ('backups', 'restore-check'):
        secure(data / name, mode=0o700)
    secure(data / 'maia3-79m.onnx', gid=people['adapter'].pw_gid, mode=0o640)
    for name, role in [('application.conf', 'app'), ('secrets.conf', 'app'),
                       ('ws.conf', 'ws'), ('redis.conf', 'redis')]:
        secure(etc / name, gid=people[role].pw_gid, mode=0o640)
    for name in ('adapter.env', 'backup.key'):
        if (etc / name).exists():
            secure(etc / name)
    secure(etc / 'logback.xml', mode=0o644)
    ws_secrets = etc / 'ws-secrets.conf'
    if not ws_secrets.exists():
        lines = (etc / 'secrets.conf').read_text().splitlines()
        storm = next(line for line in lines if line.startswith('storm.secret = '))
        ws_secrets.write_text(storm + '\n' + 'oauth.secrets = ' + json.dumps([secrets.token_urlsafe(48)]) + '\n')
    secure(ws_secrets, gid=people['ws'].pw_gid, mode=0o640)
    ws = etc / 'ws.conf'
    ws.write_text(ws.read_text().replace('/etc/nosweatchess/secrets.conf', '/etc/nosweatchess/ws-secrets.conf'))
    secure(ws, gid=people['ws'].pw_gid, mode=0o640)
    unit_dir = at('/etc/systemd/system')
    unit_dir.mkdir(parents=True, exist_ok=True)
    payment_ips = lightning_addresses() if root == Path('/') else ()
    allowlist = etc / 'lightning-addresses.json'
    allowlist.write_text(json.dumps(payment_ips) + '\n')
    secure(allowlist)
    for role in ROLES:
        path = unit_dir / ('nosweatchess-' + role + '.service')
        path.write_text(unit(role, payment_ips))
        secure(path, mode=0o644)
    rules = etc / 'isolation.nft'
    rules.write_text(policy({role: person.pw_uid for role, person in people.items()},
                            pwd.getpwnam('cloudflared').pw_uid, payment_ips))
    secure(rules)
    filter_unit = unit_dir / 'nosweatchess-isolation.service'
    filter_unit.write_text('''[Unit]
Description=Mute Chess service network boundaries
After=ufw.service
Before=nosweat-cloudflared.service

[Service]
Type=oneshot
ExecStart=/usr/sbin/nft -f /etc/nosweatchess/isolation.nft
ExecReload=/usr/sbin/nft -f /etc/nosweatchess/isolation.nft
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
''')
    secure(filter_unit, mode=0o644)
    dropin = unit_dir / 'nosweat-cloudflared.service.d'
    dropin.mkdir(exist_ok=True)
    (dropin / 'isolation.conf').write_text('[Unit]\nRequires=nosweatchess-isolation.service\nAfter=nosweatchess-isolation.service\n')
    secure(dropin / 'isolation.conf', mode=0o644)
    return {'users': {role: person.pw_uid for role, person in people.items()},
            'config_root': str(root), 'service_count': len(ROLES)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('/'), help='Isolated filesystem fixture for acceptance tests')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('Run as root')
    if args.root == Path('/'):
        active = [unit for unit in UNITS if subprocess.run(['systemctl', 'is-active', '--quiet', unit]).returncode == 0]
        if active:
            raise SystemExit('Stop public services in a maintenance window first: ' + ', '.join(active))
    print(json.dumps(configure(args.root), indent=2))
