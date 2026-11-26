# Expat security update and pending socket backport — November 26, 2026

Issue #402. Unattended upgrades installed libexpat1 2.7.4-1ubuntu0.3 at
06:44 JST before this operator review. The candidate is from resolute-security.
The vendor changelog includes CVE-2026-93990, CVE-2026-102633,
CVE-2026-77214 and CVE-2026-115506. Do not claim the operator installed a
package that was already updated automatically.

The existing maintenance wrapper coordinated restarts of dbus,
networkd-dispatcher and unattended-upgrades to unload their old Expat mappings.
Application services and RELEASE.json were unchanged; no reboot was required.
Verify no process retains a deleted old libexpat mapping, the public site and
ordinary games remain healthy, then refresh current verification from the real
SECURITY381_BUILD.json receipt and actual runtime observations. Preserve the
original source/build receipts and confirm the existing OpenClaw classifier.

The live native pin remains a372615f8a1fe3f6d48ba60913c44d7b6b40da48
(tree 8ca5466297355f02cd67ec71726bb8abcc498839); application release
bc226308e6b7c77801dc3d120b5b34872a8fa0c9 is not rebuilt here.

GHSA-rxpx-6m5g-qm2w applies to the pinned lila-ws source: the inherited
Option overload bypasses Sri's String validator, and the public lobby socket
is supported. Its upstream fix bee9229a6d75f97386a9194bd5ca06eaa508076f
is being added to draft #395 for the next application release. No live
impersonation or load test is authorized or performed. All three undeployed
upstream advisories remain visible; no report predicates, monitoring controls
or schedules change.

## Completion addendum — November 26, 2026

The [PR #403 maintenance receipt](https://github.com/Dash1971/mute-chess/pull/403)
reports that no process retained a deleted old Expat mapping and package integrity
matched. Critical health, HTTP/WebSocket, authentication rejection/replay, Study
access and real-game progress checks passed. The unchanged application/native
identity and 28 compiled classes matched the real SECURITY381 build/source
receipts. Both current security readers and the corresponding-source archive
were refreshed without an application rebuild or reboot. Fresh existing
OpenClaw classification returned `inventory_verified=true`, with all three
then-undeployed upstream advisories still visible.

The later [November 26 application deployment](release-2026-11-26.md) completed
the lobby-ID, Racer and SRI backports, including the SRI fix described above.
That record supplies the matching deployed identities and runtime verification.
The preparation text above retains its original date and scope; this addendum
records published results and does not rerun maintenance or host checks.
