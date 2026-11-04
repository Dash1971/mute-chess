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

function gateway(){
  const handlers={},calls=[];
  const server={on(event,fn){handlers[event]=fn;return this;},listen(){}};
  const transport={
    createServer(handler){handlers.request=handler;return server;},
    request(options){const request={options,on(){return this;},end(){this.ended=true;},destroy(){},};calls.push(request);return request;},
  };
  vm.runInNewContext(code,{transport,Buffer,URL,Date,console,require:createRequire(import.meta.url),setInterval(){return {unref(){}};}});
  return {
    calls,
    request(path,method='POST'){
      const req={url:path,method,headers:{host:'mutechess.org',origin:'https://mutechess.org','cf-connecting-ip':'192.0.2.1',cookie:'session=test'},pipe(upstream){this.upstream=upstream;},on(){}};
      const res={status:undefined,on(){return this;},setHeader(){},writeHead(status){this.status=status;},end(){}};
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
