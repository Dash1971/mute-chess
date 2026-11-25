"""Version upgrades and declared maintenance paths must not require frozen checks."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest


def load(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('live-checks') / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


artifacts = load('security-artifacts')
monitor = load('monitor-check')
inventory = json.loads((Path(__file__).resolve().parents[2] / 'docs/security-inventory.json').read_text())


class LiveExpectationsTests(unittest.TestCase):
    def test_reviewed_jvm_upgrade_accepts_new_jars_and_rejects_stale_duplicates(self):
        expected = copy.deepcopy(inventory['runtime']['jvm'])
        upgraded = dict(expected, Netty='4.3.0.Final', Jackson='2.19.0')
        upgraded.update({'lila-ws Netty': '4.3.1.Final', 'org.jsoup:jsoup': '1.24.0', 'com.google.guava:guava': '34.0.0-jre', 'com.sun.mail:jakarta.mail': '1.6.9'})
        names = ['io.netty.netty-buffer-4.3.0.Final.jar', 'io.netty.netty-transport-native-epoll-4.3.0.Final-linux-x86_64.jar', 'com.fasterxml.jackson.core.jackson-core-2.19.0.jar', 'org.jsoup.jsoup-1.24.0.jar', 'com.google.guava.guava-34.0.0-jre.jar', 'com.sun.mail.jakarta.mail-1.6.9.jar']
        artifacts.verify_jars(names, 'lila', upgraded)
        artifacts.verify_jars(['io.netty.netty-buffer-4.3.1.Final.jar'], 'ws', upgraded)
        with self.assertRaises(AssertionError):
            artifacts.verify_jars(names, 'lila', expected)
        with self.assertRaises(AssertionError):
            artifacts.verify_jars(names + ['io.netty.netty-transport-native-epoll-' + expected['Netty'] + '-linux-x86_64.jar'], 'lila', upgraded)
        with self.assertRaises(AssertionError):
            artifacts.verify_jars(names + ['org.jsoup.jsoup-' + expected['org.jsoup:jsoup'] + '.jar'], 'lila', upgraded)
        with self.assertRaises(AssertionError):
            artifacts.verify_jars(names, 'ws', upgraded)  # WS has its own reviewed Netty.

    def test_reviewed_runtime_upgrades_reject_old_observations(self):
        upgraded = copy.deepcopy(inventory)
        upgraded['runtime']['node'].update(version='25.0.0', embeddedUndici='8.0.0')
        upgraded['runtime']['python'].update(numpy='3.0.0', onnxruntime='2.0.0', chess='2.0.0')
        upgraded['buildAndTest']['pip'] = '27.0.0'
        node = {'node': '25.0.0', 'undici': '8.0.0'}
        python = {'pip': '27.0', 'numpy': '3.0.0', 'onnxruntime': '2.0.0', 'chess': '2.0.0'}
        artifacts.verify_node(node, upgraded['runtime']['node'])
        artifacts.verify_python(python, upgraded)
        with self.assertRaises(AssertionError):
            artifacts.verify_node(node, inventory['runtime']['node'])
        with self.assertRaises(AssertionError):
            artifacts.verify_python(python, inventory)
        with self.assertRaises(AssertionError):
            artifacts.verify_python(dict(python, pip='27.0rc1'), upgraded)

    def test_running_java_uses_reviewed_package_version(self):
        artifacts.verify_java('123:\nJDK 21.0.14\n', '21.0.14+3-1~26.04.1')
        with self.assertRaises(AssertionError):
            artifacts.verify_java('JDK 21.0.13.1', '21.0.14+3-1~26.04.1')
        with self.assertRaises(AssertionError):
            artifacts.verify_java('JDK 21.0.140', '21.0.14+3-1~26.04.1')

    def test_declared_additional_paths_pass_but_unexpected_paths_fail(self):
        release = '/opt/nosweatchess/current/RELEASE.json'
        extra = '/etc/nosweatchess/application.conf'
        monitor.verify_planned_paths([release, extra], [extra, release])
        with self.assertRaises(AssertionError):
            monitor.verify_planned_paths([release, extra], [release])
        with self.assertRaises(AssertionError):
            monitor.verify_planned_paths([release], [release, extra])
        with self.assertRaises(AssertionError):
            monitor.verify_planned_paths([extra], [extra])

    def test_baseline_accepts_runtime_only_history_but_post_deployment_requires_release(self):
        release = '/opt/nosweatchess/current/RELEASE.json'
        result = dict(allControlHashesMatch=True, isolationUnchanged=True, containment=False,
                      criticalDrift=[], plannedPaths=[])
        monitor.verify_result(result, [release], baseline=True)
        with self.assertRaises(AssertionError):
            monitor.verify_result(result, [release])
        with self.assertRaises(AssertionError):
            monitor.verify_result(result, [], baseline=True)
        result['plannedPaths'] = [release]
        monitor.verify_result(result, [release])
        result['plannedPaths'].append('/etc/nosweatchess/application.conf')
        with self.assertRaises(AssertionError):
            monitor.verify_result(result, [release])

    def test_both_phases_reject_security_drift_or_containment(self):
        release = '/opt/nosweatchess/current/RELEASE.json'
        healthy = dict(allControlHashesMatch=True, isolationUnchanged=True, containment=False,
                       criticalDrift=[], plannedPaths=[release])
        for baseline in (True, False):
            for field, bad in [('allControlHashesMatch', False), ('isolationUnchanged', False),
                               ('containment', True), ('criticalDrift', ['unexpected change'])]:
                with self.subTest(baseline=baseline, field=field), self.assertRaises(AssertionError):
                    monitor.verify_result(dict(healthy, **{field: bad}), [release], baseline)
