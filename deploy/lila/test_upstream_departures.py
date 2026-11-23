import copy
import importlib.util
import json
from pathlib import Path
import unittest
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
        paths = check.patch_files((HERE / "patches/lila-nostr-maia.patch").read_text())
        mock = patch.object(check, "native_files", return_value=paths)
        mock.start()
        self.addCleanup(mock.stop)

    def test_current_register_covers_the_actual_native_patches(self):
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


if __name__ == "__main__":
    unittest.main()
