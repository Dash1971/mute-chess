/** Compare the reviewed native feature list with the actual public gateway policy. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { classifyPublicPath } from './public-surface.mjs';

const policy = JSON.parse(await readFile(process.argv[2], 'utf8'));
const routeSource = await readFile(process.argv[3] ?? join(dirname(process.argv[2]), 'routes'), 'utf8');
const declared = new Set([...routeSource.matchAll(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+(\S+)\s+controllers\.([\w.]+)/gm)].map(m => JSON.stringify(m.slice(1))));
assert.equal(policy.schema, 1);
assert(policy.routes.length > 0);
const unique = new Set();
for (const route of policy.routes) {
  assert(declared.has(JSON.stringify([route.method, route.route, route.action])), 'Stale native route: ' + route.action);
  const key = JSON.stringify([route.method, route.action, route.pattern]);
  assert(!unique.has(key), 'Duplicate reviewed route: ' + key);
  unique.add(key);
  assert(new RegExp(route.pattern).test(route.sample), route.route);
  if (route.scope === 'gateway-bypass') {
    assert(['Main.devAsset', 'ExternalAssets.at', 'Cms.source'].includes(route.action));
  } else {
    assert.equal(classifyPublicPath(route.method, route.sample), route.gateway, route.action);
    if (route.method === 'GET')
      assert.equal(classifyPublicPath('HEAD', route.sample), route.gateway, route.action + ' HEAD');
  }
}
for (const path of ['/future-upstream-feature', '/api/import', '/api/bot/account/upgrade'])
  assert.equal(classifyPublicPath('POST', path), 'deny', path);
assert.equal(classifyPublicPath('GET', '/paste'), 'unsupported');
assert.equal(classifyPublicPath('GET', '/tournament/abcdefgh'), 'allow');
assert.equal(classifyPublicPath('POST', '/tournament/abcdefgh/join'), 'allow');
assert.equal(classifyPublicPath('POST', '/tournament/abcdefgh/export'), 'deny');
for (const [method, path, action] of [
  ...['display','chess-clock','game-behavior','privacy','notification','engine-analysis']
    .map(c => ['GET', '/account/preferences/' + c, 'Pref.form']),
  ['POST', '/rel/block/alice', 'Relation.bcAction'],
  ['POST', '/rel/unblock/alice', 'Relation.bcAction'],
  ['GET', '/tournament/history/unique', 'Tournament.history'],
  ['GET', '/games/best/replacement/01234567', 'Tv.gameChannelReplacement'],
]) {
  assert.equal(classifyPublicPath(method, path), 'allow', path);
  assert(policy.routes.some(r => r.method === method && r.action === action && new RegExp(r.pattern).test(path)),
    'Existing UI route missing from native allowlist: ' + path);
}
console.log(JSON.stringify({ nativeRoutes: unique.size, gatewayParity: 'pass' }));
