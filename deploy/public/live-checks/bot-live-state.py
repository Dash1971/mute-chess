"""CRITICAL: observe an existing real game advancing; never creates a game.
Committed from the 23 November live checks (#383)."""
from pathlib import Path
import http.client,json,time
assert __import__('os').geteuid()==0
token=next(l.split('=',1)[1].strip().strip('"') for l in Path('/etc/nosweatchess/adapter.env').read_text().splitlines() if l.startswith('ADAPTER_TOKEN='))
def get(path):
 c=http.client.HTTPConnection('127.0.0.1',29663,timeout=15);c.request('GET',path,headers={'Host':'mutechess.org','Authorization':'Bearer '+token});r=c.getresponse();assert r.status==200;rjson=json.loads(r.read());c.close();return rjson
activity=get('/club/internal/activity');first={g['id']:g['ply'] for g in get('/club/internal/games')}
assert activity['paused'] is False and activity['active']>0 and first
# One nonzero ply snapshot is not evidence of progress. Observe the same game.
until=time.monotonic()+60
while True:
 time.sleep(5)
 games=get('/club/internal/games')
 advancing=[{'id':g['id'],'before':first[g['id']],'after':g['ply']} for g in games if g['id'] in first and g['ply']>first[g['id']]]
 if advancing:break
 assert time.monotonic()<until,'No sampled real game advanced within 60 seconds'
assert get('/club/internal/activity')['paused'] is False
print(json.dumps({'passed':True,'class':'critical','admissionsOpen':True,'advancing':advancing}))
