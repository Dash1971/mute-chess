#!/usr/bin/env python3
"""Derive only current standard-chess lessons from pinned upstream BSON dumps.
Decode upstream study.bson/study_chapter_flat.bson with MongoDB bsondump first.
Never run upstream's destructive development-database seeder.
"""
import argparse, hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
PIN = 'b5d06f115c51d6f12167b9629fb21f087bf2e833'
MARKER = 'lichess-practice-' + PIN

def prepare(studies, chapters, sections):
    ids = set(re.findall(r'study\("([a-zA-Z0-9]{8})"', sections))
    studies = [s for s in studies if s['_id'] in ids]
    ids = {s['_id'] for s in studies}
    chapters = [c for c in chapters if c['studyId'] in ids]
    for s in studies:
        s['noSweatUpstream']={'repository':'https://github.com/lichess-org/lila-db-seed','commit':PIN,'ownerId':s['ownerId'],'contributors':sorted(s['members'])}
        s.update(visibility='public', ownerId='lichess', members={}, uids=[], likers=[], likes=0, views=0, noSweatLesson=MARKER)
        s['settings'].update(chat='nobody', shareable='everyone')
    for c in chapters:
        if c['setup']['variant'] != {'$numberInt': '1'}: raise ValueError('Only standard chess lessons are supported')
        c.update(ownerId='lichess', noSweatLesson=MARKER)
    return sorted(studies,key=lambda s:s['_id']), sorted(chapters,key=lambda s:s['_id'])

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('studies');p.add_argument('chapters');p.add_argument('sections')
    a=p.parse_args()
    studies,chapters=prepare(*[[json.loads(l) for l in Path(f).read_text().splitlines()] for f in (a.studies,a.chapters)],Path(a.sections).read_text())
    meta={'repository':'https://github.com/lichess-org/lila-db-seed','commit':PIN,'license':'MIT','marker':MARKER,'studies':len(studies),'chapters':len(chapters),'files':{}}
    for name,records in [('studies.jsonl',studies),('chapters.jsonl',chapters)]:
        data=''.join(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n' for d in records).encode()
        (ROOT/name).write_bytes(data);meta['files'][name]=hashlib.sha256(data).hexdigest()
    (ROOT/'catalog.json').write_text(json.dumps(meta,indent=2)+'\n')
