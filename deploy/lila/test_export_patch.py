import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("export_native", HERE / "export-patch.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ExportPatchTests(unittest.TestCase):
    def test_round_trip_binary_modes_deletions_and_only_the_workflow_exception(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            git = ["git", "-C", str(root)]
            env = dict(os.environ, GIT_AUTHOR_NAME="Fixture", GIT_AUTHOR_EMAIL="fixture@example.invalid",
                       GIT_COMMITTER_NAME="Fixture", GIT_COMMITTER_EMAIL="fixture@example.invalid")

            def run(*args):
                return subprocess.check_output(git + list(args), env=env, stderr=subprocess.DEVNULL)

            run("init", "--quiet")
            (root / "existing.txt").write_text("old\n")
            (root / "deleted.txt").write_text("delete me\n")
            run("add", ".")
            run("commit", "--quiet", "-m", "Upstream")
            base = run("rev-parse", "HEAD").decode().strip()
            (root / "existing.txt").write_text("new\n")
            (root / "deleted.txt").unlink()
            (root / "new.bin").write_bytes(b"\x00\xff\x00\x01")
            script = root / "new.sh"
            script.write_text("#!/bin/sh\nexit 0\n")
            script.chmod(0o755)
            expected = exporter.native_source.patch_for(root)
            run("add", ".")
            run("commit", "--quiet", "-m", "Native application")
            workflow = root / exporter.WORKFLOW
            workflow.parent.mkdir(parents=True)
            workflow.write_text("name: Mute checks\n")
            run("add", ".")
            run("commit", "--quiet", "-m", "GitHub test file")
            commit = run("rev-parse", "HEAD").decode().strip()
            # An unrelated CI file must remain in the application patch.
            extra = workflow.with_name("another.yml")
            extra.write_text("name: Must not be hidden\n")
            run("add", ".")
            run("commit", "--quiet", "-m", "Other file")
            with_other = run("rev-parse", "HEAD").decode().strip()
            (root / "existing.txt").write_text("Caller working copy must survive\n")
            global_config = root / "global.gitconfig"
            global_config.write_text("[core]\n\tabbrev = 12\n")
            before = run("status", "--porcelain")
            pin = {"repository": "https://github.com/Dash1971/lila", "commit": commit, "upstreamBase": base}
            with patch.dict(os.environ, {"GIT_CONFIG_GLOBAL": str(global_config)}):
                self.assertEqual(exporter.export_patch(pin, root), expected)
            self.assertIn(b".github/workflows/another.yml", exporter.export_patch(dict(pin, commit=with_other), root))
            self.assertEqual(run("status", "--porcelain"), before)
            self.assertEqual((root / "existing.txt").read_text(), "Caller working copy must survive\n")

    def test_pin_rejects_branch_names_missing_fields_and_extra_fields(self):
        valid = {"repository": "https://github.com/Dash1971/lila", "commit": "a" * 40, "upstreamBase": "b" * 40}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "pin.json"
            path.write_text(json.dumps(valid))
            self.assertEqual(exporter.read_pin(path), valid)
            for pin in [dict(valid, commit="main"), dict(valid, upstreamBase=None),
                        {"commit": "a" * 40}, dict(valid, ignored="not allowed")]:
                path.write_text(json.dumps(pin))
                with self.assertRaises(ValueError):
                    exporter.read_pin(path)


if __name__ == "__main__":
    unittest.main()
