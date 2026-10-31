import importlib.util
from pathlib import Path
import subprocess
import sys
import unittest

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
