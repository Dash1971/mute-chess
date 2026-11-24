# Security versions and advisory review

Dated entries describe their stated release or maintenance operation. They do
not override the latest [verified release evidence](records/documentation-review-evidence-2026-11-24.md)
or authorize another operation. Source targets and verified deployments are
distinct; issue closure alone proves neither installation nor runtime safety.

## November 23 chat and structured-data fixes (#381)

The deployed November 23 release backports Lichess commits
`fb5dcea873881c84909bd4aceb8d0f516e6f3454` (GHSA-m2c6-9p38-6473)
and `1aa437dc5ae7983aad537cb7ead0c69ce381352b` (GHSA-gj2c-24vm-2v39)
with `cherry-pick -x` provenance. Ordinary local room moderation cannot emit
cross-chat deletion events. Native moderator and broadcast-moderator audit and
new-timeout deletion behavior remain intact. The shared metadata helper retains native JSON serialization and escapes HTML
tag-openers as JSON Unicode escapes, keeping its script content inert and valid
JSON. This corrects the intermediate patch's HTML-entity encoding, which the
round-trip tests reproduced as two JSON parsing failures. The implementation
retains the helper API; upstream follow-up
`44695041c92372a2a4ec33f153a37e1df48af943` provides the safe JSON rendering
context. Ublog structured data stays disabled, and the Mute
organization metadata hook retains its branding with the upstream `Frag` type.
No user-facing copy, feature exposure or translation keys change.

Regression evidence must show assertion failures with the old behavior and
passes with the fixed production event publication and rendered markup. Run
`chat/testOnly lila.chat.NoSweatChatTimeoutTest` and
`web/testOnly lila.web.NoSweatStructuredDataTest lila.web.NoSweatBrandingTest`.
The chat test observes actual Bus events through the private production
publication method; it does not require a database, new test dependency or
public test hook. Preserve the real build receipts and verify the deployed chat,
structured-data, blog and Mute metadata class hashes before updating the
reviewed inventory. A source target is not proof of deployment.

The other two newly published flags have distinct statuses. The Fishnet key
disclosure fix `aadc0f01b401caee91d7b1cb645c84a31d6b2cff` is already in our
native ancestry; the active analysis JSON writer selects only `nodesPerMove`
and `version`, excluding `fishnetKey`. The Puzzle Racer advisory concerns the
separate WebSocket service. Its vulnerable public upgrade endpoint is blocked
by the gateway; this is a mitigation, not a claim that the WebSocket pin is
patched. The real gateway test rejects both Racer URL forms before forwarding
and retains a successful analysis upgrade. Keep that raw flag visible with its
documented mitigation under the unchanged classifier. Blog publishing and the
supporting streamer endpoint also remain blocked.

## November 21 OS security maintenance (#355)

