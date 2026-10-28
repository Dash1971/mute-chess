import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('analysis_assets', Path(__file__).with_name('analysis-assets.py'))
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)

class AnalysisAssetTests(unittest.TestCase):
    def test_exact_build_and_tamper_rejection(self):
        with tempfile.TemporaryDirectory() as temporary:
            source, built = Path(temporary) / 'source', Path(temporary) / 'built'
            source.mkdir(); built.mkdir(); (built / 'models').mkdir()
            model, wasm = b'verified model', b'verified runtime'
            digest = lambda value: hashlib.sha256(value).hexdigest()
            config = {'models': {'5m': {'id': '5m', 'sha256': digest(model)}},
                      'runtime': {'assets': {'wasm': {'sha256': digest(wasm)}}}}
            (source / 'config.json').write_text(json.dumps(config))
            (source / 'worker.js').write_text('postMessage("ready")')
            for path in source.iterdir(): (built / path.name).write_bytes(path.read_bytes())
            (built / 'models/5m.onnx').write_bytes(model)
            (built / 'ort-wasm-simd-threaded.wasm').write_bytes(wasm)
            self.assertEqual(len(assets.verify(source, built)), 4)
            (built / 'models/5m.onnx').write_bytes(b'other model')
            with self.assertRaisesRegex(ValueError, 'differs'): assets.verify(source, built)
            (built / 'models/5m.onnx').write_bytes(model)
            (built / 'worker.js').write_text('unexpected script')
            with self.assertRaisesRegex(ValueError, 'differs'): assets.verify(source, built)
            (built / 'worker.js').write_bytes((source / 'worker.js').read_bytes())
            (built / 'extra.js').write_text('extra')
            with self.assertRaisesRegex(ValueError, 'extra'): assets.verify(source, built)

if __name__ == '__main__': unittest.main()
