#!/usr/bin/env python3
"""Replay a legal fixture across native room-idle windows; qualification only."""
import argparse
import io
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request

import chess.pgn


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--environment', type=Path, required=True)
    p.add_argument('--fixture', type=Path, required=True)
    p.add_argument('--report', type=Path, required=True)
    p.add_argument('--expect-rollback', action='store_true')
    p.add_argument('--seconds', type=int, default=145)
    p.add_argument('--delay-updates', action='store_true', help='Private Mongo fault injection widens the flush race')
    args = p.parse_args()
    env = dict(line.split('=', 1) for line in args.environment.read_text().splitlines() if '=' in line)
    origin = env['LILA_ORIGIN']
    run = env['STUDY_QUAL_RUN_ID']
    if origin != 'http://127.0.0.1:19763' or not run.startswith('q'):
        raise SystemExit('Disposable qualification scope only')

    def api(path='', body=None):
        req = urllib.request.Request(origin + '/club/internal/study' + path,
            data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization': 'Bearer ' + env['ADAPTER_TOKEN'], 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.load(r)

    for attempt in range(90):
        try:
            state = api('/ratings')
            break
        except (OSError, ValueError):
            time.sleep(1)
    else:
        raise SystemExit('Qualification readiness timeout')
    assert not state['publicRatings'] and state['runId'] == run
    game = chess.pgn.read_game(io.StringIO(args.fixture.read_text()))
    assert game is not None and not game.errors
    moves = [m.uci() for m in game.mainline_moves()]
    assert len(moves) >= 145, 'Choose a long legal archived fixture'
    # Deliberately synthetic fixture snapshots, never research/model evidence.
    seats = ('pixel-moth', 'glitch-cat')
    policies = {color: {'version': 'native-no-wait-study-v1', 'runId': run,
        'addedHumanWait': False, 'production': {'bot': seat, 'qualificationFixture': True}}
        for color, seat in zip(('white', 'black'), seats)}
    created = api('', {'white': seats[0], 'black': seats[1], 'speed': 'rapid', 'policies': policies})
    started = time.monotonic()
    observed = []
    rollback = None
    delayed = False
    def failpoint(enabled):
        command = {'configureFailPoint': 'failCommand', 'mode': 'alwaysOn' if enabled else 'off',
            'data': {'failCommands': ['update'], 'blockConnection': True, 'blockTimeMS': 250}}
        subprocess.run(['/opt/nosweatchess/tools/node',
            '/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js',
            'mongodb://127.0.0.1:27028/admin', '--quiet', '--eval',
            'const r=db.adminCommand('+json.dumps(command)+');if(r.ok!==1)throw Error("Failpoint unavailable");'],
            check=True, capture_output=True)
    try:
        for ply, move in enumerate(moves):
            state = api()
            current = next(g for g in state['games'] if g['id'] == created['id'])
            actual = current['state']['moves'].split() if current['state']['moves'] else []
            observed.append({'seconds': time.monotonic() - started, 'ply': current['ply']})
            if current['ply'] != ply or actual != moves[:ply]:
                rollback = {'expectedPly': ply, 'returnedPly': current['ply'],
                    'seconds': time.monotonic() - started, 'prefixMatches': actual == moves[:len(actual)]}
                break
            api('/' + created['id'] + '/move', {'ply': ply, 'move': move})
            if time.monotonic() - started >= args.seconds:
                break
            until = time.monotonic() + 1.05
            while time.monotonic() < until:
                if args.delay_updates and not delayed and time.monotonic()-started >= 45:
                    failpoint(True)
                    delayed = True
                state = api()
                g = next(g for g in state['games'] if g['id'] == created['id'])
                if g['ply'] != ply+1:
                    rollback = {'expectedPly': ply+1, 'returnedPly': g['ply'],
                        'seconds': time.monotonic()-started, 'faultInjectedUpdateDelayMs': 250 if delayed else 0}
                    break
                time.sleep(.025)
            if rollback:
                break
    finally:
        if delayed:
            failpoint(False)
        api('/stop', {'runId': run})
    report = {'qualificationOnly': True, 'run': run, 'game': created['id'],
        'fixtureIsCalibrationEvidence': False, 'faultInjectedUpdateDelayMs': 250 if delayed else 0,
        'elapsedSeconds': time.monotonic() - started,
        'observed': observed, 'rollback': rollback, 'expectedRollback': args.expect_rollback}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'observed'}), flush=True)
    if args.expect_rollback:
        assert rollback is not None, 'Original rollback was not reproduced'
    else:
        assert rollback is None and report['elapsedSeconds'] >= args.seconds, 'Presence qualification failed'


if __name__ == '__main__':
    main()
