import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { setImmediate } from 'node:timers/promises';
import { build } from 'esbuild';

// Browser-state tests: payment signatures/binding have independent lightning.test.mjs coverage.
const mocks = {
  'nostr-tools/pool': `export class SimplePool {
    subscribeMany(relays, filter, callbacks) { const entry={callbacks,closed:false}; globalThis.pools.push(entry); return {close(){entry.closed=true;}}; }
    destroy() { globalThis.destroyed++; }
  }`,
  'nostr-tools/pure': `export const getPublicKey=()=>globalThis.savedAccount;
    export const finalizeEvent=event=>({...event,pubkey:globalThis.savedAccount});`,
  './key-store.mjs': `export async function loadKey(){globalThis.savedLoads++;return globalThis.savedKey;}`,
  '../lightning.mjs': `export const support={address:'test@example.org',recipient:'recipient',issuer:'issuer',relays:['wss://relay.example.org']};
    export const lnurl='test-lnurl'; export const invoiceDetails=value=>globalThis.details[value];`,
};
const bundle = (await build({
  entryPoints: [fileURLToPath(new URL('../browser/patron.mjs', import.meta.url))],
  bundle: true, write: false, platform: 'browser',
  plugins: [{name:'patron-test-dependencies', setup(builder) {
    builder.onResolve({filter:/.*/}, args => Object.hasOwn(mocks,args.path) ? {path:args.path,namespace:'patron-test'} : undefined);
    builder.onLoad({filter:/.*/,namespace:'patron-test'}, args => ({contents:mocks[args.path],loader:'js'}));
  }}],
})).outputFiles[0].text;

const account='a'.repeat(64);
const flush=async()=>{await setImmediate();await setImmediate();};
async function page(options={}) {
  const names=['create','amount','currency','quote','copy','check','dismiss','status','payment','qr','open','invoice-amount','thanks'];
  const nodes=new Map(names.map(name=>[name,{dataset:{},value:name==='amount'?'100':name==='currency'?'sats':'',
    textContent:'',hidden:name==='payment'||name==='thanks',disabled:false,listeners:{},
    addEventListener(event,fn){this.listeners[event]=fn;},async click(){return this.listeners.click?.();}}]));
  const classes=new Set(),calls=[],timers=new Map();let timerId=0;
  const root={dataset:{pubkey:account,paidStatus:'Confirmed locally translated',waiting:'Waiting locally translated',signerNeeded:'Please sign in again here to create an invoice.',dismissed:'Dismissed locally translated',dismissFailed:'Dismiss failed locally translated'},classList:{add(name){classes.add(name);}}};
  const pools=[];
  const signer=options.signer===false?undefined:{getPublicKey:async()=>options.signerAccount||account,signEvent:async event=>({...event,pubkey:account})};
  class Clock extends Date {static now(){return 120000;}}
  const context=vm.createContext({console,Date:Clock,AbortSignal,TextEncoder,Uint8Array,
    pools,destroyed:0,savedLoads:0,savedKey:options.key||null,savedAccount:account,reloads:0,
    details:Object.fromEntries(['old','renewal','new'].map((name,index)=>[name,{createdAt:index?110:80,expiresIn:1000,paymentHash:name,amountMsat:100000}])),
    document:{getElementById(id){return id==='nostr-patron'?root:nodes.get(id.replace('patron-',''));}},
    window:{nostr:signer,addEventListener(){}},navigator:{clipboard:{async writeText(){await options.copy?.();}}},
    location:{reload(){context.reloads++;}},
    setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
    site:{asset:{async loadEsm(){await options.qr?.();}}},
    fetch:async(path,request)=>{
      if(path==='/club/patron/pending'){await options.loadPending?.();return new Response(JSON.stringify(options.pending||[]),{headers:{'X-Mute-Patron-Paid-At':String(options.paidAt||0),'X-Mute-Patron-Dismissed':(options.dismissed||[]).join(',')}});}
      calls.push({path,body:JSON.parse(request.body)});
      if(path==='/club/patron/invoice')return new Response(JSON.stringify({invoice:'new'}));
      if(path==='/club/patron/dismiss'){await options.dismiss?.();return new Response(JSON.stringify({dismissed:options.dismissAccepted!==false}),{status:options.dismissStatus||200});}
      assert.equal(path,'/club/patron/receipt');
      return new Response(JSON.stringify({confirmed:options.confirmed!==false}));
    },
  });
  vm.runInContext(bundle,context);await flush();
  const receipt={id:'receipt',tags:[['description',JSON.stringify({pubkey:account})],['bolt11',options.receipt||'old']]};
  return {node:name=>nodes.get(name),classes,calls,timers,context,pools,async receipt(){await pools.at(-1).callbacks.onevent(receipt);await flush();}};
}

