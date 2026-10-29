#!/usr/bin/env python3
"""Install a separate, loopback-only public alpha. Run as root on the mini."""
import base64
import fcntl
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
maintenance_lock = open('/run/lock/nosweatchess-maintenance.lock', 'a')
fcntl.flock(maintenance_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
payload = Path(sys.argv[1]).resolve()
dev = Path('/home/dash/no-sweat-lila')
for role in ('gateway', 'app', 'ws', 'adapter', 'mongo', 'redis'):
    if subprocess.run(['systemctl', 'is-active', '--quiet', 'nosweatchess-' + role]).returncode == 0:
        raise SystemExit('Stop the public stack in a checked maintenance window before installation')
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
for repository, field in (('lila', 'upstreamLila'), ('lila-ws', 'upstreamWs')):
    actual = subprocess.check_output(['git', '-c', f'safe.directory={dev}/sources/{repository}',
        '-C', str(dev / 'sources' / repository), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != release_info.get(field):
        raise SystemExit('Native upstream revision differs from the verified main release: ' + repository)
expected_patch = (payload / 'lila-nostr-maia.patch').read_bytes()
for brand_source in ('design/quiet-signal/build.py', 'design/quiet-signal/render.mjs',
        'design/quiet-signal/quiet-signal.css', 'design/quiet-signal/board.svg',
        'design/logo-explorations/final/icon.svg', 'third-party/space-grotesk/OFL.txt'):
    if not (payload / brand_source).is_file():
        raise SystemExit('Release payload is missing Quiet Signal source: ' + brand_source)
if source_checker.patch_for(dev / 'sources/lila') != expected_patch:
    raise SystemExit('Native build source differs from the merged main patch')
if hashlib.sha256(expected_patch).hexdigest() != release_info.get('nativePatchSha256'):
    raise SystemExit('Native patch provenance hash mismatch')
analysis_spec = importlib.util.spec_from_file_location('analysis_assets', payload / 'deployment/public/analysis-assets.py')
analysis_checker = importlib.util.module_from_spec(analysis_spec)
analysis_spec.loader.exec_module(analysis_checker)
analysis_checker.verify(payload / 'analysis/browser', dev / 'sources/lila/public/nosweat/analysis')
# Reject parse failures before creating a release or changing the active symlink.
checker = base / 'tools/node'
if not checker.exists():
    checker = Path('/opt/club-maia/node-v24.22.1-linux-x64/bin/node')
for script in ('gateway.mjs', 'lila-adapter/server.mjs', 'lila-adapter/policy.mjs', 'nosweat/nostr.js'):
    subprocess.run([str(checker), '--check', str(payload / script)], check=True)
isolation_spec = importlib.util.spec_from_file_location('service_isolation', payload / 'deployment/public/service-isolation.py')
isolation = importlib.util.module_from_spec(isolation_spec)
isolation_spec.loader.exec_module(isolation)
service_accounts = isolation.accounts()
for directory in (base / 'releases', base / 'tools', data, etc):
    directory.mkdir(parents=True, exist_ok=True)
for name in ('mongo', 'redis'):
    directory = data / name
    directory.mkdir(exist_ok=True)
    directory.chmod(0o700)
    os.chown(directory, service_accounts[name].pw_uid, service_accounts[name].pw_gid)
for name in ('backups', 'restore-check'):
    directory = data / name
    directory.mkdir(exist_ok=True)
    os.chown(directory, 0, 0)
    directory.chmod(0o700)
etc.chmod(0o711)
os.chown(etc, 0, 0)

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
os.chown(model, 0, service_accounts['adapter'].pw_gid)
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
net.domain = "mutechess.org"
net.prodDomain = "mutechess.org"
net.socket.domains = ["mutechess.org"]
net.base_url = "https://mutechess.org"
net.site.name = "Mute Chess"
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
csrf.origin = "https://mutechess.org"
cookie.name = "nosweat_session"
netty.threads = 2
''')
(etc / 'adapter.env').write_text(f'''ADAPTER_TOKEN={adapter_token}
LILA_ORIGIN=http://127.0.0.1:29663
PUBLIC_ORIGIN=https://mutechess.org
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
for name, role in (('secrets.conf', 'app'), ('application.conf', 'app'), ('ws.conf', 'ws'), ('redis.conf', 'redis')):
    path = etc / name
    path.chmod(0o640)
    os.chown(path, 0, service_accounts[role].pw_gid)
(etc / 'logback.xml').chmod(0o644)
os.chown(etc / 'logback.xml', 0, 0)
for name in ('adapter.env', 'backup.key'):
    path = etc / name
    if path.exists():
        os.chown(path, 0, 0)
        path.chmod(0o600)

source_dir = release / 'corresponding-source'
source_dir.mkdir()
for repository in ('lila', 'lila-ws'):
    with (source_dir / f'{repository}-upstream.tar').open('wb') as output:
        subprocess.run(['git', '-c', f'safe.directory={dev}/sources/{repository}', '-C', str(dev / 'sources' / repository), 'archive', 'HEAD'], stdout=output, check=True)
for name in ('lila-nostr-maia.patch', 'lila-ws-bind-address.patch', 'BUILD.md', 'THIRD_PARTY.md', 'LICENSE', 'RELEASE.json'):
    shutil.copy(payload / name, source_dir / name)
shutil.copytree(payload / 'third-party', source_dir / 'third-party')
for brand_directory in ('quiet-signal', 'logo-explorations/final'):
    shutil.copytree(payload / 'design' / brand_directory, source_dir / 'design' / brand_directory,
        ignore=shutil.ignore_patterns('node_modules', '__pycache__', '.venv*'))
shutil.copytree(release / 'lila-adapter', source_dir / 'lila-adapter', ignore=shutil.ignore_patterns('node_modules'))
shutil.copytree(payload / 'deployment', source_dir / 'deployment')
shutil.copytree(payload / 'analysis', source_dir / 'analysis')
shutil.copytree(payload / 'puzzles', source_dir / 'puzzles')
with tarfile.open(release / 'source.tar.gz', 'w:gz') as archive:
    archive.add(source_dir, arcname='mutechess-source')
(release / 'source.tar.gz').chmod(0o644)

current = base / 'current'
if current.exists() and not current.is_symlink():
    raise RuntimeError('Refusing to replace an unknown current directory')
replacement = base / 'current.new'
replacement.symlink_to(release)
replacement.replace(current)

# Keep account/filesystem/network policy in the same reviewed operations module.
subprocess.run(['python3', str(payload / 'deployment/public/service-isolation.py')], check=True)
isolation_info = etc / 'ISOLATION.json'
isolation_info.write_text(json.dumps({'operations_commit': release_info['gitCommit'], 'application_revision': release_info['gitCommit']}, indent=2) + '\n')
os.chown(isolation_info, 0, 0)
isolation_info.chmod(0o600)
subprocess.run(['nft', '-c', '-f', '/etc/nosweatchess/isolation.nft'], check=True)
subprocess.run(['systemd-analyze', 'verify', *[
    '/etc/systemd/system/nosweatchess-' + role + '.service'
    for role in ('isolation', 'gateway', 'app', 'ws', 'adapter', 'mongo', 'redis')
]], check=True)
subprocess.run(['systemctl', 'daemon-reload'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'nosweatchess-isolation'], check=True)
subprocess.run(['systemctl', 'enable', '--now', 'nosweatchess-mongo', 'nosweatchess-redis'], check=True)
# Seed only missing catalog puzzles after the isolated database is ready.
for attempt in range(30):
    probe = subprocess.run([str(base / 'tools/node'), str(dev / 'tools/mongosh/node_modules/mongosh/bin/mongosh.js'), 'mongodb://127.0.0.1:27019/nosweat', '--quiet', '--eval', 'db.runCommand({ping:1}).ok'], capture_output=True)
    if probe.returncode == 0: break
    import time
    time.sleep(1)
else: raise RuntimeError('Puzzle database did not become ready')
env = {**os.environ, 'PATH': str(base / 'tools') + os.pathsep + os.environ.get('PATH', '')}
subprocess.run(['python3', str(source_dir / 'puzzles/import.py'), 'mongodb://127.0.0.1:27019/nosweat', '--mongosh', str(dev / 'tools/mongosh/node_modules/mongosh/bin/mongosh.js')], env=env, check=True)
print(json.dumps({'release': str(release), 'source_sha256': hashlib.sha256((release / 'source.tar.gz').read_bytes()).hexdigest(), 'application_exposed': False}))
