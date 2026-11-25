# Lobby-ID, Racer and SRI guard backports — draft for the next release

Issue [#393](https://github.com/Dash1971/mute-chess/issues/393) is draft-only.
None of these changes is deployed or eligible to clear the live advisories yet.

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

Merge order for the next release: review and merge native PR #10 first; then
update the companion's native-pin.json to that actual merged commit/tree,
register its exact new native paths in upstream-departures.json and update
security-inventory.json targets/provenance together. The draft deliberately
retains the current deployed native pin rather than presenting unmerged code
as the application's authority. Complete the normal source checks and real
build, then deploy the three changes together with the planned application release.

Before marking ready: validate Racer missing/valid/expired markers and cache
failure without opening public Racer routes. Re-run lobby regressions and the
existing release checks. After deployment match actual native commit/tree,
patched WS source and compiled classes, refresh both current security readers
and the reviewed OpenClaw inventory, and require inventory_verified=true before
clearing any of the three live advisories. Do not change classifier predicates or schedules.

AI assistance: Codex prepared the upstream backports and focused validation;
human review is pending. The scope is these three guards, without new tooling,
route exposure, user strings or unrelated dependency changes.
