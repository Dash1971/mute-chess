"""The live-check premise that caused #383, without network requests."""
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('public_health', Path(__file__).with_name('live-checks') / 'public-health.py')
health = importlib.util.module_from_spec(spec)
spec.loader.exec_module(health)


class LiveMetadataTests(unittest.TestCase):
    def test_no_jsonld_is_valid(self):
        self.assertEqual(health.parse_jsonld(b'<html><h1>Mute Chess</h1></html>'), 0)

    def test_jsonld_present_must_parse(self):
        self.assertEqual(health.parse_jsonld(b'<script type="application/ld+json">{"name":"Mute Chess"}</script>'), 1)
        with self.assertRaises(json.JSONDecodeError):
            health.parse_jsonld(b'<script type="application/ld+json">{&quot;name&quot;:1}</script>')

    def test_multiple_blocks_are_all_parsed(self):
        with self.assertRaises(json.JSONDecodeError):
            health.parse_jsonld(b'<script type="application/ld+json">{}</script><script type="application/ld+json">invalid</script>')
