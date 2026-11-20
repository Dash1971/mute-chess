import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Exercise the deployed gateway handlers without opening ports or mutating accounts.
const code=(await build({
  entryPoints:[fileURLToPath(new URL('../../deploy/public/gateway.mjs',import.meta.url))],
  bundle:true,write:false,platform:'node',format:'cjs',
  plugins:[{name:'gateway-transports',setup(builder){
    builder.onResolve({filter:/^node:(http|fs)$/},args=>({path:args.path,namespace:'gateway-test'}));
    builder.onLoad({filter:/.*/,namespace:'gateway-test'},args=>({loader:'js',contents:args.path==='node:http'
      ? 'export default globalThis.transport;'
      : `export const readFileSync=()=>JSON.stringify({gitCommit:'test-revision'});
         export const createReadStream=()=>{throw Error('Unexpected asset read');};
         export const statSync=createReadStream,realpathSync=createReadStream;`}));
  }}],
})).outputFiles[0].text;

function gateway({ authLimit, fullAuthTable = false, clock = Date } = {}){
  const handlers={},calls=[];
  const server={on(event,fn){handlers[event]=fn;return this;},listen(){}};
  const transport={
    createServer(handler){handlers.request=handler;return server;},
    request(options){const request={options,on(){return this;},end(){this.ended=true;},destroy(){},};calls.push(request);return request;},
  };
  const { networkFor, limits, authBuckets } = vm.runInNewContext(code + '\n;({networkFor: rateLimitNetwork, limits: requestLimits, authBuckets})',{transport,Buffer,URL,Date:clock,console,require:createRequire(import.meta.url),setInterval(){return {unref(){}};}});
  if (fullAuthTable) Object.defineProperty(authBuckets, 'size', { value: 10000 });
  if (authLimit !== undefined) limits.auth = authLimit;
  return {
    calls, networkFor,
    request(path,method='POST',ip='192.0.2.1'){
      const req={url:path,method,headers:{host:'mutechess.org',origin:'https://mutechess.org','cf-connecting-ip':ip,cookie:'session=test'},pipe(upstream){this.upstream=upstream;},on(){}};
      const res={status:undefined,on(){return this;},setHeader(){},writeHead(status){this.status=status;},end(body){this.body=body;}};
      handlers.request(req,res);return {req,res};
    },
    upgrade(path,origin='https://mutechess.org'){
      const socket={destroyed:false,destroy(){this.destroyed=true;},on(){return this;}};
      handlers.upgrade({url:path,headers:{host:'mutechess.org',origin,'cf-connecting-ip':'192.0.2.1',cookie:'session=test'}},socket,Buffer.alloc(0));
      return socket;
    },
  };
}

test('native relationship POSTs and legacy aliases reach Lila with stable IDs and session headers',()=>{
  const app=gateway();
  for(const action of ['follow','unfollow','block','unblock'])for(const prefix of ['/api/rel','/rel']){
    const path=`${prefix}/${action}/n066f8597b3952d996bc?mini=1`;
    const {req,res}=app.request(path);
    assert.equal(res.status,undefined);
    assert.ok(req.upstream);
    assert.equal(app.calls.at(-1).options.path,path);
    assert.equal(app.calls.at(-1).options.headers.cookie,'session=test');
    assert.equal(app.calls.at(-1).options.headers['x-forwarded-proto'],'https');
  }
});

test('relationship routing does not expose GET mutations, extra actions or malformed IDs',()=>{
  const app=gateway();
  for(const path of ['/api/rel/follow/test1','/api/rel/promote/test1','/api/rel/follow/'+ 'a'.repeat(31),'/api/rel/follow/test1/extra']){
    const {res}=app.request(path,path==='/api/rel/follow/test1'?'GET':'POST');
    assert.equal(res.status,404,path);
  }
  assert.equal(app.calls.length,0);
});

test('native challenge room socket forwards to the existing websocket service',()=>{
  const app=gateway();
  const socket=app.upgrade('/challenge/AbCd1234/socket/v5?sri=test&v=2');
  assert.equal(socket.destroyed,false);
  assert.equal(app.calls.length,1);
  assert.equal(app.calls[0].options.port,29664);
  assert.equal(app.calls[0].options.path,'/challenge/AbCd1234/socket/v5?sri=test&v=2');
  assert.equal(app.calls[0].options.headers.cookie,'session=test');
  assert.equal(app.calls[0].ended,true);
});

test('foreign origins and malformed challenge socket paths remain denied',()=>{
  const app=gateway();
  assert.equal(app.upgrade('/challenge/AbCd1234/socket/v5','https://example.org').destroyed,true);
  for(const path of ['/challenge/short/socket/v5','/challenge/AbCd1234/socket/v5/extra','/challenge/AbCd1234/admin/v5'])
    assert.equal(app.upgrade(path).destroyed,true,path);
  assert.equal(app.calls.length,0);
});

