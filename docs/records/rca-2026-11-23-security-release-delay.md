# RCA: security release delay and extended game-admission interruption

Date: 23 November 2026. All times below are Asia/Tokyo (JST).
Responsible executor: OpenAI Codex. This was an execution and validation failure in this run.

## Executive finding

I added a release acceptance condition without validating its premise against the existing site: that the homepage must contain an organization JSON-LD block. The homepage and About page do not emit that block. The assertion therefore failed on absence even though the renderer regression tests, deployed code, authorization checks, locale checks and critical data comparisons passed.

I then treated that checker defect as a reason to hold game admissions and restore the previous release. The subsequent reactivation extended the interruption. The owner approved a bounded check correction and one verification retry. No application rebuild was necessary for that retry.

An earlier, separate test-design omission lengthened the work before maintenance: the first metadata test checked inert markup and text but did not parse the JSON. An additional check found that the intermediate upstream patch encoded JSON quotes as HTML entities. Adding JSON round-trip assertions before the first native PR would have caught that earlier and avoided an additional PR/CI cycle. The encoding problem was corrected before the release was exposed.

## Impact and measured timeline

New-game admissions were held for approximately **22 minutes**, from about 21:46:57 until 22:09:01. The start is the creation time of the drain log immediately after the pause request, not an independently timestamped pause audit event; it is approximate. Existing games finished naturally before services stopped. No game was force-ended by this release.

The public tunnel service was stopped across these recorded systemd lifecycle windows:

| Window | Purpose | Duration |
| --- | --- | --- |
| 21:50:45–21:57:10 | Initial encrypted backup and cutover | 6m 25s |
| 22:04:07–22:04:53 | Restore previous release after the bad check | 46s |
| 22:07:33–22:08:03 | Reactivate the existing security build | 30s |

Total recorded tunnel-service stopped time: **7m 41s**. These are process lifecycle intervals, not continuous external HTTP availability measurements. New-game unavailability lasted longer than tunnel downtime because admissions remained paused after the first restart.

Approximately 11m 51s elapsed between the first tunnel restart and admissions reopening. That period contains the incorrect-check hold, decision/approval handling, restoration and reactivation; it should not be presented as an exact calculation of wholly avoidable time.

All checked counts and identity, rating, account-claim and second-factor hashes matched the pre-cutover checkpoint: 10,036 accounts, 59,768 games, 6,193,530 puzzles and 322 puzzle-round records. This supports no loss or alteration in the checked data; it is not a claim that every database field was independently compared. No database restore or schema migration occurred.

## Root cause and contributing decisions

1. **Unsupported acceptance assumption.** I introduced a new live-page presence requirement without testing it on the existing page before maintenance.
2. **Incomplete initial regression coverage.** I did not include valid JSON round-tripping in the first markup test, causing avoidable extra review/CI work.
3. **Incorrect failure classification.** I failed to separate a defective operator check from an application, authorization or data-integrity failure quickly enough.
4. **Availability held too long.** I kept admissions paused through the checker/approval/recovery sequence after the application had passed critical checks. That was my sequencing decision; responsibility does not lie with the owner's approval rules or response time.

## Resolution and evidence

- Native PRs #8 and #9 and Mute companion PR #382 are merged. Final main: `bc226308e6b7c77801dc3d120b5b34872a8fa0c9`; native: `a372615f8a1fe3f6d48ba60913c44d7b6b40da48`.
- The correction removes only the false metadata-presence requirement. Any JSON-LD actually present is still parsed. Actual renderer round-trip tests and deployed class hashes remain required. All other health, authorization, WebSocket and security checks remain.
- No rebuild was performed for the approved retry. Original build receipts and source identities are preserved.
- Admissions reopened at approximately 22:09:01. Native bot-game plies were observed advancing from 39 to 189.
- Fresh runtime verification and identical SECURITY_VERIFICATION/SECURITY279 reader records were published. OpenClaw returned `inventory_verified=true` at 22:12:33. The host monitor reports matching control hashes, unchanged isolation, no containment and no critical drift.
- The Racer advisory remains visible as mitigated by a blocked public endpoint; it is not claimed patched. The chat and blog fixes and existing Fishnet fix are now recorded against verified deployed code.

## Preventive operating commitments

- Establish the bounded acceptance criteria before opening a maintenance window. Validate any added live-page assertion against the current baseline first.
- Test both security properties and ordinary data semantics in the initial focused tests; here that means script containment plus JSON round-tripping.
- Classify a failed assertion before choosing recovery: distinguish application/auth/data failure from a defective test premise. Preserve healthy availability when critical checks pass while completing non-disruptive verification.
- Reuse the existing verified build for an operational check correction; do not introduce source changes, a rebuild or a new release framework to resolve it.

These are changes to my execution discipline. No new general deployment tooling, monitoring rules, scheduler, infrastructure or weakened security predicate has been implemented.

Evidence retained with this task includes original/final CI records, red/green regression logs, initial failed-check diagnostics, lifecycle journal excerpts, both activation and recovery logs, backup verification, data-continuity hashes, current security verification, classifier output and monitor status. No claim of human testing is made.
