"""CRITICAL: anonymous private/public/missing chapter authorization matrix.
Committed from the 23 November live checks (#383)."""
from pathlib import Path
import http.client,json,secrets,subprocess,sys
assert __import__('os').geteuid()==0
mode='after'  # Only the corrected authorization behavior is accepted.
study=secrets.token_hex(4);chapter=secrets.token_hex(4);owner='arena320names323fixture';marker='Security309 isolated chapter check'
node='/opt/nosweatchess/tools/node';shell='/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js'
def mongo(code):
 return subprocess.check_output([node,shell,'mongodb://127.0.0.1:27019/nosweat','--quiet','--eval',code],text=True,timeout=20).strip()
def get(query=''):
 c=http.client.HTTPConnection('127.0.0.1',29660,timeout=10);c.request('GET',f'/study/{study}/{chapter}/config'+query,headers={'Host':'mutechess.org','Accept':'application/json'});r=c.getresponse();data=r.read().decode();c.close();return r.status,data
study_doc={'_id':study,'name':marker,'members':{owner:{'role':'w'}},'position':chapter,'ownerId':owner,'visibility':'private','settings':{'computer':'everyone','explorer':'everyone'},'from':'scratch','likes':0}
chapter_doc={'_id':chapter,'studyId':study,'name':marker,'setup':{'variant':1,'orientation':True},'root':{'_':{'p':0,'f':'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}},'tags':[],'order':1,'ownerId':owner}
try:
 mongo('const s='+json.dumps(study_doc)+';const c='+json.dumps(chapter_doc)+';if(db.study.countDocuments({_id:s._id})||db.study_chapter_flat.countDocuments({_id:c._id}))throw Error("Fixture collision");s.createdAt=s.updatedAt=new Date();c.createdAt=new Date();db.study.insertOne(s);db.study_chapter_flat.insertOne(c);')
 private_status,raw=get();division_status,div=get('?divisionOnly=true')
 assert private_status==401 and marker not in raw,(private_status,raw[:160])
 assert division_status==401 and marker not in div,(division_status,div[:160])
 mongo('db.study.updateOne({_id:'+json.dumps(study)+',ownerId:'+json.dumps(owner)+'},{$set:{visibility:"public"}})')
 public_status,raw=get();assert public_status==200 and json.loads(raw)['name']==marker,(public_status,raw[:160])
 public_division_status,_=get('?divisionOnly=true');assert public_division_status==200,public_division_status
 result={'passed':True,'mode':mode,'anonymousPrivateConfig':private_status,'anonymousPrivateDivision':division_status,'anonymousPublicConfig':public_status,'anonymousPublicDivision':public_division_status}
finally:
 mongo('db.study_chapter_flat.deleteOne({_id:'+json.dumps(chapter)+',studyId:'+json.dumps(study)+',ownerId:'+json.dumps(owner)+'});db.study.deleteOne({_id:'+json.dumps(study)+',ownerId:'+json.dumps(owner)+',name:'+json.dumps(marker)+'});if(db.study.countDocuments({_id:'+json.dumps(study)+'})||db.study_chapter_flat.countDocuments({_id:'+json.dumps(chapter)+'}))throw Error("Fixture cleanup failed");')
if mode=='after':
 missing_status,_=get();assert missing_status==404,missing_status;result['missingAfterCleanup']=missing_status
print(json.dumps(result))
