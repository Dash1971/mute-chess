import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("native_fork", HERE / "native-fork.py")
fork = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fork)


class NativeForkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "source"
        self.root.mkdir()
        self.env = dict(os.environ, GIT_AUTHOR_NAME="Fixture", GIT_AUTHOR_EMAIL="fixture@example.invalid",
                        GIT_COMMITTER_NAME="Fixture", GIT_COMMITTER_EMAIL="fixture@example.invalid")
        self.git("init", "--quiet")
        self.write("app/source.scala", "upstream\n")
        self.write("ui/@types/lichess/i18n.d.ts", "interface I18n {\n}\n")
        self.write("translation/source/site.xml", '<resources><string name="muteHello">Hello</string></resources>')
        self.network = b"verified network fixture"
        for name in fork.NETWORKS:
            self.write(name, "version https://git-lfs.github.com/spec/v1\noid sha256:" +
                       hashlib.sha256(self.network).hexdigest() + "\nsize " + str(len(self.network)) + "\n")
        self.base = self.commit("Upstream")
        self.write("app/source.scala", "native\n")
        self.write(fork.WORKFLOW, "name: Native checks\n")
        self.head = self.commit("Native")
        self.pin = {"repository": "https://github.com/Dash1971/lila", "commit": self.head, "upstreamBase": self.base}

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], env=self.env,
                                       stderr=subprocess.DEVNULL).decode().strip()

    def write(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value) if isinstance(value, str) else path.write_bytes(value)

    def commit(self, message):
        self.git("add", ".")
        self.git("commit", "--quiet", "-m", message)
        return self.git("rev-parse", "HEAD")

    def test_release_requires_exact_head_tree_and_upstream_base(self):
        identity = fork.verify_checkout(self.root, self.pin)
        release = dict(identity, upstreamLila=self.base)
        self.assertEqual(fork.verify_release(self.root, self.pin, release), identity)
        for field in ("nativeCommit", "nativeTree", "upstreamLila"):
            with self.assertRaisesRegex(ValueError, "identity differs"):
                fork.verify_release(self.root, self.pin, dict(release, **{field: "0" * 40}))
        with self.assertRaisesRegex(ValueError, "HEAD differs"):
            fork.verify_checkout(self.root, dict(self.pin, commit=self.base))

    def test_source_archive_must_identify_the_verified_mute_commit(self):
        path = Path(self.temp.name) / "source.tar"
        path.write_bytes(subprocess.check_output(["git", "-C", str(self.root), "archive", "--format=tar", self.head]))
        fork.verify_mute_archive(path, self.head)
        with self.assertRaisesRegex(ValueError, "archive differs"):
            fork.verify_mute_archive(path, self.base)

    def test_rejects_tracked_staged_and_untracked_source_changes(self):
        self.write("app/source.scala", "unexpected\n")
        with self.assertRaisesRegex(ValueError, "unapproved changes"):
            fork.verify_checkout(self.root, self.pin)
        self.git("add", "app/source.scala")
        with self.assertRaisesRegex(ValueError, "unapproved changes"):
            fork.verify_checkout(self.root, self.pin)
        self.git("reset", "--hard", self.head)
        self.write("app/extra.scala", "unexpected\n")
        with self.assertRaisesRegex(ValueError, "unapproved changes"):
            fork.verify_checkout(self.root, self.pin)

    def test_generated_assets_are_narrowly_allowed_and_lfs_bytes_verified(self):
        self.write("public/nosweat/nostr.js", "generated bundle")
        self.write("public/nosweat/analysis/core.js", "source verified by existing analysis-assets.py")
        for name in fork.NETWORKS:
            self.write(name, self.network)
        fork.verify_checkout(self.root, self.pin)
        self.write(fork.NETWORKS[0], b"x" * len(self.network))
        with self.assertRaisesRegex(ValueError, "network differs"):
            fork.verify_checkout(self.root, self.pin)
        self.write(fork.NETWORKS[0], self.network)
        self.write("public/nosweat/unapproved.js", "must not be hidden")
        with self.assertRaisesRegex(ValueError, "unapproved changes"):
            fork.verify_checkout(self.root, self.pin)

    def test_checkout_reuses_only_verified_generated_changes_without_discarding_them(self):
        destination = Path(self.temp.name) / "checkout"
        fork.checkout(destination, self.pin, str(self.root))
        bundle = destination / "public/nosweat/nostr.js"
        bundle.parent.mkdir(parents=True)
        bundle.write_text("keep generated bundle")
        fork.checkout(destination, self.pin, str(self.root))
        self.assertEqual(bundle.read_text(), "keep generated bundle")
        source = destination / "app/source.scala"
        source.write_text("do not discard")
        with self.assertRaisesRegex(ValueError, "unapproved changes"):
            fork.checkout(destination, self.pin, str(self.root))
        self.assertEqual(source.read_text(), "do not discard")

    def test_file_inventory_uses_git_diff_with_only_the_approved_workflow_exception(self):
        self.assertEqual(fork.changed_files(self.root, self.pin), {"app/source.scala"})
        self.write("app/Unregistered.scala", "must be registered\n")
        self.write(".github/workflows/other.yml", "not exempt\n")
        head = self.commit("New files")
        self.assertEqual(fork.changed_files(self.root, dict(self.pin, commit=head)),
                         {"app/source.scala", "app/Unregistered.scala", ".github/workflows/other.yml"})
        self.git("mv", "app/source.scala", "app/Moved.scala")
        head = self.commit("Move source")
        self.assertEqual(fork.changed_files(self.root, dict(self.pin, commit=head)),
                         {"app/source.scala", "app/Moved.scala", "app/Unregistered.scala", ".github/workflows/other.yml"})

    def test_generated_declarations_are_checked_before_restoring(self):
        path = self.root / "ui/@types/lichess/i18n.d.ts"
        bootstrap = path.read_text()
        generated = bootstrap.replace("}\n", "    /** Hello */\n    muteHello: string;\n}\n")
        path.write_text(generated)
        fork.restore_generated_i18n(self.root)
        self.assertEqual(path.read_text(), bootstrap)
        path.write_text(generated + "unexpected source change\n")
        with self.assertRaisesRegex(ValueError, "beyond the expected"):
            fork.restore_generated_i18n(self.root)
        self.assertTrue(path.read_text().endswith("unexpected source change\n"))


if __name__ == "__main__":
    unittest.main()
