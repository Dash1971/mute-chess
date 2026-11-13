# Security versions and advisory review

The maintained release targets are [security-inventory.json](security-inventory.json). Read the actual active `/opt/nosweatchess/current/RELEASE.json` first, then `/opt/nosweatchess/current/corresponding-source/docs/security-inventory.json`. This follows the active release automatically. The original November5 `SECURITY279_BUILD.json` is historical build evidence. Every later deployment must supply current-release verification as described below; the review date alone is not evidence of freshness.

OpenClaw can read these files using its existing authorized host access as part of its existing daily report. No extra scanner, scheduler or broader access is introduced. Compare advisory affected ranges with the actual runtime versions, upstream pins **and local patches**, and label browser, service-runtime and build/installation-tooling findings separately. Do not report upstream security keyword matches, resolved advisories or CI-only changes as new server vulnerabilities. Do report inventory drift and unresolved applicability rather than guessing.

## November 5 maintenance (#279)

Lila retains its exact upstream revision while dependency overrides select jsoup1.23.2, Guava33.7.2-jre and Jakarta Mail1.6.8. Existing Netty4.2.19.Final and Jackson2.18.11 alignment remains. The native browser/build lock selects patched DOMPurify, Undici, YAML, source-map, URI, UUID and glob packages. Toast UI embeds DOMPurify2.3.3 in its ESM distribution: its existing package patch now imports DOMPurify3.4.17, rather than relying on an ineffective transitive override alone. Security and ordinary-content tests exercise the actual editor viewer.

Redis is updated from the private Ubuntu8.0.5 extraction to upstream8.2.11 with the exact upstream Lua metadata fix `e4eb89782d70c26b07a29b956472004cb8a78b80` applied. This is deliberate:8.0.6's older general error-reply fix is not evidence that this later metadata-parsing fix is present. The source tarball and backport have pinned hashes in the inventory. Build with `build-essential` and `libssl-dev`, `make -j2 BUILD_TLS=yes`, without optional modules. The existing host preparation script applies the same patch. Keep the current loopback service/configuration and data unchanged; normal APT upgrades do not update this private binary. The app Python environment uses pip26.2.0.

The two reported Lichess fixes are already ancestors of our upstream pin. Three MongoDB notices stop at versions below8.0.34; two concern other release branches. These decisions are recorded with exact IDs and must be revisited if pins or deployment change. The deepmerge4.3.1 advisory remains visible: no fixed release was listed, and inspected Shepherd tour options are code-defined. An affected package version with no demonstrated input path is not a clean bill of health.

## At each release or private runtime update

Update the JSON when changing a runtime, upstream pin, local backport or dependency override. Confirm resolved locks and staged jars, compare actual running versions after activation, and retain the build receipt with the release. The standard installer already carries `docs/` in corresponding source. Keep version/patch evidence and source pins in the same release; do not overwrite a deployment record with merely planned versions. For packages not summarized here, use the complete deployed native lock, JVM jars, adapter production lock, Python environment and renderer Cargo lock. Keep secrets, user data and credentials out of inventory and reports.


## Every deployment completion check

Owner policy, November7,2026: refreshing security verification is required for **every** deployment, including UI/styles-only changes and unchanged dependency graphs. The deployment operator owns this step alongside the normal build, cutover and health checks. The release is not complete until the existing daily-report classifier returns `inventory_verified: true` for a fresh collection of the active release.

