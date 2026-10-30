import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
LOCATION = ROOT / 'deploy/calibration'
spec = importlib.util.spec_from_file_location('rating_plan', LOCATION / 'rating_plan.py')
model = importlib.util.module_from_spec(spec)
sys.modules['rating_plan'] = model
spec.loader.exec_module(model)
spec = importlib.util.spec_from_file_location('adjustment', LOCATION / 'adjust.py')
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)
COMMIT = 'a' * 40
DATE = '2026-10-30T10:00:00+00:00'


def fixture():
    roster = json.loads((ROOT / 'lila-adapter/roster.json').read_text())
    reference = json.loads((ROOT / 'docs/data/lichess-maia-adjustment-reference-2026-10-30.json').read_text())
    reference['retrievedAtUtc'] = DATE
    users, perfs = [], []
    for index, bot in enumerate(sorted(roster, key=lambda b: b['username'].lower())):
        user_id = bot['username'].lower()
        users.append({'_id': user_id, 'title': 'BOT', 'enabled': True, 'noSweatBot': True})
        document = {'_id': user_id, 'unrelatedFutureField': {'kept': [1, 2, 3]}}
        for speed in ('blitz', 'rapid', 'bullet', 'classical', 'ultraBullet', 'correspondence'):
            document[speed] = {'gl': {'r': model.double(1500 + index), 'd': model.double(120 if speed in
                               ('blitz', 'rapid') else 200), 'v': model.double(.09)},
                               'nb': {'$numberInt': '9' if speed in ('blitz', 'rapid') else '0'},
                               'la': {'$date': {'$numberLong': '1793350000000'}},
                               're': [{'$numberInt': '1498'}, {'$numberInt': '1490'}]}
        if index < 30:
            document['standard'] = copy.deepcopy(document['blitz'])
        perfs.append(document)
    return {'users': users, 'perfs': perfs, 'activeGames': 0}, roster, reference


