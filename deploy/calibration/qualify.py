#!/usr/bin/env python3
"""Exercise the migration in a new, disposable loopback Mongo namespace. No games/inference."""
import argparse
import json
from pathlib import Path
import secrets
import subprocess

from rating_plan import build, digest, double, now


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('node', 'mongosh', 'roster', 'reference', 'output'):
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(mode=0o700, parents=True, exist_ok=False)
    directory = Path(__file__).resolve().parent
    name = 'nosweat_calibration_qrating103_' + secrets.token_hex(4)
    uri = 'mongodb://127.0.0.1:27028/' + name
    assert name.startswith('nosweat_calibration_q') and len(name.removeprefix('nosweat_calibration_')) <= 32
    roster = json.loads(args.roster.read_text())
    reference = json.loads(args.reference.read_text())
    checks = []

    def shell(js, expect=None):
        source = args.output / 'fixture.js'
        source.write_text('if(db.getName()!==' + json.dumps(name) + ')throw Error("Private namespace only");\n' + js)
        result = subprocess.run([str(args.node), str(args.mongosh), uri, '--quiet', '--file', str(source)],
                                text=True, capture_output=True, timeout=40)
        if expect:
            assert result.returncode and expect in result.stderr + result.stdout, result.stderr + result.stdout
            return
        assert result.returncode == 0, result.stderr + result.stdout
        return result.stdout.strip()

    def database(mode, plan=None, expect=None, **extra):
        request = {'mode': mode, **extra}
        if plan:
            text = json.dumps(plan, indent=2) + '\n'
            import hashlib
            request.update(planJson=text, planSha256=hashlib.sha256(text.encode()).hexdigest())
        path = args.output / 'request.json'
        path.write_text(json.dumps(request))
        import os
        result = subprocess.run([str(args.node), str(args.mongosh), uri, '--quiet', '--file',
                                 str(directory / 'database.js')], text=True, capture_output=True, timeout=40,
                                env=dict(os.environ, MUTE_ADJUST_REQUEST=str(path)))
        if expect:
            assert result.returncode and expect in result.stderr + result.stdout, result.stderr + result.stdout
            return
        assert result.returncode == 0, result.stderr + result.stdout
        return json.loads(result.stdout)

    assert shell('print(db.getCollectionNames().length)') == '0'
    users, perfs = [], []
    for index, bot in enumerate(sorted(roster, key=lambda b: b['username'].lower())):
        user_id = bot['username'].lower()
        users.append({'_id': user_id, 'noSweatBot': True, 'title': 'BOT', 'enabled': True})
        p = {'_id': user_id, 'unknownPreservedField': {'future': 'unchanged'}}
        for speed in ('blitz', 'rapid', 'bullet', 'classical', 'ultraBullet', 'correspondence'):
            played = speed in ('blitz', 'rapid') or (speed == 'bullet' and index < 3)
            p[speed] = {'gl': {'r': double(1500.5 + index), 'd': double(130 if played else 200),
                              'v': double(.09)}, 'nb': {'$numberInt': '1' if played else '0'},
                        'la': {'$date': {'$numberLong': '1793350000000'}}, 're': [{'$numberInt': '1490'}]}
        if index < 30:
            p['standard'] = {'gl': {'r': double(1510.5 + index), 'd': double(100), 'v': double(.09)},
                             'nb': {'$numberInt': '10'}, 'la': {'$date': {'$numberLong': '1793350000000'}}}
        perfs.append(p)
    shell('db.user4.insertMany(' + json.dumps(users) + ');\n' +
          'db.user_perf.insertMany(EJSON.deserialize(' + json.dumps(perfs) + ',{relaxed:false}));\n' +
          'db.user4.insertMany([{_id:"qualificationhuman",enabled:true},{_id:"qualificationapibot",title:"BOT"}]);\n' +
          'db.user_perf.insertMany([{_id:"qualificationhuman",blitz:{gl:{r:1600,d:80,v:.09},nb:90}},' +
          '{_id:"qualificationapibot",blitz:{gl:{r:2000,d:100,v:.09},nb:4}}]);\n' +
          'db.game5.insertOne({_id:"qualpast",s:30,players:["unchanged"]});\n' +
          'db.history.insertOne({_id:"qualhistory",ratings:[1500,1490]});')
    native_types = {f'{speed}.gl.{field}': {'$toDouble': f'${speed}.gl.{field}'}
                    for speed in ('blitz', 'rapid', 'bullet', 'classical', 'ultraBullet', 'correspondence')
                    for field in ('r', 'd', 'v')}
    shell('db.user_perf.updateMany({_id:{$in:' + json.dumps([p['_id'] for p in perfs]) + '}},' +
          json.dumps([{'$set': native_types}]) + ')')
    shell('db.user_perf.updateMany({"standard.nb":{$gt:0}},' + json.dumps([{'$set': {
        f'standard.gl.{f}': {'$toDouble': f'$standard.gl.{f}'} for f in ('r', 'd', 'v')}}]) + ')')
    immutable = shell('print(EJSON.stringify({users:db.user4.find().sort({_id:1}).toArray(),' +
                      'otherPerfs:db.user_perf.find({_id:{$in:["qualificationhuman","qualificationapibot"]}}).sort({_id:1}).toArray(),' +
                      'games:db.game5.find().toArray(),history:db.history.find().toArray()},{relaxed:false}))')
    snapshot = database('snapshot')
    plan = build(snapshot, roster, reference, 'a' * 40, now())
    (args.output / 'before.json').write_text(json.dumps(snapshot, indent=2) + '\n')
    (args.output / 'plan.json').write_text(json.dumps(plan, indent=2) + '\n')
    backup = {'path': 'qualification-only.enc', 'sha256': '0' * 64}
    # A changed game count invalidates the reviewed plan before any cohort write.
    first = plan['rows'][0]['id']
    shell('db.user_perf.updateOne({_id:' + json.dumps(first) + '},{$inc:{"blitz.nb":1}})')
    database('prepare', plan, expect='Stale/changed perf', backup=backup)
    shell('db.user_perf.updateOne({_id:' + json.dumps(first) + '},{$inc:{"blitz.nb":-1}})')
    checks.append('stale-plan-rejected-before-writes')
    database('prepare', plan, backup=backup)
    assert database('snapshot') == snapshot
    checks.append('prepare-writes-only-audit')
    database('resume', plan, expect='Injected qualification failure', testFailAfter=7)
    mixed = database('snapshot')
    assert sum(a != b for a, b in zip(snapshot['perfs'], mixed['perfs'])) == 7
    database('apply', plan, expect='already recorded', backup=backup)
    changed = dict(plan, createdAtUtc='2026-10-30T00:00:00+00:00')
    database('resume', changed, expect='original recorded plan')
    checks.append('partial-write-and-repeated-apply-guard')
    result = database('resume', plan)
    assert result['written'] == 37
    database('verify', plan)
    after = database('snapshot')
    assert after['perfs'] == [r['after'] for r in plan['rows']]
    database('resume', plan, expect='Cannot resume')
    checks.append('resume-never-subtracts-twice')
    shell('db.user_perf.updateOne({_id:' + json.dumps(first) + '},{$inc:{"rapid.nb":1}})')
    database('restore', plan, expect='Stale/changed perf')
    shell('db.user_perf.updateOne({_id:' + json.dumps(first) + '},{$inc:{"rapid.nb":-1}})')
    checks.append('restore-rejects-intervening-results')
    database('restore', plan, expect='Injected qualification failure', testFailAfter=5)
    database('restore', plan)
    database('verify', plan)
    assert database('snapshot') == snapshot
    assert database('restore', plan)['status'] == 'already-restored'
    checks.append('partial-restore-recovery-and-exact-before-images')
    current_immutable = shell('print(EJSON.stringify({users:db.user4.find().sort({_id:1}).toArray(),' +
                             'otherPerfs:db.user_perf.find({_id:{$in:["qualificationhuman","qualificationapibot"]}}).sort({_id:1}).toArray(),' +
                             'games:db.game5.find().toArray(),history:db.history.find().toArray()},{relaxed:false}))')
    assert immutable == current_immutable
    checks.append('humans-unmanaged-bots-users-games-history-untouched')
    shell('db.game5.insertOne({_id:"qualactive",s:20})')
    database('prepare', plan, expect='Active games/reservations', backup=backup)
    checks.append('active-game-guard')
    import hashlib
    report = {'qualificationOnly': True, 'database': name, 'identities': 44, 'poolRatings': 176,
              'derivedStandardSnapshots': 30,
              'earnedBulletPreserved': 3, 'checks': checks, 'noInferenceOrPublicWrites': True,
              'beforeSha256': digest(snapshot), 'restoredExactly': True,
              'codeSha256': {name: hashlib.sha256((directory / name).read_bytes()).hexdigest()
                             for name in ('rating_plan.py', 'database.js', 'qualify.py')}}
    (args.output / 'qualification.json').write_text(json.dumps(report, indent=2) + '\n')
    shell('db.dropDatabase()')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
