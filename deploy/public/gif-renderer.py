#!/usr/bin/env python3
"""Prepare/verify the pinned official renderer; never installs or starts services."""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tarfile
import tempfile

PIN = json.loads(Path(__file__).with_suffix('.json').read_text())
FILES = {'lila-gif', 'lila-gif-upstream.tar', 'lila-gif-moss.tar', 'BUILD.json'}
MOSS_PATCH = Path(__file__).with_name('lila-gif-moss.patch')


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def regular(path, limit):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= limit:
        raise ValueError('Missing, linked or oversized renderer artifact: ' + str(path))


def verify(artifact):
    """Check content against the reviewed pin and builder receipt, without execution.

    The receipt records a trusted operator's build; it is not a signature or proof
    of reproducible compilation. The source archive and lockfile pin are fixed in
    reviewed source; the binary hash binds release installation to that build.
    """
    if artifact.is_symlink() or not artifact.is_dir() or {p.name for p in artifact.iterdir()} != FILES:
        raise ValueError('Renderer artifact must contain exactly binary, source and build receipt')
    for name in FILES:
        regular(artifact / name, 65536 if name == 'BUILD.json' else 100 * 1024 * 1024)
    receipt = json.loads((artifact / 'BUILD.json').read_text())
    if receipt.get('formatVersion') != 1 or any(receipt.get(k) != v for k, v in PIN.items()):
        raise ValueError('Renderer build receipt differs from the reviewed source/toolchain pin')
    if digest(artifact / 'lila-gif-upstream.tar') != PIN['sourceSha256']:
        raise ValueError('Renderer source archive differs from the pinned official source')
    overlay = artifact / 'lila-gif-moss.tar'
    if digest(overlay) != receipt.get('mossSourceSha256'):
        raise ValueError('Renderer moss source archive differs from its build receipt')
    sprites = receipt.get('generatedSprites', {})
    if not isinstance(sprites, dict) or set(sprites) != set(PIN['mossSprites']):
        raise ValueError('Renderer receipt must account for all 40 moss sprites')
    with tarfile.open(overlay) as archive:
        members = archive.getmembers()
        expected = {*PIN['mossSprites'], MOSS_PATCH.name}
        if len(members) != len(expected) or {m.name for m in members} != expected:
            raise ValueError('Renderer moss archive has unexpected or missing source files')
        for member in members:
            if not member.isfile() or not 0 < member.size <= 5 * 1024 * 1024:
                raise ValueError('Renderer moss archive must contain bounded regular files')
            with archive.extractfile(member) as handle:
                actual = hashlib.file_digest(handle, 'sha256').hexdigest()
            expected_hash = PIN['mossPatchSha256'] if member.name == MOSS_PATCH.name else sprites[member.name]
            if actual != expected_hash:
                raise ValueError('Renderer moss source file differs: ' + member.name)
    binary = artifact / 'lila-gif'
    if digest(binary) != receipt.get('binarySha256'):
        raise ValueError('Renderer binary differs from its build receipt')
    with binary.open('rb') as handle:
        header = handle.read(20)
    if header[:6] != b'\x7fELF\x02\x01' or header[18:20] != b'\x3e\x00':
        raise ValueError('Renderer must be a Linux x86-64 ELF binary')
    return receipt


def generate_moss(working):
    if digest(MOSS_PATCH) != PIN['mossPatchSha256']:
        raise ValueError('Renderer moss patch differs from the reviewed pin')
    for package in ('numpy', 'Pillow'):
        if importlib.metadata.version(package) != PIN['generation'][package]:
            raise ValueError('Renderer generation dependency differs: ' + package)
    resvg = subprocess.check_output(['resvg', '--version'], text=True).strip()
    # resvg 0.45.1 prints only CARGO_PKG_VERSION (upstream main.rs).
    if resvg != PIN['generation']['resvg']:
        raise ValueError('Renderer resvg version differs from the reviewed pin: ' + repr(resvg))
    original = {path: digest(path) for path in (working / 'theme/sprites').glob('*.gif')}
    subprocess.run(['git', 'apply', '--check', str(MOSS_PATCH)], cwd=working, check=True)
    subprocess.run(['git', 'apply', str(MOSS_PATCH)], cwd=working, check=True)
    subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'theme', '-p', 'test_make_sprites.py'],
                   cwd=working, check=True)
    subprocess.run([sys.executable, 'make-sprites.py', '--theme', 'quiet-signal'], cwd=working / 'theme', check=True)
    if any(digest(path) != value for path, value in original.items()):
        raise ValueError('Moss generation unexpectedly changed an existing upstream sprite')
    generated = {str(path.relative_to(working)): digest(path)
                 for path in sorted((working / 'theme/sprites').glob('quiet-signal-*.gif'))}
    if set(generated) != set(PIN['mossSprites']):
        raise ValueError('Moss generation must produce exactly the 40 pinned piece sets')
    return generated


