#!/usr/bin/env python3
"""Add missing licensed practice lessons and empty native forum categories.
Only the two isolated Mute Chess databases are accepted. No users, games,
permissions, existing lessons, posts or learner progress are replaced.
"""
import argparse, hashlib, json, os, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def verify():
    meta=json.loads((ROOT/'catalog.json').read_text())
    data={}
    for name,sha in meta['files'].items():
        blob=(ROOT/name).read_bytes()
        if hashlib.sha256(blob).hexdigest()!=sha: raise ValueError('Lesson hash mismatch: '+name)
        data[name]=[json.loads(l) for l in blob.decode().splitlines()]
    if len(data['studies.jsonl'])!=meta['studies'] or len(data['chapters.jsonl'])!=meta['chapters']: raise ValueError('Lesson count mismatch')
    ids={s['_id'] for s in data['studies.jsonl']}
    for s in data['studies.jsonl']:
        if s['ownerId']!='lichess' or s['members'] or s['uids'] or s['likers'] or s['visibility']!='public' or s['noSweatLesson']!=meta['marker']: raise ValueError('Unsafe lesson ownership')
    for c in data['chapters.jsonl']:
        if c['studyId'] not in ids or c['ownerId']!='lichess' or c['setup']['variant']!={'$numberInt':'1'} or c['noSweatLesson']!=meta['marker']: raise ValueError('Unsafe chapter')
    return meta

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('database',choices=['mongodb://127.0.0.1:27018/nosweat_lila_dev','mongodb://127.0.0.1:27019/nosweat'])
    p.add_argument('--mongosh',required=True);a=p.parse_args();verify()
    subprocess.run([a.mongosh,a.database,'--quiet','--file',str(ROOT/'import.cjs')],env={**os.environ,'MUTE_LEARNING_ROOT':str(ROOT)},check=True)
