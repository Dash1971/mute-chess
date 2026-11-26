# Security versions and advisory review

This is the standing procedure for verifying the actual release and reviewing
advisories. [Security reporting](../SECURITY.md) is the private intake channel.
Dated maintenance entries are retained in the [history log](records/security-maintenance-log-2026-11-24.md).

The maintained release targets are [security-inventory.json](security-inventory.json). Read the actual active `/opt/nosweatchess/current/RELEASE.json` first, then `/opt/nosweatchess/current/corresponding-source/docs/security-inventory.json`. This follows the active release automatically. The original November 5 `SECURITY279_BUILD.json` is historical build evidence. Every later deployment must supply current-release verification as described below; the review date alone is not evidence of freshness.

OpenClaw can read these files using its existing authorized host access as part of its existing daily report. No extra scanner, scheduler or broader access is introduced. Compare advisory affected ranges with the actual runtime versions, upstream pins **and local patches**, and label browser, service-runtime and build/installation-tooling findings separately. Do not report upstream security keyword matches, resolved advisories or CI-only changes as new server vulnerabilities. Do report inventory drift and unresolved applicability rather than guessing.


## At each release or private runtime update

Update the JSON when changing a runtime, upstream pin, local backport or dependency override. Confirm resolved locks and staged jars, compare actual running versions after activation, and retain the build receipt with the release. The standard installer already carries `docs/` in corresponding source. Keep version/patch evidence and source pins in the same release; do not overwrite a deployment record with merely planned versions. For packages not summarized here, use the complete deployed native lock, JVM jars, adapter production lock, Python environment and renderer Cargo lock. Keep secrets, user data and credentials out of inventory and reports.


## Native fork identity (#364)

Current releases and both current verification readers record `nativeCommit`
and `nativeTree`. Require matching full IDs in the release, build verification
and reviewed inventory's `upstreamPins.lila.fork`; retain the original upstream
pin and all security-backport decisions. Verify the actual clean pinned checkout
before staging. The source package includes native fork and Mute main Git
archives plus the remaining small patches. Historical receipts stay byte-for-byte
unchanged; the two-stage transition and external identity-only diff are recorded
in [the fork contract](native-fork.md).

This is a verification contract, not installation evidence: inspect the active
RELEASE.json and fresh OpenClaw collection for actual deployment. The identity
migration authorizes no other predicate, advisory, scheduler or monitor change.

## Every deployment completion check

Owner policy, November 7, 2026: refreshing security verification is required for **every** deployment, including UI/styles-only changes and unchanged dependency graphs. The deployment operator owns this step alongside the normal build, cutover and health checks. The release is not complete until the existing daily-report classifier returns `inventory_verified: true` for a fresh collection of the active release.

Before maintenance, commit and merge every live acceptance check. No check is
added or changed during the window. Write down each expected old-release result
(normally pass; fail only for the fix being shipped), then baseline the same
checks on the currently serving release **before pausing admissions**. Resolve
unexpected results before the window; required security checks cannot be dropped
to proceed. See the [committed live checks](../deploy/public/live-checks/README.md).

Critical checks are app/WebSocket/adapter/gateway health, sign-in, the
authorization matrix, data continuity and deployed commit/tree/class hashes,
plus a real game advancing. All other checks, including page content and
metadata, are advisory. Record and resolve advisory failures after the window;
they never hold admissions or trigger rollback. Rollback requires a named
critical failure and evidence of an application defect rather than a checker
defect. A security release is not rolled back for a suspected test defect.

1. After activation, run the committed critical gates with the predeclared candidate expectations and compare the frozen data-continuity checkpoints. Reopen admissions as soon as these pass. Following a global drain, confirm an existing real game advances immediately after reopening (there is no live game to observe while closed). Continue all verification that does not require a stopped site, including record publication and the fresh classifier collection below, **with games open**. A genuine critical failure remains a critical incident; reopening is not permission to omit checks.
2. Resolve `/opt/nosweatchess/current` once and read its RELEASE.json, reviewed inventory and real current build receipt. Confirm the pointer stays unchanged during collection. Record the active git commit, native fork commit/tree, inventory SHA256 and verification time.
3. Verify the security-sensitive staged/runtime artifacts: selected JVM versions with no obsolete duplicate jars, actual compiled DOMPurify and absence of the old embedded sanitizer code, relevant upstream source fixes, and private runtimes/backports including Redis file **and running-process** hashes. Use the matching current build receipt for rebuild claims. Record only checks actually performed. If evidence is unavailable or mismatched, leave verification pending and report the concrete gap.
4. Preserve the original security build receipt byte-for-byte as `corresponding-source/SECURITY279_ORIGINAL_BUILD.json` (and in its original historical release). Write a **new** `corresponding-source/SECURITY_VERIFICATION.json` with `kind: current-release-security-verification`, `verifiedAtUTC`, `main`, `nativeCommit`, `nativeTree`, `inventorySha256`, source-build filename/hash, original-security-build filename/hash, and observed checks. Keep real build provenance: a fresh verification is not a new build. Never invent successful rebuild flags for reused artifacts.
5. The existing OpenClaw collector reads `corresponding-source/SECURITY279_BUILD.json`. For compatibility, publish the same new verification object at that existing path, with the legacy fields `fullBackendRebuildPassed`, `fullUiBuildPassed`, `redisVersion`, `redisBackport` and `redisServerSha256` supported by the actual matching build/runtime evidence. The preserved original remains separate; the legacy filename now carries explicitly labeled current verification. Keep both current copies identical and include the generated evidence in the existing corresponding-source archive. Do not change RELEASE.json merely to refresh this record.
6. Use OpenClaw's existing `collect_host.py` and `reconcile.classify` on the fresh host collection and existing advisory scan. Require `inventory_verified: true`; unresolved or newly applicable findings remain visible. Do not send an extra scheduled report as a test. Do not edit reviewer reference inventory, bypass identity checks or reset intrusion-monitor baselines just to clear a warning. If reviewed security inputs changed, obtain the appropriate new applicability review and update the maintained inventory through the normal PR procedure.
7. After verified activation, update living feature/status documentation and [release history](releases.md) with the actual deployed Mute/native identities and linked evidence. Preserve dated receipts; label source-only changes as unreleased. A docs-only merge without application activation is not a release-history entry. Finish with a wording search from the repository root:

   ```sh
   rg -n -i 'pending|draft|this PR|this change|next release|not deployed' \
     --glob '*.md' --glob '!docs/records/**' --glob '!docs/data/**' \
     --glob '!archive/**' .
   ```

   Review each result against the release evidence. Replace temporary wording
   for completed releases with current behavior and link the dated record. Retain
   genuinely pending work and historical instructions; this is a manual review,
   not a requirement to remove every matching word. Add every new dated record
   to the [records index](records/README.md).

