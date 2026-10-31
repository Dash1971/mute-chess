import copy
import json
import os
import stat
from pathlib import Path
import tempfile
import unittest

from audit import audit_predecessor

from continuation import (ADMISSION_END, DEADLINE, FILES, MODEL_VERSION, MODEL_SHA256, ORIGINAL_ADMISSION_END,
                          ORIGINAL_MAIN, RUN, compact_json_bytes, digest, validate_predecessor, continuation_storage_usage, copy_verified_evidence, create_protected_directory)

ROOT = Path(__file__).resolve().parents[2]


def js_numbers(value):
    if isinstance(value, dict):
        return {k: js_numbers(v) for k, v in value.items()}
    if isinstance(value, list):
        return [js_numbers(v) for v in value]
    return int(value) if isinstance(value, float) and value.is_integer() else value


class ContinuationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        roster = js_numbers(json.loads((ROOT/'lila-adapter/roster.json').read_text())+
                            json.loads((ROOT/'lila-adapter/experiment-roster.json').read_text()))
        manifest = json.loads((ROOT/'lila-adapter/experiment-manifest.json').read_text())
        self.records = [{'id': f'R{i:07d}', 'white': manifest['trainingIds'][0],
                         'black': manifest['trainingIds'][1] if i < 2000 else manifest['heldoutIds'][0],
                         'speed': 'blitz', 'state': 'finished',
                         'result': {'status': 'mate', 'winner': 'black', 'plies': 4,
                                    'whiteDiff': 0, 'blackDiff': 0, 'ratedUpdate': True}}
                        for i in range(2001)]
        model = {'version': MODEL_VERSION, 'rosterSha256': manifest['combinedRosterSha256'],
                 'trainingIds': manifest['trainingIds'], 'heldoutIds': manifest['heldoutIds'],
                 'speeds': {s: {'predictions': {b['id']: {'rating': 1500} for b in roster}}
                            for s in ('blitz', 'rapid')}}
        self.values = {'resources.jsonl': {'at': 1, 'health': {'status': 200, 'ms': 2}},
                       'combined-roster.json': roster, 'experiment-manifest.json': manifest,
                       'training-ratings.json': {b['id']: {} for b in roster}, 'frozen-predictor.json': model,
                       'checkpoint.json': {'run': RUN, 'main': ORIGINAL_MAIN, 'publicRatings': True,
                           'initial': {'profile': 'strength-predictor-v1', 'maximumAdmitted': 3000,
                                       'maximumConcurrency': 22, 'workerCount': 2, 'modelSha256': MODEL_SHA256,
                                       'admissionEnd': ORIGINAL_ADMISSION_END, 'deadline': ORIGINAL_ADMISSION_END+30*60000,
                                       'rosterSha256': manifest['combinedRosterSha256']},
                           'latest': {'closed': True, 'games': [], 'publicGames': 0, 'admitted': 2001,
                                      'records': self.records}},
                       'supervisor.json': {'run': RUN, 'commit': ORIGINAL_MAIN, 'profile': 'strength-predictor-v1',
                                           'reason': 'completed', 'configurationRestored': True,
                                           'ended': ORIGINAL_ADMISSION_END+1000}}
        self.write_values()
        frozen_hash = digest((self.root/'frozen-predictor.json').read_bytes())
        self.events = [{'type': 'start'}]
        for i, record in enumerate(self.records):
            if i == 2000:
                self.events.append({'type': 'predictions-frozen', 'admitted': 2000, 'heldout': 50,
                                    'sha256': frozen_hash})
            self.events.extend([{'type': 'admission', 'id': record['id'], 'white': record['white'],
                                 'black': record['black'], 'speed': record['speed'],
                                 'policies': {s: {'runId': RUN, 'addedHumanWait': False} for s in ('white', 'black')}},
                                *({'type': 'move', 'id': record['id'], 'ply': ply, 'move': move}
                                  for ply, move in enumerate(['f2f3', 'e7e5', 'g2g4', 'd8h4'])),
                                {'type': 'finish', **record}])
            # Synthetic persistence fixture, never a strength/calibration result.
            (self.root/(record['id']+'.pgn')).write_text('[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1\n')
        self.events.append({'type': 'end', 'completed': 2001})
        self.write_events()
        self.audit = audit_predecessor(self.root)

    def write_values(self):
        for name, value in self.values.items():
            (self.root/name).write_text(json.dumps(value, indent=2))

    def write_events(self):
        (self.root/'events.jsonl').write_text(''.join(json.dumps(e)+'\n' for e in self.events))

    def validate(self, **kw):
        return validate_predecessor(self.root, kw.get('run', RUN), kw.get('records', self.records),
                                    kw.get('now', ORIGINAL_ADMISSION_END+2000), kw.get('audit', self.audit))

    def test_accepts_only_clean_predecessor_without_writing_it(self):
        before = {name: (self.root/name).read_bytes() for name in FILES}
        receipt = self.validate()
        self.assertEqual(receipt['admittedAtResume'], 2001)
        self.assertEqual(receipt['maximumAdmitted'], 3000)
        self.assertEqual(receipt['deadline'], DEADLINE)
        self.assertEqual(len(receipt['predecessorPgnSha256']), 2001)
        self.assertEqual(before, {name: (self.root/name).read_bytes() for name in FILES})

    def test_failure_abort_source_and_budget_refusals(self):
        mutations = [
            ('supervisor.json', lambda d: d.update(reason='worker-failed')),
            ('supervisor.json', lambda d: d.update(reason='absolute-deadline')),
            ('supervisor.json', lambda d: d.update(configurationRestored=False)),
            ('checkpoint.json', lambda d: d.update(failure='history rollback')),
            ('checkpoint.json', lambda d: d.update(main='0'*40)),
            ('checkpoint.json', lambda d: d['latest'].update(closed=False)),
            ('checkpoint.json', lambda d: d['latest'].update(admitted=3000)),
            ('checkpoint.json', lambda d: d['latest'].update(admitted=1999)),
            ('checkpoint.json', lambda d: d['latest'].update(publicGames=1)),
            ('checkpoint.json', lambda d: d['latest']['records'][0].update(state='aborted')),
        ]
        for name, mutate in mutations:
            with self.subTest(file=name, mutation=mutate):
                original = copy.deepcopy(self.values[name])
                mutate(self.values[name]);self.write_values()
                with self.assertRaises(ValueError): self.validate()
                self.values[name] = original;self.write_values()
        for now in [ORIGINAL_ADMISSION_END-1, ADMISSION_END, DEADLINE]:
            with self.assertRaises(ValueError): self.validate(now=now)
        with self.assertRaises(ValueError): self.validate(run='differentrun')

    def test_model_native_record_event_and_pgn_tamper_refusals(self):
        changed = copy.deepcopy(self.records);changed[0]['result']['plies'] += 1
        with self.assertRaises(ValueError): self.validate(records=changed)
        (self.root/'frozen-predictor.json').write_text('{}')
        with self.assertRaises(ValueError): self.validate()
        self.write_values()
        pgn = self.root/(self.records[0]['id']+'.pgn');pgn.unlink()
        with self.assertRaises(ValueError): self.validate()
        pgn.write_text('fixture')
        self.events.insert(-1, {'type': 'checkpoint-error'})
        self.write_events()
        with self.assertRaises(ValueError): self.validate()

    def test_incomplete_unpinned_or_stale_integrity_receipt_is_refused(self):
        variants = [{}, {**self.audit, 'checkedFinishedGames': 2000},
                    {**self.audit, 'sourceSha256': {}},
                    {**self.audit, 'inputSha256': {}},
                    {**self.audit, 'errors': ['bad PGN']},
                    {**self.audit, 'dependencies': {'chess': 'other'}}]
        for audit in variants:
            with self.assertRaises(ValueError): self.validate(audit=audit)

    def test_whitespace_compaction_preserves_strings_and_original_numbers(self):
        raw = b'{\n "a": 1, "b": " \\\" hi ", "c": 0.00001\n}'
        self.assertEqual(compact_json_bytes(raw), b'{"a":1,"b":" \\\" hi ","c":0.00001}')


