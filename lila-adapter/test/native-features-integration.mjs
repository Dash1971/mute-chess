// Explicit private native-stack qualification. Never accepts a production origin.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
const require = createRequire('/home/dash/no-sweat-lila/sources/lila/package.json');
const { JSDOM } = require('jsdom');
const origin = 'http://127.0.0.1:19663', jar = new Map(), key = generateSecretKey();
async function request(path, body, options = {}) {
  const response = await fetch(origin + path, {
    method: body === undefined ? 'GET' : 'POST', redirect:'manual',
    headers: { Origin:origin, Accept: options.accept ?? 'text/html', Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),
      ...(body instanceof URLSearchParams ? {} : {'Content-Type':'application/json'}), ...options.headers },
    body: body === undefined ? undefined : body instanceof URLSearchParams ? body : JSON.stringify(body),
    signal:AbortSignal.timeout(30000),
  });
  for (const c of response.headers.getSetCookie()) { const pair=c.split(';')[0], i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1)); }
  const text=await response.text();assert.equal(response.status,options.status ?? 200,path+': '+response.status+' '+text.slice(0,200));
  return text;
}
const html = text => new JSDOM(text).window.document;
try {
  for (const [path, selector] of [
    ['/','.lobby'], ['/forum','.forum'], ['/learn','#learn-app'], ['/training/coordinate','#trainer'],
    ['/practice','.practice-app'], ['/games','.tv-games'], ['/analysis#explorer','.analyse'],
  ]) {
    const page=await request(path), doc=html(page);
    assert.ok(doc.querySelector(selector), path+' native page '+selector);
    assert.doesNotMatch(page,/\/coach(?:["/])|href="\/blog"|href="\/swag/);
  }
  const home=await request('/');assert.match(home,/app.flotilla.social\/spaces\/mobilemaia/);
  const homeDoc=html(home);
  for(const selector of ['.lobby__side','.lobby__puzzle','.lobby__feed','.lobby__tv','.lobby__tournaments','#clinput','#notify-toggle'])
    assert.equal(homeDoc.querySelector(selector),null,'Focused home omits '+selector);
  const nav=[...homeDoc.querySelectorAll('#topnav section > a')].map(a=>a.textContent.trim());
  assert.deepEqual(nav,['Puzzles','Community','Tools']);
  assert.ok(homeDoc.querySelector('a[href="/patron"]'),'Donate remains');
  for(const path of ['/about','/faq','/contact','/terms-of-service','/privacy']) {
    const info=html(await request(path));assert.ok(info.querySelector('.mutechess-info h1'),path);
  }
  const patron=html(await request('/patron'));
  assert.ok(patron.querySelector('a[aria-label="Close donation"]'));
  assert.match(patron.body.textContent,/dash@walletofsatoshi.com/);
  const category=await request('/forum/mute-feedback');assert.match(category,/Posting opens|Sign in/);

  const practice=html(await request('/practice'));
  const course=practice.querySelector('a[href^="/practice/"]');assert.ok(course,'Installed practice course');
  const lesson=await request(course.getAttribute('href'));
  assert.match(lesson,/"practice":/);assert.match(lesson,/"study":/);
  assert.doesNotMatch(lesson,/NoSuchElementException|Internal server error/);
  const storm=await request('/storm');assert.match(storm,/"puzzles":\[/);
  const puzzles=JSON.parse('['+storm.match(/"puzzles":\[(.*?)\]/s)[1]+']');
  assert.ok(puzzles.length>=120,'Full native Storm selection');
  assert.equal(new Set(puzzles.map(p=>p.fen.split(' ')[1])).size,1,'Storm same-color pool');
  const streak=await request('/streak');assert.match(streak,/"streak":/);
  const streakApi=JSON.parse(await request('/api/streak',undefined,{accept:'application/json'}));
  assert.ok(streakApi,'Streak native API');
  const pubkey=getPublicKey(key), challenge=JSON.parse(await request('/club/challenge',{pubkey}));
  const body={challenge:challenge.challenge,username:'NativeCheck'+randomBytes(3).toString('hex')};
  const event=finalizeEvent({kind:27235,created_at:Math.floor(Date.now()/1000),content:'',tags:[
    ['u',origin+'/club/login'],['method','POST'],['challenge',challenge.challenge],
    ['payload',createHash('sha256').update(JSON.stringify(body)).digest('hex')],
  ]},key);
  await request('/club/login',body,{headers:{Authorization:'Nostr '+Buffer.from(JSON.stringify(event)).toString('base64')}});
  for (const [category,field,value] of [['display','display.animation','1'],['chess-clock','clock.sound','0'],['game-behavior','behavior.autoQueen','1'],['privacy','studyInvite','2']]) {
    const doc=html(await request('/account/preferences/'+category)), data=new URLSearchParams();
    for (const input of doc.querySelectorAll('form.autosubmit input')) {
      if (!input.name || (['checkbox','radio'].includes(input.type) && !input.checked)) continue;
      data.set(input.name,input.value);
    }
    data.set(field,value);assert.equal(await request('/account/preferences',data),'saved');
    const saved=html(await request('/account/preferences/'+category));
    assert.equal(saved.querySelector(`input[name="${field}"]:checked`)?.value,value,'Native autosave persists '+field);
  }
  const notifyDoc=html(await request('/account/preferences/notification')), notifyData=new URLSearchParams();
  for(const input of notifyDoc.querySelectorAll('form.autosubmit input')) {
    if(!input.name || (['checkbox','radio'].includes(input.type) && !input.checked))continue;
    notifyData.set(input.name,input.value);
  }
  notifyData.set('mention.bell','true');
  assert.equal(await request('/account/preferences/notification',notifyData),'saved');
  assert.equal(html(await request('/account/preferences/notification')).querySelector('input[name="mention.bell"]').checked,true);

  await request('/learn/score',new URLSearchParams({stage:'rook',level:'1',score:'500'}));
  const progress=JSON.parse(await request('/learn',undefined,{accept:'application/json'}));
  assert.ok(JSON.stringify(progress).includes('500'),'Native basics progress persisted');
  await request('/learn/score',new URLSearchParams({stage:'atomic',level:'1',score:'500'}),{status:400});
  await request('/storm/dashboard');
  const stormRun=new URLSearchParams({puzzles:'1',score:'1',moves:'1',errors:'0',combo:'1',time:'30',highest:'1000',
    notAnExploit:"Yes, we know that you can send whatever score you like. That's why there's no leaderboards and no competition."});
  await request('/storm',stormRun,{accept:'application/json'});
  const ids=streakApi.streak.split(' ');
  assert.ok(ids.length>=145, 'Native streak difficulty pool');
  await request('/training/complete/mix/'+streakApi.puzzle.id,new URLSearchParams({win:'false',rated:'false',streakId:ids[1],streakScore:'0'}),{accept:'application/json'});
  console.log(JSON.stringify({ok:true,checks:['native menus and Flotilla','20-course practice index and actual lesson','Storm complete same-color pool','Streak native selector','Nostr disposable login','display/clock/behavior persist after reload','basic lesson progress and input validation','native storm/streak recording']}));
} finally { key.fill(0); }
