"""Fail-closed evidence checks for the single owner-authorized validation tail."""
import datetime as dt
import hashlib
import json
import math
import re
import os
import stat
from pathlib import Path

PROFILE = 'strength-validation-continuation-v1'
RUN = 'r20261031p137'
ORIGINAL_MAIN = 'f656d5c22b062646cc48c54feced50cb2c6710f6'
MODEL_VERSION = 'strength137-ridge-rbf-v1'
MODEL_SHA256 = '3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010'
ADMISSION_END = int(dt.datetime.fromisoformat('2026-10-31T12:30:00+00:00').timestamp()*1000)
DEADLINE = int(dt.datetime.fromisoformat('2026-10-31T13:00:00+00:00').timestamp()*1000)
ORIGINAL_ADMISSION_END = int(dt.datetime.fromisoformat('2026-10-31T10:04:39+00:00').timestamp()*1000)
FILES = ('checkpoint.json', 'supervisor.json', 'events.jsonl', 'combined-roster.json',
         'experiment-manifest.json', 'training-ratings.json', 'frozen-predictor.json', 'resources.jsonl')


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def digest(value):
    return hashlib.sha256(value).hexdigest()


def compact_json_bytes(data):
    # JSON.stringify(value, null, 2) and JSON.stringify(value) differ only in
    # unquoted whitespace. Preserve original numeric/Unicode serialization.
    result, quoted, escaped = bytearray(), False, False
    for char in data:
        if quoted:
            result.append(char)
            if escaped:
                escaped = False
            elif char == 92:
                escaped = True
            elif char == 34:
                quoted = False
        elif char == 34:
            quoted = True
            result.append(char)
        elif char not in b' \t\r\n':
            result.append(char)
    return bytes(result)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def records_by_id(records):
    require(isinstance(records, list), 'Missing native record array')
    result = {}
    for record in records:
        require(record['id'] not in result, 'Duplicate native game ID')
        require(record.get('state') == 'finished' and record.get('result', {}).get('ratedUpdate') is True,
                'Every predecessor game must be finished and natively rated')
        result[record['id']] = {k: record[k] for k in ('id', 'white', 'black', 'speed', 'state', 'result')}
    return result


