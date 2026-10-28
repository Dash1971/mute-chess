# No Sweat Chess implementation direction

The owner's confirmed direction is recorded in `docs/chess-foundation.md` (28 October 2026): desktop/browser only; Lichess/Lila is the base for all exposed chess play and analysis; Mobile Maia / En Croissant / maiachess.com add the specified analysis capabilities. Cyberpunk/cypherpunk is the wrapper and branding.

Read that decision before changing architecture. The current Node/Fastify round implementation is an infrastructure prototype, not a decision to reimplement the Lichess chess experience. Do not expand a parallel custom rules/clock/premove/analysis-tree stack. Retain the native Lichess base and its tested behavior, adding clear adapters for Maia, Nostr and our supported human-versus-bot scope.

The owner retired the Node/Fastify prototype on 28 October 2026. Its service is stopped and disabled; source, configuration and database are retained for rollback/reference. Do not restart or expand it by default. The separate native Lila development stack is the active foundation. Do not conflate inference-only benchmarks with complete-stack capacity. Preserve concurrent homepage work. No Mobile Maia app release/change is implied. The owner subsequently authorized deploying the completed native Maia/Nostr alpha to nosweatchess.org; see `deploy/public/README.md` and the dated private deployment handover. Preserve the separate public service/data boundary.

Use confirmed bot identities/policies from issues #1/#2 rather than mockup names. Reuse the existing classification references and reliability safeguards; keep Stockfish evaluations, Maia likelihoods and classifier annotations semantically distinct. Preserve upstream licenses and exact-source provenance.