The November 21 OS update completed as recorded in [PR #356](https://github.com/Dash1971/mute-chess/pull/356). Apply later Ubuntu updates through the existing weekly-update procedure,
which drains all games before a required reboot and reopens admissions after
healthy startup. The kernel target is 7.0.0-44.44 (running 7.0.0-44-generic),
covered by USN-9166-1 even though its APT candidate is labelled updates rather
than security. PyJWT's system package target is 2.10.1-4ubuntu1.4 for
CVE-2026-102269 / USN-9177-1; it is absent from the application's Python venv.
OpenJDK 21.0.13.1 was already installed automatically on November 20 for
USN-9156-1. Confirm both running Java services use that patched runtime.

GHSA-f5v5-272f-4q4f is already fixed in the unchanged Lila pin: upstream commit
016e06f188e05dc96a7c5a0ab2b548895f7ec44e precedes our pin, and RequestPref
retains the removal of bgImg request/session input. Confirm the deployed class,
then apply this reviewed inventory decision through OpenClaw's existing
matching-pin verification. No application source patch or classifier change is
needed. Preserve the active RELEASE.json, original build receipts and security
control hashes; refresh current verification using the actual boot/runtime
observations and require a fresh inventory_verified=true collection.

Monitoring investigation found repeated connection-refused stack traces to the
unconfigured opening explorer at localhost:9002. A sampled ten-minute window
had 1,332 application journal entries, exceeding the fast poll's existing
250-entry / 200,000-byte limits. The independent full journal archive retains
the underlying records. Two isolated failed fast polls have no saved exception
reason; do not invent a cause or discard the missed intervals. Current complete
polls do not backfill those observations. Keep existing monitoring and history
enabled. Correcting the optional opening requests is a separate bounded
follow-up; no limit increase, warning suppression or monitoring redesign is
part of this maintenance.

## Verified translation-parser upgrade (#318)

The native fork pins `bin/package.json` and the frozen lock to fast-xml-parser
5.12.0, fixing GHSA-474x-hrwr-fgx4 / CVE-2026-126066. The upgrade retains existing
translation options without `stopNodes`; PR #344 records identical parsed content
across 460 XML files and byte-identical generated Scala keys.

The November 23 deployed release verification records the installed 5.12.0 build
dependency, frozen install and package/manifest/lock hashes. Those records were
read again on November 24; see the
[release evidence](records/documentation-review-evidence-2026-11-24.md).
This is translation-generation tooling, not a running application service.
The old instruction to wait for a future deployment is superseded. Each later
release still requires its own actual build/runtime verification; issue closure
alone is not deployment evidence. This documentation update does not modify the
host's reviewed inventory, classifier or advisory decisions.

## November 19 runtime maintenance (#342)

Cloudflared is updated through its existing APT repository from 2026.11.0 to
2026.11.1. Cloudflare commit 1d50650b69dd95663e6d97c8dc9cba5dd17a788c
bumps the embedded OpenTelemetry SDK/trace from 1.45.0 to 1.47.0, fixing
CVE-2026-128085 / GHSA-q7gw-24fr-5p69 (attribute-value length-limit bypass and
excess memory retention). The affected dependency was confirmed in the old
binary; a public exploit path through our configuration was not established.
Vendor packages may contain security fixes without an Ubuntu security-origin
label. Verify the new binary's embedded modules and its running process hash.

The pending cloud-init, cloud-init-base, fwupd, libfwupd3 and GStreamer packages
are also updated. Needrestart's CVE-2026-124757 fix was already installed by
automatic updates earlier that morning. GStreamer 1.28.2-1ubuntu0.1 fixes
CVE-2026-125704. Cloud-init remains disabled. No reboot is required.

This is a runtime/package maintenance operation: the active application remains
main c2088ed8dd658d6152c6e818134811b43191b2e4 with its original build receipts
and RELEASE.json unchanged. Publish these reviewed runtime records separately
with their merged documentation commit, then refresh current verification from
the real MAIA_LAB341_BUILD.json and observed runtime checks. Preserve the prior
inventory/verification and update OpenClaw's reviewed reference only after those
checks. Require a fresh existing-classifier result of inventory_verified=true.
No application rebuild, classifier change, schedule change or control baseline
reset is part of this work. Fast-xml-parser #318 remains pending for the next
application build. Node PR67069 is a tracing feature, not a vulnerability fix;
its keyword match may remain visible until separately recorded by the reviewer.

The maintained release targets are [security-inventory.json](security-inventory.json). Read the actual active `/opt/nosweatchess/current/RELEASE.json` first, then `/opt/nosweatchess/current/corresponding-source/docs/security-inventory.json`. This follows the active release automatically. The original November 5 `SECURITY279_BUILD.json` is historical build evidence. Every later deployment must supply current-release verification as described below; the review date alone is not evidence of freshness.

OpenClaw can read these files using its existing authorized host access as part of its existing daily report. No extra scanner, scheduler or broader access is introduced. Compare advisory affected ranges with the actual runtime versions, upstream pins **and local patches**, and label browser, service-runtime and build/installation-tooling findings separately. Do not report upstream security keyword matches, resolved advisories or CI-only changes as new server vulnerabilities. Do report inventory drift and unresolved applicability rather than guessing.

## November 5 maintenance (#279)

Lila retains its exact upstream revision while dependency overrides select jsoup 1.23.2, Guava 33.7.2-jre and Jakarta Mail 1.6.8. The #365 candidate aligns Lila Netty at 4.2.21.Final; the separately pinned WebSocket component retains 4.2.19.Final. Jackson 2.18.11 alignment remains. Inventory targets describe each component separately; verify the actual staged/runtime jars at release time. The native browser/build lock selects patched DOMPurify, Undici, YAML, source-map, URI, UUID and glob packages. Toast UI embeds DOMPurify 2.3.3 in its ESM distribution: its existing package patch now imports DOMPurify 3.4.17, rather than relying on an ineffective transitive override alone. Security and ordinary-content tests exercise the actual editor viewer.

Redis is updated from the private Ubuntu 8.0.5 extraction to upstream 8.2.11 with the exact upstream Lua metadata fix `e4eb89782d70c26b07a29b956472004cb8a78b80` applied. This is deliberate:8.0.6's older general error-reply fix is not evidence that this later metadata-parsing fix is present. The source tarball and backport have pinned hashes in the inventory. Build with `build-essential` and `libssl-dev`, `make -j2 BUILD_TLS=yes`, without optional modules. The existing host preparation script applies the same patch. Keep the current loopback service/configuration and data unchanged; normal APT upgrades do not update this private binary. The app Python environment uses pip 26.2.0.

The two reported Lichess fixes are already ancestors of our upstream pin. Three MongoDB notices stop at versions below 8.0.34; two concern other release branches. These decisions are recorded with exact IDs and must be revisited if pins or deployment change. The deepmerge 4.3.1 advisory remains visible: no fixed release was listed, and inspected Shepherd tour options are code-defined. An affected package version with no demonstrated input path is not a clean bill of health.

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

Owner policy, November 7,2026: refreshing security verification is required for **every** deployment, including UI/styles-only changes and unchanged dependency graphs. The deployment operator owns this step alongside the normal build, cutover and health checks. The release is not complete until the existing daily-report classifier returns `inventory_verified: true` for a fresh collection of the active release.

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

The controller paths are private operational details documented in its existing Mute Chess daily-report README. This policy adds no scanner, scheduler, deployment framework or broader access. A documentation-only repository change that is not deployed does not change the running application identity; the next application deployment must carry this policy and matching current evidence.


### Planned-release fingerprint coordination

The daily report also reads the separate host monitor's expected RELEASE.json fingerprint. Every deployment must use the existing planned-maintenance wrapper with only the intended changed paths declared, including `/opt/nosweatchess/current/RELEASE.json`. Verify that the new release fingerprint is accepted, isolation is unchanged and no other control hashes drift before declaring completion. Updating advisory verification alone does not resolve a stale host-monitor release record.

If an earlier deployment missed this step, first verify the active commit against approved main/build evidence and actual runtime artifacts, prove that the only configuration-hash difference is RELEASE.json, and check isolation/containment and incident state. Only then record the narrowly scoped release-fingerprint approval with previous/new hashes and evidence, retaining the prior state for audit. Do not reset unrelated hashes, incident records, SSH observations or journal-coverage warnings. This is coordination of an approved application release, not permission to accept unexplained security-control drift.


## November 11 maintenance (#307)

MongoDB's private runtime moves from 8.0.34 to 8.0.38 on the same release branch. Vendor 8.0.37 fixes the newly reviewed 8.0 advisories; 8.0.38 is its packaging follow-up. Preserve the existing standalone data directory and loopback/UID isolation. The MongoDB9.0-only notices remain not applicable to 8.0.

At that release the Lila pin was unchanged and a local backport carried upstream 34830b8316fea29a93c6b797236f79203ad021e8 for GHSA-2cpx-9573-5pwp: HTML-escape the original Markdown when parsing raises StackOverflowError. Since the 23 November 2026 upstream merge (#365), this fix comes from upstream itself. The native Markdown suite includes a long reference-link regression that exercises this fallback. No new user-facing strings.

Keep deepmerge unresolved. fast-xml-parser 5.11.1 remains an affected version in translation-generation tooling, but the inspected invocation does not enable the required stopNodes option. Do not silently classify these as patched. Refresh actual runtime checks/current-release evidence and the reviewed reference inventory after deployment. Classifier changes require the owner's separately scoped approval; preserve fail-closed identity checks and schedules.


## November 13 maintenance (#309)

Backport upstream e71a2964ec3b3c6da7fa7c4ec6b53de53bba4326 (GHSA-2236-pwjw-m8m4) on the unchanged Lila pin. Chapter configuration loads the study and chapter together, enforces native CanView for both config and divisionOnly, and retains the pinned controller's native unauthorized/forbidden continuations. Validate with a temporary isolated HTTP fixture: public config allowed; anonymous private config and division refused; missing fixture refused. Remove the test fixture afterward. No new user-facing strings.

Cloudflared moves from 2026.10.7 to 2026.11.0 through the existing APT repository. Record the actual installed and running version/hash with the fresh current-release security verification. Keep tunnel credentials, units and isolation unchanged.

The moderator-token, tournament and broadcast advisories remain visible. The current gateway blocks their public attack paths; that is not a source-level fix or permission to enable those routes without review. The two existing low-severity dependency findings also remain visible. No classifier predicate or schedule changes are part of this release.


## Arena exposure and subsequent visibility fix (#313/#314)

The original Arena exposure review retained gateway denial of tournament API
exports. The subsequent #314 backport routes games/results/teams exports through
the existing tournament visibility guard, including Mute's owner-event gate.
The broadcast backport validates source addresses using upstream's production
exclusions. Neither change opens a public API route or claims comprehensive
DNS-rebinding protection; existing containment remains required.

The active November 23 release verification records
`tournamentExportVisibilityVerified` and `relayAddressValidationVerified` as true.
See the [read-only evidence review](records/documentation-review-evidence-2026-11-24.md).
The old draft/source-target status is superseded. Gateway mitigation and source
fixes remain distinct, and later releases must verify their actual artifacts.

## Moderator OAuth/TOTP backport (#316)

Backport upstream e6f4cf2f451e8c83dfeba207173b64dfd34c469b for GHSA-5gjj-x225-jrr3 on the unchanged Lila pin. In production, the request-time OAuth role filter preserves moderator roles only when both web:mod and enrolled TOTP are present. This also covers previously issued tokens when account enrollment changes. Preserve upstream development/test behavior and the existing non-moderator permission filter. No accounts, tokens, roles, configuration or public routes are changed. No new user-facing strings.

The advisory's patched-version metadata still says no fix; the reviewed upstream source commit supplies the fix evidence. Run the focused actual-filter regression and permission tests, compile the merged main revision, and verify the deployed SecurityApi class and source against its new build receipt. Preserve all prior security receipts; refresh both current verification reader paths, the exact deployed/reviewed inventory and the existing daily report. Keep deepmerge and fast-xml-parser findings visible. No classifier predicates, monitoring controls or schedules change.
