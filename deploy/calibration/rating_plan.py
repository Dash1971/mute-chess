"""One-time external-anchor plan. This does not calculate Glicko updates."""
import copy
import datetime as dt
import hashlib
import json
import math
import re

ADJUSTMENT_ID = 'maia-p95-anchor-cross-speed-v1'
OFFSET = -75
SPEEDS = ('blitz', 'rapid', 'bullet', 'classical')


def require(ok, reason):
    if not ok:
        raise ValueError(reason)


def number(value):
    if isinstance(value, dict):
        require(set(value) <= {'$numberDouble', '$numberInt', '$numberLong'} and len(value) == 1,
                'Unexpected BSON numeric type')
        value = next(iter(value.values()))
    require(not isinstance(value, bool), 'Boolean is not a rating')
    result = float(value)
    require(math.isfinite(result), 'Non-finite number')
    return result


def double(value):
    return {'$numberDouble': repr(float(value))}


def digest(value):
    return hashlib.sha256(json.dumps(value, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def reference_for(reference, requested, target, anchor):
    users = reference['users']
    require(len({u['id'] for u in users}) == len(users) == 11, 'Expected eleven distinct references')

    def reliable(user):
        for speed in (target, anchor):
            p = user['perfs'][speed]
            require(type(p['prov']) is bool, 'Missing reference provisional evidence')
            require(400 <= number(p['rating']) <= 4000 and 0 < number(p['rd']) <= 500,
                    'Invalid reference rating/RD')
            require(type(p['games']) is int and p['games'] >= 0, 'Invalid reference games')
            if p['prov'] or p['rd'] > 110 or p['games'] < 30:
                return False
        return True

    by_id = {u['id']: u for u in users}
    require(requested in by_id, 'Missing matched reference')
    candidates = [u for u in users if reliable(u)]
    require(candidates, 'No supported reference pair')
    level = int(requested.rsplit('_', 1)[1])
    chosen = min(candidates, key=lambda u: (abs(int(u['id'].rsplit('_', 1)[1]) - level), u['id']))
    a, b = chosen['perfs'][anchor], chosen['perfs'][target]
    return {'requested': requested, 'used': chosen['id'], 'fallback': chosen['id'] != requested,
            'source': chosen['profileUrl'], 'anchorSpeed': anchor, 'targetSpeed': target,
            'anchor': a, 'target': b, 'delta': b['rating'] - a['rating']}


def build(snapshot, roster, reference, commit, created_at):
    require(re.fullmatch('[0-9a-f]{40}', commit) is not None, 'Exact source commit required')
    require(len(roster) == 44, 'Expected the reviewed 44-identity roster')
    ids = sorted(b['username'].lower() for b in roster)
    require(len(set(ids)) == 44, 'Duplicate roster identity')
    users = {u['_id']: u for u in snapshot['users']}
    perfs = {p['_id']: p for p in snapshot['perfs']}
    require(len(snapshot['users']) == len(snapshot['perfs']) == 44 and
            sorted(users) == sorted(perfs) == ids, 'Managed cohort changed or missing perfs')
    require(snapshot['activeGames'] == 0, 'Active games or reservations')
    for u in users.values():
        require(u.get('title') == 'BOT' and u.get('noSweatBot') is True and u.get('enabled') is not False,
                'Only enabled managed BOT accounts may be adjusted')
    observed = dt.datetime.fromisoformat(reference['retrievedAtUtc'].replace('Z', '+00:00'))
    created = dt.datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    require(observed.tzinfo is not None and created.tzinfo is not None, 'UTC timestamps required')
    require(-300 <= (created - observed).total_seconds() <= 7 * 86400, 'Reference snapshot is stale/future')
    require(reference['source'] == 'https://lichess.org/api/users', 'Unexpected reference source')
    require(sorted(u['id'] for u in reference['users']) == sorted({b['reference_account'] for b in roster}),
            'Reference family differs from roster')
    rows = []
    for bot in sorted(roster, key=lambda b: b['username'].lower()):
        user_id = bot['username'].lower()
        before = perfs[user_id]
        require(number(before.get('correspondence', {}).get('nb', 0)) == 0,
                'Earned Correspondence would require a separate aggregate review')
        after = copy.deepcopy(before)
        changes = []
        for speed in SPEEDS:
            p = before[speed]
            r, rd, volatility = (number(p['gl'][k]) for k in ('r', 'd', 'v'))
            nb = number(p['nb'])
            require(nb.is_integer() and nb >= 0 and 400 <= r <= 4000 and 0 < rd <= 500 and
                    0 < volatility <= .1, 'Invalid native perf')
            new_rd = rd
            ref = None
            if speed in ('blitz', 'rapid') or nb > 0:
                new_rating, mode = r + OFFSET, 'earned-rating-translation'
            else:
                anchor = 'blitz' if speed == 'bullet' else 'rapid'
                ref = reference_for(reference, bot['reference_account'], speed, anchor)
                new_rating = number(before[anchor]['gl']['r']) + OFFSET + ref['delta']
                # Unplayed priors stay broad. Do not import an established RD.
                new_rd = max(rd, 300 if ref['fallback'] else 200)
                mode = 'unplayed-cross-speed-prior'
            require(400 <= new_rating <= 4000, 'Proposed rating outside native bounds; no clipping')
            after[speed]['gl']['r'] = double(new_rating)
            fields = [f'{speed}.gl.r']
            if new_rd != rd:
                after[speed]['gl']['d'] = double(new_rd)
                fields.append(f'{speed}.gl.d')
            changes.append({'speed': speed, 'mode': mode, 'games': int(nb), 'before': r,
                            'after': new_rating, 'rdBefore': rd, 'rdAfter': new_rd,
                            'fields': fields, 'reference': ref})
        # Lila's persisted standard perf is a weighted aggregate of established
        # non-UltraBullet speeds. All contributing earned speeds translate by
        # the same amount; translation commutes with that native aggregation.
        standard = before.get('standard')
        if standard and number(standard['nb']) > 0:
            r, rd = (number(standard['gl'][k]) for k in ('r', 'd'))
            require(400 <= r + OFFSET <= 4000, 'Aggregate rating outside native bounds')
            after['standard']['gl']['r'] = double(r + OFFSET)
            changes.append({'speed': 'standard', 'mode': 'derived-standard-translation',
                            'games': int(number(standard['nb'])), 'before': r, 'after': r + OFFSET,
                            'rdBefore': rd, 'rdAfter': rd, 'fields': ['standard.gl.r'], 'reference': None})
        rows.append({'id': user_id, 'name': bot['name'], 'before': before, 'after': after, 'changes': changes})
    return {'schema': 1, 'id': ADJUSTMENT_ID, 'sourceCommit': commit, 'createdAtUtc': created_at,
            'offset': OFFSET, 'speeds': list(SPEEDS), 'rosterSha256': digest(roster),
            'snapshot': snapshot, 'reference': reference, 'rows': rows}


def validate(plan, roster):
    require(plan == build(plan['snapshot'], roster, plan['reference'], plan['sourceCommit'],
                          plan['createdAtUtc']), 'Plan was modified; generate and review a new plan')


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()