test('Arena exposes only native event actions and its socket, retaining private and management boundaries', () => {
  const app=gateway();
  for (const [path,method] of [
    ['/tournament','GET'],['/tournament/new','GET'],['/tournament/new','POST'],
    ['/tournament/AbCd1234','GET'],['/tournament/AbCd1234/standing/1','GET'],
    ['/tournament/AbCd1234/player/Dash','GET'],['/tournament/AbCd1234/page-of/Dash','GET'],
    ['/tournament/AbCd1234/join','POST'],['/tournament/AbCd1234/withdraw','POST'],
    ['/tournament/AbCd1234/prepare','POST'],['/tournament/AbCd1234/edit','POST'],
    ['/tournament/AbCd1234/terminate','POST'],
  ]) {
    const result=app.request(path,method);
    assert.equal(result.req.upstream?.options.path,path,`${method} ${path}`);
  }
  for (const path of ['/tournament/manager','/tournament/team-battle/new/AbCd1234',
    '/api/tournament','/tournament/AbCd1234/admin','/club/internal/arena']) {
    const count=app.calls.length;
    app.request(path,'POST');assert.equal(app.calls.length,count,path);
  }
  const count=app.calls.length;
  assert.equal(app.upgrade('/tournament/AbCd1234/socket/v5').destroyed,false);
  assert.equal(app.calls.length,count+1);
  assert.equal(app.upgrade('/tournament/AbCd1234/socket/v5','https://other.example').destroyed,true);
});


test('Arena API exports implicated in GHSA-hr3c-7vww-ffrj stay denied', () => {
  const app=gateway();
  for (const path of ['/api/tournament/AbCd1234/games','/api/tournament/AbCd1234/results','/api/tournament/AbCd1234/teams']) {
    const count=app.calls.length;
    const result=app.request(path,'GET');
    assert.equal(result.res.status,404); assert.equal(app.calls.length,count);
  }
});


test('spectator public-name lookups expose only the native read-only status endpoint',()=>{
  const app=gateway();
  const path='/api/users/status?ids=n066f8597b3952d996bc';
  for(const method of ['GET','HEAD']){
    const {req,res}=app.request(path,method);
    assert.equal(res.status,undefined);assert.ok(req.upstream);
    assert.equal(app.calls.at(-1).options.path,path);
  }
  for(const [path,method] of [['/api/users/status','POST'],['/api/users/status/extra','GET'],['/api/users','GET']]){
    assert.equal(app.request(path,method).res.status,404);
  }
});


test('Arena discovery exposes native read-only calendar and history without widening tournament administration',()=>{
  const app=gateway();
  for (const path of ['/tournament/calendar','/tournament/history?page=2','/tournament/history/unique?page=2']) {
    for(const method of ['GET','HEAD']) {
      const result=app.request(path,method);
      assert.equal(result.req.upstream?.options.path,path);
    }
    const count=app.calls.length;
    app.request(path,'POST');assert.equal(app.calls.length,count);
  }
  for(const path of ['/tournament/featured','/tournament/history/weekly','/tournament/calendar/export']) {
    app.request(path,'GET');
    assert.equal(app.calls.at(-1).options.path,'/club/unsupported');
  }
});

test('gateway groups IPv6 by the first 64 bits and preserves separate IPv4 addresses', () => {
  const { networkFor } = gateway();
  assert.equal(networkFor('2001:db8::1'), networkFor('2001:0db8:0000:0000:abcd::2'));
  assert.notEqual(networkFor('2001:db8:0:1::1'), networkFor('2001:db8::1'));
  assert.equal(networkFor('::1'), '0:0:0:0::/64');
  assert.equal(networkFor('192.0.2.1'), '192.0.2.1');
});

test('an authentication quota leaves ordinary browsing and other networks available and expires', () => {
  let now = 1000;
  const app = gateway({ authLimit: 1, clock: { now: () => now } });
  assert.ok(app.request('/club/challenge').req.upstream);
  const limited = app.request('/club/login').res;
  assert.equal(limited.status, 429);
  assert.equal(JSON.parse(limited.body).code, 'auth_rate_limited');
  assert.ok(app.request('/', 'GET').req.upstream);
  assert.ok(app.request('/club/security', 'GET').req.upstream);
  assert.ok(app.request('/club/challenge', 'POST', '192.0.2.2').req.upstream);
  now += 60000;
  assert.ok(app.request('/club/security', 'POST').req.upstream);
});

test('a new client network can sign in when the exact network table is full', () => {
  let now = 0;
  const app = gateway({ authLimit: 2, fullAuthTable: true, clock: { now: () => now } });
  assert.ok(app.request('/club/challenge').req.upstream);
  const { req } = app.request('/club/login');
  assert.equal(req.upstream.options.headers['x-forwarded-for'], '192.0.2.1');
  assert.equal(app.request('/club/security').res.status, 429);
  assert.ok(app.request('/', 'GET').req.upstream);
  now += 60000;
  assert.ok(app.request('/club/security').req.upstream);
});
