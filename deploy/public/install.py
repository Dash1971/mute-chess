#!/usr/bin/env python3
"""Install a separate, loopback-only public alpha. Run as root on the mini."""
import base64
import importlib.util
import re
import grp
import hashlib
import json
import os
from pathlib import Path
import pwd
import secrets
import shutil
import subprocess
import sys
import tarfile

if os.geteuid() != 0:
    raise SystemExit('Run this installer as root')
payload = Path(sys.argv[1]).resolve()
dev = Path('/home/dash/no-sweat-lila')
base = Path('/opt/nosweatchess')
data = Path('/srv/nosweatchess')
etc = Path('/etc/nosweatchess')
release_info = json.loads((payload / 'RELEASE.json').read_text())
if (release_info.get('branch') != 'main' or release_info.get('sourceVerified') is not True or
        not re.fullmatch(r'[0-9a-f]{40}', release_info.get('gitCommit', ''))):
    raise SystemExit('Release provenance must identify a verified, merged main commit')
spec = importlib.util.spec_from_file_location('native_source', payload / 'deployment/public/native-source.py')
source_checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_checker)
expected_patch = (payload / 'lila-nostr-maia.patch').read_bytes()
if source_checker.patch_for(dev / 'sources/lila') != expected_patch:
    raise SystemExit('Native build source differs from the merged main patch')
if hashlib.sha256(expected_patch).hexdigest() != release_info.get('nativePatchSha256'):
    raise SystemExit('Native patch provenance hash mismatch')
# Reject parse failures before creating a release or changing the active symlink.
checker = base / 'tools/node'
if not checker.exists():
    checker = Path('/opt/club-maia/node-v24.22.1-linux-x64/bin/node')
for script in ('gateway.mjs', 'lila-adapter/server.mjs', 'lila-adapter/policy.mjs', 'nosweat/nostr.js'):
    subprocess.run([str(checker), '--check', str(payload / script)], check=True)
try:
    account = pwd.getpwnam('nosweatchess')
except KeyError:
    subprocess.run(['useradd', '--system', '--user-group', '--home-dir', str(data), '--shell', '/usr/sbin/nologin', 'nosweatchess'], check=True)
    account = pwd.getpwnam('nosweatchess')
for directory in (base / 'releases', base / 'tools', data, etc):
    directory.mkdir(parents=True, exist_ok=True)
for name in ('mongo', 'redis', 'backups', 'restore-check'):
    directory = data / name
    directory.mkdir(exist_ok=True)
    directory.chmod(0o700)
    os.chown(directory, account.pw_uid, account.pw_gid)
etc.chmod(0o750)
os.chown(etc, 0, account.pw_gid)

digest = hashlib.sha256()
for name in ('lila-nostr-maia.patch', 'gateway.mjs', 'install.py', 'lila-adapter/server.mjs', 'RELEASE.json'):
    digest.update((payload / name).read_bytes())
release_id = 'main-' + release_info['gitCommit'][:12] + '-' + digest.hexdigest()[:8]
release = base / 'releases' / release_id
if release.exists():
    raise SystemExit('This immutable release already exists; inspect it before reusing it')
release.mkdir()

def ignore(directory, names):
    result = {x for x in names if x in {'.git', 'node_modules', 'target', 'logs', '.bloop', '.bsp', '.metals', '.devenv', 'RUNNING_PID', 'instance.lock'} or x.startswith('._')}
    if Path(directory) == dev / 'sources/lila/conf':
        result.update({'application.conf', 'secrets.conf'})
    if Path(directory) == dev / 'sources/lila':
        result.update({'data', '.sbtopts', '.jvmopts'})
    return result

shutil.copytree(dev / 'sources/lila', release / 'lila', ignore=ignore, symlinks=True)
shutil.copytree(dev / 'sources/lila/target/universal/stage/lib', release / 'lila/lib')
(release / 'lila/conf/version.conf').chmod(0o644)
shutil.copytree(dev / 'sources/lila-ws/target/universal/stage/lib', release / 'ws/lib')
shutil.copytree(payload / 'lila-adapter', release / 'lila-adapter')
shutil.copytree(payload / 'nosweat', release / 'lila/public/nosweat', dirs_exist_ok=True)
shutil.copy(payload / 'gateway.mjs', release / 'gateway.mjs')
shutil.copy(payload / 'RELEASE.json', release / 'RELEASE.json')
(release / 'RELEASE.json').chmod(0o644)

