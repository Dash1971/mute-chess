#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {loadRoster} from './roster.mjs';
const root=process.argv[2];
if(!root)throw Error('Usage: validate-catalog.mjs NATIVE_ROOT');
const native=JSON.parse(await readFile(resolve(root,'public/nosweat-roster.json')));
const aliases=JSON.parse(await readFile(resolve(root,'public/nosweat-bot-aliases.json')));
assert.deepEqual(native,await loadRoster());
assert.deepEqual(aliases,JSON.parse(await readFile(new URL('./catalog-aliases.json',import.meta.url))));
console.log(JSON.stringify({nativeRosterMatchesAdapter:true,population:native.length,aliases:Object.keys(aliases).length}));
