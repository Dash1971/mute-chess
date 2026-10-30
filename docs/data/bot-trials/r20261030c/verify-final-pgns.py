from pathlib import Path
import collections, datetime, io, json, sys
import chess, chess.pgn
root=Path(sys.argv[1]);events=[json.loads(l) for l in (root/'events.jsonl').read_text().splitlines()]
finishes=[e for e in events if e['type']=='finish'];assert len(finishes)==200
moves=[e for e in events if e['type']=='move'];by_game=collections.defaultdict(list)
for e in moves:by_game[e['id']].append(e)
counts=collections.Counter((e['id'],e['ply']) for e in moves)
unique=sum(counts.values())-sum(n-1 for n in counts.values());all_plies=0;rollback_games=[];conflicts=[];duplicates=[]
for e in finishes:
 gid=e['id'];g=chess.pgn.read_game(io.StringIO((root/(gid+'.pgn')).read_text()));assert not g.errors,(gid,g.errors)
 board=g.board();sequence=[]
 for m in g.mainline_moves():
  assert m in board.legal_moves,(gid,m);sequence.append(m.uci());board.push(m)
 assert len(sequence)==e['result']['plies'],(gid,len(sequence),e['result']['plies'])
 result='1-0' if e['result'].get('winner')=='white' else '0-1' if e['result'].get('winner')=='black' else '1/2-1/2'
 assert g.headers['Result']==result,(gid,g.headers['Result'],result)
 if e['result']['status']=='mate':assert board.is_checkmate(),gid
 elif e['result']['status']=='stalemate':assert board.is_stalemate(),gid
 else:assert board.outcome(claim_draw=True) and board.outcome(claim_draw=True).result()==result,gid
 seen={};previous=-1
 for m in by_game[gid]:
  ply=m['ply'];assert ply<len(sequence),(gid,ply,len(sequence))
  if m['move']!=sequence[ply]:conflicts.append({'game':gid,'ply':ply,'event':m['move'],'pgn':sequence[ply]})
  if ply<previous and gid not in rollback_games:rollback_games.append(gid)
  previous=ply
  if ply in seen:duplicates.append({'game':gid,'ply':ply,'sameMove':seen[ply]==m['move']})
  seen[ply]=m['move']
 assert set(seen)==set(range(len(sequence))),(gid,'missing submissions')
 all_plies+=len(sequence)
assert not conflicts,conflicts
assert all(d['sameMove'] for d in duplicates)
assert all_plies==unique,(all_plies,unique)
start=datetime.datetime.fromisoformat(moves[0]['at'].replace('Z','+00:00'));end=datetime.datetime.fromisoformat(moves[-1]['at'].replace('Z','+00:00'))
report={'games':len(finishes),'allFinalPGNsLegal':True,'nativeFinishPlyAndResultMatch':True,'terminalStatesMatch':True,'submissionEvents':len(moves),'finalNativePlies':all_plies,'duplicateGamePlySubmissions':len(duplicates),'gamesWithObservedPlyRollback':rollback_games,'allRepeatedMovesMatchFinalPGN':True,'conflictingMoves':conflicts,'observedSeconds':(end-start).total_seconds(),'uniqueNativePliesPerSecond':all_plies/(end-start).total_seconds(),'interpretation':'Repeated work is retained in raw evidence. Distinct completed games/perfs are not duplicated. All repeated submissions follow the identical final legal PGN sequence. Headless round-lifecycle behavior needs a separate fix/qualification before another trial.'}
(root/'integrity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
