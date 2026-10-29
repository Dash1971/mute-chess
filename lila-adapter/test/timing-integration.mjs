// Private native stack only. Measures real Maia replies without changing owner data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { TIMING_VERSION } from '../policy.mjs';
const origin='http://127.0.0.1:19663',jar=new Map(),sockets=[],results=[];
const token=(await readFile('/home/dash/no-sweat-lila/config/adapter.env','utf8')).match(/^ADAPTER_TOKEN=(.+)$/m)[1];
let active;
async function call(path,body,admin=false){
  const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Accept:'application/json',
    Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body===undefined?{}:{'Content-Type':'application/json'}),...(admin?{Authorization:'Bearer '+token}:{})},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
  const text=await response.text();assert.equal(response.status,200,path+': '+text.slice(0,150));return JSON.parse(text);
}
async function wait(fn,label){for(let i=0;i<120;i++){const value=await fn();if(value)return value;await delay(80);}throw Error('Timed out '+label);}
function storedMoves(id){
  assert.match(id,/^[A-Za-z0-9]{8}$/);
  const code=`JSON.stringify(db.nosweat_game.findOne({_id:${JSON.stringify(id)}},{moves:1}).moves||{})`;
  return Object.values(JSON.parse(execFileSync('/opt/club-maia/node-v24.22.1-linux-x64/bin/node',[
    '/home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js','mongodb://127.0.0.1:27018/nosweat_lila_dev','--quiet','--eval',code],{encoding:'utf8'}))).map(value=>JSON.parse(value).timing);
}
try{
  for(const minutes of [1,5]){
    active=await call('/club/play',{minutes,increment:0,color:'white',rated:false});
    const state=(await call('/club/internal/games',undefined,true)).find(g=>g.id===active.id);
    assert.deepEqual(state.clock,{initial:minutes*60,increment:0});assert.equal(state.policy.timingVersion,TIMING_VERSION);
    let round=await call('/game'+active.url);
    const ws=new WebSocket(`ws://127.0.0.1:19664/play/${active.url.slice(1)}/v5?sri=timing${active.id}&v=${round.player.version}`,{headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>k+'='+v).join('; ')}});
    await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});sockets.push(ws);
    const roundTrips=[];
    for(let i=0;i<4;i++){
      round=await call('/game'+active.url);
      // Native PossibleMoves.json groups origin followed by legal destinations.
      const uci=round.possibleMoves.split(' ')[0].slice(0,4);
      const before=round.game.turns,started=performance.now();
      assert.match(uci,/^[a-h][1-8][a-h][1-8]$/);
      ws.send(JSON.stringify({t:'move',d:{u:uci,a:i+1}}));
      await wait(async()=> (await call('/game'+active.url)).game.turns>=before+2,'Maia reply');roundTrips.push(Math.round(performance.now()-started));
    }
    ws.send(JSON.stringify({t:'resign'}));await wait(async()=> (await call('/game'+active.url)).game.status.id>=30,'resignation');
    const timings=storedMoves(active.id);assert.equal(timings.length,4);
    for(const timing of timings){
      if(minutes===1)assert.ok(timing.targetMs>=275&&timing.targetMs<=3000);
      assert.ok(timing.actualMs>=Math.floor(timing.inferenceMs)-2,'inference counted within actual duration');
      assert.ok(timing.actualMs<=Math.max(timing.targetMs,timing.inferenceMs)+2000,'no second full delay after inference');
    }
    results.push({control:minutes+'+0',timings,roundTripMs:roundTrips});active=undefined;ws.close();
  }
  console.log(JSON.stringify({ok:true,timingVersion:TIMING_VERSION,results}));
}finally{
  if(active)await call('/club/internal/'+active.id+'/failure',{},true).catch(()=>{});
  for(const ws of sockets)ws.close();
}
