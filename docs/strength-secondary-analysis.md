# Pre-registered effective-configuration CV correction (#144)

Recorded October31, before any held-out study games or outcomes. The running
experiment remains on `f656d5c22b062646cc48c54feced50cb2c6710f6`; do not deploy,
restart, add games, change settings or extend its deadline for this correction.

The200 training identities include196 canonical effective configurations. Explicit
temperature-zero/top-p-zero controls intentionally replicate argmax settings.
V1 hashes account identity into five CV folds; two alias groups therefore span
folds. Its training CV score can be optimistic for those rows. This is a
training-only selection limitation; the50 held-out identities remain untouched.
Do not present identity-grouped V1 CV as wholly unseen-effective-policy evidence.

V2 groups by the canonical tuple `(conditioningSelf, conditioningOpponent,
history, temperature, topP, openingFullMoves)`. Temperature-zero or top-p-zero
maps both sampling coordinates to zero. With full1/1 sampling, the opening
override has no effect and maps to zero. Names are excluded. This only identifies
known exact aliases; it does not assume arbitrary nearby settings are identical.

The secondary procedure is fixed now:

1. Use exactly V1's frozen `training-ratings.json`, original roster and split.
   Never use held-out labels to fit or select either model.
2. Run V2 with the same features, RD weighting, two complexities, lambda grid
   `0.1,1,10,100`, five folds and additive-within-five preference. Only the fold
   grouping and artifact/version/count descriptions change.
3. Evaluate both frozen procedures on the same prospective held-out games and
   native-label snapshot. Report both, including RD, coverage and the original
   noisy-label/absolute-anchor caveats. Do not choose the better test score and
   call it the pre-registered primary outcome; do not tune from the test results.

The V2 numerical fit may be computed after the run from its immutable training
snapshot: its entire selection procedure is published before the test data exists.
Keep hashes of the snapshot, code and model. It writes research artifacts only,
never native ratings or game history. This does not authorize10000-account
generation, another game batch or a live deployment while the study is active.
