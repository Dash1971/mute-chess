/** Compare the reviewed native feature list with the actual public gateway policy. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { classifyPublicPath } from './public-surface.mjs';

const policy = JSON.parse(await readFile(process.argv[2], 'utf8'));
const routeSource = await readFile(process.argv[3] ?? join(dirname(process.argv[2]), 'routes'), 'utf8');
const declared = new Set([...routeSource.matchAll(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS)\s+(\S+)\s+controllers\.([\w.]+)/gm)].map(m => JSON.stringify(m.slice(1))));
const routes = [...declared].map(row => {
  const [method, path, action] = JSON.parse(row);
  return compileRoute(method, path, action);
});

// Resolve in conf/routes order, including routes that shadow later declarations.
// These finite samples check compatibility, not authorization or valid controller input.
function compileRoute(method, path, action) {
  const parameters = [];
  let pattern = '^', offset = 0;
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const match of path.matchAll(/\$(\w+)<([^>]+)>|:(\w+)|\*(\w+)/g)) {
    pattern += escape(path.slice(offset, match.index));
    const constraint = match[2] ?? (match[4] ? '.+' : '[^/]+');
    pattern += '(?:' + constraint + ')';
    parameters.push({ start: match.index, length: match[0].length, constraint: new RegExp('^(?:' + constraint + ')$') });
    offset = match.index + match[0].length;
  }
  return { method, path, action, parameters, regex: new RegExp(pattern + escape(path.slice(offset)) + '$') };
}

function reverseCoverage(declarations, reviewed, exceptions = new Map()) {
  const words = new Set([
    'alice', 'alice.smith', 'n066f8597b3952d996bc', 'npub1' + 'q'.repeat(58),
    'en', 'de', 'zh', 'white', 'black', 'random', '1', '0', '42', '123456',
    'display', 'chess-clock', 'game-behavior', 'privacy', 'notification', 'engine-analysis',
    'follow', 'unfollow', 'block', 'unblock', 'best', 'unique', 'true', 'false',
    'bullet', 'blitz', 'rapid', 'classical', 'standard', 'a/b', 'a/b/c', '',
    ...[1, 2, 5, 6, 8, 12, 30].flatMap(n => ['a'.repeat(n), '1'.repeat(n)]),
    ...declarations.flatMap(r => r.path.split('/').filter(p => p && !/[:$*]/.test(p))),
  ]);
  const requests = new Set();
  for (const route of declarations) {
    const values = route.parameters.map(p => [...words].filter(v => p.constraint.test(v)));
    assert(values.every(v => v.length), 'Add route samples for ' + route.path);
    const build = choices => {
      let path = route.path;
      for (let i = route.parameters.length - 1; i >= 0; i--) {
        const p = route.parameters[i];
        path = path.slice(0, p.start) + choices[i] + path.slice(p.start + p.length);
      }
      assert(route.regex.test(path), 'Generated sample does not match ' + route.path);
      requests.add(JSON.stringify([route.method, path]));
      if (route.method === 'GET') requests.add(JSON.stringify(['HEAD', path]));
    };
    const defaults = values.map(v => v[0]);
    build(defaults);
    values.forEach((candidates, i) => candidates.forEach(v => build(defaults.map((d, j) => i === j ? v : d))));
  }
  let admitted = 0;
  const missing = new Set();
  const excepted = new Set();
  for (const request of requests) {
    const [method, path] = JSON.parse(request);
    if (classifyPublicPath(method, path) !== 'allow') continue;
    const nativeMethod = method === 'HEAD' ? 'GET' : method;
    const resolved = declarations.find(r => r.method === nativeMethod && r.regex.test(path));
    assert(resolved, 'Unresolved declared request: ' + request);
    const permitted = reviewed.some(r => r.method === nativeMethod && r.action === resolved.action && new RegExp(r.pattern).test(path));
    const key = resolved.method + ' ' + resolved.path + ' ' + resolved.action;
    if (exceptions.has(key)) {
      assert(exceptions.get(key).length > 0 && !permitted, 'Obsolete/invalid closed-route exception: ' + key);
      excepted.add(key);
    } else if (!permitted)
      missing.add(method + ' ' + path + ' -> ' + resolved.action);
    admitted++;
  }
  assert.equal(missing.size, 0, 'Gateway-admitted request missing from native allowlist:\n' + [...missing].join('\n'));
  assert.deepEqual([...excepted].sort(), [...exceptions.keys()].sort(), 'Stale closed-route exception');
  return { declaredRoutes: declarations.length, generatedRequests: requests.size, admittedRequests: admitted, closedExceptions: [...exceptions] };
}
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
for (const name of ['alice', 'alice.smith', 'npub1' + 'q'.repeat(58)]) {
  assert.equal(classifyPublicPath('GET', '/@/' + name + '/blog'), 'unsupported');
  assert.equal(classifyPublicPath('HEAD', '/@/' + name + '/blog.atom'), 'unsupported');
  assert.equal(classifyPublicPath('POST', '/@/' + name + '/blog/new'), 'deny');
}
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
const reverse = reverseCoverage(routes, policy.routes, new Map([
  [String.raw`POST /$gameId<\w{8}>/request-analysis Analyse.requestAnalysis`,
    'The legacy mobile alias is not supported; analysis is also an eight-character game ID match. The broad /analysis gateway family passes that collision, which the native list intentionally closes. The supported /game/:id/request-analysis path is unchanged.'],
]));
// A new action under an already admitted URL family must fail this check.
assert.throws(() => reverseCoverage([compileRoute('GET', '/club/future', 'Future.show')], []), /missing from native allowlist/);
// Route resolution uses the first declaration, not a later permitted action.
assert.throws(() => reverseCoverage([
  compileRoute('GET', '/club/future', 'Future.show'),
  compileRoute('GET', '/club/:id', 'NoSweat.game'),
], [{ method: 'GET', action: 'NoSweat.game', pattern: '^/club/[^/]+$' }]), /Future.show/);
console.log(JSON.stringify({ nativeRoutes: unique.size, gatewayParity: 'pass', reverseCoverage: reverse }));
