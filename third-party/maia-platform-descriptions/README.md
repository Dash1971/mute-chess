# Maia position description source

Original source: CSSLab/maia-platform-frontend, revision
`15cef70619bbd7d70c5b0575af3bcf907aeed62c`, GPL-3.0. The unmodified files and
license in this directory record the source used for the November 18, 2026
Mute Chess adaptation in native `ui/lib/src/nosweat/maiaLabModel.ts`.

The adaptation retains the outcome/findability/temptation thresholds, considers
all 21 real matched-rating samples and uses Mute's already-pinned empirical
Stockfish win-rate mapping. It replaces phrase-bank randomization with whole
translated sentence templates, renders referenced moves as native preview
buttons and refuses a narrative until every legal move has depth-12 evidence.
Missing ratings are pending, never zero or silently interpolated. Mates retain
White perspective, and candidate ordering prefers shorter winning mates.
Descriptions are current-position summaries, not annotations or measured human
solve rates. See [feature details](../../docs/maia-lab.md).

The repository's retained MoveMap component inspired the optional scatter view;
Mute plots its actual empirical win-rate loss directly instead of using Maia's
nonlinear horizontal projection. Human bars need a separately configured forecast
service in upstream and are excluded. No private API, React application port,
new dependency or LLM service is introduced.
