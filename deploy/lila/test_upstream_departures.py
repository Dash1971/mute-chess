import copy
import importlib.util
import json
from pathlib import Path
import unittest
import subprocess
import tempfile
from unittest.mock import patch

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
spec = importlib.util.spec_from_file_location("upstream_check", HERE / "check-upstream.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class DepartureRegisterTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((HERE / "upstream-departures.json").read_text())
        # Test register errors without network access. CI separately checks the
        # real fork diff; test_native_fork exercises that Git operation directly.
        paths = {"app/Hook.scala", "app/Service.scala", "modules/game/Guard.scala"}
        self.manifest["repositories"][0]["areas"] = [
            {"id": "hook", "rationale": "Native hook", "verification": ["native tests"], "files": ["app/Hook.scala", "app/Service.scala"]},
            {"id": "guard", "rationale": "Admission guard", "verification": ["guard tests"], "files": ["modules/game/Guard.scala"]},
        ]
        mock = patch.object(check, "native_files", return_value=paths)
        mock.start()
        self.addCleanup(mock.stop)

    def test_register_covers_fixture_and_remaining_websocket_patch(self):
        result = check.validate(self.manifest, ROOT)
        self.assertEqual(set(result), {"lila", "lila-ws"})

    def test_removing_a_documented_file_catches_undocumented_native_changes(self):
        self.manifest["repositories"][0]["areas"][0]["files"].pop()
        with self.assertRaisesRegex(ValueError, "undocumented native files"):
            check.validate(self.manifest, ROOT)

    def test_obsolete_or_duplicate_entries_are_rejected(self):
        repo = self.manifest["repositories"][0]
        repo["areas"][0]["files"].append("app/RetiredCustomService.scala")
        with self.assertRaisesRegex(ValueError, "stale entries"):
            check.validate(self.manifest, ROOT)
        repo["areas"][0]["files"].pop()
        repo["areas"][0]["files"].append(repo["areas"][1]["files"][0])
        with self.assertRaisesRegex(ValueError, "Duplicate registered"):
            check.validate(self.manifest, ROOT)

    def test_pins_and_explanations_cannot_silently_disappear(self):
        original = copy.deepcopy(self.manifest)
        self.manifest["repositories"][0]["revision"] = "0" * 40
        with self.assertRaisesRegex(ValueError, "pin disagrees"):
            check.validate(self.manifest, ROOT)
        original["repositories"][0]["areas"][0]["rationale"] = ""
        with self.assertRaisesRegex(ValueError, "Missing rationale"):
            check.validate(original, ROOT)

    def test_path_wildcards_and_ambiguous_renames_require_explicit_review(self):
        for path in ["../outside", "/absolute", "modules/**", "ui/*.ts"]:
            with self.assertRaises(ValueError):
                check.relative_path(path)
        with self.assertRaisesRegex(ValueError, "renamed"):
            check.patch_files("diff --git a/old.scala b/new.scala\n")

    def test_copied_functions_require_review_when_upstream_source_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(["git", "-C", directory, *args], text=True).strip()
            git("init", "--quiet")
            source = root / "Source.scala"
            source.write_text("original upstream function\n")
            git("add", "Source.scala")
            git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "old")
            old = git("rev-parse", "HEAD")
            blob = git("rev-parse", "HEAD:Source.scala")
            area = {"files": ["NoSweatCopy.scala"], "derivedCopies": {
                "NoSweatCopy.scala": {"derivedFrom": "Source.scala", "upstreamBlob": blob}}}
            repo = {"areas": [area]}
            check.validate_derived_copies(repo, {"upstreamBase": old}, root)
            source.write_text("upstream security fix\n")
            git("add", "Source.scala")
            git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "new")
            pin = {"upstreamBase": git("rev-parse", "HEAD")}
            with self.assertRaisesRegex(ValueError, "Upstream source changed for NoSweatCopy"):
                check.validate_derived_copies(repo, pin, root)
            area["derivedCopies"]["NoSweatCopy.scala"]["upstreamBlob"] = git("rev-parse", "HEAD:Source.scala")
            check.validate_derived_copies(repo, pin, root)
            area["files"] = []
            with self.assertRaisesRegex(ValueError, "Unregistered derived copy"):
                check.validate_derived_copies(repo, pin, root)


if __name__ == "__main__":
    unittest.main()
