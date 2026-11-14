// One focused visual regression fixture for #328, not an application server.
// Usage: node capture.mjs NATIVE_ROOT MOBILE_CAPTURE_DIR OUTPUT_DIR
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [source, mobile, output] = process.argv.slice(2).map(p => path.resolve(p));
const { build } = await import(pathToFileURL(path.join(source,'ui/.build/node_modules/esbuild/lib/main.js')));
const { chromium } = await import(pathToFileURL(path.join(source,'node_modules/@playwright/test/index.mjs')));
await fs.mkdir(output,{recursive:true});
const fixtures = JSON.parse(await fs.readFile(path.join(source,'ui/analyse/tests/fixtures/arrowBehavior.json')));
const reference = JSON.parse(await fs.readFile(path.join(mobile,'mobile-results.json')));
const packages = new Map();
for (const name of await fs.readdir(path.join(source,'ui'))) {
  try { const json = JSON.parse(await fs.readFile(path.join(source,'ui',name,'package.json'))); packages.set(json.name,path.join(source,'ui',name,'src')); } catch {}
}
const bundle = await build({
 entryPoints:[path.join(source,'ui/analyse/tests/fixtures/arrowBehavior.browser.mts')],
 bundle:true,format:'esm',write:false,conditions:['source'],metafile:true,
 alias:Object.fromEntries([...packages].filter(([,root])=>fsSync.existsSync(root))),
 plugins:[{name:'local-source',setup(b){
   b.onResolve({filter:/^@\//},args=>{
     const pkg=args.importer.match(/\/ui\/([^/]+)\//)?.[1];
     if(!pkg)throw new Error('Unexpected alias importer '+args.importer);
     const base=path.join(source,'ui',pkg,'src',args.path.slice(2));
     return {path:fsSync.existsSync(base+'.ts')?base+'.ts':path.join(base,'index.ts')};
   });
 }}],
});
// Prove all production surface/helper imports came from THIS candidate checkout.
const inputs=Object.keys(bundle.metafile.inputs).map(p=>path.resolve(p));
for(const target of ['ui/lib/src/nosweat/arrows.ts','ui/analyse/src/noSweatAnalysis.ts','ui/analyse/src/autoShape.ts','ui/puzzle/src/noSweatMaia.ts','ui/puzzle/src/autoShape.ts','ui/lib/src/game/glyphs.ts'])
 assert.ok(inputs.includes(path.join(source,target)),target);
const cssRoot = path.join(source,'public/css');
const cssFiles = await fs.readdir(cssRoot);
const theme = cssFiles.find(n=>/^lib\.theme\.all\.[a-f0-9]+\.css$/.test(n));
const siteCss=cssFiles.find(n=>/^site\.[a-f0-9]+\.css$/.test(n));
assert.ok(theme && siteCss,'compiled native board CSS required');
const bootstrap = `window.site={sri:'fixture',asset:{url:'/assets',flair:'/assets/flair'},pubsub:{on(){},emit(){}},load:Promise.resolve()};window.$html=(s,...v)=>s.reduce((a,x,i)=>a+x+(v[i]??''),'');window.$trim=window.$html;window.i18n=new Proxy({},{get:()=>new Proxy({},{get:()=>Object.assign((...a)=>a.join(' '),{asArray:(...a)=>a})})});`;
const pieceVars=['white','black'].flatMap((color,i)=>Object.entries({pawn:'P',knight:'N',bishop:'B',rook:'R',queen:'Q',king:'K'}).map(([role,piece])=>`---${color}-${role}:url(/assets/piece/cburnett/${i?'b':'w'}${piece}.svg)`)).join(';');
const html = `<!doctype html><html lang="en-GB" data-brand="mutechess"><head><link rel="stylesheet" href="/assets/css/${siteCss}"><link rel="stylesheet" href="/assets/css/${theme}"><link rel="stylesheet" href="/assets/nosweat/brand.css"><style>:root{${pieceVars}}html,body{margin:0;padding:0;background:#0d1718}#board{position:relative;margin:24px}.cg-wrap{width:100%;height:100%}cg-board{background:conic-gradient(#658276 25%,#c8d0b9 0 50%,#658276 0 75%,#c8d0b9 0);background-size:25% 25%}</style></head><body class="dark moss cburnett"><div id="board" class="cg-wrap is2d"></div><script>${bootstrap}</script><script type="module" src="/fixture.js"></script></body></html>`;
const server=http.createServer(async(req,res)=>{
 try {
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  const relative=decodeURIComponent(req.url.split('?')[0]).replace(/^\/assets\//,'');
  const file=path.resolve(source,'public',relative);
  if(!file.startsWith(path.join(source,'public')+path.sep))throw Error('path');
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.woff2')?'font/woff2':'application/octet-stream');res.end(await fs.readFile(file));
 } catch {res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:850,height:750},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.message)});
const results=[];
try {
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.waitForFunction(()=>!!window.arrowFixture);
 for(const c of fixtures.cases) for(const orientation of ['white','black']) {
  const expected=reference.find(r=>r.id===c.id&&r.orientation===orientation);
  assert.ok(expected,`${c.id} missing Flutter capture`);
  for(const surface of ['puzzle','analysis','postgame']) {
   const shapes=await page.evaluate(({c,orientation,surface})=>window.arrowFixture.render(c,orientation,surface),{c,orientation,surface});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const observed=await page.evaluate(()=>{
    const arrows=[...document.querySelectorAll('.nosweat-engine-arrow')].map(g=>({uci:g.dataset.move,tail:g.dataset.tail.split(','),head:g.dataset.head.split(','),layer:g.dataset.layer}));
    const plane=document.querySelector('.cg-custom-below');const badges=document.querySelector('.cg-custom-svgs');
    const piece=document.querySelector('piece');
    if(piece && (!getComputedStyle(piece).backgroundImage.includes('cburnett') || piece.getBoundingClientRect().width===0))throw Error('Piece artwork missing from fixture');
    return {arrows,arrowZ:plane?getComputedStyle(plane).zIndex:null,badgeZ:badges?getComputedStyle(badges).zIndex:null,
     badgeColors:[...document.querySelectorAll('.cg-custom-svgs circle')].map(c=>c.getAttribute('fill'))};
   });
   const normalize=arr=>arr.map(a=>({...a,uci:a.uci.slice(0,4)}));
   assert.deepEqual(normalize(observed.arrows),normalize(expected.arrows),`${c.id} ${orientation} ${surface}`);
   if(observed.arrows.length)assert.ok(Number(observed.badgeZ)>Number(observed.arrowZ),'badges must be above arrows');
   const category={brilliant:'#15aabf',good:'#12b886',interesting:'#82c91e',dubious:'#fab005',mistake:'#fd7e14',blunder:'#fa5252'}[c.badge];
   if(category)assert.ok(observed.badgeColors.includes(category),`badge ${c.badge}`);
   await page.locator('#board').screenshot({path:path.join(output,`${c.id}-${orientation}-${surface}.png`)});
   results.push({id:c.id,orientation,surface,...observed});
  }
 }
 // Existing SVG siblings must not defeat refreshed paint order (without remounting board).
 const sequences=[
  [[{uci:'a1a6'}],'h1h7','a1a6'],
  [[{uci:'a1a6'}],'h1h7','b1b6'],
  [[{uci:'a1a6'}],'h1h7','h1h7'],
  [[{uci:'a1a6'},{uci:'b1b6',width:3.125}],'b1b6','a1a6'],
  [[],undefined,undefined],
  [[{uci:'h1h6'},{uci:'c8c7',width:3.125}],'h1h7','h1h6'],
 ];
 for(const [sf,m1,m2] of sequences){
  const arrows=await page.evaluate(({sf,m1,m2})=>window.arrowFixture.paintRaw(sf,m1,m2),{sf,m1,m2});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.deepEqual(await page.locator('.nosweat-engine-arrow').evaluateAll(gs=>gs.map(g=>g.dataset.move)),arrows.map(a=>a.uci),'asynchronous update order');
 }
 const sample=fixtures.cases.find(c=>c.id==='reported-J2VCe');
 for(const surface of ['puzzle','analysis','postgame']) for(const [name,options] of Object.entries({single:{single:true},noMaia:{hideMaia:true},noFish:{hideFish:true},off:{off:true},threat:{threat:true},hover:{hover:true},custom:{colors:{stockfish:'#663399',stockfishSecond:'#99ccff',maia:'#ffaa00',maiaSecond:'#cc4488'}}})){
  await page.evaluate(({sample,surface,options})=>window.arrowFixture.render(sample,'black',surface,options),{sample,surface,options});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const arrows=await page.locator('.nosweat-engine-arrow').evaluateAll(gs=>gs.map(g=>({uci:g.dataset.move,tail:g.dataset.tail,head:g.dataset.head})));
  if(name==='off'||name==='threat')assert.equal(arrows.length,0);
  if(name==='single')assert.ok(!arrows.some(a=>a.head.includes('#e85d68')));
  if(name==='noMaia')assert.ok(arrows.every(a=>!a.head.includes('#e89b3c')&&!a.head.includes('#e85d68')));
  if(name==='noFish')assert.ok(arrows.every(a=>!a.tail.includes('#3d9be9')&&!a.tail.includes('#8ac8f5')));
  if(name==='hover'&&surface==='puzzle')assert.equal(arrows.length,0);
  if(name==='custom')assert.ok(arrows.some(a=>a.tail==='#663399'&&a.head==='#cc4488'));
  await page.locator('#board').screenshot({path:path.join(output,`setting-${name}-${surface}.png`)});
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({source,fixtureCases:fixtures.cases.length,comparisons:results.length,asyncTransitions:sequences.length,settingsCases:21,results,errors},null,2));
 console.log(JSON.stringify({comparisons:results.length,asyncTransitions:sequences.length,settingsCases:21,errors}));
} finally {await browser.close();await new Promise(r=>server.close(r));}
