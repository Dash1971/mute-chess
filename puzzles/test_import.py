import gzip
import hashlib
import importlib.util
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('catalog_import', Path(__file__).with_name('import.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CSV = b'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate\n00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,e8d7 a2e6 d7d8 f7f8,1760,80,83,172,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black#34,Italian_Game Italian_Game_Classical_Variation,1607774862751\n'


class CatalogTests(unittest.TestCase):
    def test_native_source_fields_and_openings_without_fabricated_players_or_static_paths(self):
        rows = list(module.records(io.StringIO(CSV.decode()), 'lichess-full-test'))
        self.assertEqual(len(rows), 1)
        puzzle = rows[0]['value']
        self.assertEqual(puzzle['gameId'], 'yyznGmXs')
        self.assertEqual(puzzle['line'], 'e8d7 a2e6 d7d8 f7f8')
        self.assertEqual(puzzle['glicko']['r'], 1760)
        self.assertEqual(puzzle['opening'], ['Italian_Game', 'Italian_Game_Classical_Variation'])
        self.assertEqual(puzzle['day'], {'$date': 1607774862751})
        self.assertEqual(puzzle['nosweatCatalog'], 'lichess-full-test')
        self.assertNotIn('players', puzzle)
        self.assertEqual(rows[0]['kind'], 'puzzle')

    def test_full_import_does_not_retain_the_starter_quality_filter(self):
        row = CSV.replace(b',80,83,172,', b',150,-70,2,')
        self.assertEqual(list(module.records(row))[0]['value']['vote'], -0.7)

    def test_current_and_legacy_official_game_urls_retain_the_same_native_game_id(self):
        current = CSV.replace(b'https://lichess.org/yyznGmXs', b'https://lichess.org/game/yyznGmXs')
        self.assertEqual(list(module.records(current)), list(module.records(CSV)))

    def test_starter_fixture_producer_accepts_current_official_urls(self):
        current = CSV.replace(b'https://lichess.org/yyznGmXs', b'https://lichess.org/game/yyznGmXs')
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'fixture.gz'
            subprocess.run([sys.executable, str(Path(__file__).with_name('prepare.py')), str(output), '1'],
                           input=current, stdout=subprocess.PIPE, check=True)
            self.assertIn(b'https://lichess.org/game/yyznGmXs', gzip.decompress(output.read_bytes()))

    def test_invalid_source_or_native_values_are_rejected(self):
        for bad in [CSV.replace(b'https://lichess.org/', b'https://example.com/'),
                    CSV.replace(b'e8d7 a2e6 d7d8 f7f8', b'e8d7 illegal'),
                    CSV.replace(b',80,83,172,', b',80,101,172,')]:
            with self.assertRaises(ValueError):
                list(module.records(bad))

    def test_prepare_verifies_the_pin_before_creating_records_and_retains_existing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            archive, output = Path(directory) / 'fixture.gz', Path(directory) / 'records.jsonl'
            blob = gzip.compress(CSV)
            archive.write_bytes(blob)
            meta = {'gzipSha256': hashlib.sha256(blob).hexdigest(), 'count': 1}
            self.assertEqual(module.prepare_records(archive, meta, output), 1)
            saved = output.read_bytes()
            with self.assertRaises(FileExistsError):
                module.prepare_records(archive, meta, output)
            self.assertEqual(output.read_bytes(), saved)
            output.unlink()
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                module.prepare_records(archive, {**meta, 'gzipSha256': '0' * 64}, output)
            self.assertFalse(output.exists())
            for count in (0, 2):
                with self.assertRaisesRegex(ValueError, 'count'):
                    module.prepare_records(archive, {**meta, 'count': count}, output)
                self.assertFalse(output.exists())

    def test_path_generator_is_upstream_except_empty_opening_handling(self):
        module.verify_paths_source()
        root = Path(__file__).parent
        metadata = json.loads((root / 'path-generator.json').read_text())
        source = (root / 'native-paths.js').read_text()
        original = source.replace('.next()?.openings || [];', '.next().openings;')
        self.assertEqual(hashlib.sha256(original.encode()).hexdigest(), metadata['upstreamSha256'])
        self.assertIn("['top', 20 / 100]", source)
        self.assertIn("['good', 50 / 100]", source)
        self.assertIn("['all', 95 / 100]", source)
        self.assertIn('const maxPathsPerGroup = 30;', source)
        self.assertIn('$sample', source)


if __name__ == '__main__':
    unittest.main()