def prepare(source, output):
    if os.geteuid() == 0:
        raise ValueError('Build the renderer as an unprivileged operator, never root')
    if platform.system() != 'Linux' or platform.machine() != 'x86_64':
        raise ValueError('Build on an Ubuntu 24.04-compatible Linux x86-64 environment')
    if output.exists() or output.is_symlink():
        raise ValueError('Refusing to overwrite renderer output')
    git = lambda *args: subprocess.check_output(['git', '-C', str(source), *args])
    if git('rev-parse', 'HEAD').decode().strip() != PIN['commit']:
        raise ValueError('Renderer checkout differs from the pinned official commit')
    if git('status', '--porcelain', '--untracked-files=no').strip():
        raise ValueError('Renderer checkout has modified tracked files')
    if digest(source / 'Cargo.lock') != PIN['cargoLockSha256']:
        raise ValueError('Renderer Cargo.lock differs from the reviewed pin')
    source_tar = git('archive', '--format=tar', 'HEAD')
    if hashlib.sha256(source_tar).hexdigest() != PIN['sourceSha256']:
        raise ValueError('Renderer source archive differs from the reviewed pin')
    rustc = subprocess.check_output(['rustc', '+' + PIN['rustVersion'], '--version'], text=True).strip()
    if not rustc.startswith('rustc ' + PIN['rustVersion'] + ' '):
        raise ValueError('Renderer Rust version differs from the reviewed pin')
    # A clean tracked checkout is insufficient: untracked .cargo/build.rs files
    # can change compilation. Build only the verified archive, in fresh output.
    output.mkdir(parents=True)
    source_path = output / 'lila-gif-upstream.tar'
    source_path.write_bytes(source_tar)
    with tempfile.TemporaryDirectory(prefix='nosweat-gif-build-') as temporary:
        working = Path(temporary)
        with tarfile.open(source_path) as archive:
            archive.extractall(working, filter='data')
        generated = generate_moss(working)
        with tarfile.open(output / 'lila-gif-moss.tar', 'w') as archive:
            archive.add(MOSS_PATCH, arcname=MOSS_PATCH.name)
            for name in PIN['mossSprites']:
                archive.add(working / name, arcname=name)
        for action in ('test', 'build'):
            subprocess.run(['cargo', '+' + PIN['rustVersion'], action, '--locked',
                            '--target', PIN['target'], '--jobs', '2', *(['--release'] if action == 'build' else [])],
                           cwd=working, check=True)
        shutil.copyfile(working / 'target' / PIN['target'] / 'release/lila-gif', output / 'lila-gif')
    (output / 'lila-gif').chmod(0o755)
    receipt = {**PIN, 'formatVersion': 1, 'rustc': rustc,
               'generatedSprites': generated, 'mossSourceSha256': digest(output / 'lila-gif-moss.tar'),
               'binarySha256': digest(output / 'lila-gif')}
    (output / 'BUILD.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return verify(output)


def stage(artifact, destination):
    """Copy a verified build into a new immutable root-owned release directory."""
    receipt = verify(artifact)
    destination.mkdir(mode=0o755)
    destination.chmod(0o755)
    os.chown(destination, 0, 0)
    for name in FILES:
        path = destination / name
        shutil.copyfile(artifact / name, path)
        os.chown(path, 0, 0)
        path.chmod(0o755 if name == 'lila-gif' else 0o644)
    if verify(destination) != receipt:
        raise ValueError('Renderer artifact changed during installation')
    return receipt


def verify_installed(artifact):
    receipt = verify(artifact)
    for path in [artifact, *[artifact / name for name in FILES]]:
        metadata = path.stat()
        if metadata.st_uid != 0 or metadata.st_gid != 0 or metadata.st_mode & 0o022:
            raise ValueError('Installed renderer must be root-owned and not group/world writable: ' + str(path))
    if not artifact.stat().st_mode & 0o001:
        raise ValueError('Installed renderer directory must be traversable by its service identity')
    if (artifact / 'lila-gif').stat().st_mode & 0o005 != 0o005:
        raise ValueError('Installed renderer binary must be readable and executable by its service identity')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    build = commands.add_parser('prepare', help='Explicitly build/test official source; no installation')
    build.add_argument('source', type=Path)
    build.add_argument('output', type=Path)
    check = commands.add_parser('verify', help='Check an existing artifact without executing its binary')
    check.add_argument('artifact', type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.source.resolve(), args.output.absolute()) if args.command == 'prepare'
                     else verify(args.artifact), indent=2))
