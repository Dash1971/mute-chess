#!/usr/bin/env python3
"""Reproduce the pre-registered random configuration/split design; no inference."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import random

SEED = 'mute-continuous-strength-20261031-v1'
SCIFI = [
    ('Wintermute', 'Neuromancer'), ('Neuromancer', 'Neuromancer'),
    ('HAL9000', '2001: A Space Odyssey'), ('SHODAN', 'System Shock'),
    ('Durandal', 'Marathon'), ('WalterWobot', 'Judge Dredd'),
    ('Skynet', 'The Terminator'), ('GLaDOS', 'Portal'),
    ('Colossus', 'Colossus: The Forbin Project'), ('DeepThought', "The Hitchhiker's Guide to the Galaxy"),
    ('Joshua', 'WarGames'), ('Mycroft', 'The Moon Is a Harsh Mistress'),
]


def digest(value):
    def normalize(v):
        if isinstance(v, float) and v.is_integer(): return int(v)
        if isinstance(v, list): return [normalize(x) for x in v]
        if isinstance(v, dict): return {k: normalize(x) for k,x in v.items()}
        return v
    return hashlib.sha256(json.dumps(normalize(value), separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def personality(identity, history):
    def draw(field):
        return int.from_bytes(hashlib.sha256(
            f'mute-pool-personality-v1:{identity}:{field}'.encode()).digest()[:4], 'big')
    return {'assignment': 'strength137-balanced-history-v1', 'history': history,
        'humanTiming': bool(draw('human-timing') % 2),
        'timingStyle': ['very-fast', 'fast', 'normal', 'slow', 'very-slow'][draw('timing-style') % 5]}


def design(original):
    assert len(original) == 44 and len({b['id'] for b in original}) == 44
    rng = random.Random(SEED)
    baseline = sorted((b for b in original if b['sampling_profile'] == 'full'),
                      key=lambda b: b['conditioning_self'])

    def seed_rating(elo, speed, temp, top_p):
        # Broad, explicitly unvalidated priors; the native games must correct them.
        a = max((b for b in baseline if b['conditioning_self'] <= elo), key=lambda b: b['conditioning_self'])
        b = min((b for b in baseline if b['conditioning_self'] >= elo), key=lambda b: b['conditioning_self'])
        fraction = 0 if a == b else (elo-a['conditioning_self'])/(b['conditioning_self']-a['conditioning_self'])
        initial = a['ratings'][speed]['initial_rating'] * (1-fraction) + b['ratings'][speed]['initial_rating'] * fraction
        return round(initial - 75 + 300 * (1-temp*top_p))

    extra = []
    for split, count in [('train', 156), ('test', 50)]:
        def strata():
            values = [(i + rng.random()) / count for i in range(count)]
            rng.shuffle(values)
            return values
        es, ts, ps = strata(), strata(), strata()
        on = (100 - sum(b['personality']['history'] for b in original)) if split == 'train' else count//2
        histories = [True]*on + [False]*(count-on)
        rng.shuffle(histories)
        settings = [(round(600 + 2000*e), round(t, 6), round(p, 6), h)
                    for e, t, p, h in zip(es, ts, ps, histories)]
        if split == 'train':
            # Endpoint cases verify aliasing and both history paths. No claimed
            # top-p effect at temperature zero. Wintermute's policy stays fixed.
            settings[:6] = [(2600, 0, 1, True), (2600, 0, 1, False),
                (2600, 1, 0, True), (2400, 0, 0, False), (2200, 1, 1, True), (2400, 1, 0, False)]
        if split == 'train':
            difference = on - sum(s[3] for s in settings)
            for index in range(count-1, 5, -1):
                if difference == 0:
                    break
                e, t, p, h = settings[index]
                if (difference > 0 and not h) or (difference < 0 and h):
                    settings[index] = (e, t, p, not h)
                    difference += -1 if difference > 0 else 1
        ranked = sorted(range(count), key=lambda i: settings[i][0], reverse=True)
        names = {ranked[i]: SCIFI[i] for i in range(min(12, count))} if split == 'train' else {}
        names[0] = ('Wintermute', 'Neuromancer') if split == 'train' else ('Probe001', None)
        if split == 'train':
            # Reserve the requested identities for their exact endpoint settings.
            names = {i: v for i, v in names.items() if v[0] not in ('Wintermute', 'Neuromancer')}
            names[0], names[1] = SCIFI[0], SCIFI[1]
        for index, (elo, temp, top_p, history) in enumerate(settings):
            name, source = names.get(index, (f'Signal{split.title()}{index+1:03}', None))
            identity = name.lower()
            bot = {'id': identity, 'name': name, 'username': name,
                'conditioning_self': elo, 'conditioning_opponent': elo,
                'sampling_profile': 'continuous-study-v1', 'temperature_after_opening': temp,
                'top_p_after_opening': top_p, 'opening': {'temperature': 1, 'top_p': 1, 'full_moves': 5},
                'personality': personality(identity, history),
                'configuration_status': 'strength137-experimental-unvalidated',
                'experiment': {'id': 'strength137-v1', 'split': split, 'seed': SEED},
                'ratings': {speed: {'initial_rating': seed_rating(elo, speed, temp, top_p),
                    'initial_rd': 300, 'status': 'unvalidated-predictor-prior',
                    'method': 'interpolated-original-full-seeds-minus75-plus300*(1-temperature*topP); not fitted'}
                    for speed in ('blitz', 'rapid')}}
            if source:
                bot['name_reference'] = source
            if name == 'Wintermute':
                bot['personality'].update(humanTiming=True, timingStyle='very-fast')
            extra.append(bot)
    all_bots = copy.deepcopy(original) + extra
    assert len({b['username'].lower() for b in all_bots}) == len(all_bots) == 250
    manifest = {'version': 'strength137-v1', 'seed': SEED, 'existingIds': [b['id'] for b in original],
        'trainingIds': [b['id'] for b in original] + [b['id'] for b in extra if b['experiment']['split'] == 'train'],
        'heldoutIds': [b['id'] for b in extra if b['experiment']['split'] == 'test'],
        'originalRosterSha256': digest(original), 'combinedRosterSha256': digest(all_bots),
        'hardStopUtc': '2026-10-31T10:34:39Z', 'admissionEndUtc': '2026-10-31T10:04:39Z',
        'maximumAdmitted': 3000, 'stages': {'warmupEnd': 200, 'trainingEnd': 2000, 'validationEnd': 3000},
        'conditioningDomain': [600, 2600], 'temperatureDomain': [0, 1], 'topPDomain': [0, 1],
        'heldoutMaeTarget': 100, 'zeroSemantics': 'temperature == 0 or top-p == 0 selects argmax',
        'absoluteLichessAlignmentValidated': False}
    return all_bots, extra, manifest


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    original = json.loads((a.root/'lila-adapter/roster.json').read_text())
    combined, extra, manifest = design(original)
    a.output.mkdir(parents=True, exist_ok=True)
    for name, value in [('roster.json', combined), ('experiment-roster.json', extra), ('experiment-manifest.json', manifest)]:
        (a.output/name).write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps({'training': len(manifest['trainingIds']), 'heldout': len(manifest['heldoutIds']),
        'combinedRosterSha256': manifest['combinedRosterSha256']}))


if __name__ == '__main__':
    main()
