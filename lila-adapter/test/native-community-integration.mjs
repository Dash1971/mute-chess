// Explicit private native-stack qualification; never accepts a production origin.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import WebSocket from 'ws';
const origin='http://127.0.0.1:19663', key=generateSecretKey(), jar=new Map();
let ws, game;
const token=(await readFile('/home/dash/no-sweat-lila/config/adapter.env','utf8')).match(/^ADAPTER_TOKEN=(.+)$/m)[1];
async function call(path, body, options={}) {
  const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',redirect:'manual',
    headers:{Origin:origin,Accept:options.accept??'application/json',Cookie:options.anonymous?'':[...jar].map(([k,v])=>k+'='+v).join('; '),
      ...(body instanceof URLSearchParams?{}:{'Content-Type':'application/json'}),...options.headers},
    body:body===undefined?undefined:body instanceof URLSearchParams?body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  for(const c of response.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');if(!options.anonymous)jar.set(pair.slice(0,i),pair.slice(i+1));}
  const text=await response.text();assert.equal(response.status,options.status??200,path+': '+response.status+' '+text.slice(0,120));
  let data;try{data=JSON.parse(text);}catch{data=text;}return {data,response};
}
async function wait(fn,label){for(let i=0;i<100;i++){const value=await fn();if(value)return value;await delay(200);}throw new Error('Timed out: '+label);}
try {
  const pubkey=getPublicKey(key), challenge=(await call('/club/challenge',{pubkey})).data;
  const username='Community'+randomBytes(3).toString('hex');
  const body={challenge:challenge.challenge,username};
  const event=finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),content:'',tags:[['u',origin+'/club/login'],['method','POST'],['challenge',challenge.challenge],['payload',createHash('sha256').update(JSON.stringify(body)).digest('hex')]]},key);
  await call('/club/login',body,{headers:{Authorization:'Nostr '+Buffer.from(JSON.stringify(event)).toString('base64')}});
  await call('/forum/mute-feedback/form',undefined,{accept:'text/html'});
  await call('/forum/mute-feedback/new',new URLSearchParams({name:'Unqualified private fixture','post.text':'Private eligibility check.','post.gameId':'00000000','post.move':'c6 c8'}),{accept:'text/html',status:403});
  game=(await call('/club/play',{minutes:5,increment:3})).data;
  const playing=(await call('/game'+game.url)).data;
  ws=new WebSocket(`ws://127.0.0.1:19664/play/${game.url.slice(1)}/v5?sri=communitycheck&v=${playing.player.version}`,{headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  const listing=await wait(async()=>{
    const html=(await call('/games',undefined,{accept:'text/html',anonymous:true})).data;
    return html.includes('mini-game-'+game.id) && html;
  },'active game in current-games listing');
  const href=listing.match(new RegExp('href="([^"]+)" class="mini-game mini-game-'+game.id))?.[1];
  assert.ok(href && href.includes(game.id),'Native spectator link contains the public game ID');
  assert.ok(!listing.includes(game.url),'Current games never reveals the private player URL');
  if(playing.player.color==='black')await wait(async()=>((await call('/game'+game.url)).data.game.turns>=1),'Maia first move');
  const before=(await call('/game'+game.url)).data.game.turns;
  ws.send(JSON.stringify({t:'move',d:{u:playing.player.color==='white'?'e2e4':'e7e5',a:1}}));
  await wait(async()=>((await call('/game'+game.url)).data.game.turns>=before+2),'native move and Maia reply');
  const watcher=(await call('/game/'+game.id+'/white',undefined,{anonymous:true})).data;
  assert.equal(watcher.player.spectator,true,'Anonymous viewer has native spectator permissions');
  ws.send(JSON.stringify({t:'resign'}));
  await wait(async()=>!((await call('/games',undefined,{accept:'text/html',anonymous:true})).data.includes('href="/'+game.id)),'finished game leaves current pool');
  // Age only this disposable fixture in the private database to exercise the native posting gate.
  const command=`db.user4.updateOne({_id:${JSON.stringify(username.toLowerCase())}},{$set:{createdAt:new Date(Date.now()-3*86400000)}})`;
  execFileSync('/opt/club-maia/node-v24.22.1-linux-x64/bin/node',['/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js','mongodb://127.0.0.1:27018/nosweat_lila_dev','--quiet','--eval',command],{stdio:'pipe'});
  // Reload authentication after the fixture update; cached public profiles are untouched.
  await call('/logout',{});
  const challenge2=(await call('/club/challenge',{pubkey})).data;
  const login={challenge:challenge2.challenge};
  const signed=finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),content:'',tags:[['u',origin+'/club/login'],['method','POST'],['challenge',challenge2.challenge],['payload',createHash('sha256').update(JSON.stringify(login)).digest('hex')]]},key);
  await call('/club/login',login,{headers:{Authorization:'Nostr '+Buffer.from(JSON.stringify(signed)).toString('base64')}});
  await call('/forum/mute-feedback/form',undefined,{accept:'text/html'});
  const study=await call('/study',new URLSearchParams({pgn:'[Event "Private integration fixture"]\n\n1. e4 e5 2. Nf3 *'}),{status:303});
  const studyUrl=study.response.headers.get('location');assert.ok(/^\/study\/[A-Za-z0-9]{8}\/[A-Za-z0-9]{8}$/.test(studyUrl));
  const studyPage=(await call(studyUrl,undefined,{accept:'text/html'})).data;assert.ok(studyPage.includes('analyse.study'));
  const studyId=studyUrl.split('/')[2];
  await call('/study/'+studyId+'/import-pgn?sri=privatecheck',new URLSearchParams({pgn:'[Variant "Atomic"]\n\n1. e4 *'}),{status:400});
  const studySocket=new WebSocket(`ws://127.0.0.1:19664/study/${studyId}/socket/v5?sri=studyqualification`,{headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}});
  await new Promise((resolve,reject)=>{studySocket.once('open',resolve);studySocket.once('error',reject);});studySocket.close();
  const post=new URLSearchParams({name:'Private native forum qualification '+username,'post.text':'Disposable private-stack test of native forum posting.','post.gameId':'00000000','post.move':'c6 c8'});
  const topic=await call('/forum/mute-feedback/new',post,{status:303,accept:'text/html'});
  const location=topic.response.headers.get('location');assert.ok(location?.startsWith('/forum/mute-feedback/'));
  const page=(await call(location,undefined,{accept:'text/html',anonymous:true})).data;
  assert.match(page,/Disposable private-stack test/);
  console.log(JSON.stringify({ok:true,checks:['new accounts retain forum eligibility gate','active human-Maia game in native current-games listing','private player URL never exposed','native watcher permissions','Maia reply and live game progression','finished game removed','native study creation, socket and variant rejection','eligible private fixture can post through native form and captcha validation']}));
} finally {
  if(game)await call('/club/internal/'+game.id+'/failure',{}, {headers:{Authorization:'Bearer '+token}}).catch(()=>{});
  ws?.close();key.fill(0);
}
