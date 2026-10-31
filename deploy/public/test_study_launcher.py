import importlib.util
import copy
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1]/'study/run-public.py'
spec = importlib.util.spec_from_file_location('study_launcher', SOURCE)
launcher = importlib.util.module_from_spec(spec)
sys.path.insert(0, str(SOURCE.parent))
try:
    spec.loader.exec_module(launcher)
finally:
    sys.path.pop(0)


class StudyLauncherTests(unittest.TestCase):
    def test_experiment_is_selectable_with_the_approved_worker_budget(self):
        self.assertEqual(launcher.PROFILES['strength-predictor-v1'],
            {'workers': 2, 'cpu': '400%', 'memory': '2000M'})
        result = subprocess.run([sys.executable, str(SOURCE), '--help'], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0)
        for profile in launcher.PROFILES:
            self.assertIn(profile, result.stdout)

    def test_new_profile_preserves_budget_and_all_old_dates(self):
        self.assertEqual(launcher.PROFILES[launcher.ESTABLISHMENT_PROFILE],
                         {'workers': 2, 'cpu': '400%', 'memory': '2000M'})
        now = launcher.ESTABLISHMENT_START
        for name in ('pilot-10-v1', 'ramp-22-v1', 'calibration-200-v1'):
            self.assertEqual(launcher.dated_limits(name, 'newrun', now), (now+75*60000, now+90*60000))
        old_start = int(dt.datetime.fromisoformat('2026-10-31T03:00:00+00:00').timestamp()*1000)
        self.assertEqual(launcher.dated_limits('strength-predictor-v1', 'oldrun', old_start), (
            int(dt.datetime.fromisoformat('2026-10-31T10:04:39+00:00').timestamp()*1000),
            int(dt.datetime.fromisoformat('2026-10-31T10:34:39+00:00').timestamp()*1000)))
        self.assertEqual(launcher.dated_limits(launcher.CONTINUATION_PROFILE, 'oldrun', old_start),
                         (launcher.CONTINUATION_ADMISSION_END, launcher.CONTINUATION_DEADLINE))

    def test_new_run_and_preparation_window_are_exact_and_never_slide(self):
        expected = (launcher.ESTABLISHMENT_ADMISSION_END, launcher.ESTABLISHMENT_DEADLINE)
        for now in (launcher.ESTABLISHMENT_START, launcher.ESTABLISHMENT_START+3*3600000,
                    launcher.ESTABLISHMENT_ADMISSION_END-1):
            self.assertEqual(launcher.dated_limits(launcher.ESTABLISHMENT_PROFILE, launcher.ESTABLISHMENT_RUN, now), expected)
        self.assertEqual(launcher.ESTABLISHMENT_DEADLINE-launcher.ESTABLISHMENT_START, 8*3600000)
        for now in (launcher.ESTABLISHMENT_START-1, launcher.ESTABLISHMENT_ADMISSION_END,
                    launcher.ESTABLISHMENT_DEADLINE):
            with self.assertRaises(RuntimeError):
                launcher.dated_limits(launcher.ESTABLISHMENT_PROFILE, launcher.ESTABLISHMENT_RUN, now)
        with self.assertRaises(RuntimeError):
            launcher.dated_limits(launcher.ESTABLISHMENT_PROFILE, 'r20261031p137', launcher.ESTABLISHMENT_START)

    def test_backup_flag_cannot_be_omitted_or_used_for_old_profiles(self):
        base = [sys.executable, str(SOURCE), '--public-ratings', '--run', launcher.ESTABLISHMENT_RUN,
                '--commit', 'a'*40]
        result = subprocess.run(base+['--profile', launcher.ESTABLISHMENT_PROFILE], text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('requires its own fresh backup receipt', result.stderr)
        result = subprocess.run(base+['--profile', 'pilot-10-v1', '--fresh-backup-receipt', 'unused.json'],
                                text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('old profiles do not accept', result.stderr)

    def test_commands_have_a_bounded_timeout(self):
        with patch.object(launcher.subprocess, 'run') as run:
            run.return_value.stdout = 'ok\n'
            self.assertEqual(launcher.command('true'), 'ok')
            self.assertEqual(run.call_args.kwargs['timeout'], 30)


class EstablishmentPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.release = self.root/'release'
        adapter = self.release/'lila-adapter'
        adapter.mkdir(parents=True)
        for name in ('roster.json', 'experiment-roster.json', 'experiment-manifest.json'):
            target = adapter/name
            target.write_bytes((SOURCE.parents[2]/'lila-adapter'/name).read_bytes())
            target.chmod(0o644)
        self.roster, self.manifest = launcher.validate_establishment_source(self.release)
        self.users = [{'_id': b['username'].lower(), 'noSweatBot': True, 'title': 'BOT', 'enabled': True,
                       'noSweatSeedVersion': 'synthetic-already-initialized'} for b in self.roster]
        self.perfs = [{'_id': u['_id'], **{speed: {'gl': {'r': 1500., 'd': 140., 'v': .09}, 'nb': 12}
                        for speed in ('blitz', 'rapid')}} for u in self.users]
        self.now = launcher.ESTABLISHMENT_START+6*60000
        self.backup_root = self.root/'backups'
        self.backup_root.mkdir()
        self.cipher = self.backup_root/'synthetic.enc'
        self.cipher.write_bytes(b'synthetic ciphertext-size/hash fixture; not a database backup')
        sha = hashlib.sha256(self.cipher.read_bytes()).hexdigest()
        utc = lambda value: dt.datetime.fromtimestamp(value/1000, dt.timezone.utc).isoformat()
        self.receipt = {'schemaVersion': 'night163-prelaunch-backup-v1', 'runId': launcher.ESTABLISHMENT_RUN,
            'profile': launcher.ESTABLISHMENT_PROFILE, 'targetMain': 'a'*40, 'previousMain': 'b'*40,
            'rosterSha256': launcher.ESTABLISHMENT_ROSTER_SHA256, 'splitSha256': launcher.ESTABLISHMENT_SPLIT_SHA256,
            'nativeBotPerfsSha256': launcher.validate_native_bots(self.roster, self.users, self.perfs),
            'completedAtUtc': utc(self.now-60000), 'offHostVerifiedAtUtc': utc(self.now-10000),
            'consistent': True, 'databaseUnlockedVerified': True, 'offHostVerified': True,
            'encryptedSnapshotSha256': sha, 'offHostCopySha256': sha,
            'encryptedSnapshotPath': str(self.cipher), 'encryptedSnapshotBytes': self.cipher.stat().st_size}
        self.path = self.root/'backup.json'
        self.write_receipt()

    def write_receipt(self):
        self.path.write_text(json.dumps(self.receipt))
        self.path.chmod(0o600)

    def load(self):
        return launcher.load_fresh_backup(self.path, 'a'*40, self.now,
            expected_uid=os.getuid(), backup_root=self.backup_root)

    def test_approved_source_raw_perfs_and_backup_validate_without_mutation(self):
        before = copy.deepcopy((self.roster, self.users, self.perfs, self.receipt))
        backup = self.load()
        fingerprint = launcher.verify_establishment_snapshot(self.roster, self.users, self.perfs, backup)
        self.assertEqual(fingerprint, self.receipt['nativeBotPerfsSha256'])
        self.assertEqual(before, (self.roster, self.users, self.perfs, self.receipt))
        query = launcher.native_perfs_query(self.roster)
        self.assertIn('db.user_perf.find', query)
        self.assertIn('.sort({_id:1}).toArray()', query)
        self.assertNotIn('update', query)
        self.assertNotIn('Glicko', query)

    def test_source_policy_and_mode_changes_refuse(self):
        path = self.release/'lila-adapter/roster.json'
        original = path.read_bytes()
        value = json.loads(original)
        value[0]['personality']['history'] = not value[0]['personality']['history']
        path.write_text(json.dumps(value))
        with self.assertRaisesRegex(RuntimeError, 'policy/split hashes changed'):
            launcher.validate_establishment_source(self.release)
        path.write_bytes(original)
        path.chmod(0o600)
        with self.assertRaisesRegex(RuntimeError, 'regular0644'):
            launcher.validate_establishment_source(self.release)

    def test_existing_native_earned_results_and_seed_flags_cannot_be_replaced(self):
        changed = copy.deepcopy(self.perfs)
        changed[0]['blitz']['gl']['r'] += 1
        with self.assertRaisesRegex(RuntimeError, 'never restore/reseed'):
            launcher.verify_establishment_snapshot(self.roster, self.users, changed, self.receipt)
        missing = copy.deepcopy(self.users)
        missing[0].pop('noSweatSeedVersion')
        with self.assertRaisesRegex(RuntimeError, 'seed metadata'):
            launcher.validate_native_bots(self.roster, missing, self.perfs)
        with self.assertRaisesRegex(RuntimeError, 'Exactly250'):
            launcher.validate_native_bots(self.roster, self.users, self.perfs[:-1])

    def test_backup_run_source_freshness_hash_and_proof_fail_closed(self):
        mutations = [
            lambda d: d.update(runId='r20261031p137'), lambda d: d.update(profile='strength-predictor-v1'),
            lambda d: d.update(targetMain='c'*40), lambda d: d.update(rosterSha256='0'*64),
            lambda d: d.update(splitSha256='0'*64), lambda d: d.update(consistent=False),
            lambda d: d.update(databaseUnlockedVerified=False), lambda d: d.update(offHostVerified=False),
            lambda d: d.update(offHostCopySha256='0'*64), lambda d: d.update(encryptedSnapshotBytes=1),
            lambda d: d.update(completedAtUtc='2026-10-31T13:00:00Z'),
            lambda d: d.update(offHostVerifiedAtUtc='2026-10-31T14:00:00Z'),
        ]
        original = copy.deepcopy(self.receipt)
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                self.receipt = copy.deepcopy(original)
                mutate(self.receipt)
                self.write_receipt()
                with self.assertRaises(RuntimeError):
                    self.load()
        self.receipt = original
        self.write_receipt()
        self.cipher.write_bytes(self.cipher.read_bytes().replace(b'fixture', b'FIXTURE'))
        with self.assertRaisesRegex(RuntimeError, 'snapshot bytes changed'):
            self.load()

    def test_backup_owner_and_writable_modes_refuse(self):
        self.path.chmod(0o660)
        with self.assertRaisesRegex(RuntimeError, 'root-owned'):
            self.load()
        self.path.chmod(0o600)
        with self.assertRaisesRegex(RuntimeError, 'root-owned'):
            launcher.load_fresh_backup(self.path, 'a'*40, self.now,
                expected_uid=os.getuid()+1, backup_root=self.backup_root)

    def test_raw_fingerprint_is_order_stable_without_api_rd_adjustment(self):
        self.assertEqual(launcher.validate_native_bots(self.roster, self.users, self.perfs),
                         launcher.validate_native_bots(self.roster, list(reversed(self.users)), list(reversed(self.perfs))))
        a = {'x': 1.0, 'y': {'z': 2}}
        b = {'y': {'z': 2.0}, 'x': 1}
        self.assertEqual(launcher.json_digest(a), launcher.json_digest(b))

    def test_protected_modes_are_actual_under_root_style_umask(self):
        output = self.root/'output'
        previous = os.umask(0o077)
        calls = []
        try:
            output.mkdir(mode=0o750)
            launcher.protected_output_files(output, os.getgid(), {'receipt.json': {'ok': True}},
                chown=lambda *args: calls.append(args))
        finally:
            os.umask(previous)
        self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o1770)
        self.assertEqual(stat.S_IMODE((output/'receipt.json').stat().st_mode), 0o640)
        self.assertEqual(calls[0], (output, 0, os.getgid()))
