import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('isolation', Path(__file__).with_name('service-isolation.py'))
isolation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(isolation)


class ServiceBoundaryTests(unittest.TestCase):
    def test_activation_replaces_stale_kernel_rules_even_when_the_oneshot_is_active(self):
        for initially_active in (False, True):
            state = {'active': initially_active, 'kernel': 'previous-policy'}

            def systemctl(*args):
                if args[1] == 'enable' and not state['active']:
                    state.update(active=True, kernel='installed-policy')
                if args[1] == 'reload':
                    self.assertTrue(state['active'])
                    state['kernel'] = 'installed-policy'
                return ''

            with patch.object(isolation, 'run', side_effect=systemctl):
                isolation.activate_policy()
            self.assertEqual(state['kernel'], 'installed-policy')

    def test_policy_reload_failure_aborts_activation(self):
        def systemctl(*args):
            if args[1] == 'reload':
                raise RuntimeError('Policy could not be applied')
            return ''

        with patch.object(isolation, 'run', side_effect=systemctl):
            with self.assertRaisesRegex(RuntimeError, 'Policy could not be applied'):
                isolation.activate_policy()

    def test_lightning_egress_is_confined_to_adapter_https_and_local_dns(self):
        ips = ('8.8.8.8', '2606:4700:4700::1111')
        uids = {role: i + 900 for i, role in enumerate(isolation.ROLES)}
        rules = isolation.policy(uids, 910, ips)
        uid = uids['adapter']
        self.assertIn(f'meta skuid {uid} ip daddr {{ 8.8.8.8 }} tcp dport 443 accept', rules)
        self.assertIn(f'meta skuid {uid} ip6 daddr {{ 2606:4700:4700::1111 }} tcp dport 443 accept', rules)
        for role in isolation.ROLES:
            unit = isolation.unit(role, ips)
            self.assertEqual('IPAddressAllow=8.8.8.8' in unit, role == 'adapter')
        self.assertNotIn('tcp dport 443 accept', isolation.policy(uids, 910))
        self.assertLess(rules.index(f'meta skuid {uid} ip daddr {{ 8.8.8.8 }}'), rules.index(f'meta skuid {uid} counter reject'))

    def test_gateway_and_adapter_have_no_database_or_persistent_write_access(self):
        for role in ('gateway', 'adapter'):
            self.assertNotIn(27019, isolation.PORTS[role])
            self.assertNotIn(16380, isolation.PORTS[role])
            unit = isolation.unit(role)
            self.assertNotIn('ReadWritePaths=', unit)
            self.assertIn('/etc/nosweatchess', unit.split('InaccessiblePaths=')[1].splitlines()[0])
            self.assertIn('Requires=nosweatchess-isolation.service', unit)
        self.assertEqual(len(set(isolation.USERS.values())), 6)

    def test_only_databases_can_write_their_respective_state_directories(self):
        for role in isolation.ROLES:
            unit = isolation.unit(role)
            writes = [line for line in unit.splitlines() if line.startswith('ReadWritePaths=')]
            self.assertEqual(writes, ['ReadWritePaths=/srv/nosweatchess/' + role]
                             if role in ('mongo', 'redis') else [])
            self.assertIn('CapabilityBoundingSet=\n', unit)
            self.assertIn('NoNewPrivileges=yes', unit)

    def test_policy_protects_local_databases_from_nonservice_users_too(self):
        uids = {role: i + 900 for i, role in enumerate(isolation.ROLES)}
        rules = isolation.policy(uids, 910)
        for destination in ('ip daddr 127.0.0.1', 'ip6 daddr ::1'):
            self.assertIn(destination + ' tcp dport { 27019, 16380 } meta skuid != { 0, 901, 902 } counter reject', rules)
            self.assertIn(destination + ' tcp dport { 29665 } meta skuid != { 0, 901 } counter reject', rules)
        for uid in (*uids.values(), 910):
            self.assertIn(f'meta skuid {uid} counter reject', rules)
        self.assertNotIn('flush ruleset', rules)
        self.assertIn('destroy table inet nosweatchess_isolation', rules)


if __name__ == '__main__':
    unittest.main()
