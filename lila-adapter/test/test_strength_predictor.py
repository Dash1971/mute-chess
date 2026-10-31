import json
from pathlib import Path
import unittest

from strength_predictor import fit, evaluate, features


ROOT = Path(__file__).resolve().parents[1]


class PredictorTests(unittest.TestCase):
    def test_unseen_configurations_and_no_heldout_label_leakage(self):
        roster = json.loads((ROOT/'roster.json').read_text()) + json.loads((ROOT/'experiment-roster.json').read_text())
        manifest = json.loads((ROOT/'experiment-manifest.json').read_text())
        ratings = {}
        for b in roster:
            e=(b['conditioning_self']-1600)/1000
            t,p=b['temperature_after_opening'],b['top_p_after_opening']
            h=b['personality']['history']
            value=1500+600*e+160*(1-t)+90*(1-p)+80*h
            ratings[b['id']]={s:{'rating':value,'rd':75,'games':30} for s in ('blitz','rapid')}
        # Synthetic labels exercise prediction plumbing, never rating evidence.
        model=fit(roster,manifest,ratings)
        for identity in manifest['heldoutIds']:
            for speed in ('blitz','rapid'):
                ratings[identity][speed]['rating'] += 5000
        again=fit(roster,manifest,ratings)
        self.assertEqual(model,again)
        sample=roster[50].copy();sample['temperature_after_opening']=0;sample['top_p_after_opening']=1
        other={**sample,'temperature_after_opening':1,'top_p_after_opening':0}
        self.assertEqual(features(sample,'interaction'),features(other,'interaction'))

    def test_missing_training_coverage_fails_closed(self):
        roster = json.loads((ROOT/'roster.json').read_text()) + json.loads((ROOT/'experiment-roster.json').read_text())
        manifest = json.loads((ROOT/'experiment-manifest.json').read_text())
        ratings={b['id']:{s:{'rating':1500,'rd':300,'games':0} for s in ('blitz','rapid')} for b in roster}
        with self.assertRaises(ValueError):
            fit(roster,manifest,ratings)