test('older unpaid invoices do not resurface after payment, but late receipts still settle',async()=>{
  const ui=await page({pending:['old'],paidAt:100});
  assert.equal(ui.node('payment').hidden,true);
  assert.equal(ui.node('status').textContent,'');
  await ui.receipt();
  assert.equal(ui.calls[0].path,'/club/patron/receipt');
  assert.equal(ui.node('thanks').hidden,false);
  assert.equal(ui.node('status').textContent,'Confirmed locally translated');
  assert.ok(ui.classes.has('payment-confirmed'));
  assert.equal(ui.context.reloads,0);
  [...ui.timers.values()].find(timer=>timer.delay===2500).fn();
  assert.equal(ui.context.reloads,1);
});

test('a newer renewal invoice is restored even when the account already has wings',async()=>{
  const ui=await page({pending:['old','renewal'],paidAt:100,receipt:'renewal'});
  assert.equal(ui.node('payment').hidden,false);
  assert.equal(ui.node('qr').dataset.qrUrl,'LIGHTNING:RENEWAL');
  assert.equal(ui.node('status').textContent,'Waiting locally translated');
  await ui.receipt();
  assert.equal(ui.node('payment').hidden,true);
  assert.equal(ui.node('create').disabled,true);
});

test('an unconfirmed server response never shows the paid animation',async()=>{
  const ui=await page({pending:['old'],confirmed:false});
  await ui.receipt();
  assert.equal(ui.node('payment').hidden,false);
  assert.equal(ui.node('thanks').hidden,true);
  assert.equal(ui.classes.has('payment-confirmed'),false);
  assert.equal(ui.node('status').textContent,'Waiting locally translated');
});

test('an in-flight QR render cannot restore waiting after a payment confirms',async()=>{
  let resolveQr;
  const ui=await page({pending:['old'],paidAt:100,qr:()=>new Promise(resolve=>{resolveQr=resolve;})});
  const creating=ui.node('create').click();await flush();
  await ui.receipt();
  resolveQr();await creating;await flush();
  assert.equal(ui.node('payment').hidden,true);
  assert.equal(ui.node('status').textContent,'Confirmed locally translated');
  assert.equal(ui.node('create').disabled,true);
});

test('one create action uses the signer first and checks its account',async()=>{
  const ui=await page();await ui.node('create').click();
  assert.equal(ui.calls[0].path,'/club/patron/invoice');
  assert.equal(ui.context.savedLoads,0);
  const wrong=await page({signerAccount:'b'.repeat(64)});await wrong.node('create').click();
  assert.equal(wrong.calls.length,0);
});

test('saved-key fallback is read only on click and wiped; unavailable signing uses plain copy',async()=>{
  const key=new Uint8Array(32).fill(7);
  const ui=await page({signer:false,key});assert.equal(ui.context.savedLoads,0);
  await ui.node('create').click();assert.equal(ui.calls[0].path,'/club/patron/invoice');
  assert.ok(key.every(value=>value===0));
  const missing=await page({signer:false});await missing.node('create').click();
  assert.equal(missing.node('status').textContent,'Please sign in again here to create an invoice.');
  assert.equal(missing.calls.length,0);
});

