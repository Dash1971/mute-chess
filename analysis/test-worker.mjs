// Task-specific worker regressions; synthetic tensors never stand in for model accuracy.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { backendPlan } from './browser/backends.js';

assert.deepEqual(backendPlan('5m', true, true, 8), [{backend:'wasm',threads:1}]);
assert.deepEqual(backendPlan('79m', false, false, 8), [{backend:'wasm',threads:1}]);
assert.deepEqual(backendPlan('79m', true, true, 8), [{backend:'webgpu',threads:1},{backend:'wasm',threads:4},{backend:'wasm',threads:1}]);
assert.equal(backendPlan('79m', false, true, 2)[0].threads,1);
const source = await readFile(new URL('./browser/maia-worker.js',import.meta.url),'utf8');
const backendSource = await readFile(new URL('./browser/backends.js',import.meta.url),'utf8');
async function run({gpu=true, failGpuInit=false, failGpuRun=false, failThreads=false, model='79m'}={}) {
  const messages=[], sessions=[];
  const scope={URL,Float32Array,Uint8Array,BigInt64Array,performance,Date,Response,
    fetch:async()=>new Response(new Uint8Array([1]))};
  scope.self={location:{href:'https://mutechess.test/analysis/maia-worker.js'},
    navigator:{gpu:gpu?{}:undefined,hardwareConcurrency:8},crossOriginIsolated:true,
    postMessage:data=>messages.push(structuredClone(data))};
  const context=vm.createContext(scope);
  const core=new vm.SyntheticModule(['CACHE_NAME','encode','sha256'],function(){
    this.setExport('CACHE_NAME','synthetic');this.setExport('encode',()=>{});this.setExport('sha256',async()=> 'ok');
  },{context});
  const backends=new vm.SourceTextModule(backendSource,{context});
  const worker=new vm.SourceTextModule(source,{context,
    initializeImportMeta:meta=>{meta.url='https://mutechess.test/analysis/maia-worker.js';},
    importModuleDynamically:async spec=>{
      const gpuModule=spec.includes('gpu.mjs');
      const env={versions:{web:'test'},wasm:{}};
      const runtime={env,Tensor:class {constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}dispose(){}},
        InferenceSession:{create:async(_weights,options)=>{
          const provider=options.executionProviders[0], threads=env.wasm.numThreads;
          sessions.push({provider,threads});
          if(provider==='webgpu'&&failGpuInit)throw new Error('GPU init fixture');
          if(provider==='wasm'&&threads>1&&failThreads)throw new Error('pthread fixture');
          return {inputNames:['tokens','self_elo','opponent_elo'],outputNames:['move_logits','value_logits'],
            release:async()=>{},run:async(feeds,names)=>{
              assert.deepEqual(Array.from(feeds.tokens.dims),[1,64,97]);
              assert.equal(feeds.self_elo.data[0],1600n);assert.equal(feeds.opponent_elo.data[0],1600n);
              assert.deepEqual(Array.from(names),['move_logits','value_logits']);
              if(provider==='webgpu'&&failGpuRun)throw new Error('GPU run fixture');
              return {move_logits:{getData:async()=>new Float32Array(4352),dispose(){}},
                value_logits:{getData:async()=>new Float32Array(3),dispose(){}}};
            }};
        }}};
      const m=new vm.SyntheticModule(['env','Tensor','InferenceSession'],function(){for(const key of ['env','Tensor','InferenceSession'])this.setExport(key,runtime[key]);},{context});
      await m.link(()=>{});await m.evaluate();return m;
    }});
  await worker.link(spec=>spec==='./core.js'?core:backends);await worker.evaluate();
  const asset={bytes:1,sha256:'ok',url:'/cpu.wasm',module:'vendor/cpu.mjs',loader:'vendor/loader.mjs'};
  const config={browserQa:true,browserModel:model,models:{[model]:{...asset,name:'fixture model'}},
    runtime:{version:'test',assets:{wasm:asset,webgpu:{...asset,url:'/gpu.wasm',module:'vendor/gpu.mjs'}}}};
  const until=async predicate=>{for(let i=0;i<100&&!predicate();i++)await new Promise(setImmediate);assert.ok(predicate(),JSON.stringify(messages));};
  scope.self.onmessage({data:{type:'init',config}});
  await until(()=>messages.some(m=>m.type==='ready'));
  const afterReady=messages.length;
  scope.self.onmessage({data:{type:'predict',id:7,arguments:{tokens:new Float32Array(64*97),selfElo:1600,opponentElo:1600}}});
  await until(()=>messages.some(m=>m.type==='prediction'||m.type==='error'));
  const result=messages.find(m=>m.type==='prediction');assert.ok(result,JSON.stringify(messages));
  assert.equal(result.id,7);assert.equal(result.policy.length,4352);assert.equal(result.values.length,3);
  assert.equal(messages.slice(afterReady).filter(m=>m.type==='initializing'||m.type==='progress'||m.type==='ready').length,0,'fallback must not reset startup watchdogs');
  return {sessions,result};
}
let test=await run();assert.equal(test.result.diagnostics.backend,'webgpu');
test=await run({failGpuInit:true});assert.deepEqual(test.sessions,[{provider:'webgpu',threads:1},{provider:'wasm',threads:4}]);
test=await run({failGpuRun:true});assert.equal(test.result.diagnostics.backend,'wasm');assert.equal(test.result.diagnostics.numThreads,4);
test=await run({failGpuInit:true,failThreads:true});assert.equal(test.result.diagnostics.numThreads,1);assert.equal(test.sessions.length,3);
test=await run({model:'5m'});assert.deepEqual(test.sessions,[{provider:'wasm',threads:1}]);
console.log('PASS: 79M GPU-first, initialization/run fallback, pthread fallback, original inputs/outputs/watchdogs and unchanged 5M backend');
