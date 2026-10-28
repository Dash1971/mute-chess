# No Sweat Chess implementation direction

The owner's confirmed direction is recorded in `docs/chess-foundation.md` (28 October 2026): desktop/browser only; Lichess/Lila is the base for all exposed chess play and analysis; Mobile Maia / En Croissant / maiachess.com add the specified analysis capabilities. Cyberpunk/cypherpunk is the wrapper and branding.

Read that decision before changing architecture. The current Node/Fastify round implementation is an infrastructure prototype, not a decision to reimplement the Lichess chess experience. Do not expand a parallel custom rules/clock/premove/analysis-tree stack. Retain the native Lichess base and its tested behavior, adding clear adapters for Maia, Nostr and our supported human-versus-bot scope.

The live private prototype remains available until a replacement is built and verified separately. Do not replace it with an unbuilt Lila checkout or conflate inference-only benchmarks with complete-stack capacity. Preserve concurrent homepage work. No Mobile Maia app release/change, domain setup or public deployment is implied.

Use confirmed bot identities/policies from issues #1/#2 rather than mockup names. Reuse the existing classification references and reliability safeguards; keep Stockfish evaluations, Maia likelihoods and classifier annotations semantically distinct. Preserve upstream licenses and exact-source provenance.
