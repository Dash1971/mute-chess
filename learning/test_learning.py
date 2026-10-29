import importlib.util, json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('lesson_import',ROOT/'import.py')
lessons=importlib.util.module_from_spec(spec);spec.loader.exec_module(lessons)
class LessonTests(unittest.TestCase):
    def test_verified_standard_readonly_catalog(self):
        meta=lessons.verify()
        self.assertEqual((meta['studies'],meta['chapters']),(20,229))
        chapters=[json.loads(x) for x in (ROOT/'chapters.jsonl').read_text().splitlines()]
        self.assertEqual(len({c['_id'] for c in chapters}),229)
        for c in chapters:
            self.assertIn(' ',c['root']['_']['f'])
    def test_no_development_seed_commands(self):
        source=(ROOT/'import.cjs').read_text()
        self.assertNotIn('.drop(',source)
        self.assertNotIn('db.user',source)
        self.assertIn('$setOnInsert',source)
        self.assertLess(source.index('Lesson ID collision'),source.index('collection.updateOne'))
