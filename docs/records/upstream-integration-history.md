# Historical native integration notes

Preserved from `18fe4e7`; dated budgets and approvals are not permission
to restart research or reapply migrations. Follow the
[current upstream policy](../upstream-alignment.md).

## Bounded native bot trial (#80)

The owner explicitly approved public bot-versus-bot rating games, retained in
public histories, and a bounded ramp to ten concurrent games. The added
`app/NoSweatStudy.scala` service uses native construction, BOT moves, completion
and Glicko persistence. The small Game Env reservation exception requires two
enabled BOT users and an explicit deployment/run scope; non-study games retain
the normal admission contract. Study and human pool admissions share the
existing serial queue, capacity and busy-seat checks. Friend invitations, round
rules, clocks, rating mathematics and anti-abuse checks are unchanged.

The study flag defaults off; native deadlines, heartbeat failure handling and
the one-shot server supervisor bound execution. Qualification uses a disposable
database, whereas the authorized run updates existing public perfs without
reset/import. Post-merge verification must exercise both BOT seats, native rating
writes after FinishGame, disabled/public/qualification scope checks, and normal
human-pool admission while the flag is on. See [methodology](native-bot-trial.md).

## Applied one-time external rating anchor (#103)

The owner-approved correction was applied on October 30, 2026, including
Bullet/Classical reference priors. This is isolated in `deploy/calibration/` and
[its runbook](bot-rating-adjustment.md); no native source paths or Glicko formula
change is introduced. Preserve native perfs, histories, uncertainty/provisional
rules and all subsequent native rating updates. The fixed-cohort migration is
manual, audited and guarded by a maintenance window, exact snapshot/plan, backup,
compare-and-set recovery and normal native cache/index rebuild. It never runs as
part of app startup or deployment. The [completion receipt](../data/rating-anchor-applied-2026-10-30/README.md) records the operation; it must not be repeated.

## Continuous strength study (#137)

The owner authorized 250 total identities and a dated, bounded 3000-game experiment
on October 31. Keep the original 44 file and perfs unchanged; the namespaced adapter
loads an additive configuration file and the native public roster is generated
from that same concatenation. The only new native control is a study-plan entry
and explicit absolute admission/deadline bounds in NoSweatStudy; normal play,
matchmaking selection, rules, clocks, perfs and native Glicko/provisional semantics
remain upstream. All model fitting/evaluation is separate Python research tooling
and cannot write ratings. Post-merge verification checks exact roster agreement,
blocked held-out admission before prediction freeze, original-policy hashes,
native 3000th/3001st admission boundaries, deadline/heartbeat cleanup and existing
human admission. See strength-experiment.md and the exact-path register.

The owner's later timing amendment (#147) permits a conditional validation-only
continuation after normal predecessor cleanup. Its namespaced study profile and
deadline branch retain the same native run records and aggregate admission cap;
no upstream rating, round or matching behavior changes. Post-merge verification must
also reject failed/incomplete predecessors, changed frozen evidence and admission
3,001 across segments. See [the dated amendment](strength-validation-continuation.md).

Issue #163 separately authorizes an overnight establishment follow-up for the
same 250 bots and earned perfs. Its new namespaced profile only adds fixed
13:30–21:30 UTC scope/deadline guards and a 3,000-new-admission/22-game plan; old
profiles remain unchanged. Native provisional flags determine establishment;
the external scheduler prioritizes unsettled bot/speed pairs without writing
ratings. Post-merge verification covers exact new public/private run IDs, fixed
cutoffs, admission 3000/3001 and unchanged native Glicko/shared human capacity.
See [the bounded follow-up](overnight-rating-establishment.md).

## Shared Engine Analysis settings and bounded opening text (#150/#151/#168)

The namespaced shared UI dialog and preference extension expose the approved
one/two-Maia toggle, per-channel arrow colors and existing Mobile Maia
Fast/Balanced/Thorough modes. Native analysis settings retain a small link to it;
puzzle review labels reuse the game-analysis rating grid. No server settings,
rules, review/classification math or account preferences are replaced. Native
Stockfish advanced controls remain native. Colors are validated before SVG and
presentation changes do not invalidate inference. Post-merge checks must cover both
analysis and puzzle call sites, old saved preferences, two-column single-engine
probabilities and review assistance gates.

The prior desktop sidebar display override let a long WikiBooks article grow a
shared CSS grid row and push Import/Export below the viewport. Restore a bounded
board-height flex sidebar with native article scrolling. Retain the same content,
opening toggle and bottom-tab selection. Verify long in-book/out-of-book layouts
and narrower native breakpoints. See [presentation details](../analysis-presentation.md).

Issue #173 adds a small Engine Analysis action to the existing authenticated
account menu, handled by its existing native account UI module. The owner subsequently corrected this presentation in #180: the menu now opens
a normal page through the existing authenticated preferences route, reusing the
native AccountPage layout and controls. Board gear dialogs remain available;
shared browser-local bindings preserve the same preferences without account writes. Both Maia conditioning inputs now always match
the selected channel rating, following Mobile Maia exactly. Legacy mismatched
preferences are normalized, and actual inference-call regressions cover both
analysis and puzzle channels.


## Assigned bot catalog initialization (#172)

The owner-approved 10,000-identity catalog adds configuration-backed policy
references and a narrow initialization helper. New catalog accounts alone receive
RD 100/zero-game assigned ratings; existing native Glicko formulas, RD 110
provisional threshold, earned perfs and all human accounts remain unchanged.
Explicit six-speed seeds retain measured/inferred provenance. Whole-roster
identity validation, fresh-account marker checks and one-time default-only
public-name aliases prevent collisions or reseeding. Native zero-game display
uses its existing latest/Perf contract. Profiles add one Research-seeded basis
row. Post-merge tests cover explicit priors, truthful nb=0, native nonprovisional
status, collision refusal, legacy fallback and display-only aliases. The shared
presence/index/±200 matching and current shared twenty-game Maia cap stay unchanged. See
[catalog methodology and reproducible manifest](../catalog-roster.md).
## Human-game Maia conditioning (#176)

The bounded NoSweatService admission hook forwards the human's already-loaded
native matching-speed rating to the private adapter; no extra rating lookup or
rating formula is introduced. The adapter clamps and freezes the opponent input
under a separate version. Bot profiles describe the actual rule instead of two
fixed inputs. Native game creation, matching, clocks, ratings, completion, old
frozen games and study policies remain unchanged. Post-merge checks must verify the
perf key/default at admission, authenticated freeze forwarding, input bounds,
versioned compatibility and unchanged self/history/sampling/timing controls.


Security maintenance #279 also aligns existing jsoup/Guava/Jakarta Mail dependencies and the native browser/build graph while retaining upstream pins. See [the maintained version inventory](../security-inventory.json) and [advisory review instructions](../security-maintenance.md). Update this inventory and verify staged/runtime versions whenever changing private runtimes or security overrides.

The first resolved native-history integration is documented in the [23 November
2026 integration report](../upstream-integration-2026-11-23.md), with the original
trial, resolution decisions and exact candidate validation.
