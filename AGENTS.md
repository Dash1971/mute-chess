# No Sweat Chess implementation direction

The owner's confirmed direction is recorded in `docs/chess-foundation.md` (28 October 2026): desktop/browser only; Lichess/Lila is the base for all exposed chess play and analysis; Mobile Maia / En Croissant / maiachess.com add the specified analysis capabilities. Cyberpunk/cypherpunk is the wrapper and branding.

Read that decision before changing architecture. The current Node/Fastify round implementation is an infrastructure prototype, not a decision to reimplement the Lichess chess experience. Do not expand a parallel custom rules/clock/premove/analysis-tree stack. Retain the native Lichess base and its tested behavior, adding clear adapters for Maia, Nostr and our supported human-versus-bot scope.

The owner retired the Node/Fastify prototype on 28 October 2026. Its service is stopped and disabled; source, configuration and database are retained for rollback/reference. Do not restart or expand it by default. The separate native Lila development stack is the active foundation. Do not conflate inference-only benchmarks with complete-stack capacity. Preserve concurrent homepage work. No Mobile Maia app release/change is implied. The owner subsequently authorized deploying the completed native Maia/Nostr alpha to nosweatchess.org; see `deploy/public/README.md` and the dated private deployment handover. Preserve the separate public service/data boundary.

Use confirmed bot identities/policies from issues #1/#2 rather than mockup names. Reuse the existing classification references and reliability safeguards; keep Stockfish evaluations, Maia likelihoods and classifier annotations semantically distinct. Preserve upstream licenses and exact-source provenance.


## Owner follow-up: native Lichess experience first

On 28 October the owner superseded the club landing page and manual bot challenge flow. Use the native Lichess homepage, quick-pair grid, custom time-control dialog, rounds and analysis. Anonymous games are casual; signed-in Nostr accounts start at native provisional 1500, then use native Glicko ratings. The server assigns an available bot within ±200 of the player's matching rating; no opponent chooser or direct challenges. Keep all existing Lichess styling/branding until the chosen nosweatchess logo is integrated. Branding work is limited to the logo concepts requested separately. Preserve NIP-07 as the recommended signer, with user-requested generated/imported browser keys as an alternative. Stacked premoves from Mobile Maia join the analysis/gameplay enhancement roadmap.


## Release discipline

The owner requires one permanent branch, `main`. Use short-lived feature branches and pull requests, review changes, pass checks, merge on GitHub, then deploy the merged main revision. Do not deploy unmerged or dirty code. Run `python3 deploy/public/verify-main.py` before preparing a release. Rebuild/verify the native source against that exact main patch. Record the main commit in RELEASE.json and verify the live revision. Delete merged feature branches; do not keep parallel release/development branches. This replaces the earlier deploy-before-push workflow.
