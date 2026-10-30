#!/usr/bin/env python3
"""Reproduce the compact CC0 opening table from Mobile Maia's pinned TSV."""
import csv
import json
from pathlib import Path
import re
import shutil
import sys

source, native = map(Path, sys.argv[1:])
rows = list(csv.DictReader(source.open(), delimiter='\t'))
assert len(rows) == 3810
assert all(re.fullmatch(r'[A-E]\d{2}', row['eco']) and len(row['epd'].split()) == 4 for row in rows)
destination = native / 'public/nosweat'
destination.mkdir(parents=True, exist_ok=True)
(destination / 'openings.json').write_text(json.dumps(
    [[row['epd'], row['eco'], row['name']] for row in rows],
    ensure_ascii=False, separators=(',', ':')) + '\n')
shutil.copyfile(source.parent / 'LICHESS_OPENINGS_CC0.txt', destination / 'OPENINGS_CC0.txt')
