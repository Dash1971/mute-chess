# Live release checks

These are the existing 23 November 2026 checks committed for [#383](https://github.com/Dash1971/mute-chess/issues/383),
with the false homepage JSON-LD requirement corrected. They are standalone
operator checks, not a new deployment runner. No service starts/stops, admission
changes, record publisher, scheduler, monitor or classifier changes are included.

Commit and merge every release-acceptance check before maintenance. Never add or
edit checks during a window. Before pausing admissions, write each expected
old-release result and run these same checks against the serving release. Normally
expect pass; declare an expected failure only for the fix being shipped, citing
the assertion and issue. Resolve unexpected results before maintenance. Required
security checks cannot be dropped to proceed. Candidate expectations must also
be written beforehand; do not accept the currently observed identity as the
expected identity.

## Classification and sequence

| Check | Class | What it establishes |
| --- | --- | --- |
| `service-health.py` | Critical | Existing app, WS, adapter, gateway, database, tunnel and isolation units active; authenticated adapter health |
| `public-health.py critical EXPECTED_MAIN` | Critical | Public HTTP/revision, real WS upgrade, anonymous Arena creation refused, blocked export/moderator/Racer paths |
| `account-auth-smoke.mjs` | Critical | Real signed Nostr challenge, reserved-name rejection and replay refusal; no account created |
| `study-http-check.py` | Critical | Anonymous private config/division refused, public allowed, missing refused; temporary fixture removed |
| `counts.js` | Critical | Counts and sorted identity/rating/claim/second-factor hashes for a frozen continuity comparison |
| `security-artifacts.py` | Critical | Expected commit/tree/inventory, real build/source archive provenance, every recorded class hash, deployed libraries/sanitizer/private runtimes and existing backports |
| `monitor-check.py` | Critical | Existing monitor's release fingerprint, all control hashes/isolation, no containment or critical drift |
| `bot-live-state.py` | Critical | Admissions open and the **same existing real game** advances within 60 seconds; never starts a game |
| `public-health.py advisory EXPECTED_MAIN` | Advisory | Existing stylesheet/content/Arena discovery checks; parses any homepage JSON-LD without requiring a block |
| `account-auth-smoke.mjs --advisory-copy` | Advisory | Exact translated ja-JP rejection copy; independent of the critical signed guard |
| `about-locales.py` | Advisory | About-page credits render against all ten native locale catalogs |

The signed smoke exercises rejection/replay, **not a successful returning-user
session**. Do not report successful sign-in from this result. Preserve the
existing browser sign-in check with an authorized test identity when validating
sign-in; never obtain or log an owner's private key. This issue does not add an
account fixture or authentication framework.

After activation, health/auth/authorization, frozen continuity and deployed
source-identity gates control reopening. Reopen immediately when they pass.
Following a global drain, run the real-game progress check immediately **after**
reopening: there is no active game to observe while closed. Continue
non-disruptive verification, security record publication and the fresh existing
OpenClaw classifier collection with games open. Completion still requires
`inventory_verified=true`; no predicate is weakened. A real critical failure
remains an incident. Advisory failures are recorded and resolved afterward;
they cannot hold admissions or trigger rollback.

Before rollback, name the critical failure and record evidence that the
application, rather than the check, is defective. A security release must not be
rolled back for an advisory result or a suspected test defect. Use the existing
[release procedure](../README.md#live-release-gates-and-rollback) and
[security completion procedure](../../../docs/security-maintenance.md#every-deployment-completion-check).

## Running the existing checks

Use the existing private Mini environment. Run host checks as root; do not expose
private ports or print adapter tokens. `counts.js` uses the existing root-only
mongosh connection. The public check can run on the operator's machine;
`monitor-check.py` runs on the existing OpenClaw controller. Direct stdout to
task-owned evidence files, outside the release and repository. Run scripts from
the reviewed checkout (or copy those exact files to private scratch).

```sh
python3 service-health.py
python3 public-health.py critical "$EXPECTED_MAIN" > "$EVIDENCE_DIR/PUBLIC-HEALTH.json"
/opt/nosweatchess/tools/node account-auth-smoke.mjs > "$EVIDENCE_DIR/ACCOUNT-AUTH-SMOKE.json"
python3 study-http-check.py > "$EVIDENCE_DIR/STUDY-HTTP-CHECK.json"
/opt/nosweatchess/tools/node /home/dash/no-sweat-lila/tools/mongosh/node_modules/mongosh/bin/mongosh.js mongodb://127.0.0.1:27019/nosweat --quiet --file counts.js
python3 security-artifacts.py --expected-main "$EXPECTED_MAIN" \
  --expected-native "$EXPECTED_NATIVE" --expected-tree "$EXPECTED_TREE" \
  --expected-inventory "$EXPECTED_INVENTORY" --expected-arena-host "$EXPECTED_ARENA_HOST" \
  --build-receipt "$BUILD_RECEIPT" --evidence-dir "$EVIDENCE_DIR"
python3 bot-live-state.py
python3 public-health.py advisory "$EXPECTED_MAIN"
/opt/nosweatchess/tools/node account-auth-smoke.mjs --advisory-copy
python3 about-locales.py
```

On the controller: `python3 monitor-check.py`. Continue to use its existing
`collect_host.py` and `reconcile.classify` for the completion collection, without
changing their inputs/rules or sending a test scheduled report.

The auth smoke sends a real ephemeral signed request but uses an intentionally
rejected name; it verifies zero account creation and clears its secret from
memory. The study check performs **temporary fixture writes**, guarded by random
IDs, collision checks, owner/marker-qualified cleanup and a missing-after-cleanup
assertion. It does not alter a user's studies. Neither check pauses games.

Capture continuity counts before and after activation while admissions are
closed/drained and compare them using the existing procedure. During an open-site
baseline, counts/ratings can legitimately change as games finish: successful
capture does not establish equality or prove an activation occurred.

`security-artifacts.py` retains the existing deployed-artifact assertions, takes
explicit release/evidence inputs instead of the deleted task directory, and
verifies every build-receipt class hash. Its publication-only tail is omitted:
it does not write `SECURITY_VERIFICATION.json`, its legacy reader or `source.tar.gz`.
Use the unchanged security completion procedure to publish actual observations
against matching receipts after a deployment. The historical build flags remain
evidence of the original build, never a claim this check rebuilt anything.

## Baseline declared before the #383 run

23 November 2026, serving release (not the documentation PR):

- Main: `bc226308e6b7c77801dc3d120b5b34872a8fa0c9`.
- Native: `a372615f8a1fe3f6d48ba60913c44d7b6b40da48`;
  tree: `8ca5466297355f02cd67ec71726bb8abcc498839`.
- Inventory SHA256: `9db1ee4beaf764ecce65ce229cacaa7e2825fea603bf1674daa6aea8698b5bbe`.
- Build receipt: `SECURITY381_BUILD.json`; expected Arena host is the existing
  approved canonical host `n066f8597b3952d996bc`.
- Expected result for **each check in the table: pass**. Homepage JSON-LD block
  count is expected to be zero (valid); no record publication or deployment.
- Capture the live continuity snapshot only, without requiring live counts to
  stay frozen. Expect existing games to advance with admissions open throughout.

The baseline result is recorded in the PR. The unchanged
[incident RCA](../../../docs/records/rca-2026-11-23-security-release-delay.md)
retains the original failure/correction and measured interruption.

### Observed baseline

All listed checks passed on the declared release with games open (23 November,
22:36–22:40 JST). Nine service units and adapter health passed; public WS returned
101; blocked paths and the private/public/missing authorization matrix passed.
All 28 build-receipt class hashes and runtime/source checks matched. Five sampled
real games advanced. All ten About locales and the separate auth-copy advisory
passed; absent homepage JSON-LD parsed as zero valid blocks.

The fresh existing classifier collection at 22:40:25 JST returned
`inventory_verified=true`, using the retained 22:12 advisory scan (no new scan
or report delivery). Racer GHSA-2rpf-mmrc-v68p remains visible as pending with its
public upgrade path blocked; it is not claimed patched. Monitor control hashes
and isolation matched, with no containment or critical drift. Active RELEASE,
both security-reader records and the source archive remained byte-identical.
Continuity counts were captured while games were open, not compared as a frozen
cutover pair. No successful returning-user session is claimed from the signed
rejection/replay test. No service/admission change or deployment occurred.
