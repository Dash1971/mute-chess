import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('ws_source', Path(__file__).with_name('ws-source.py'))
ws = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ws)


class WebSocketSourceTests(unittest.TestCase):
    def test_verification_includes_new_source_and_rejects_tracked_or_untracked_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'ws'
            root.mkdir()
            git = ['git', '-C', str(root)]
            env = dict(os.environ, GIT_AUTHOR_NAME='Fixture', GIT_AUTHOR_EMAIL='fixture@example.invalid',
                       GIT_COMMITTER_NAME='Fixture', GIT_COMMITTER_EMAIL='fixture@example.invalid')

            def run(*args):
                return subprocess.check_output(git + list(args), env=env)

            run('init', '--quiet')
            tracked = root / 'source.scala'
            tracked.write_text('upstream\n')
            run('add', '.')
            run('commit', '--quiet', '-m', 'Upstream')
            tracked.write_text('reviewed change\n')
            added = root / 'test.scala'
            added.write_text('reviewed regression\n')
            extra = subprocess.run(git + ['diff', '--no-index', '--binary', '--', '/dev/null', added.name],
                                   cwd=root, capture_output=True)
            self.assertEqual(extra.returncode, 1)
            expected = Path(directory) / 'reviewed.patch'
            expected.write_bytes(run('diff', '--binary', '--', '.') + extra.stdout)
            ws.verify(root, expected)
            added.write_text('unreviewed change\n')
            with self.assertRaisesRegex(ValueError, 'differs'):
                ws.verify(root, expected)
            added.write_text('reviewed regression\n')
            tracked.write_text('unreviewed source\n')
            with self.assertRaisesRegex(ValueError, 'differs'):
                ws.verify(root, expected)


if __name__ == '__main__':
    unittest.main()
