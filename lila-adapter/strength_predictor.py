#!/usr/bin/env python3
"""Training-only weighted strength fit and frozen prospective evaluation. No DB writes."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np

MODEL_VERSION = 'strength137-ridge-rbf-effective-cv-v2'


def effective_configuration(bot):
    """Known policy aliases share a CV group even when account names differ."""
    t, p = float(bot['temperature_after_opening']), float(bot['top_p_after_opening'])
    opening = int(bot['opening']['full_moves'] or 0)
    if t == 0 or p == 0:
        t, p = 0., 0.
    elif t == 1 and p == 1:
        opening = 0
    return (int(bot['conditioning_self']), int(bot['conditioning_opponent']),
        bool(bot['personality']['history']), t, p, opening)


def features(bot, complexity):
    e = (bot['conditioning_self']-1600)/1000
    t, p = bot['temperature_after_opening'], bot['top_p_after_opening']
    h = float(bot['personality']['history'])
    deterministic = float(t == 0 or p == 0)
    # Equivalent endpoints have equivalent predictors; their redundant slider
    # values cannot imply a strength difference.
    if deterministic:
        t, p = 0., 0.
    opening = float(bot['opening']['full_moves'] or 0)/5
    if t == 1 and p == 1:
        opening = 0.  # Full sampling before/after the opening is one policy.
    row = [1., e, t, p, h, deterministic, opening]
    if complexity == 'interaction':
        row += [e*e, e**3, t*t, p*p, t*p, e*t, e*p, h*e, h*t, h*p, h*t*p,
                deterministic*e, deterministic*h]
        row += [np.exp(-((e-k)/.3)**2) for k in np.linspace(-1, 1, 7)]
    return row


def solve(x, y, weights, penalty):
    # The intercept is not shrunk toward an arbitrary rating origin.
    reg = np.eye(x.shape[1]) * penalty
    reg[0, 0] = 1e-10
    lhs = x.T @ (weights[:, None]*x) + reg
    return np.linalg.solve(lhs, x.T @ (weights*y)), np.linalg.pinv(lhs)


def group_fold(bot):
    key = json.dumps(effective_configuration(bot), separators=(',', ':'))
    return int(hashlib.sha256(('strength137-cv-effective-v2:'+key).encode()).hexdigest()[:8], 16) % 5


def fit(roster, manifest, ratings):
    training = [b for b in roster if b['id'] in set(manifest['trainingIds'])]
    assert len(training) == 200 and not set(manifest['heldoutIds']) & {b['id'] for b in training}
    result = {'version': MODEL_VERSION, 'rosterSha256': manifest['combinedRosterSha256'],
        'trainingIds': manifest['trainingIds'], 'heldoutIds': manifest['heldoutIds'],
        'selection': 'five folds grouped by canonical effective configuration; weighted native training-perf labels only',
        'absoluteLichessAlignmentValidated': False, 'speeds': {}}
    for speed in ('blitz', 'rapid'):
        rows = [b for b in training if ratings[b['id']][speed]['games'] > 0]
        if len(rows) < 100:
            raise ValueError('Insufficient training coverage; do not present a validated predictor')
        y = np.array([ratings[b['id']][speed]['rating'] for b in rows])
        rd = np.array([ratings[b['id']][speed]['rd'] for b in rows])
        weights = 1/(rd*rd + 50**2)
        weights /= weights.mean()
        folds = np.array([group_fold(b) for b in rows])
        candidates = []
        for complexity in ('additive', 'interaction'):
            x = np.array([features(b, complexity) for b in rows])
            for penalty in (.1, 1., 10., 100.):
                errors = []
                for fold in range(5):
                    tr, va = folds != fold, folds == fold
                    if not va.any() or tr.sum() < x.shape[1]:
                        continue
                    beta, _ = solve(x[tr], y[tr], weights[tr], penalty)
                    errors.extend(abs(x[va] @ beta-y[va]).tolist())
                if not errors:
                    continue
                candidates.append({'complexity': complexity, 'penalty': penalty,
                    'configurationCvMae': float(np.mean(errors))})
        # Prefer simpler model if its measured CV error is within five points.
        best_error = min(c['configurationCvMae'] for c in candidates)
        chosen = min((c for c in candidates if c['configurationCvMae'] <= best_error+5),
            key=lambda c: (c['complexity'] != 'additive', c['configurationCvMae']))
        x = np.array([features(b, chosen['complexity']) for b in rows])
        beta, cov = solve(x, y, weights, chosen['penalty'])
        residual = y-x@beta
        # Model disagreement/noisy-label residual is retained rather than treating
        # many copies of the same configuration as independent calibration.
        residual_scale = max(50., float(np.sqrt(np.mean(residual**2))))
        predictions = {}
        for bot in roster:
            v = np.array(features(bot, chosen['complexity']))
            predictions[bot['id']] = {'rating': float(v@beta),
                'approximatePredictiveSd': float(residual_scale*np.sqrt(1+v@cov@v)),
                'split': 'heldout' if bot['id'] in manifest['heldoutIds'] else 'training'}
        result['speeds'][speed] = {**chosen, 'candidates': candidates, 'coefficients': beta.tolist(),
            'trainingIdentities': len(rows),
            'trainingConfigurations': len({effective_configuration(b) for b in rows}),
            'trainingMedianRd': float(np.median(rd)),
            'trainingResidualScale': residual_scale, 'predictions': predictions}
    result['limitations'] = ['Native rating labels remain uncertain and share the external anchor.',
        'Approximate predictive SD is not a demonstrated confidence bound; prospective coverage must be checked.',
        'No independent opponent-conditioning, Bullet/Classical or production timing validation.',
        'Only the published model/opening/input domain is supported.']
    return result


def evaluate(model, manifest, ratings, records):
    heldout = set(manifest['heldoutIds'])
    report = {'version': model['version'], 'evaluatorVersion': MODEL_VERSION, 'targetMae': 100, 'speeds': {}, 'noisyLabelTargetMet': False}
    for speed in ('blitz', 'rapid'):
        predicted = model['speeds'][speed]['predictions']
        errors, details, scored = [], [], []
        for identity in sorted(heldout):
            perf = ratings[identity][speed]
            if perf['games'] <= 0:
                continue
            estimate = predicted[identity]['rating']
            errors.append(abs(estimate-perf['rating']))
            details.append({'id': identity, 'prediction': estimate, 'nativeRating': perf['rating'],
                'rd': perf['rd'], 'nativeGames': perf['games'], 'absoluteError': errors[-1]})
        for record in records:
            if record.get('speed') != speed or record.get('state') != 'finished':
                continue
            a, b = record['white'], record['black']
            if not ({a, b} & heldout):
                continue
            result = record['result']
            score = .5 if not result.get('winner') else float(result['winner'] == 'white')
            delta = predicted[a]['rating']-predicted[b]['rating']
            expected = 1/(1+10**(-delta/400))
            scored.append((expected, score))
        mae = float(np.mean(errors)) if errors else None
        rng = np.random.default_rng(137)
        boot = [float(np.mean(rng.choice(errors, size=len(errors), replace=True)))
                for _ in range(1000)] if errors else []
        report['speeds'][speed] = {'configurations': len(details), 'nativeRatingMae': mae,
            'configurationBootstrapMae95': np.quantile(boot, [.025, .975]).tolist() if boot else None,
            'medianNativeRd': float(np.median([d['rd'] for d in details])) if details else None,
            'frozenOutcomeGames': len(scored),
            'brier': float(np.mean([(p-y)**2 for p,y in scored])) if scored else None,
            'expectedScoreCrossEntropy': float(np.mean([-y*np.log(max(p,1e-12))-(1-y)*np.log(max(1-p,1e-12))
                for p,y in scored])) if scored else None,
            'meetsNoisyLabelMaeTarget': len(details) == 50 and mae <= 100, 'details': details}
    report['noisyLabelTargetMet'] = all(s['meetsNoisyLabelMaeTarget'] for s in report['speeds'].values())
    report['interpretation'] = 'Noisy native-label criterion only; does not prove true-strength MAE or absolute Lichess alignment.'
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--roster', type=Path, required=True)
    p.add_argument('--manifest', type=Path, required=True)
    p.add_argument('--ratings', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--model', type=Path)
    p.add_argument('--records', type=Path)
    a = p.parse_args()
    read = lambda path: json.loads(path.read_text())
    ratings = read(a.ratings)
    ratings = ratings.get('ratings', ratings)
    manifest = read(a.manifest)
    result = evaluate(read(a.model), manifest, ratings, read(a.records)) if a.model else fit(read(a.roster), manifest, ratings)
    a.output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({'written': str(a.output), 'version': MODEL_VERSION}))


if __name__ == '__main__':
    main()
