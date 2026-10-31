import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('gif_renderer', Path(__file__).with_name('gif-renderer.py'))
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class GifRendererTests(unittest.TestCase):
    def fixture(self, root):
        binary = b'\x7fELF\x02\x01' + b'\0' * 12 + b'\x3e\x00' + b'test ELF payload'
        source = b'pinned upstream source archive'
        patch_data = b'reviewed moss extension'
        sprite_data = b'GIF89a fixture'
        pin = {**renderer.PIN, 'sourceSha256': hashlib.sha256(source).hexdigest(),
               'mossPatchSha256': hashlib.sha256(patch_data).hexdigest()}
        receipt = {**pin, 'formatVersion': 1, 'binarySha256': hashlib.sha256(binary).hexdigest()}
        artifact = root / 'artifact'
        artifact.mkdir()
        for name, content in [('lila-gif', binary), ('lila-gif-upstream.tar', source),
                              ('BUILD.json', json.dumps(receipt).encode())]:
            (artifact / name).write_bytes(content)
        with tarfile.open(artifact / 'lila-gif-moss.tar', 'w') as archive:
            for name, data in [(renderer.MOSS_PATCH.name, patch_data),
                               *[(name, sprite_data) for name in pin['mossSprites']]]:
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
        receipt['generatedSprites'] = {name: hashlib.sha256(sprite_data).hexdigest() for name in pin['mossSprites']}
        receipt['mossSourceSha256'] = renderer.digest(artifact / 'lila-gif-moss.tar')
        (artifact / 'BUILD.json').write_text(json.dumps(receipt))
        return artifact, pin, receipt

    def test_verification_rejects_changed_source_binary_toolchain_and_unexpected_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            artifact, pin, receipt = self.fixture(Path(temporary))
            with patch.object(renderer, 'PIN', pin):
                self.assertEqual(renderer.verify(artifact), receipt)
                for name in ('lila-gif', 'lila-gif-upstream.tar', 'lila-gif-moss.tar'):
                    original = (artifact / name).read_bytes()
                    (artifact / name).write_bytes(original + b'tampered')
                    with self.assertRaisesRegex(ValueError, 'differs'):
                        renderer.verify(artifact)
                    (artifact / name).write_bytes(original)
                changed = {**receipt, 'rustVersion': '1.0.0'}
                (artifact / 'BUILD.json').write_text(json.dumps(changed))
                with self.assertRaisesRegex(ValueError, 'toolchain pin'):
                    renderer.verify(artifact)
                (artifact / 'BUILD.json').write_text(json.dumps(receipt))
                missing = {**receipt, 'generatedSprites': dict(receipt['generatedSprites'])}
                missing['generatedSprites'].pop(pin['mossSprites'][0])
                (artifact / 'BUILD.json').write_text(json.dumps(missing))
                with self.assertRaisesRegex(ValueError, 'all 40'):
                    renderer.verify(artifact)
                (artifact / 'BUILD.json').write_text(json.dumps(receipt))
                (artifact / 'extra').write_text('unexpected')
                with self.assertRaisesRegex(ValueError, 'exactly'):
                    renderer.verify(artifact)

    def test_verification_never_executes_binary_and_rejects_wrong_platform_and_symlinks(self):
        with tempfile.TemporaryDirectory() as temporary:
            artifact, pin, receipt = self.fixture(Path(temporary))
            with patch.object(renderer, 'PIN', pin), patch.object(renderer.subprocess, 'run') as run:
                binary = artifact / 'lila-gif'
                binary.write_bytes(b'Mach-O binary from the Mac')
                receipt['binarySha256'] = renderer.digest(binary)
                (artifact / 'BUILD.json').write_text(json.dumps(receipt))
                with self.assertRaisesRegex(ValueError, 'Linux x86-64 ELF'):
                    renderer.verify(artifact)
                binary.unlink()
                binary.symlink_to(artifact / 'lila-gif-upstream.tar')
                with self.assertRaisesRegex(ValueError, 'linked'):
                    renderer.verify(artifact)
                run.assert_not_called()

    def test_release_staging_reverifies_content_and_sets_root_only_writable_modes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            artifact, pin, receipt = self.fixture(root)
            destination = root / 'release-gif'
            with patch.object(renderer, 'PIN', pin), patch.object(renderer.os, 'chown') as chown:
                self.assertEqual(renderer.stage(artifact, destination), receipt)
                self.assertEqual(renderer.verify(destination), receipt)
                self.assertEqual(chown.call_count, 5)
                for call in chown.call_args_list:
                    self.assertEqual(call.args[1:], (0, 0))
                self.assertEqual(stat.S_IMODE((destination / 'lila-gif').stat().st_mode), 0o755)
                for name in ('BUILD.json', 'lila-gif-upstream.tar', 'lila-gif-moss.tar'):
                    self.assertEqual(stat.S_IMODE((destination / name).stat().st_mode), 0o644)
                with self.assertRaises(FileExistsError):
                    renderer.stage(artifact, destination)

    def test_prepare_builds_only_verified_archive_with_locked_dependencies(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'source'
            source.mkdir()
            (source / 'Cargo.lock').write_text('locked dependencies')
            (source / 'build.rs').write_text('untracked code must never run')
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode='w') as archive:
                content = b'locked dependencies'
                info = tarfile.TarInfo('Cargo.lock')
                info.size = len(content)
                archive.addfile(info, io.BytesIO(content))
            source_tar = buffer.getvalue()
            pin = {**renderer.PIN, 'cargoLockSha256': renderer.digest(source / 'Cargo.lock'),
                   'sourceSha256': hashlib.sha256(source_tar).hexdigest()}
            moss_patch = root / renderer.MOSS_PATCH.name
            moss_patch.write_text('reviewed moss extension')
            pin['mossPatchSha256'] = renderer.digest(moss_patch)
            calls = []

            def output(command, **kwargs):
                if command[0] == 'rustc':
                    return 'rustc ' + pin['rustVersion'] + ' (pinned build)\n'
                if command[-1] == 'HEAD' and 'rev-parse' in command:
                    return (pin['commit'] + '\n').encode()
                if 'status' in command:
                    return b''
                if 'archive' in command:
                    return source_tar
                self.fail('Unexpected command: ' + repr(command))

            def build(command, cwd, check):
                calls.append(command)
                self.assertTrue(check)
                self.assertNotEqual(cwd, source)
                self.assertFalse((cwd / 'build.rs').exists(), 'untracked checkout files must be excluded')
                self.assertIn('--locked', command)
                self.assertEqual(command[command.index('--jobs') + 1], '2')
                if 'build' in command:
                    binary = cwd / 'target' / pin['target'] / 'release/lila-gif'
                    binary.parent.mkdir(parents=True)
                    binary.write_bytes(b'\x7fELF\x02\x01' + b'\0' * 12 + b'\x3e\x00')

            def generate(working):
                for name in pin['mossSprites']:
                    path = working / name
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(b'GIF89a fixture')
                return {name: renderer.digest(working / name) for name in pin['mossSprites']}

            with patch.object(renderer, 'PIN', pin), patch.object(renderer.os, 'geteuid', return_value=1000), \
                    patch.object(renderer.platform, 'system', return_value='Linux'), \
                    patch.object(renderer.platform, 'machine', return_value='x86_64'), \
                    patch.object(renderer, 'MOSS_PATCH', moss_patch), \
                    patch.object(renderer, 'generate_moss', side_effect=generate), \
                    patch.object(renderer.subprocess, 'check_output', side_effect=output), \
                    patch.object(renderer.subprocess, 'run', side_effect=build):
                artifact = root / 'artifact'
                receipt = renderer.prepare(source, artifact)
                self.assertEqual(receipt['sourceSha256'], pin['sourceSha256'])
                self.assertEqual([command[2] for command in calls], ['test', 'build'])
                self.assertIn('--release', calls[1])
                self.assertEqual(renderer.verify(artifact), receipt)

    def test_generation_is_pinned_and_refuses_changes_to_the_six_upstream_themes(self):
        with tempfile.TemporaryDirectory() as temporary:
            working = Path(temporary)
            sprites = working / 'theme/sprites'
            sprites.mkdir(parents=True)
            original = sprites / 'brown-cburnett.gif'
            original.write_bytes(b'original sprite')
            moss_patch = working / 'lila-gif-moss.patch'
            moss_patch.write_text('reviewed moss extension')
            pin = {**renderer.PIN, 'mossPatchSha256': renderer.digest(moss_patch)}
            changed_original = False

            def run(command, cwd, check):
                if 'make-sprites.py' in command:
                    self.assertEqual(command[-2:], ['--theme', 'quiet-signal'])
                    for name in pin['mossSprites']:
                        (working / name).write_bytes(b'GIF89a moss')
                    if changed_original:
                        original.write_bytes(b'overwritten sprite')

            with patch.object(renderer, 'PIN', pin), patch.object(renderer, 'MOSS_PATCH', moss_patch), \
                    patch.object(renderer.importlib.metadata, 'version', side_effect=lambda name: pin['generation'][name]), \
                    patch.object(renderer.subprocess, 'check_output', return_value=pin['generation']['resvg']), \
                    patch.object(renderer.subprocess, 'run', side_effect=run):
                self.assertEqual(set(renderer.generate_moss(working)), set(pin['mossSprites']))
                self.assertEqual(original.read_bytes(), b'original sprite')
                changed_original = True
                with self.assertRaisesRegex(ValueError, 'existing upstream sprite'):
                    renderer.generate_moss(working)

    def test_installed_renderer_requires_root_ownership_and_no_shared_write_access(self):
        receipt = {'binarySha256': 'verified'}
        for uid, gid, mode, allowed in [(0, 0, 0o100755, True), (1000, 0, 0o100755, False),
                                        (0, 1000, 0o100755, False), (0, 0, 0o100775, False),
                                        (0, 0, 0o100757, False)]:
            metadata = SimpleNamespace(st_uid=uid, st_gid=gid, st_mode=mode)
            with patch.object(renderer, 'verify', return_value=receipt), \
                    patch.object(Path, 'stat', return_value=metadata):
                if allowed:
                    self.assertEqual(renderer.verify_installed(Path('/installed/gif')), receipt)
                else:
                    with self.assertRaisesRegex(ValueError, 'root-owned'):
                        renderer.verify_installed(Path('/installed/gif'))

    def test_prepare_refuses_root_without_running_any_build_command(self):
        with patch.object(renderer.os, 'geteuid', return_value=0), \
                patch.object(renderer.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'never root'):
                renderer.prepare(Path('/source'), Path('/output'))
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