The controller paths are private operational details documented in its existing Mute Chess daily-report README. This policy adds no scanner, scheduler, deployment framework or broader access. A documentation-only repository change that is not deployed does not change the running application identity; the next application deployment must carry this policy and matching current evidence.


### Planned-release fingerprint coordination

The daily report also reads the separate host monitor's expected RELEASE.json fingerprint. Every deployment must use the existing planned-maintenance wrapper with only the intended changed paths declared, including `/opt/nosweatchess/current/RELEASE.json`. Verify that the new release fingerprint is accepted, isolation is unchanged and no other control hashes drift before declaring completion. Updating advisory verification alone does not resolve a stale host-monitor release record.

If an earlier deployment missed this step, first verify the active commit against approved main/build evidence and actual runtime artifacts, prove that the only configuration-hash difference is RELEASE.json, and check isolation/containment and incident state. Only then record the narrowly scoped release-fingerprint approval with previous/new hashes and evidence, retaining the prior state for audit. Do not reset unrelated hashes, incident records, SSH observations or journal-coverage warnings. This is coordination of an approved application release, not permission to accept unexplained security-control drift.



## Current evidence and open findings

- **Latest evidence:** the [November 26 verified deployment](records/release-2026-11-26.md)
  records the serving identities, deployed lobby/Racer/SRI guards and matching
  security verification. Later releases still require their own verification.
- **Open finding:** the [reviewed inventory](security-inventory.json) still lists
  deepmerge 4.3.1 (GHSA-gcqx-w48m-w2h4) as affected, with no fixed release in that
  review. It is used through shepherd.js tours. Inspected merge options are
  code-defined; an attacker-controlled options path has not been established.
  Keep the finding visible and re-evaluate on an upstream fix or input-path
  change. The release collection's zero new dependency alerts does not clear it.
- **Earlier evidence:** the [records index](records/README.md) links Expat and
  Cloudflared/SQLite maintenance, backport preparation and earlier reviews.

<details>
<summary>Historical section links</summary>

<a id="november-23-chat-and-structured-data-fixes-381"></a>
- [November 23 chat and structured-data fixes (#381)](records/security-maintenance-log-2026-11-24.md#november-23-chat-and-structured-data-fixes-381)

<a id="november-21-os-security-maintenance-355"></a>
- [November 21 OS security maintenance (#355)](records/security-maintenance-log-2026-11-24.md#november-21-os-security-maintenance-355)

<a id="verified-translation-parser-upgrade-318"></a>
- [Verified translation-parser upgrade (#318)](records/security-maintenance-log-2026-11-24.md#verified-translation-parser-upgrade-318)

<a id="november-19-runtime-maintenance-342"></a>
- [November 19 runtime maintenance (#342)](records/security-maintenance-log-2026-11-24.md#november-19-runtime-maintenance-342)

<a id="november-5-maintenance-279"></a>
- [November 5 maintenance (#279)](records/security-maintenance-log-2026-11-24.md#november-5-maintenance-279)

<a id="november-11-maintenance-307"></a>
- [November 11 maintenance (#307)](records/security-maintenance-log-2026-11-24.md#november-11-maintenance-307)

<a id="november-13-maintenance-309"></a>
- [November 13 maintenance (#309)](records/security-maintenance-log-2026-11-24.md#november-13-maintenance-309)

<a id="arena-exposure-and-subsequent-visibility-fix-313314"></a>
- [Arena exposure and subsequent visibility fix (#313/#314)](records/security-maintenance-log-2026-11-24.md#arena-exposure-and-subsequent-visibility-fix-313314)

<a id="moderator-oauthtotp-backport-316"></a>
- [Moderator OAuth/TOTP backport (#316)](records/security-maintenance-log-2026-11-24.md#moderator-oauthtotp-backport-316)

</details>

<details>
<summary>Preserved earlier section URLs</summary>

<a id="required-in-the-next-application-release-fast-xml-parser-318"></a>
- [Required in the next application release: fast-xml-parser (#318)](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/security-maintenance.md#required-in-the-next-application-release-fast-xml-parser-318)

<a id="draft-arena-exposure-review-313"></a>
- [Draft Arena exposure review (#313)](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/security-maintenance.md#draft-arena-exposure-review-313)

<a id="stacked-tournamentbroadcast-backports-314-depends-on-arena-313"></a>
- [Stacked tournament/broadcast backports (#314, depends on Arena #313)](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/security-maintenance.md#stacked-tournamentbroadcast-backports-314-depends-on-arena-313)

</details>
