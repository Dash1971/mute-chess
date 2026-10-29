#!/usr/bin/env python3
"""Verify the pinned CC0 catalog and seed native Lila puzzle/path collections.
Only inserts absent puzzles; never resets local ratings, votes or user rounds.
Paths are namespaced and replaced only within this catalog's own IDs.
"""
import argparse, csv, datetime, gzip, hashlib, io, json, os, re, subprocess, tempfile
from collections import defaultdict
from pathlib import Path
ROOT = Path(__file__).resolve().parent

def records(data):
    groups = defaultdict(list)
    for row in csv.DictReader(io.StringIO(data.decode())):
        puzzle_id = row['PuzzleId']
        if not re.fullmatch(r'[A-Za-z0-9]{5}', puzzle_id): raise ValueError('Invalid puzzle ID')
        game = re.match(r'https://lichess.org/([A-Za-z0-9]{8})(?:/|#|$)', row['GameUrl'])
        moves = row['Moves'].split()
        if not game or len(moves) < 2 or not all(re.fullmatch(r'[a-h][1-8][a-h][1-8][qrbn]?', m) for m in moves): raise ValueError('Invalid puzzle line/source')
        rating = int(row['Rating']); popularity = int(row['Popularity'])
        themes = row['Themes'].split()
        doc = {'_id':puzzle_id, 'gameId':game[1], 'fen':row['FEN'], 'line':row['Moves'], 'glicko':{'r':float(rating),'d':float(row['RatingDeviation']),'v':0.09}, 'plays':int(row['NbPlays']), 'vote':popularity / 100, 'themes':themes, 'nosweatCatalog':'lichess-cc0-2026-10'}
        # Native vote counters use an explicit 200-weight prior derived from the exported popularity.
        doc.update(vu=100 + popularity, vd=100 - popularity)
        if row.get('DailyDate'): doc['day'] = {'$date':int(row['DailyDate'])}
        yield {'kind':'puzzle','value':doc}
        for theme in set(themes) | {'mix'}: groups[theme].append((rating,puzzle_id))
    generated = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    for theme, entries in sorted(groups.items()):
        buckets = defaultdict(list)
        for rating, puzzle_id in entries: buckets[rating // 100].append(puzzle_id)
        if len(entries) < 100:
            buckets = {15:[puzzle_id for _, puzzle_id in entries]}
        first,last = min(buckets),max(buckets)
        for bucket, ids in sorted(buckets.items()):
            ids.sort(key=lambda p:hashlib.sha256(f'{theme}:{p}'.encode()).digest())
            for tier in ('top','good','all'):
                prefix=f'{theme}|{tier}|'
                yield {'kind':'path','value':{'_id':f'{prefix}nsc202610-{bucket:02d}', 'min':f'{prefix}{0 if bucket == first else bucket * 100:04d}', 'max':f'{prefix}{9999 if bucket == last else bucket * 100 + 99:04d}', 'ids':ids, 'gen':generated, 'nosweatCatalog':'lichess-cc0-2026-10'}}

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database', choices=['mongodb://127.0.0.1:27018/nosweat_lila_dev','mongodb://127.0.0.1:27019/nosweat'])
    parser.add_argument('--mongosh', required=True)
    args=parser.parse_args()
    metadata=json.loads((ROOT/'catalog.json').read_text()); blob=(ROOT/'lichess.csv.gz').read_bytes()
    if hashlib.sha256(blob).hexdigest()!=metadata['gzipSha256']: raise ValueError('Catalog archive hash mismatch')
    data=gzip.decompress(blob)
    if hashlib.sha256(data).hexdigest()!=metadata['csvSha256']: raise ValueError('Catalog content hash mismatch')
    rows=list(records(data))
    if sum(r['kind']=='puzzle' for r in rows)!=metadata['count']: raise ValueError('Catalog count mismatch')
    with tempfile.TemporaryDirectory(prefix='nosweat-puzzles-') as directory:
        path=Path(directory)/'records.jsonl';path.write_text(''.join(json.dumps(r)+'\n' for r in rows))
        env={**os.environ,'NSC_PUZZLE_RECORDS':str(path)}
        subprocess.run([args.mongosh,args.database,'--quiet','--file',str(ROOT/'import.cjs')],env=env,check=True)
