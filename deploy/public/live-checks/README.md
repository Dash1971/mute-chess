# Live release checks

These are the standing release-acceptance checks. They separate critical gates
from advisory checks and use explicit release/build evidence. They are standalone
operator checks, not a deployment runner, service controller or classifier.

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
| `monitor-check.py --expected-path PATH …` | Critical | Existing monitor's release fingerprint, all control hashes/isolation, no containment or critical drift |
| `bot-live-state.py` | Critical | Admissions open and the **same existing real game** advances within 60 seconds; never starts a game |
| `public-health.py advisory EXPECTED_MAIN` | Advisory | Existing stylesheet/content/Arena discovery checks; parses any homepage JSON-LD without requiring a block |
| `account-auth-smoke.mjs --advisory-copy` | Advisory | Exact translated ja-JP rejection copy; independent of the critical signed guard |
| `about-locales.py` | Advisory | About-page credits render against all ten native locale catalogs |

The signed smoke exercises rejection/replay, **not a successful returning-user
session**. Do not report successful sign-in from this result. Preserve the
existing browser sign-in check with an authorized test identity when validating
sign-in; never obtain or log an owner's private key. Rejection/replay fixtures
do not substitute for a successful sign-in check.

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

On the controller: `python3 monitor-check.py --expected-path /opt/nosweatchess/current/RELEASE.json`.
Repeat `--expected-path` for every additional path explicitly declared before
maintenance; the actual and expected lists must match exactly (order does not
matter). The release path remains required. Never derive the expected list from
the observed monitor result during the window. Continue to use its existing
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
explicit release/evidence paths and
verifies every build-receipt class hash. Version expectations come from that
release's reviewed inventory, independently pinned by `--expected-inventory`,
rather than a second set of version literals in the checker. Review candidate
version changes in the normal inventory PR before maintenance, using the old
release's inventory hash for its baseline and the candidate's approved hash after
activation. Keep historical receipt identities and the known-bad sanitizer
exclusion unchanged. Its publication-only tail is omitted:
it does not write `SECURITY_VERIFICATION.json`, its legacy reader or `source.tar.gz`.
Use the unchanged security completion procedure to publish actual observations
against matching receipts after a deployment. The historical build flags remain
evidence of the original build, never a claim this check rebuilt anything.

## Recorded baselines

The [November 23 baseline and observed results](../../../docs/records/live-check-baseline-2026-11-23.md)
are dated evidence. Declare and run a fresh baseline for each release.

<details>
<summary>Historical section links</summary>

<a id="baseline-declared-before-the-383-run"></a>
- [Baseline declared before the #383 run](../../../docs/records/live-check-baseline-2026-11-23.md#baseline-declared-before-the-383-run)

<a id="observed-baseline"></a>
- [Observed baseline](../../../docs/records/live-check-baseline-2026-11-23.md#observed-baseline)

</details>
