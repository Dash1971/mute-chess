import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('study_supervisor', Path(__file__).with_name('run-public.py'))
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)


class QuiescentSnapshotBoundaryTests(unittest.TestCase):
    def test_interval_game_finishing_during_gateway_close_is_in_the_baseline(self):
        events = []
        state = {'finished': False}
        def command(*args): events.append(args)
        def sleep(seconds):
            events.append(('sleep', seconds))
            state['finished'] = True
        def active_count():
            events.append(('active-count',))
            return 0
        def capture():
            self.assertTrue(state['finished'])
            events.append(('capture-current-perfs-and-interval-games',))
        supervisor.quiesce_gateway(command, sleep, active_count, capture)
        self.assertEqual(events, [('systemctl', 'stop', 'nosweatchess-gateway'), ('sleep', 3),
                                  ('active-count',), ('capture-current-perfs-and-interval-games',)])

    def test_new_active_human_game_blocks_snapshot_and_writer_restart(self):
        called = []
        with self.assertRaisesRegex(RuntimeError, 'preserve the newly active game'):
            supervisor.quiesce_gateway(lambda *a: called.append(a), lambda _: None,
                                        lambda: 1, lambda: called.append(('unsafe-snapshot',)))
        self.assertEqual(called, [('systemctl', 'stop', 'nosweatchess-gateway')])
