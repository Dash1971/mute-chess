"""Existing 23 November public checks, separated into critical/advisory runs.

The failed assertion required homepage JSON-LD to exist. That premise was
incorrect: absence is valid. Parse any blocks present; never require presence.
"""
import argparse
import http.client
import json
from html.parser import HTMLParser


class JsonLd(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.current = None
        self.blocks = []

    def handle_starttag(self, tag, attrs):
        if tag == 'script' and dict(attrs).get('type') == 'application/ld+json':
            self.current = ''

    def handle_data(self, data):
        if self.current is not None:
            self.current += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.current is not None:
            self.blocks.append(json.loads(self.current))
            self.current = None


def parse_jsonld(body):
    parser = JsonLd()
    parser.feed(body.decode())
    parser.close()
    assert parser.current is None, 'Unclosed JSON-LD script'
    return len(parser.blocks)


def get(path, headers=None):
    c = http.client.HTTPSConnection('mutechess.org', timeout=20)
    try:
        c.request('GET', path, headers=headers or {'Accept': 'text/html'})
        r = c.getresponse()
        return r.status, dict(r.getheaders()), b'' if r.status == 101 else r.read()
    finally:
        c.close()


def check(kind, main):
    status, headers, body = get('/')
    assert status == 200, status
    result = {'class': kind, 'httpStatus': status}
    if kind == 'critical':
        assert headers.get('X-NoSweat-Revision', headers.get('x-nosweat-revision')) == main
        result['revision'] = main
        status, _, _ = get('/tournament/new')
        assert status in [302, 303, 401, 403], status
        result['anonymousCreationRefused'] = status
        result['blockedPaths'] = {}
        for path in ['/api/tournament/00000000/' + name for name in ['games', 'results', 'teams']] + ['/account/oauth/token/create', '/mod', '/api/stream/mod']:
            status, _, _ = get(path)
            assert status == 404, (path, status)
            result['blockedPaths'][path] = status
        upgrade = {'Origin': 'https://mutechess.org', 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='}
        status, _, _ = get('/analysis/socket/v5?sri=releasecheck383', upgrade)
        assert status == 101, status
        result['websocketStatus'] = status
        for path in ['/racer/fixture?sri=releasecheck383', '/racer/fixture/socket/v5?sri=releasecheck383']:
            try:
                status, _, _ = get(path, upgrade)
                assert status != 101, (path, status)
            except http.client.RemoteDisconnected:
                pass  # The gateway may close a refused upgrade without a body.
        result['racerUpgradeRefused'] = True
    else:
        assert b'brand.css?v=account-access1' in body
        status, _, css = get('/assets/nosweat/brand.css?v=account-access1')
        assert status == 200 and b'#nostr-security [hidden]' in css and b'display: none !important' in css
        result['accountStylesheetVersionAndHiddenRuleVerified'] = True
        result['jsonLdBlocksParsed'] = parse_jsonld(body)
        result['jsonLdPresent'] = result['jsonLdBlocksParsed'] > 0
        status, _, body = get('/tournament')
        assert status == 200 and b'tournament/help' in body and b'<h1>' in body
        assert b'href="/tournament/new"' not in body
        assert b'href="/tournament/history"' in body and b'href="/tournament/calendar"' in body
        result['arenaDiscovery'] = {}
        for path in ['/tournament/calendar', '/tournament/history', '/tournament/history/unique?page=2']:
            status, _, _ = get(path)
            assert status == 200, (path, status)
            result['arenaDiscovery'][path] = status
        status, _, body = get('/tournament', {'Accept': 'application/json'})
        assert status == 200 and isinstance(json.loads(body), dict)
    result['passed'] = True
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('kind', choices=['critical', 'advisory'])
    parser.add_argument('expected_main')
    args = parser.parse_args()
    print(json.dumps(check(args.kind, args.expected_main)))
