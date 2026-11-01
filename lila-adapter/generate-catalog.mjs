#!/usr/bin/env node
// Generate identities from measured policies, without playing or editing games.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { allocateCatalog, canonicalCatalogPolicy } from './catalog-calibration.mjs';
import { assignedPersonality } from './personality.mjs';

const ROOT = new URL('../', import.meta.url);
const DATA = new URL('docs/data/catalog-2026-11-01/', ROOT);
const read = async path => JSON.parse(await readFile(new URL(path, ROOT)));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const CATALOG_VERSION = 'measured-policy-catalog-2026-11-01-v1';
export const RESEARCH_URL = 'https://github.com/Dash1971/mobile-maia-research/blob/d12f93536442c636d56ec23313e89807a2771467/studies/bot-rating-establishment-2026-10-31/REPORT.md';

const prefixes = `Neon Chrome Null Ghost Violet Cobalt Moss Pixel Quantum Silent Lunar Solar Amber Copper Velvet Binary Azure Ivory Scarlet Silver Golden Crimson Indigo Onyx Echo Cipher Static Prism Velvet Jade Frost Ember Ash Iron Glass Carbon Quartz Slate Vapor Plasma Sonic Astral Nova Cosmic Lunar Dusk Dawn Night Mist Rain Storm Thunder Snow Ice Silk Soft Quiet Hollow Hidden Broken Lost Last First Deep Far Low High Bright Dark Clear Swift Slow Pale Warm Cold Blue Red Green Black White Grey Rose Ruby Opal Pearl Coral Flint Steel Bronze Alloy NeonWave Moon Star Void Zero One Zen Hex Bit Byte Data Signal Pulse Phase Delta Sigma Omega Alpha Beta Gamma Lambda Theta Kappa Logic Vector Scalar Flux Ion Photon Proton Radon Xenon Argon Krypton Mercury Saturn Orion Vega Lyra Draco Hydra Phoenix Raven Falcon Kestrel Owl Fox Lynx Wolf Cat Moth Wasp Bee`.split(' ');
const suffixes = `Rook Knight Bishop Pawn Queen King Gambit Castle Check File Rank Square Fork Pin Skewer Warden Oracle Runner Pilot Diver Drifter Weaver Keeper Seeker Walker Rider Dancer Dreamer Sleeper Nomad Ranger Courier Vector Signal Circuit Protocol Cipher Relay Proxy Tunnel Packet Socket Portal Kernel Module Byte Bit Code Script Shell Cache Stack Queue Thread Process Memory Buffer Matrix Vertex Pixel Glyph Rune Symbol Token Key Lock Gate Bridge Window Mirror Shade Shadow Ghost Phantom Specter Wraith Spirit Echo Whisper Murmur Noise Static Hush Silence Hum Chord Note Tempo Rhythm Beat Pulse Wave Phase Spark Ember Flame Smoke Ash Dust Mist Cloud Rain Storm Frost Snow Ice Glass Stone Pebble Marble Quartz Opal Jade Pearl Ruby Onyx Flint Copper Bronze Steel Iron Chrome Alloy Carbon Graphite Moss Fern Ivy Reed Lily Rose Iris Lotus Bloom Leaf Seed Root Vine Grove Forest Meadow Harbor Haven Shelter Refuge Beacon Lantern Prism Lens Ray Beam Halo Aura Arc Orbit Comet Meteor Planet Moon Star Sun Nova Galaxy Cosmos Nebula Horizon Skyline Rooftop Alley Avenue Street Market Station Terminal Junction Crossroad Transit Subway Monorail Metro Tram Taxi Drone Droid Android Automaton Robot Replicant Synth Servo Motor Engine Gear Turbine Dynamo Reactor Battery Capacitor Diode Triode Anode Cathode Electron Photon Proton Neutron Quark Ion Atom Molecule Crystal Lattice Tessera Spiral Helix Fractal Pattern Motion Momentum Inertia Gravity Force Energy Power Torque Spin Drift Flow Tide Current Stream River Delta Ocean Lake Pond Isle Reef Coast Shore Cove Bay Cape Dawn Dusk Night Twilight Midnight Noon Aurora Eclipse Solstice Equinox Mirage Oasis Desert Dune Canyon Valley Summit Peak Ridge Cliff Cave Vault Crypt Archive Library Atlas Codex Ledger Journal Manuscript Chapter Verse Story Myth Fable Legend Saga Memory Dream Thought Idea Logic Reason Proof Axiom Theorem Lemma Puzzle Riddle Enigma Mystery Paradox Cipher`.split(' ');
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
function uniqueNames(existing, reserved) {
  const used = new Set([...existing, ...reserved].map(n => n.replace(/[^a-z0-9]/gi,'').toLowerCase()));
  const values = new Map();
  for (const p of prefixes) for (const s of suffixes) {
    const username = p+s, name = p+' '+s, key = username.toLowerCase();
    if (name.length <= 20 && !used.has(key)) values.set(key, {username,name});
  }
  return [...values.values()].sort((a,b) => compare(digest(CATALOG_VERSION+':name:'+a.username), digest(CATALOG_VERSION+':name:'+b.username)));
}
function transfer(reference, conditioning, target, anchor) {
  const reliable = reference.users.filter(u => [target,anchor].every(s => {
    const p=u.perfs[s];return p && !p.prov && p.rd<=110 && p.games>=30;
  }));
  if (!reliable.length) throw Error('No supported cross-speed reference');
  reliable.sort((a,b) => Math.abs(Number(a.id.split('_').at(-1))-conditioning)-Math.abs(Number(b.id.split('_').at(-1))-conditioning) || compare(a.id,b.id));
  const chosen=reliable[0];
  return {delta:chosen.perfs[target].rating-chosen.perfs[anchor].rating, reference:chosen.id,
    requestedConditioning:conditioning, usedConditioning:Number(chosen.id.split('_').at(-1)),
    sourceSpeed:anchor, targetSpeed:target, method:'historical-cross-speed-prior'};
}
export async function generateCatalog() {
  const original=await read('lila-adapter/roster.json'), extra=await read('lila-adapter/experiment-roster.json');
  const existing=[...original,...extra];
  const recorded=await read('docs/data/catalog-2026-11-01/reference-settings.json');
  if (digest(existing)!==digest(recorded)) throw Error('Original measured roster changed');
  const perfs=await read('docs/data/catalog-2026-11-01/reference-perfs.json');
  const distributions={blitz:await read('docs/data/catalog-2026-11-01/distribution-blitz.json'),rapid:await read('docs/data/catalog-2026-11-01/distribution-rapid.json')};
  const references=await read('docs/data/lichess-maia-adjustment-reference-2026-10-30.json');
  const naming=await read('lila-adapter/catalog-names.json');
  const allocation=allocateCatalog({roster:existing,perfs,distributions,totalSize:10000,minRating:800,seed:CATALOG_VERSION});
  const byId=new Map(existing.map(b=>[b.id,b]));
  const chosen=[];
  for (const t of allocation.templates) for(let n=0;n<t.assignedCount;n++) chosen.push(t);
  // Highest NEW measured policies receive character homages. No rating changes.
  chosen.sort((a,b)=>b.ratings.blitz-a.ratings.blitz || b.ratings.rapid-a.ratings.rapid || compare(a.key,b.key));
  const names=uniqueNames(existing.flatMap(b=>[b.username,b.name]),[...Object.values(naming.legacyAliases),...naming.newCandidates.map(n=>n.name)]);
  if(names.length<chosen.length) throw Error('Insufficient unique display names');
  const catalog=chosen.map((t,index)=>{
    const id='catalog-'+String(index+1).padStart(5,'0');
    const homage=naming.newCandidates[index];
    const identity=homage ? {name:homage.name,username:homage.name.replace(/[^A-Za-z0-9]/g,'')} : names[index];
    const source=byId.get(t.prototypeId), random=assignedPersonality(id);
    const personality={...random,assignment:'measured-policy-history-hash-timing-v1',history:source.personality.history};
    const ratings={};
    for(const speed of ['blitz','rapid']) ratings[speed]={initial_rating:t.ratings[speed],initial_rd:100,status:'research-seeded',source:'measured-policy-reference'};
    const bullet=transfer(references,source.conditioning_self,'bullet','blitz');
    const classical=transfer(references,source.conditioning_self,'classical','rapid');
    ratings.bullet={initial_rating:t.ratings.blitz+bullet.delta,initial_rd:100,status:'research-seeded',source:'historical-cross-speed-prior'};
    ratings.classical={initial_rating:t.ratings.rapid+classical.delta,initial_rd:100,status:'research-seeded',source:'historical-cross-speed-prior'};
    ratings.ultraBullet={...ratings.blitz,source:'unvalidated-blitz-proxy'};
    ratings.correspondence={...ratings.rapid,source:'unvalidated-rapid-proxy'};
    if(Object.values(ratings).some(p=>p.initial_rating<400||p.initial_rating>4000))throw Error('Unsupported prior; no clipping');
    const bot={id,...identity,conditioning_self:source.conditioning_self,conditioning_opponent:source.conditioning_opponent,
      sampling_profile:source.sampling_profile,temperature_after_opening:source.temperature_after_opening,top_p_after_opening:source.top_p_after_opening,
      opening:source.opening,personality,ratings,
      rating_assignment:{schema:1,version:CATALOG_VERSION,method:'measured-policy-reference-v1',referenceIds:t.sourceIds,
        referencePolicyKey:t.key,researchUrl:RESEARCH_URL,initialRd:100,gameCount:0,
        speedMethods:{blitz:'measured-policy-reference',rapid:'measured-policy-reference',bullet:bullet.method,classical:classical.method,
          ultraBullet:'unvalidated-blitz-proxy',correspondence:'unvalidated-rapid-proxy'},bulletReference:bullet.reference,classicalReference:classical.reference},
      ...(homage?{homage:homage.franchise}:{})};
    if(JSON.stringify(canonicalCatalogPolicy(bot))!==t.key)throw Error('Generated policy differs from reference');
    return bot;
  });
  const all=[...existing,...catalog];
  for(const field of ['id','username'])if(new Set(all.map(b=>b[field].toLowerCase())).size!==10000)throw Error('Duplicate '+field);
  const compact=n=>n.replace(/[^a-z0-9]/gi,'').toLowerCase();
  const displayNames=all.map(b=>naming.legacyAliases[b.username]??b.name);
  if(new Set(displayNames.map(compact)).size!==10000)throw Error('Duplicate public display name');
  if(all.some(b=>b.name.length>20||b.username.length>20))throw Error('Name exceeds supported length');
  const ranks={};
  for(const speed of ['blitz','rapid']) ranks[speed]=all.map(b=>({id:b.id,username:b.username,name:naming.legacyAliases[b.username]??b.name,
    rating:perfs[b.id]?.[speed].rating??b.ratings[speed].initial_rating,reference:byId.has(b.id)})).sort((a,b)=>b.rating-a.rating||compare(a.username,b.username)).slice(0,20);
  const used=allocation.templates.filter(t=>t.assignedCount);
  const manifest={schema:1,version:CATALOG_VERSION,total:10000,preserved:250,added:9750,referencePolicies:allocation.templates.length,usedPolicies:used.length,
    method:'Exact measured policy reuse; equivalent-policy RD-weighted reference means; joint Blitz/Rapid CDF allocation',
    assignedRd:100,assignedGameCount:0,researchUrl:RESEARCH_URL,referenceRosterSha256:digest(recorded),referencePerfsSha256:digest(perfs),
    aliases:naming.legacyAliases,distributionSource:await read('docs/data/catalog-2026-11-01/distribution-source.json'),
    distribution:{thresholds:allocation.thresholds,target:allocation.target,achieved:allocation.achieved},
    templateCounts:used.map(t=>({key:t.key,sourceIds:t.sourceIds,ratings:t.ratings,count:t.assignedCount})),top20:ranks,
    ranges:Object.fromEntries(['blitz','rapid','bullet','classical'].map(s=>[s,{newMin:Math.min(...catalog.map(b=>b.ratings[s].initial_rating)),newMax:Math.max(...catalog.map(b=>b.ratings[s].initial_rating))}]))};
  return {catalog,all,aliases:naming.legacyAliases,manifest};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const {catalog,aliases,manifest}=await generateCatalog();
  await writeFile(new URL('lila-adapter/catalog-roster.json',ROOT),'[\n'+catalog.map(b=>JSON.stringify(b)).join(',\n')+'\n]\n');
  await writeFile(new URL('lila-adapter/catalog-aliases.json',ROOT),JSON.stringify(aliases,null,2)+'\n');
  await writeFile(new URL('catalog-manifest.json',DATA),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({total:manifest.total,new:manifest.added,usedPolicies:manifest.usedPolicies,distribution:manifest.distribution.achieved,top20:manifest.top20.blitz}));
}