class RatingPlanTests(unittest.TestCase):
    def setUp(self):
        self.snapshot, self.roster, self.reference = fixture()

    def build(self):
        return model.build(self.snapshot, self.roster, self.reference, COMMIT, DATE)

    def test_earned_translation_changes_only_rating_and_preserves_all_other_fields(self):
        plan = self.build()
        self.assertEqual(len(plan['rows']), 44)
        for row in plan['rows']:
            for speed in ('blitz', 'rapid'):
                expected = copy.deepcopy(row['before'][speed])
                expected['gl']['r'] = model.double(model.number(expected['gl']['r']) - 75)
                self.assertEqual(row['after'][speed], expected)
            for field in ('_id', 'unrelatedFutureField', 'ultraBullet', 'correspondence'):
                self.assertEqual(row['before'][field], row['after'][field])
            if 'standard' in row['before']:
                expected = copy.deepcopy(row['before']['standard'])
                expected['gl']['r'] = model.double(model.number(expected['gl']['r']) - 75)
                self.assertEqual(row['after']['standard'], expected)
        self.assertEqual(self.snapshot, fixture()[0])

    def test_unplayed_categories_use_adjusted_earned_anchor_plus_matched_speed_difference(self):
        row = next(r for r in self.build()['rows'] if r['name'] == 'Neon Rook')
        for speed, anchor in [('bullet', 'blitz'), ('classical', 'rapid')]:
            change = next(c for c in row['changes'] if c['speed'] == speed)
            self.assertFalse(change['reference']['fallback'])
            self.assertEqual(change['after'], model.number(row['before'][anchor]['gl']['r']) - 75 +
                             change['reference']['delta'])
            self.assertEqual(change['rdAfter'], 200)
            self.assertEqual(row['before'][speed]['nb'], row['after'][speed]['nb'])

    def test_played_bullet_keeps_earned_information_and_only_gets_common_shift(self):
        self.snapshot['perfs'][0]['bullet']['nb'] = {'$numberInt': '1'}
        self.snapshot['perfs'][0]['bullet']['gl']['d'] = model.double(145)
        row = self.build()['rows'][0]
        change = next(c for c in row['changes'] if c['speed'] == 'bullet')
        self.assertEqual(change['mode'], 'earned-rating-translation')
        self.assertIsNone(change['reference'])
        self.assertEqual(change['rdAfter'], 145)
        self.assertEqual(change['after'], change['before'] - 75)

    def test_unreliable_upper_accounts_use_visible_nearest_supported_offset_and_broad_rd(self):
        plan = self.build()
        for row in plan['rows']:
            bot = next(b for b in self.roster if b['username'].lower() == row['id'])
            if bot['conditioning_self'] < 2200:
                continue
            for c in row['changes']:
                if c['speed'] not in ('bullet', 'classical'):
                    continue
                self.assertEqual(c['reference']['used'], 'maia3-79m_2000')
                self.assertTrue(c['reference']['fallback'])
                self.assertGreaterEqual(c['rdAfter'], 300)

    def test_uncertain_unplayed_rd_is_never_lowered(self):
        self.snapshot['perfs'][0]['classical']['gl']['d'] = model.double(458)
        self.assertEqual(model.number(self.build()['rows'][0]['after']['classical']['gl']['d']), 458)

    def test_human_unmanaged_missing_or_extra_cohort_accounts_are_rejected(self):
        for field, value in [('title', None), ('noSweatBot', False), ('enabled', False)]:
            saved = copy.deepcopy(self.snapshot)
            self.snapshot['users'][0][field] = value
            with self.assertRaises(ValueError):
                self.build()
            self.snapshot = saved
        self.snapshot['users'].pop()
        with self.assertRaises(ValueError):
            self.build()

    def test_active_games_stale_references_and_out_of_bounds_values_fail_closed(self):
        self.snapshot['activeGames'] = 1
        with self.assertRaises(ValueError):
            self.build()
        self.snapshot['activeGames'] = 0
        self.reference['retrievedAtUtc'] = '2026-10-01T00:00:00+00:00'
        with self.assertRaises(ValueError):
            self.build()
        self.reference['retrievedAtUtc'] = DATE
        self.snapshot['perfs'][0]['blitz']['gl']['r'] = model.double(450)
        with self.assertRaisesRegex(ValueError, 'no clipping'):
            self.build()

    def test_reviewed_plan_cannot_be_edited_to_change_other_data_or_offset(self):
        plan = self.build()
        model.validate(plan, self.roster)
        for field, value in [('offset', -150), ('speeds', ['bullet'])]:
            changed = copy.deepcopy(plan)
            changed[field] = value
            with self.assertRaises(ValueError):
                model.validate(changed, self.roster)
        plan['rows'][0]['after']['blitz']['nb'] = {'$numberInt': '99'}
        with self.assertRaises(ValueError):
            model.validate(plan, self.roster)

    def test_preview_never_calls_live_database_or_systemctl(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name, value in [('snapshot', self.snapshot), ('roster', self.roster), ('reference', self.reference)]:
                (root / (name + '.json')).write_text(json.dumps(value))
            args = ['adjust.py', 'preview', '--commit', COMMIT, '--snapshot', str(root / 'snapshot.json'),
                    '--roster', str(root / 'roster.json'), '--reference', str(root / 'reference.json'),
                    '--output', str(root / 'output')]
            with patch.object(runtime, 'now', return_value=DATE), patch.object(sys, 'argv', args), \
                    patch.object(runtime, 'Live', side_effect=AssertionError('Live access')), patch('builtins.print'):
                runtime.main()
            plan = json.loads((root / 'output/plan.json').read_text())
            self.assertEqual(len(plan['rows']), 44)
            self.assertEqual(len((root / 'output/preview.csv').read_text().splitlines()), 207)

    def test_earned_correspondence_blocks_an_incomplete_aggregate_translation(self):
        self.snapshot['perfs'][0]['correspondence']['nb'] = {'$numberInt': '1'}
        with self.assertRaisesRegex(ValueError, 'Correspondence'):
            self.build()

    def test_live_root_and_maintenance_guards_fail_before_writes(self):
        with patch.object(runtime.os, 'geteuid', return_value=501):
            with self.assertRaisesRegex(ValueError, 'Root'):
                runtime.Live(COMMIT)
        with patch.object(runtime, 'command', return_value='LoadState=loaded\nActiveState=active'):
            with self.assertRaisesRegex(ValueError, 'Stop public writers'):
                runtime.maintenance()


if __name__ == '__main__':
    unittest.main()
