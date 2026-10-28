import importlib.util
import json
from pathlib import Path
import tempfile
import sys
import unittest
from unittest.mock import patch


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


monitor = module('monitor', 'monitor-access.py')
installer = module('monitor_installer', 'install-monitor-access.py')


class RestrictedAccessTests(unittest.TestCase):
    def test_child_output_is_bounded_before_return_to_controller(self):
        result = monitor.run([sys.executable, '-c', 'import os; os.write(1,b"x"*300000)'])
        self.assertEqual(result['returncode'], 0)
        self.assertEqual(len(result['output']), 200000)

    def test_shells_subsystems_extra_arguments_and_injection_are_denied(self):
        for command in ('', 'sh', 'bash', 'sudo -i', 'id', 'status; id',
                        'status\nlogs', 'status ', ' logs', '$(id)',
                        'scp -t /tmp/x', 'internal-sftp', 'logs /etc/shadow',
                        'emergency-poweroff --reboot', 'status\x00'):
            with self.subTest(command=command):
                self.assertIsNone(monitor.dispatch(command))
        for command in monitor.ACTIONS:
            self.assertEqual(monitor.dispatch(command), [
                '/usr/bin/sudo', '-n', '/usr/local/sbin/nosweat-monitor', command])

    def test_public_key_cannot_inject_authorized_keys_options(self):
        result = installer.key_line('ssh-ed25519 AAAA comment\n', '192.0.2.7')
        self.assertIn('restrict,from="192.0.2.7",command=', result)
        self.assertEqual(result.count('\n'), 1)
        for address in ('192.0.2.7",command="sh', '*', '192.0.2.0/24'):
            with self.assertRaises(ValueError):
                installer.key_line('ssh-ed25519 AAAA', address)
        with self.assertRaises(ValueError):
            installer.key_line('command="sh" ssh-ed25519 AAAA', '192.0.2.7')

    def test_log_fields_are_bounded_redacted_and_marked_untrusted(self):
        event = {'MESSAGE': 'token=secret Bearer bad nsec1qqqq ' + 'a' * 64,
                 '_SYSTEMD_UNIT': 'nosweatchess-app.service',
                 'UNEXPECTED_SECRET': 'do not export'}
        with patch.object(monitor, 'run', return_value={
                'returncode': 0, 'output': json.dumps(event), 'error': ''}):
            result = monitor.journal()
        self.assertTrue(result['untrusted_log_content'])
        self.assertNotIn('UNEXPECTED_SECRET', result['events'][0])
        message = result['events'][0]['MESSAGE']
        for secret in ('secret', 'bad', 'nsec1qqqq', 'a' * 64):
            self.assertNotIn(secret, message)
        self.assertEqual(len(monitor.redact('x' * 1000)), 600)

    def test_counter_changes_do_not_change_policy_fingerprint_shape(self):
        a = {'rule': {'handle': 3, 'expr': [{'counter': {'packets': 1, 'bytes': 2}}]}}
        b = {'rule': {'handle': 9, 'expr': [{'counter': {'packets': 9, 'bytes': 99}}]}}
        self.assertEqual(monitor.policy_shape(a), monitor.policy_shape(b))

    def test_containment_is_latched_before_stop_and_never_reopens_it(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            calls = []

            def fake_run(argv, **kwargs):
                self.assertTrue((state / 'contained').exists())
                calls.append(argv)
                return {'returncode': 0, 'output': '', 'error': ''}

            with patch.object(monitor, 'STATE', state), patch.object(
                    monitor, 'LATCH', state / 'contained'), patch.object(
                    monitor, 'run', side_effect=fake_run):
                monitor.contain()
                original = (state / 'contained').read_text()
                monitor.contain()
                self.assertEqual((state / 'contained').read_text(), original)
                self.assertFalse(any('poweroff' in call for call in calls))
                monitor.contain(poweroff=True)
            self.assertEqual(calls[-1], ['/usr/bin/systemctl', 'poweroff'])
            for call in calls:
                self.assertNotIn('start', call)
                self.assertNotIn('restart', call)
                self.assertNotIn('nosweatchess-isolation.service', call)
                self.assertNotIn('nosweatchess-mongo.service', call)


if __name__ == '__main__':
    unittest.main()
