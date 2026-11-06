#!/usr/bin/env python3
"""Import a pinned official catalog without replacing earned ratings or puzzle history."""
import argparse
import contextlib
import csv
import gzip
import hashlib
import io
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATABASES = (
    'mongodb://127.0.0.1:27018/nosweat_lila_dev',
    'mongodb://127.0.0.1:27019/nosweat',
    'mongodb://127.0.0.1:27029/nosweat_puzzle_catalog_test',
)
STARTER_ID = 'lichess-cc0-2026-10'


def puzzle_document(row, catalog_id):
    puzzle_id = row['PuzzleId']
    if not re.fullmatch(r'[A-Za-z0-9]{5}', puzzle_id):
        raise ValueError('Invalid puzzle ID')
    game = re.fullmatch(r'https://lichess\.org/(?:game/)?([A-Za-z0-9]{8})(?:[/#][^\s]*)?', row['GameUrl'])
    moves = row['Moves'].split()
    if not game or len(moves) < 2 or not all(re.fullmatch(r'[a-h][1-8][a-h][1-8][qrbn]?', m) for m in moves):
        raise ValueError('Invalid puzzle line/source')
    rating, deviation = int(row['Rating']), int(row['RatingDeviation'])
    popularity, plays = int(row['Popularity']), int(row['NbPlays'])
    if not 0 <= rating <= 9999 or deviation <= 0 or not -100 <= popularity <= 100 or plays < 0:
        raise ValueError('Invalid puzzle rating/popularity/plays')
    doc = {
        '_id': puzzle_id, 'gameId': game[1], 'fen': row['FEN'], 'line': row['Moves'],
        'glicko': {'r': float(rating), 'd': float(deviation), 'v': 0.09},
        'plays': plays, 'vote': popularity / 100, 'themes': row['Themes'].split(),
        'vu': 100 + popularity, 'vd': 100 - popularity, 'nosweatCatalog': catalog_id,
    }
    if row.get('OpeningTags'):
        doc['opening'] = row['OpeningTags'].split()
    if row.get('DailyDate'):
        doc['day'] = {'$date': int(row['DailyDate'])}
    return doc


def records(data, catalog_id=STARTER_ID):
    stream = io.StringIO(data.decode()) if isinstance(data, bytes) else data
    for row in csv.DictReader(stream):
        yield {'kind': 'puzzle', 'value': puzzle_document(row, catalog_id)}


@contextlib.contextmanager
def catalog_stream(archive, metadata):
    if metadata.get('format') == 'csv.zst':
        # zstd checks the complete compressed stream, including truncated input.
        process = subprocess.Popen(['zstd', '-dc', str(archive)], stdout=subprocess.PIPE)
        stream = io.TextIOWrapper(process.stdout, encoding='utf-8', newline='')
        try:
            yield stream
        except BaseException:
            stream.close()
            process.wait()
            raise
        else:
            stream.close()
            if process.wait() != 0:
                raise ValueError('Invalid or incomplete zstd catalog')
    else:
        with gzip.open(archive, 'rt', encoding='utf-8', newline='') as stream:
            yield stream


def verify_archive(archive, metadata):
    expected = metadata.get('archiveSha256', metadata.get('gzipSha256'))
    with archive.open('rb') as source:
        if hashlib.file_digest(source, 'sha256').hexdigest() != expected:
            raise ValueError('Catalog archive hash mismatch')
    if 'archiveBytes' in metadata and archive.stat().st_size != metadata['archiveBytes']:
        raise ValueError('Catalog archive size mismatch')


def prepare_records(archive, metadata, output):
    verify_archive(archive, metadata)
    count = 0
    catalog_id = metadata.get('id', STARTER_ID)
    target = output.open('x', encoding='ascii')
    try:
        with target, catalog_stream(archive, metadata) as source:
            for record in records(source, catalog_id):
                count += 1
                if count > metadata['count']:
                    raise ValueError('Catalog count exceeds pin')
                # ASCII JSON keeps the mongosh chunk reader independent of UTF-8 boundaries.
                target.write(json.dumps(record, ensure_ascii=True, separators=(',', ':')) + '\n')
        if count != metadata['count']:
            raise ValueError('Catalog count mismatch')
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    return count


def verify_paths_source():
    metadata = json.loads((ROOT / 'path-generator.json').read_text())
    if hashlib.sha256((ROOT / 'native-paths.js').read_bytes()).hexdigest() != metadata['sha256']:
        raise ValueError('Native path generator hash mismatch')


def validate_records(path, metadata_path, chessops):
    subprocess.run([
        'node', str(ROOT / 'validate.mjs'), str(chessops),
        '--records', str(path), '--metadata', str(metadata_path),
    ], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database', choices=DATABASES, nargs='?')
    parser.add_argument('--archive', type=Path, help='Downloaded pinned official .csv.zst')
    parser.add_argument('--starter', action='store_true', help='Use the bundled small development fixture')
    parser.add_argument('--mongosh')
    parser.add_argument('--chessops', type=Path, help='Pinned native Chessops package directory')
    parser.add_argument('--work-dir', type=Path, help='Scratch filesystem with room for full normalized records')
    parser.add_argument('--prepare-only', type=Path, help='Write normalized records without connecting to MongoDB')
    args = parser.parse_args()
    metadata_path = ROOT / ('catalog.json' if args.starter else 'full-catalog.json')
    metadata = json.loads(metadata_path.read_text())
    archive = args.archive or (ROOT / 'lichess.csv.gz' if args.starter else None)
    if archive is None:
        parser.error('--archive is required for the full catalog; see puzzles/README.md')
    if args.starter and args.database == DATABASES[1]:
        parser.error('The starter fixture is for development/testing, not the live catalog')
    if not args.prepare_only and not (args.database and args.mongosh and args.chessops):
        parser.error('Import requires database, --mongosh and --chessops')
    verify_paths_source()
    if args.prepare_only:
        count = prepare_records(archive, metadata, args.prepare_only)
        if args.chessops:
            validate_records(args.prepare_only, metadata_path, args.chessops)
        print(json.dumps({'preparedPuzzles': count, 'records': str(args.prepare_only), 'databaseTouched': False}))
        return
    with tempfile.TemporaryDirectory(prefix='nosweat-puzzles-', dir=args.work_dir) as directory:
        path = Path(directory) / 'records.jsonl'
        prepare_records(archive, metadata, path)
        validate_records(path, metadata_path, args.chessops)
        env = dict(os.environ, NSC_PUZZLE_RECORDS=str(path), NSC_PUZZLE_COUNT=str(metadata['count']),
                   NSC_PUZZLE_CATALOG=metadata.get('id', STARTER_ID), NSC_PUZZLE_PATHS=str(ROOT / 'native-paths.js'))
        subprocess.run([args.mongosh, args.database, '--quiet', '--file', str(ROOT / 'import.cjs')], env=env, check=True)


if __name__ == '__main__':
    main()
