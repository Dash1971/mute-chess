# Native analysis and premove extensions

Codex-assisted implementation for the No Sweat Chess fork; no upstream contribution or human manual testing is claimed.

Stacked premove projection follows Mobile Maia `lib/src/premoves.dart`, revision `78d45c2563bdd565614e776212254d2eb33fee59` (AGPL-3.0). Native Lila/Chessground remain the input, legal-destination, round, clock and server authority.

Browser Maia client/worker, history encoder and bounded 5M loader are adapted from Dash1971/mobilemaia.org at `4b3afc058adcdb54c879f1903ed2270a33e9f68c` (AGPL-3.0). Changes: .js module filenames for native Play MIME compatibility, same-origin asset paths and No Sweat Chess cache namespace. ONNX Runtime JS/loaders retain MIT and all notices in browser/vendor; runtime source/version/integrity and both model hashes/source commits are pinned in browser/config.json. No model is trained or changed here. 5M is the lightweight analysis default; 79M is opt-in. These model choices do not alter the live bots' 79M policy.

The scoring oracle and material reference come from Mobile Maia at `78d45c2563bdd565614e776212254d2eb33fee59`, copying En Croissant v0.15.0 `6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53` (GPL-3.0). Its license is retained under third-party. Independent annotation boundary and live-search fixtures are retained unchanged. The runtime port uses Chessops, exact complete MultiPV iterations, cancellable worker capture search without a node truncation, and whole-decision-window corroboration for !/!!. Computed labels are separate from imported PGN glyphs.

The interaction brief is Mobile Maia Preview issues #200 and #26; no private maiachess.com API or separate React board is used. Native Stockfish 19 assets and native analysis tree/variations are reused.