class StorageBudgetTests(unittest.TestCase):
    def test_continuation_counts_entire_database_and_both_physical_evidence_trees(self):
        self.assertEqual(continuation_storage_usage(700, 200, 300), 1200)
        self.assertGreater(continuation_storage_usage(1024**3-10, 6, 5), 1024**3)
        for values in [(-1, 2, 3), (1, None, 3), (True, 2, 3)]:
            with self.assertRaises(ValueError): continuation_storage_usage(*values)


class ProtectedEvidenceCopyTests(unittest.TestCase):
    def test_changed_bytes_or_symlink_are_refused_before_creating_readable_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory);source=root/'source';target=root/'target'
            source.write_bytes(b'known evidence')
            expected=digest(source.read_bytes())
            copy_verified_evidence(source,target,expected)
            self.assertEqual(target.read_bytes(),b'known evidence')
            with self.assertRaises(FileExistsError): copy_verified_evidence(source,target,expected)
            target.unlink();source.write_bytes(b'changed')
            with self.assertRaises(ValueError): copy_verified_evidence(source,target,expected)
            self.assertFalse(target.exists())
            link=root/'link';link.symlink_to(source)
            with self.assertRaises(OSError): copy_verified_evidence(link,target,digest(b'changed'))
            self.assertFalse(target.exists())


class ProtectedSnapshotDirectoryTests(unittest.TestCase):
    def test_actual_directory_mode_ignores_restrictive_supervisor_umask(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)/'predecessor'
            previous_umask = os.umask(0o077)
            try:
                with patch('continuation.os.chown') as ownership:
                    created = create_protected_directory(target, 1234)
            finally:
                os.umask(previous_umask)
            self.assertEqual(created, target)
            ownership.assert_called_once_with(target, 0, 1234)
            actual = stat.S_IMODE(target.stat().st_mode)
            self.assertEqual(actual, 0o750)
            self.assertEqual(actual & 0o070, 0o050)  # Worker group can read/traverse.
            self.assertEqual(actual & 0o022, 0)      # Worker/others cannot write.
            self.assertEqual(actual & 0o007, 0)      # Other accounts have no access.
            with self.assertRaises(FileExistsError): create_protected_directory(target, 1234)
