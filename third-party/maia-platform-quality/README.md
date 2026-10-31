# Maia platform candidate colors

Source: https://github.com/CSSLab/maia-platform-frontend
Revision: a6e52f5c811ee18863cb2f0e81f2433a5b9905de (GPL-3.0).

Unmodified references: `src/lib/analysis.ts` -> `lib-analysis.ts`,
`src/constants/analysis.ts` -> `constants-analysis.ts`, and
`src/hooks/useAnalysisController/utils.ts` -> `utils.ts`.
The native patch adapts the empirical winrate lookup and 5/10 percentage-point
quality boundaries. See analysis/PROVENANCE.md for search and UI differences.


The Moves by Rating adapter (#146) also follows the same pinned repository’s
`src/components/Analysis/MovesByRating.tsx`,
`src/hooks/useAnalysisController/useMoveRecommendations.ts`, and
`src/hooks/useAnalysisController/useEngineAnalysis.ts`.
The implementation stays in native Snabbdom/SVG; no React/chart dependency is
added. Exact source links and input/engine differences are in
[the source audit](../../docs/maia-rating-chart.md).
