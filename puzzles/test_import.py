import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('catalog_import',Path(__file__).with_name('import.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
CSV=b'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate\n00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,e8d7 a2e6 d7d8 f7f8,1760,80,83,172,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black#34,,\n'
class CatalogTests(unittest.TestCase):
    def test_source_metadata_and_native_paths(self):
        rows=list(module.records(CSV));puzzle=rows[0]['value']
        self.assertEqual(puzzle['gameId'],'yyznGmXs');self.assertEqual(puzzle['line'],'e8d7 a2e6 d7d8 f7f8')
        self.assertEqual(puzzle['glicko']['r'],1760);self.assertNotIn('players',puzzle)
        paths=[r['value'] for r in rows if r['kind']=='path']
        self.assertEqual(len(paths),15)
        for path in paths:
            self.assertEqual(path['ids'],['00sHx'])
            prefix='|'.join(path['_id'].split('|')[:2])+'|'
            self.assertEqual(path['min'],prefix+'0000');self.assertEqual(path['max'],prefix+'9999')
    def test_invalid_source_rejected(self):
        with self.assertRaises(ValueError): list(module.records(CSV.replace(b'https://lichess.org/',b'https://example.com/')))
if __name__=='__main__':unittest.main()
