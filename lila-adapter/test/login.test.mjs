import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import { nsecEncode } from 'nostr-tools/nip19';
import { loadKey, forgetKey } from '../browser/key-store.mjs';
const bundle=(await build({entryPoints:[fileURLToPath(new URL('../browser/login.mjs',import.meta.url))],bundle:true,write:false,platform:'browser'})).outputFiles[0].text;
async function page(login,signer){
  await forgetKey();
  const names=['generate','backup','created','copy','reveal','create-login','username','extension','saved','use-saved','forget','nsec','import','status','methods','second-factor','token','verify','back'];
  const nodes=new Map(names.map(name=>[name,{value:'',textContent:'',hidden:['created','saved','second-factor'].includes(name),disabled:false,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},focus(){this.focused=true;},scrollIntoView(){},async click(){await this.listeners.click?.();}}]));
  const attempts=[],destinations=[];let nonce=0,clipboard='';
  const context=vm.createContext({console,crypto,TextEncoder,TextDecoder,URL,URLSearchParams,Uint8Array,ArrayBuffer,DataView,structuredClone,indexedDB,btoa,atob,setTimeout,clearTimeout,setInterval,clearInterval,AbortSignal,
    navigator:{clipboard:{async writeText(text){clipboard=text;}}},window:{nostr:signer,addEventListener(){}},
    location:{origin:'http://127.0.0.1:19663',search:'?referrer=%2Fforum',assign(url){destinations.push(url);}},
    document:{getElementById(id){return nodes.get(id.replace(/^nostr-/,''))??null;},querySelectorAll(){return [...nodes.values()];}},
    fetch:async(path,options)=>{
      const body=JSON.parse(options.body);
      if(path==='/club/challenge')return new Response(JSON.stringify({challenge:String(++nonce),url:'http://127.0.0.1:19663/club/login'}));
      assert.equal(path,'/club/login');
      const event=JSON.parse(Buffer.from(options.headers.Authorization.slice(6),'base64').toString());
      assert.ok(verifyEvent(event),'actual signed proof');
      assert.equal(event.tags.find(t=>t[0]==='payload')[1],Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(options.body))).toString('hex'));
      attempts.push({body,event});const result=login(body,event);return new Response(JSON.stringify(result.body),{status:result.status});
    },
  });vm.runInContext(bundle,context);
  return {node:name=>nodes.get(name),attempts,destinations,get clipboard(){return clipboard;}};
}
test('create/copy/save a new key preserves identity and returns to the requested page',async()=>{
  const ui=await page(()=>({status:200,body:{url:'/'}}));assert.equal(ui.node('second-factor').hidden,true);
  await ui.node('generate').click();const backup=ui.node('backup').value;assert.match(backup,/^nsec1/);assert.equal(ui.node('backup').type,'password');
  await ui.node('copy').click();assert.equal(ui.clipboard,backup);await ui.node('create-login').click();
  const saved=await loadKey();assert.equal(nsecEncode(saved),backup);saved.fill(0);
  assert.equal(ui.node('backup').value,'');assert.equal(ui.attempts.length,1);assert.deepEqual(ui.destinations,['http://127.0.0.1:19663/forum']);
});
test('existing nsec prompts for 2FA after proof, signs fresh retries, and saves only after success',async()=>{
  const key=generateSecretKey(),pubkey=getPublicKey(key);
  const ui=await page(body=>!body.twoFactorToken?{status:401,body:{error:'Code required',code:'two_factor_required'}}:body.twoFactorToken==='recovery-valid'?{status:200,body:{url:'/'}}:{status:401,body:{error:'Invalid or already used authentication code'}});
  ui.node('nsec').value=nsecEncode(key);await ui.node('import').click();assert.equal(ui.attempts[0].event.pubkey,pubkey);
  assert.equal(ui.node('second-factor').hidden,false);assert.equal(ui.node('methods').hidden,true);assert.equal(ui.node('token').focused,true);assert.equal(ui.node('nsec').value,'');assert.equal(await loadKey(),null);
  ui.node('token').value='wrong';await ui.node('verify').click();assert.match(ui.node('status').textContent,/Invalid/);assert.equal(ui.node('second-factor').hidden,false);
  ui.node('token').value='recovery-valid';await ui.node('verify').click();assert.equal(new Set(ui.attempts.map(a=>a.body.challenge)).size,3);assert.ok(ui.attempts.every(a=>a.event.pubkey===pubkey));
  const saved=await loadKey();assert.equal(getPublicKey(saved),pubkey);saved.fill(0);key.fill(0);assert.equal(ui.node('token').value,'');assert.equal(ui.destinations.length,1);
});
test('browser signer with no 2FA never shows the code field or stores a key',async()=>{
  const key=generateSecretKey(),ui=await page(()=>({status:200,body:{url:'/'}}),{getPublicKey:()=>getPublicKey(key),signEvent:e=>finalizeEvent(JSON.parse(JSON.stringify(e)),key)});
  await ui.node('extension').click();assert.equal(ui.node('second-factor').hidden,true);assert.equal(ui.attempts[0].body.twoFactorToken,undefined);assert.equal(await loadKey(),null);key.fill(0);
});
test('unqualified errors never reveal 2FA; switching identity clears the pending code',async()=>{
  const key=generateSecretKey();let requireFactor=false;
  const ui=await page(()=>requireFactor?{status:401,body:{error:'Code required',code:'two_factor_required'}}:{status:401,body:{error:'Invalid signature'}});
  ui.node('nsec').value=nsecEncode(key);await ui.node('import').click();assert.equal(ui.node('second-factor').hidden,true);
  requireFactor=true;ui.node('nsec').value=nsecEncode(key);await ui.node('import').click();ui.node('token').value='old-code';await ui.node('back').click();
  assert.equal(ui.node('token').value,'');assert.equal(ui.node('second-factor').hidden,true);assert.equal(ui.node('methods').hidden,false);key.fill(0);
});
