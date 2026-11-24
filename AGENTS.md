# Mute Chess: current implementation rules

Read the parent workspace `AGENTS.md` and the latest owner instructions first.
Keep work bounded. New or redesigned general tooling, shared infrastructure or
unrelated refactors require explicit approval before implementation. Do not
expand a feature into deployment, backup or test orchestration.

## Foundation and source

- Native application changes belong in `Dash1971/lila` on `main`, through PRs.
  Keep existing NoSweat namespaces and small hooks in upstream-owned files.
  Never commit to native `master`, rebase or force-push deployed history.
  Merge upstream regularly; urgent security fixes use `git cherry-pick -x`.
- `deploy/lila/native-pin.json` is the application source authority. Preserve
  exact native commit/tree provenance and the documented clean-source rules.
  Only `.github/workflows/mute.yml` is excluded as approved metadata from the
  application-departure inventory. Maintain the exact-path departure register.
- The active website is native Lila with Maia, Nostr and Mute integrations.
  The retired Fastify/PostgreSQL prototype is in `archive/node-prototype/`.
  Do not restart it. Keep its history and reproducible source available.
- Preserve native rules, clocks, ratings, provisional semantics, anti-abuse,
  authentication, data and secret protection. Standard chess only. Preserve
  our simplified UI, branding, Maia, Open Brilly Finder, stacked premoves,
  Lightning patronage and owner Arenas. Follow [upstream policy](docs/upstream-alignment.md).
- Keep this workspace lean; use the existing Mini build environment for bulky
  work and archive historical checkouts/evidence at `/srv/macbook-archives`.
  No per-task SDKs, model copies or unbounded build output.

## Current product contracts

- The site supports desktop/mobile browsers and the exposed features documented
  in [the site manual](docs/site-manual.md). Historical 44-bot, two-game,
  human-versus-bot-only and pre-Arena plans do not override the current site.
- Preserve the 10,000 managed bot identities, policies, unique names, earned
  ratings and histories. Human Nostr public keys and canonical key-derived
  IDs stay stable while public names remain editable. Never transmit or publish
  nsec; preserve the authorized local key backup/reveal controls.
- Shared Maia capacity is twenty games. Background games top up to five total
  games, counting humans. Native Arena fillers follow their configurable
  participant target and rating range; unchecking bot accounts is human-only.
  Preserve existing games, independent maintenance pauses and disconnect grace.
- Analysis remains in the browser, using native game/tree/review behavior.
  Maia probabilities, Stockfish evaluations and classifications are distinct.
  Preserve current arrow behavior (including tapering), badges and engine
  preferences unless the owner explicitly authorizes a change.
- Do not restore hidden features or expose unsupported public routes because
  upstream adds them. Unsupported links use the translated native notice.
  Keep Learn limited to Chess basics and Practice.
- Never start calibration, load tests, research games, migrations, social
  publishing or service changes on the basis of old time-bounded approvals.

## User-facing text

Every added or changed user-facing string, including help, titles, accessibility,
errors and transient feedback, must use native catalogs and ship translated in
all ten locales: en-GB, de-DE, es-ES, fr-FR, hi-IN, ja-JP, ko-KR, pt-BR, ru-RU,
zh-CN. English fallback is incomplete. Check keys, placeholders and localized
rendering. Reuse the existing translation system; use American English in
communication/product prose while retaining native locale identifiers.

## Review and releases

- Open an issue, use a short-lived `codex/` branch, create a focused PR, review
  and pass checks. Native changes have a native PR and a Mute companion pin PR.
  Keep one permanent `main` branch and remove merged branches. Do not deploy
  dirty, unmerged or unverified source. Run the existing main/source checks.
- The site is preproduction; routine brief downtime needs no extra approval.
  Still obey explicit requests for draft-only work or delayed batch deployment.
  Building or merging does not by itself authorize deployment.
- Commit and merge all live acceptance checks before maintenance; never add or
  change checks during the window. Baseline the same checks on the serving
  release before pausing, with each expected pass/fix-specific fail written down.
- Critical: service health, sign-in, authorization, data continuity, real game
  progress and deployed commit/tree/class hashes. All other checks are advisory.
  Reopen games when critical gates pass; finish non-disruptive security record
  publication/classifier collection with games open. Advisory failures never
  hold admissions or trigger rollback. Rollback requires a named critical
  application failure and evidence excluding a checker defect. Follow the
  [live-check sequence and scope](deploy/public/live-checks/README.md).
- Every deployment requires fresh security verification of the actual active
  `RELEASE.json`, native commit/tree, inventory, libraries, sanitizer and running
  private runtimes/backports. Preserve real original build receipts and IDs.
- Use the existing host-monitor maintenance wrapper for the exact planned
  `RELEASE.json` path. Verify the new expected fingerprint, unchanged unrelated
  control hashes and isolation. Never reset unrelated baselines or hide alerts.
- Publish matching current `SECURITY_VERIFICATION.json` and existing
  `SECURITY279_BUILD.json` reader copies using real matching evidence. Update
  OpenClaw's deployed/reference inventory only after runtime verification (the
  repository inventory may describe an explicitly undeployed release target), then require a fresh
  existing-classifier `inventory_verified=true`. No report predicate/schedule
  changes. Follow [security maintenance](docs/security-maintenance.md).

## Documentation maintenance

Keep living guides focused on current behavior and standing procedures. During
PR review, remove temporary phrases such as "this PR" and move dated validation,
experiments and superseded decisions to `docs/records/` or their existing evidence
location. Preserve original receipts and immutable records. Repoint internal
links and retain compatibility pages/heading anchors for published URLs.

A merge proves source integration, not deployment. Clearly label unreleased
behavior and use actual matching release/runtime evidence before calling a fix
deployed. Do not remove a legitimate pending-deployment statement merely because
its PR merged. Update current wording after verified activation, and retain the
dated evidence separately. Documentation work does not authorize a release or
new maintenance/check tooling.

## Historical owner instructions

Every section from the former long AGENTS.md is retained, with relative links
adjusted for its new location, in the
[decision records](docs/decisions/README.md). Consult the relevant topic before
changing its behavior. These records preserve detailed constraints, provenance
and research budgets; dated or superseded authorizations are not new permission.
Latest owner instructions and the current rules above take precedence when
older entries conflict.
