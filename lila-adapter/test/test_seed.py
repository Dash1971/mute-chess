import os
import unittest
from maia_worker import Engine

class SeedTests(unittest.TestCase):
    def test_replay_seed_and_history(self):
        engine = Engine(os.environ['MAIA_MODEL'])
        request = dict(moves=['e2e4', 'e7e5'], history=True, selfElo=1600,
                       opponentElo=1600, temperature=1, topP=.95, seed='ab12345678ef0001')
        self.assertEqual(engine.predict(request)['move'], engine.predict(request)['move'])