1. Resolve `/opt/nosweatchess/current` once and read its RELEASE.json, reviewed inventory and real current build receipt. Confirm the pointer stays unchanged during collection. Record the active git commit, native patch fingerprint, inventory SHA256 and verification time.
2. Verify the security-sensitive staged/runtime artifacts: selected JVM versions with no obsolete duplicate jars, actual compiled DOMPurify and absence of the old embedded sanitizer code, relevant upstream source fixes, and private runtimes/backports including Redis file **and running-process** hashes. Use the matching current build receipt for rebuild claims. Record only checks actually performed. If evidence is unavailable or mismatched, leave verification pending and report the concrete gap.
3. Preserve the original security build receipt byte-for-byte as `corresponding-source/SECURITY279_ORIGINAL_BUILD.json` (and in its original historical release). Write a **new** `corresponding-source/SECURITY_VERIFICATION.json` with `kind: current-release-security-verification`, `verifiedAtUTC`, `main`, `nativePatchSha256`, `inventorySha256`, source-build filename/hash, original-security-build filename/hash, and observed checks. Keep real build provenance: a fresh verification is not a new build. Never invent successful rebuild flags for reused artifacts.
4. The existing OpenClaw collector reads `corresponding-source/SECURITY279_BUILD.json`. For compatibility, publish the same new verification object at that existing path, with the legacy fields `fullBackendRebuildPassed`, `fullUiBuildPassed`, `redisVersion`, `redisBackport` and `redisServerSha256` supported by the actual matching build/runtime evidence. The preserved original remains separate; the legacy filename now carries explicitly labeled current verification. Keep both current copies identical and include the generated evidence in the existing corresponding-source archive. Do not change RELEASE.json merely to refresh this record.
5. Use OpenClaw's existing `collect_host.py` and `reconcile.classify` on the fresh host collection and existing advisory scan. Require `inventory_verified: true`; unresolved or newly applicable findings remain visible. Do not send an extra scheduled report as a test. Do not edit reviewer reference inventory, bypass identity checks or reset intrusion-monitor baselines just to clear a warning. If reviewed security inputs changed, obtain the appropriate new applicability review and update the maintained inventory through the normal PR procedure.

The controller paths are private operational details documented in its existing Mute Chess daily-report README. This policy adds no scanner, scheduler, deployment framework or broader access. A documentation-only repository change that is not deployed does not change the running application identity; the next application deployment must carry this policy and matching current evidence.


### Planned-release fingerprint coordination

The daily report also reads the separate host monitor's expected RELEASE.json fingerprint. Every deployment must use the existing planned-maintenance wrapper with only the intended changed paths declared, including `/opt/nosweatchess/current/RELEASE.json`. Verify that the new release fingerprint is accepted, isolation is unchanged and no other control hashes drift before declaring completion. Updating advisory verification alone does not resolve a stale host-monitor release record.

If an earlier deployment missed this step, first verify the active commit against approved main/build evidence and actual runtime artifacts, prove that the only configuration-hash difference is RELEASE.json, and check isolation/containment and incident state. Only then record the narrowly scoped release-fingerprint approval with previous/new hashes and evidence, retaining the prior state for audit. Do not reset unrelated hashes, incident records, SSH observations or journal-coverage warnings. This is coordination of an approved application release, not permission to accept unexplained security-control drift.


## November 11 maintenance (#307)

MongoDB's private runtime moves from8.0.34 to8.0.38 on the same release branch. Vendor8.0.37 fixes the newly reviewed8.0 advisories;8.0.38 is its packaging follow-up. Preserve the existing standalone data directory and loopback/UID isolation. The MongoDB9.0-only notices remain not applicable to8.0.

The Lila pin remains unchanged. Its local patch backports upstream34830b8316fea29a93c6b797236f79203ad021e8 for GHSA-2cpx-9573-5pwp: HTML-escape the original Markdown when parsing raises StackOverflowError. The native Markdown suite includes a long reference-link regression that exercises this fallback. No new user-facing strings.

Keep deepmerge unresolved. fast-xml-parser5.11.1 remains an affected version in translation-generation tooling, but the inspected invocation does not enable the required stopNodes option. Do not silently classify these as patched. Refresh actual runtime checks/current-release evidence and the reviewed reference inventory after deployment. Classifier changes require the owner's separately scoped approval; preserve fail-closed identity checks and schedules.


## November 13 maintenance (#309)

Backport upstream e71a2964ec3b3c6da7fa7c4ec6b53de53bba4326 (GHSA-2236-pwjw-m8m4) on the unchanged Lila pin. Chapter configuration loads the study and chapter together, enforces native CanView for both config and divisionOnly, and retains the pinned controller's native unauthorized/forbidden continuations. Validate with a temporary isolated HTTP fixture: public config allowed; anonymous private config and division refused; missing fixture refused. Remove the test fixture afterward. No new user-facing strings.

Cloudflared moves from2026.10.7 to2026.11.0 through the existing APT repository. Record the actual installed and running version/hash with the fresh current-release security verification. Keep tunnel credentials, units and isolation unchanged.

The moderator-token, tournament and broadcast advisories remain visible. The current gateway blocks their public attack paths; that is not a source-level fix or permission to enable those routes without review. The two existing low-severity dependency findings also remain visible. No classifier predicate or schedule changes are part of this release.