for tool in ('mongodb', 'redis'):
    if not (base / 'tools' / tool).exists():
        shutil.copytree(dev / 'tools' / tool, base / 'tools' / tool, symlinks=True)
if not (base / 'tools/node').exists():
    shutil.copy('/opt/club-maia/node-v24.22.1-linux-x64/bin/node', base / 'tools/node')
    (base / 'tools/node').chmod(0o755)
if not (base / 'venv/bin/python').exists():
    subprocess.run(['python3', '-m', 'venv', str(base / 'venv')], check=True)
    subprocess.run([str(base / 'venv/bin/pip'), 'install', '-r', str(payload / 'requirements.txt')], check=True)
model = data / 'maia3-79m.onnx'
if not model.exists():
    shutil.copy('/srv/club-maia/models/maia3-79m.onnx', model)
model.chmod(0o640)
os.chown(model, 0, account.pw_gid)
assert hashlib.sha256(model.read_bytes()).hexdigest() == '3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010'

os.umask(0o077)
secret_file = etc / 'secrets.conf'
if secret_file.exists():
    secret_values = dict(line.split(' = ', 1) for line in secret_file.read_text().splitlines() if line)
    adapter_token = json.loads(secret_values['nosweat.adapterToken'])
else:
    adapter_token = secrets.token_hex(32)
    secret_values = {key: json.dumps(secrets.token_urlsafe(48)) for key in (
        'play.http.secret.key', 'security.password_reset.secret', 'security.email_confirm.secret',
        'security.email_change.secret', 'security.login_token.secret', 'security.turnstile_cookie.secret', 'storm.secret')}
    secret_values['user.password.bpass.secret'] = json.dumps(base64.b64encode(secrets.token_bytes(32)).decode())
    secret_values['nosweat.adapterToken'] = json.dumps(adapter_token)
    secret_file.write_text(''.join(f'{key} = {value}\n' for key, value in secret_values.items()))
application = '''include "base"
include "version"
include required(file("/etc/nosweatchess/secrets.conf"))
play.server.dir = "/opt/nosweatchess/current/lila"
play.server.http.address = "127.0.0.1"
play.server.http.port = 29663
mongodb.uri = "mongodb://127.0.0.1:27019/nosweat?appName=nosweatchess"
redis.uri = "redis://127.0.0.1:16380"
net.domain = "nosweatchess.org"
net.prodDomain = "nosweatchess.org"
net.socket.domains = ["nosweatchess.org"]
net.base_url = "https://nosweatchess.org"
net.site.name = "No Sweat Chess"
net.crawlable = false
net.http.log = false
play.http.session.cookieName = "nosweat_session"
play.http.session.maxAge = 7 days
mailer.primary.mock = true
mailer.secondary.mock = true
nosweat.enabled = true
nosweat.adapterUrl = "http://127.0.0.1:29665"
'''
(etc / 'application.conf').write_text(application)
(etc / 'ws.conf').write_text('''include classpath("application.conf")
include required(file("/etc/nosweatchess/secrets.conf"))
http.host = "127.0.0.1"
http.port = 29664
http.use-nginx-forwarded-ip = true
mongo.uri = "mongodb://127.0.0.1:27019/nosweat?appName=nosweatchess-ws"
redis.uri = "redis://127.0.0.1:16380"
csrf.origin = "https://nosweatchess.org"
cookie.name = "nosweat_session"
netty.threads = 2
''')
(etc / 'adapter.env').write_text(f'''ADAPTER_TOKEN={adapter_token}
LILA_ORIGIN=http://127.0.0.1:29663
PUBLIC_ORIGIN=https://nosweatchess.org
ADAPTER_PORT=29665
MAIA_MODEL=/srv/nosweatchess/maia3-79m.onnx
MAIA_PYTHON=/opt/nosweatchess/venv/bin/python
''')
(etc / 'redis.conf').write_text('''bind 127.0.0.1
port 16380
protected-mode yes
dir /srv/nosweatchess/redis
appendonly yes
maxmemory 128mb
maxmemory-policy noeviction
''')
(etc / 'logback.xml').write_text('''<configuration><appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender"><encoder><pattern>%date %-5level %logger{30} %message%n%xException{20}</pattern></encoder></appender><root level="INFO"><appender-ref ref="STDOUT"/></root></configuration>''')
for path in etc.iterdir():
    path.chmod(0o640)
    os.chown(path, 0, account.pw_gid)
