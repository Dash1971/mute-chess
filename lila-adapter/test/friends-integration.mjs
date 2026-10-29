// Private native stack only. Disposable Nostr identities; no owner credentials.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import WebSocket from 'ws';
const origin = 'http://127.0.0.1:19663', run = randomBytes(3).toString('hex'), sockets = [];
class Client {
  jar = new Map();
  cookie() { return [...this.jar].map(([k,v]) => k+'='+v).join('; '); }
  async request(path, body, status = 200, extra = {}) {
    const response = await fetch(origin+path, { method: body === undefined ? 'GET' : 'POST', redirect:'manual',
      headers: { Origin:origin, Accept:'application/json', 'X-Requested-With':'XMLHttpRequest', Cookie:this.cookie(),
        ...(body !== undefined && !(body instanceof URLSearchParams) ? {'Content-Type':'application/json'} : {}), ...extra },
      body: body === undefined ? undefined : body instanceof URLSearchParams ? body : JSON.stringify(body),
      signal:AbortSignal.timeout(30000) });
    for (const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0], i=pair.indexOf('='); this.jar.set(pair.slice(0,i),pair.slice(i+1)); }
    const text = await response.text(); assert.equal(response.status,status,path+': '+text.slice(0,200));
    try { return JSON.parse(text); } catch { return text; }
  }
  async login(suffix) {
    const key=generateSecretKey(), pubkey=getPublicKey(key);
    const {challenge}=await this.request('/club/challenge',{pubkey});
    const body={challenge,username:'Friends'+run+suffix}, raw=JSON.stringify(body);
    const event=finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),content:'',tags:[
      ['u',origin+'/club/login'],['method','POST'],['challenge',challenge],['payload',createHash('sha256').update(raw).digest('hex')],
    ]},key);key.fill(0);
    const result=await this.request('/club/login',body,200,{Authorization:'Nostr '+Buffer.from(JSON.stringify(event)).toString('base64')});
    this.username=result.user?.username ?? result.username;assert.ok(this.username,JSON.stringify(result));
  }
}
const setup = overrides => new URLSearchParams({variant:'1',timeMode:'1',time:'5',increment:'3',days:'2',mode:'1',color:'white',...overrides});
async function waitFor(fn, name) { for(let i=0;i<80;i++){const value=await fn();if(value)return value;await delay(150);}throw Error('Timed out '+name); }
async function connect(client, fullId, version) {
  const ws = new WebSocket(`ws://127.0.0.1:19664/play/${fullId}/v5?sri=friends${run}${sockets.length}&v=${version}`,{headers:{Cookie:client.cookie(),Origin:origin}});
  ws.events=[];ws.on('message',raw=>{try{const event=JSON.parse(String(raw));ws.events.push(...(event.t==='b'?event.d:[event]));}catch{}});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});sockets.push(ws);return ws;
}
try {
  const a=new Client(),b=new Client(),stranger=new Client(),guest=new Client();
  await a.login('A');await b.login('B');await stranger.login('C');
  const home=await a.request('/',undefined,200,{Accept:'text/html'});
  assert.match(home,/id="friend_box"/);assert.match(home,/id="challenge-toggle"/);assert.doesNotMatch(home,/id="notify-toggle"|id="clinput"/);
  await a.request('/challenge');await b.request('/challenge');
  await a.request('/rel/follow/'+b.username,{});await b.request('/rel/follow/'+a.username,{});
  const following=await a.request('/@/'+a.username+'/following',undefined,200,{Accept:'text/html'});assert.match(following,new RegExp(b.username,'i'));
  const invite=await a.request('/setup/friend?user='+b.username,setup());
  const id=invite.challenge.id;assert.equal(invite.challenge.destUser.id,b.username.toLowerCase());
  assert.ok((await b.request('/challenge')).in.some(c=>c.id===id),'recipient receives native invitation');
  await stranger.request('/challenge/'+id+'/accept',{},404);
  await b.request('/challenge/'+id+'/accept',{},303,{Accept:'text/html'});
  const white=await a.request('/game/'+id),black=await b.request('/game/'+id);
  assert.equal(white.player.color,'white');assert.equal(black.player.color,'black');
  assert.notEqual(white.opponent.user.title,'BOT');assert.equal(white.clock.initial,300);assert.equal(white.clock.increment,3);assert.equal(white.game.rated,true);
  const wa=await connect(a,id+white.player.id,white.player.version),wb=await connect(b,id+black.player.id,black.player.version);
  wa.send(JSON.stringify({t:'move',d:{u:'e2e4',a:1}}));
  await waitFor(async()=> (await b.request('/game/'+id)).game.turns===1,'white move');
  wb.send(JSON.stringify({t:'move',d:{u:'e7e5',a:1}}));
  await waitFor(async()=> (await a.request('/game/'+id)).game.turns===2,'black move');
  wa.send(JSON.stringify({t:'move',d:{u:'g1f3',a:2}}));
  await waitFor(async()=> (await b.request('/game/'+id)).game.turns===3,'second white move');
  wb.send(JSON.stringify({t:'move',d:{u:'b8c6',a:2}}));
  await waitFor(async()=> (await a.request('/game/'+id)).game.turns===4,'second black move');
  wa.send(JSON.stringify({t:'resign'}));
  await waitFor(async()=> (await b.request('/game/'+id)).game.status.id>=30,'native resignation');
  const pgn=await a.request('/game/export/'+id,undefined,200,{Accept:'application/x-chess-pgn'});assert.match(pgn,/1\. e4[\s\S]*e5[\s\S]*2\. Nf3[\s\S]*Nc6/);
  await waitFor(async()=> (await a.request('/@/'+a.username+'/all',undefined,200,{Accept:'text/html'})).includes(id),'native game history');
  wa.send(JSON.stringify({t:'rematch-yes'}));
  await waitFor(()=>wb.events.some(e=>e.t==='rematchOffer'||e.d?.t==='rematchOffer'),'rematch offer');
  wb.send(JSON.stringify({t:'rematch-yes'}));
  const redirect=await waitFor(()=>wa.events.find(e=>e.t==='redirect')?.d,'mutually accepted rematch');
  assert.match(redirect.id,/^[A-Za-z0-9]{12}$/);
  const rematch=await a.request('/game/'+redirect.id);assert.equal(rematch.player.color,'black');
  assert.equal(rematch.clock.initial,300);assert.equal(rematch.clock.increment,3);
  const next=await connect(a,redirect.id,rematch.player.version);next.send(JSON.stringify({t:'abort'}));
  await waitFor(async()=> (await a.request('/game/'+redirect.id)).game.status.id===25,'unplayed rematch abort');
  const declined=await a.request('/setup/friend?user='+b.username,setup());await b.request('/challenge/'+declined.challenge.id+'/decline',{},204);
  const canceled=await a.request('/setup/friend?user='+b.username,setup());await a.request('/challenge/'+canceled.challenge.id+'/cancel',{},204);
  await b.request('/rel/block/'+a.username,{});await a.request('/setup/friend?user='+b.username,setup(),403);
  await b.request('/rel/unblock/'+a.username,{});await a.request('/rel/unfollow/'+b.username,{});
  // Separate requests respect the native per-IP setup budget.
  await delay(61000);
  await guest.request('/setup/friend?user='+b.username,setup({mode:'0'}),403);
  await a.request('/setup/friend',setup(),403);
  await a.request('/setup/friend?user='+a.username,setup(),403);
  await a.request('/setup/friend?user=PixelMoth',setup(),403);
  await a.request('/setup/friend?user='+b.username,setup({variant:'2'}),403);
  await a.request('/setup/hook/abcdefgh',setup(),403);
  await a.request('/api/challenge/'+b.username,{},403);
  console.log(JSON.stringify({ok:true,checks:['native friends and challenges load','follow/block round trip','anonymous/open/self/bot/variant rejected','human pool HTTP denied','invitation ownership','two human clocks and moves','resignation/export/history','native mutual rematch and abort','decline/cancel','blocked challenger refused']}));
} finally {for(const ws of sockets){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({t:'resign'}));ws.close();}}
