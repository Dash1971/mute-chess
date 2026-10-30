#!/usr/bin/env python3
"""Fetch a dated, public-only reference snapshot. No Mute Chess database access."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

from rating_plan import now, require


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--roster', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    roster = json.loads(args.roster.read_text())
    ids = sorted({b['reference_account'] for b in roster})
    require(len(ids) == 11, 'Expected eleven matched references')
    request = urllib.request.Request('https://lichess.org/api/users', data=','.join(ids).encode(),
                                    headers={'Content-Type': 'text/plain', 'User-Agent': 'MuteChess-calibration/1.0'})
    with urllib.request.urlopen(request, timeout=25) as response:
        require(response.geturl() == 'https://lichess.org/api/users', 'Unexpected redirect')
        raw = response.read(1_000_001)
    require(len(raw) <= 1_000_000, 'Response too large')
    users = json.loads(raw)
    require(sorted(u['id'] for u in users) == ids, 'Missing/extra reference account')
    result = {'retrievedAtUtc': now(), 'source': 'https://lichess.org/api/users',
              'sourceResponseSha256': hashlib.sha256(raw).hexdigest(), 'users': []}
    for user in users:
        perfs = {s: {k: user['perfs'][s].get(k, False if k == 'prov' else None)
                     for k in ('rating', 'rd', 'games', 'prov')} for s in ('bullet', 'blitz', 'rapid', 'classical')}
        result['users'].append({'id': user['id'], 'profileUrl': 'https://lichess.org/@/' + user['id'], 'perfs': perfs})
    with args.output.open('x') as output:
        output.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'accounts': len(users), 'output': str(args.output), 'retrievedAtUtc': result['retrievedAtUtc']}))


if __name__ == '__main__':
    main()