(etc / 'adapter.env').chmod(0o600)

source_dir = release / 'corresponding-source'
source_dir.mkdir()
for repository in ('lila', 'lila-ws'):
    with (source_dir / f'{repository}-upstream.tar').open('wb') as output:
        subprocess.run(['git', '-c', f'safe.directory={dev}/sources/{repository}', '-C', str(dev / 'sources' / repository), 'archive', 'HEAD'], stdout=output, check=True)
for name in ('lila-nostr-maia.patch', 'lila-ws-bind-address.patch', 'BUILD.md', 'THIRD_PARTY.md', 'LICENSE', 'RELEASE.json'):
    shutil.copy(payload / name, source_dir / name)
shutil.copytree(payload / 'third-party', source_dir / 'third-party')
shutil.copytree(release / 'lila-adapter', source_dir / 'lila-adapter', ignore=shutil.ignore_patterns('node_modules'))
shutil.copytree(payload / 'deployment', source_dir / 'deployment')
with tarfile.open(release / 'source.tar.gz', 'w:gz') as archive:
    archive.add(source_dir, arcname='nosweatchess-source')
(release / 'source.tar.gz').chmod(0o644)

current = base / 'current'
if current.exists() and not current.is_symlink():
    raise RuntimeError('Refusing to replace an unknown current directory')
replacement = base / 'current.new'
replacement.symlink_to(release)
replacement.replace(current)

common = '''User=nosweatchess
Group=nosweatchess
Restart=on-failure
RestartSec=5
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
CapabilityBoundingSet=
IPAddressDeny=any
IPAddressAllow=localhost
UMask=0077
TasksMax=512
'''
java = '/usr/lib/jvm/java-21-openjdk-amd64/bin/java'
services = {
    'mongo': ('1G', f'{base}/tools/mongodb/bin/mongod --bind_ip 127.0.0.1 --port 27019 --dbpath {data}/mongo --wiredTigerCacheSizeGB 0.25', '', str(data / 'mongo')),
    'redis': ('256M', f'{base}/tools/redis/usr/bin/redis-server {etc}/redis.conf', f'Environment=LD_LIBRARY_PATH={base}/tools/redis/usr/lib/x86_64-linux-gnu\n', str(data / 'redis')),
    'app': ('3G', f'{java} -Xms256m -Xmx2g -XX:ActiveProcessorCount=3 -Dlogger.file={etc}/logback.xml -Dconfig.file={etc}/application.conf -Dplay.server.dir={current}/lila -Dplay.mode=prod -cp {current}/lila/lib/* lila.app.Lila {current}/lila', '', str(current / 'lila')),
    'ws': ('768M', f'{java} -Xms64m -Xmx384m -XX:ActiveProcessorCount=2 -Dlogback.configurationFile={etc}/logback.xml -Dconfig.file={etc}/ws.conf -cp {current}/ws/lib/* lila.ws.LilaWs', '', str(current / 'ws')),
    'adapter': ('1536M', f'{base}/tools/node --max-old-space-size=256 {current}/lila-adapter/server.mjs', f'EnvironmentFile={etc}/adapter.env\n', str(current / 'lila-adapter')),
    'gateway': ('192M', f'{base}/tools/node --max-old-space-size=96 {current}/gateway.mjs', '', str(current)),
}
for name, (memory, command, extra, working) in services.items():
    dependencies = 'After=network.target\n'
    if name not in ('mongo', 'redis'):
        dependencies += 'After=nosweatchess-mongo.service nosweatchess-redis.service\nRequires=nosweatchess-mongo.service nosweatchess-redis.service\n'
    unit = f'[Unit]\nDescription=No Sweat Chess public alpha {name}\n{dependencies}\n[Service]\n{common}WorkingDirectory={working}\nReadWritePaths={data}\nMemoryMax={memory}\n{extra}ExecStart={command}\n\n[Install]\nWantedBy=multi-user.target\n'
    Path(f'/etc/systemd/system/nosweatchess-{name}.service').write_text(unit)
    Path(f'/etc/systemd/system/nosweatchess-{name}.service').chmod(0o644)
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'nosweatchess-mongo', 'nosweatchess-redis'], check=True)
print(json.dumps({'release': str(release), 'source_sha256': hashlib.sha256((release / 'source.tar.gz').read_bytes()).hexdigest(), 'application_exposed': False}))
