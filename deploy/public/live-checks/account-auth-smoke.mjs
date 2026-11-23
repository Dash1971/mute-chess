// CRITICAL: signed rejection/replay guard, not proof of a successful session.
// Live wire verification with an intentionally rejected name: creates no account.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const require = createRequire('/opt/nosweatchess/current/lila-adapter/package.json');
const imported = await import(pathToFileURL(require.resolve('nostr-tools/pure')));
const { generateSecretKey, getPublicKey, finalizeEvent } = imported.default ?? imported;
const origin='https://mutechess.org';
const advisory=process.argv.includes('--advisory-copy');
const key=generateSecretKey(), pubkey=getPublicKey(key);
async function call(path,body,authorization) {
 const response=await fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Accept:'application/json','Accept-Language':'ja-JP',...(authorization?{Authorization:authorization}:{})},body:typeof body==='string'?body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 return {status:response.status,body:await response.json()};
}
try {
 const challenge=await call('/club/challenge',{pubkey});
 assert.equal(challenge.status,200);assert.match(challenge.body.challenge,/^[0-9a-f]{64}$/);assert.equal(challenge.body.expiresIn,60);
 const raw=JSON.stringify({challenge:challenge.body.challenge,username:'N'+pubkey.slice(0,19).toUpperCase()});
 const event=finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),content:'',tags:[['u',challenge.body.url],['method','POST'],['challenge',challenge.body.challenge],['payload',createHash('sha256').update(raw).digest('hex')]]},key);
 const authorization='Nostr '+Buffer.from(JSON.stringify(event)).toString('base64');
 const rejected=await call('/club/login',raw,authorization);
 assert.equal(rejected.status,409);assert.equal(rejected.body.code,'reserved_public_name');
 if(advisory) {
 const expected=readFileSync('/opt/nosweatchess/current/lila/translation/dest/site/ja-JP.xml','utf8').match(/<string name="muteChooseDifferentName">([^<]+)<\/string>/)?.[1];
 assert.ok(expected);assert.equal(rejected.body.error,expected);
 }
 const replay=await call('/club/login',raw,authorization);assert.equal(replay.status,401);
 const code='print(db.user4.countDocuments({nostr:'+JSON.stringify(pubkey)+'}))';
 const count=Number(execFileSync('/opt/nosweatchess/tools/node',['/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js','mongodb://127.0.0.1:27019/nosweat','--quiet','--eval',code],{encoding:'utf8'}).trim());assert.equal(count,0);
 const result={passed:true,class:advisory?'advisory':'critical',reservedNameStatus:409,replayStatus:401,localizedFeedbackChecked:advisory,locale:'ja-JP',accountCreated:false,existingUserCredentialsUsed:false};
 console.log(JSON.stringify(result));
} finally { key.fill(0); }
