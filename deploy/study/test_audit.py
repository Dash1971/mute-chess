import copy
import json
from pathlib import Path
import tempfile
import unittest

from audit import audit_predecessor
from continuation import FILES, ORIGINAL_MAIN, RUN

PGN = '[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1\n'
MOVES = ['f2f3', 'e7e5', 'g2g4', 'd8h4']


class CompleteIntegrityAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.game = 'AbCd0123'
        self.record = {'id': self.game, 'white': 'a', 'black': 'b', 'speed': 'blitz', 'state': 'finished',
                       'result': {'status': 'mate', 'winner': 'black', 'plies': 4, 'ratedUpdate': True}}
        self.checkpoint = {'run': RUN, 'main': ORIGINAL_MAIN,
                           'latest': {'admitted': 1, 'records': [self.record]}}
        self.events = [{'type': 'move', 'id': self.game, 'ply': ply, 'move': move}
                       for ply, move in enumerate(MOVES)]
        for name in FILES:
            (self.root/name).write_text('{}')
        self.write()
        (self.root/(self.game+'.pgn')).write_text(PGN)

    def write(self):
        (self.root/'checkpoint.json').write_text(json.dumps(self.checkpoint))
        (self.root/'events.jsonl').write_text(''.join(json.dumps(e)+'\n' for e in self.events))

    def test_legal_game_is_fully_bound_to_native_result_and_unique_acknowledgements(self):
        receipt = audit_predecessor(self.root)
        self.assertEqual(receipt['checkedFinishedGames'], 1)
        self.assertEqual(receipt['uniqueVerifiedPlies'], 4)
        self.assertEqual(receipt['acknowledgedPlies'], 4)
        self.assertEqual(receipt['errors'], [])
        self.assertEqual(receipt['dependencies'], {'chess': '1.11.2'})
        self.assertEqual(set(receipt['inputSha256']), set(FILES))
        self.assertIn('resources.jsonl', receipt['inputSha256'])
        self.assertEqual(set(receipt['sourceSha256']), {'audit.py', 'continuation.py'})

    def test_truncated_illegal_wrong_result_and_extra_game_pgns_fail(self):
        variants = [
            '[Result "0-1"]\n\n1. f3 e5 0-1\n',
            '[Result "0-1"]\n\n1. e5 0-1\n',
            PGN.replace('[Result "0-1"]', '[Result "1-0"]'),
            PGN+'\n'+PGN,
        ]
        for pgn in variants:
            with self.subTest(pgn=pgn):
                (self.root/(self.game+'.pgn')).write_text(pgn)
                with self.assertRaises(ValueError): audit_predecessor(self.root)

    def test_missing_duplicate_conflicting_and_wrong_acknowledgements_fail(self):
        original = copy.deepcopy(self.events)
        variants = [original[:-1], original+[original[0]],
                    original+[{**original[0], 'move': 'e2e4'}],
                    [{**original[0], 'move': 'e2e4'}, *original[1:]],
                    original+[{'type': 'move', 'id': 'unknown1', 'ply': 0, 'move': 'e2e4'}]]
        for events in variants:
            with self.subTest(events=events):
                self.events=events;self.write()
                with self.assertRaises(ValueError): audit_predecessor(self.root)

    def test_native_winner_or_terminal_position_disagreement_fails(self):
        original = copy.deepcopy(self.record)
        for change in [{'winner': 'white'}, {'status': 'stalemate'}, {'plies': 40}]:
            self.record['result'].update(change);self.write()
            with self.assertRaises(ValueError): audit_predecessor(self.root)
            self.record.clear();self.record.update(copy.deepcopy(original))