test('dismissal hides the unpaid prompt, stops stale expiry, and still accepts a late payment',async()=>{
  const ui=await page({pending:['old']});
  const expire=[...ui.timers.values()][0].fn;
  await ui.node('dismiss').click();
  assert.equal(ui.calls[0].path,'/club/patron/dismiss');
  assert.deepEqual(ui.calls[0].body,{paymentHash:'old'});
  assert.equal(ui.node('payment').hidden,true);
  assert.equal(ui.node('create').disabled,false);
  assert.equal(ui.node('status').textContent,'Dismissed locally translated');
  expire();
  assert.equal(ui.node('status').textContent,'Dismissed locally translated');
  await ui.receipt();
  assert.equal(ui.node('status').textContent,'Confirmed locally translated');
  assert.equal(ui.node('thanks').hidden,false);
});

test('dismissed invoices stay hidden on reload while newer renewals can be restored',async()=>{
  const hidden=await page({pending:['old'],dismissed:['old']});
  assert.equal(hidden.node('payment').hidden,true);
  await hidden.receipt();
  assert.equal(hidden.node('thanks').hidden,false);
  const renewal=await page({pending:['renewal','old'],dismissed:['old'],paidAt:100});
  assert.equal(renewal.node('payment').hidden,false);
  assert.equal(renewal.node('qr').dataset.qrUrl,'LIGHTNING:RENEWAL');
});

test('a rejected dismissal keeps the invoice payable and uses translated feedback',async()=>{
  for (const options of [{dismissAccepted:false},{dismissStatus:403}]) {
    const ui=await page({pending:['old'],...options});
    await ui.node('dismiss').click();
    assert.equal(ui.node('payment').hidden,false);
    assert.equal(ui.node('status').textContent,'Dismiss failed locally translated');
    assert.equal(ui.node('dismiss').disabled,false);
    assert.equal(ui.classes.has('payment-confirmed'),false);
  }
});

test('confirmed payment wins over an in-flight dismissal and later clicks do nothing',async()=>{
  let finish;
  const ui=await page({pending:['old'],dismiss:()=>new Promise(resolve=>{finish=resolve;})});
  const dismissing=ui.node('dismiss').click();await flush();
  await ui.receipt();finish();await dismissing;
  assert.equal(ui.node('status').textContent,'Confirmed locally translated');
  assert.equal(ui.node('create').disabled,true);
  assert.equal(ui.node('dismiss').disabled,true);
  await ui.node('dismiss').click();
  assert.equal(ui.calls.filter(call=>call.path==='/club/patron/dismiss').length,1);
});

test('in-flight QR and an old pending response cannot restore a dismissed request',async()=>{
  let finishQr;
  const ui=await page({pending:['old'],qr:()=>new Promise(resolve=>{finishQr=resolve;})});
  await ui.node('dismiss').click();finishQr();await flush();
  assert.equal(ui.node('payment').hidden,true);
  assert.equal(ui.node('status').textContent,'Dismissed locally translated');
  await ui.receipt();assert.equal(ui.node('thanks').hidden,false);
  let finishPending;
  const stale=await page({pending:['new'],loadPending:()=>new Promise(resolve=>{finishPending=resolve;})});
  await stale.node('create').click();await stale.node('dismiss').click();
  finishPending();await flush();
  assert.equal(stale.node('payment').hidden,true);
  assert.equal(stale.node('status').textContent,'Dismissed locally translated');
});


test('a late clipboard completion cannot replace dismissed feedback',async()=>{
  let finish;
  const ui=await page({pending:['old'],copy:()=>new Promise(resolve=>{finish=resolve;})});
  await ui.node('copy').click();await ui.node('dismiss').click();finish();await flush();
  assert.equal(ui.node('status').textContent,'Dismissed locally translated');
});

test('creating a replacement keeps the dismissed invoice eligible for its late receipt',async()=>{
  const ui=await page({pending:['old']});
  await ui.node('dismiss').click();await ui.node('create').click();
  assert.equal(ui.node('qr').dataset.qrUrl,'LIGHTNING:NEW');
  assert.equal(ui.pools.length,1);
  await ui.receipt();
  assert.equal(ui.node('payment').hidden,true);
  assert.equal(ui.node('thanks').hidden,false);
});
