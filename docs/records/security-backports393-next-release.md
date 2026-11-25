# Lobby-ID, Racer and SRI guard backports — release preparation

The owner authorized the combined waiting-PR release on November 26, 2026.
These source targets are not deployed or eligible to clear live advisories until
activation, exact runtime verification and the fresh existing classifier pass.

- Native [PR #10](https://github.com/Dash1971/lila/pull/10) cherry-picks
  c45261e09272b6fb78f6884419ecccdf8705ee09 for GHSA-3m7f-j2c6-6x4x.
  Validate before both lobby request branches. Use the pinned native GameId
  alphabet (eight ASCII word/hyphen characters), preserving existing mixed-case
  IDs. The two actual lobby-init tests reject traversal/query/length/newline
  input and retain valid IDs through native and Mute branches. Focused lint and
  formatting pass. Mute's fixed /club/play JSON endpoint remains unchanged.
- The retained WebSocket patch adds upstream
  257e811ea70e1f39fe9ec0d01f08caca363f1674 for GHSA-2rpf-mmrc-v68p.
  Check the existing `racer.race.<id>` cache marker before opening a Racer room.
  The Lila marker writer, 1f25f6ae91088627103f1e3b6da76fa78e78ff8d,
  is already in our upstream pin. The advisory's Lila commit alone did not fix
  the separately pinned WebSocket server. Exact patched WS source compiled;
  both existing FriendPayloadTest cases passed. No live Racer integration test
  is claimed. Keep the gateway's public Racer denial.

- Issue #402 adds upstream WebSocket commit
  bee9229a6d75f97386a9194bd5ca06eaa508076f for GHSA-rxpx-6m5g-qm2w.
  Explicitly flatMap Sri.read in the socket controller and anonymous auth
  fallback. The previous Sri.from(Option) selected an inherited overload and
  bypassed String validation. The supported public lobby socket makes this
  applicable to our pin; no live impersonation or load test was performed.
  Four focused regressions reproduce that overload bypass with synthetic IDs,
  reject encoded packed account bindings through the real request parser,
  preserve browser/mobile/missing SRI behavior, and exercise real Auth fallback
  without database or network access. All four and the two friend-payload
  tests pass; exact WS compilation and Scala formatting pass. The source
  changes preserve the upstream validator's accepted alphabet and auth flow.

Both native PRs #11 (US English) and #10 (lobby guard) are merged. The companion
pins their actual combined native main, `f042367d18dac287dbfde5f9d20a0be088b3a11a`,
tree `6f338e6d31a325cad77171400ce2e9fd0b5ff29c`. Exact new native paths and
reviewed security target provenance move together. Complete normal companion
checks and the real full build before activating the combined application release.

November 26 isolated integration validation used the actual Mongo cache and
Controller.racer with a task-owned loopback Mongo process/database. Missing and
TTL-expired markers return 404; a valid marker constructs the endpoint; stopping
the isolated cache fails the request closed. Ordinary anonymous authentication
and its existing SID fallback remain intact. The test passed; the fixture
process and data were removed. No public Racer route was opened. Re-run lobby
regressions and the existing release checks. After deployment match actual native commit/tree,
patched WS source and compiled classes, refresh both current security readers
and the reviewed OpenClaw inventory, and require inventory_verified=true before
clearing any of the three live advisories. Do not change classifier predicates or schedules.

AI assistance: Codex prepared the upstream backports and focused validation;
existing owner review and focused CI findings were addressed. The scope is these three guards, without new tooling,
route exposure, user strings or unrelated dependency changes.