def validate_predecessor(directory, run, native_records, now, integrity_audit):
    """Read-only. Return an immutable predecessor receipt; never trust perfs to reset data."""
    require(run == RUN, 'Continuation is restricted to the dated owner-approved run')
    require(ORIGINAL_ADMISSION_END <= now < ADMISSION_END, 'Outside continuation admission window')
    directory = Path(directory)
    payloads = {}
    for name in FILES:
        path = directory/name
        require(path.is_file() and not path.is_symlink(), 'Missing or linked predecessor file: '+name)
        payloads[name] = path.read_bytes()
    read = lambda name: json.loads(payloads[name])
    checkpoint, supervisor = read('checkpoint.json'), read('supervisor.json')
    initial, latest = checkpoint['initial'], checkpoint['latest']
    manifest, roster, model = read('experiment-manifest.json'), read('combined-roster.json'), read('frozen-predictor.json')
    expected_manifest = json.loads((Path(__file__).resolve().parents[2]/'lila-adapter/experiment-manifest.json').read_text())
    require(manifest == expected_manifest, 'Predecessor manifest differs from reviewed source')
    events = [json.loads(line) for line in payloads['events.jsonl'].splitlines()]
    require(checkpoint.get('run') == run and checkpoint.get('main') == ORIGINAL_MAIN and
            checkpoint.get('publicRatings') is True and not checkpoint.get('failure'), 'Predecessor source/scope/failure mismatch')
    require(initial.get('profile') == 'strength-predictor-v1' and initial.get('maximumAdmitted') == 3000 and
            initial.get('maximumConcurrency') == 22 and initial.get('workerCount') == 2 and
            initial.get('modelSha256') == MODEL_SHA256 and
            initial.get('admissionEnd') == ORIGINAL_ADMISSION_END and
            initial.get('deadline') == int(dt.datetime.fromisoformat(manifest['hardStopUtc']).timestamp()*1000),
            'Predecessor budget/model/deadline mismatch')
    require(supervisor.get('run') == run and supervisor.get('commit') == ORIGINAL_MAIN and
            supervisor.get('profile') == 'strength-predictor-v1' and supervisor.get('reason') == 'completed' and
            supervisor.get('configurationRestored') is True and
            ORIGINAL_ADMISSION_END <= supervisor.get('ended', 0) <= now, 'Predecessor did not complete normal cleanup')
    require(latest.get('closed') is True and not latest.get('games') and latest.get('publicGames') == 0,
            'Predecessor checkpoint is not cleanly closed')
    records = records_by_id(latest['records'])
    admitted = latest['admitted']
    require(2000 <= admitted < 3000 and admitted == len(records), 'No eligible validation remainder')
    require(records_by_id(native_records) == records, 'Native records changed or do not match predecessor checkpoint')
    pgn_hashes = {}
    for game_id in records:
        require(re.fullmatch(r'[A-Za-z0-9]{8}', game_id), 'Invalid native game ID')
        pgn = directory/(game_id+'.pgn')
        require(pgn.is_file() and not pgn.is_symlink() and pgn.stat().st_size > 0, 'Missing final PGN: '+game_id)
        pgn_hashes[game_id] = digest(pgn.read_bytes())
    require(integrity_audit.get('version') == 'strength137-integrity-v1' and
            integrity_audit.get('readOnly') is True and integrity_audit.get('errors') == [] and
            integrity_audit.get('run') == run and integrity_audit.get('sourceMain') == ORIGINAL_MAIN and
            integrity_audit.get('dependencies') == {'chess': '1.11.2'} and
            integrity_audit.get('checkedFinishedGames') == admitted and
            integrity_audit.get('uniqueVerifiedPlies') == sum(r['result']['plies'] for r in records.values()) and
            integrity_audit.get('acknowledgedPlies') == integrity_audit.get('uniqueVerifiedPlies'),
            'Missing/incomplete predecessor integrity audit')
    require(integrity_audit.get('sourceSha256') == {
        name: digest(Path(__file__).with_name(name).read_bytes()) for name in ('audit.py', 'continuation.py')},
        'Unpinned predecessor auditor source')
    require(integrity_audit.get('inputSha256') == {name: digest(value) for name, value in payloads.items()} and
            integrity_audit.get('pgnSha256') == pgn_hashes and
            integrity_audit.get('recordsSha256') == digest(canonical([records[k] for k in sorted(records)]).encode()),
            'Predecessor audit/input hash mismatch')
    admissions = [e for e in events if e['type'] == 'admission']
    finishes = [e for e in events if e['type'] == 'finish']
    freezes = [e for e in events if e['type'] == 'predictions-frozen']
    require(len(admissions) == admitted and {e['id'] for e in admissions} == set(records), 'Admission evidence mismatch')
    require(len(finishes) == admitted and {e['id'] for e in finishes} == set(records), 'Finish evidence mismatch')
    require(records_by_id(finishes) == records, 'Finished result evidence mismatch')
    require(all(records[e['id']]['white'] == e['white'] and records[e['id']]['black'] == e['black'] and
                records[e['id']]['speed'] == e['speed'] for e in admissions), 'Admission seat evidence mismatch')
    require(not any(e['type'] in ('failure', 'stop-error', 'checkpoint-error') for e in events), 'Predecessor contains failure evidence')
    require(events[-1]['type'] == 'end' and not events[-1].get('failure') and events[-1].get('completed') == admitted,
            'Predecessor has no clean final worker receipt')
    require(len(freezes) == 1 and freezes[0]['admitted'] == 2000 and freezes[0]['heldout'] == 50 and
            freezes[0]['sha256'] == digest(payloads['frozen-predictor.json']), 'Frozen primary model receipt mismatch')
    training, heldout = set(manifest['trainingIds']), set(manifest['heldoutIds'])
    require(len(training) == 200 and len(heldout) == 50 and not training & heldout and
            len(roster) == 250 and {b['id'] for b in roster} == training | heldout, 'Roster/split mismatch')
    # Original roster hash is JSON.stringify-compatible; source file was emitted by that exact worker.
    roster_hash = digest(compact_json_bytes(payloads['combined-roster.json']))
    require(roster_hash == manifest['combinedRosterSha256'] == initial['rosterSha256'] == model['rosterSha256'],
            'Frozen roster hash mismatch')
    require(model.get('version') == MODEL_VERSION and model.get('trainingIds') == manifest['trainingIds'] and
            model.get('heldoutIds') == manifest['heldoutIds'], 'Primary model/split changed')
    for speed in ('blitz', 'rapid'):
        predictions = model['speeds'][speed]['predictions']
        require(set(predictions) == training | heldout and all(
            isinstance(p.get('rating'), (float, int)) and math.isfinite(p['rating']) for p in predictions.values()),
            'Missing/nonfinite frozen predictions')
    require(set(read('training-ratings.json')) == training | heldout, 'Training snapshot roster mismatch')
    require(manifest.get('maximumAdmitted') == 3000 and manifest.get('stages') ==
            {'warmupEnd': 200, 'trainingEnd': 2000, 'validationEnd': 3000}, 'Original stage budget changed')
    freeze_index = events.index(freezes[0])
    for index, event in enumerate(events):
        if event['type'] != 'admission':
            continue
        seats = {event['white'], event['black']}
        has_heldout = bool(seats & heldout)
        if has_heldout:
            require(index > freeze_index and len(seats & heldout) == 1 and len(seats & training) == 1,
                    'Held-out admission/freeze boundary violated')
        require(all(event['policies'][color].get('runId') == run and
                    event['policies'][color].get('addedHumanWait') is False for color in ('white', 'black')),
                'Predecessor study policy scope changed')
    return {'version': PROFILE, 'runId': run, 'predecessorMain': ORIGINAL_MAIN,
            'predecessorEnded': supervisor['ended'], 'admittedAtResume': admitted,
            'maximumAdmitted': 3000, 'maximumConcurrency': 22, 'workerCount': 2,
            'admissionEnd': ADMISSION_END, 'deadline': DEADLINE,
            'modelVersion': MODEL_VERSION, 'modelSha256': digest(payloads['frozen-predictor.json']),
            'recordsSha256': digest(canonical([records[k] for k in sorted(records)]).encode()),
            'predecessorPgnSha256': pgn_hashes,
            'integrityAuditSha256': digest((json.dumps(integrity_audit, indent=2)+'\n').encode()),
            'storageBudget': {'limitBytes': 1024**3, 'basis':
                'Full current Mongo storage and indexes plus both original and continuation evidence directories, including protected copies'},
            'predecessorFiles': {name: digest(value) for name, value in payloads.items()}}


def continuation_storage_usage(mongo_bytes, predecessor_bytes, continuation_bytes):
    values = (mongo_bytes, predecessor_bytes, continuation_bytes)
    require(all(isinstance(value, int) and not isinstance(value, bool) and value >= 0 for value in values),
            'Invalid conservative continuation storage sample')
    return sum(values)


def copy_verified_evidence(source, target, expected_sha256):
    """Never follow a changed source link or expose mismatched bytes in the new snapshot."""
    fd = os.open(source, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as stream:
        require(stat.S_ISREG(os.fstat(stream.fileno()).st_mode), 'Evidence source is not a regular file')
        payload = stream.read()
    require(digest(payload) == expected_sha256, 'Evidence changed before protected copy')
    with Path(target).open('xb') as stream:
        stream.write(payload)


def create_protected_directory(directory, group_id):
    """Grant worker traversal explicitly despite the root supervisor's 0077 umask."""
    directory = Path(directory)
    directory.mkdir(mode=0o750)
    os.chown(directory, 0, group_id)
    directory.chmod(0o750)
    return directory
