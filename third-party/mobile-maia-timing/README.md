# Mobile Maia timing reference

Unmodified GPL-3.0 source and independent Dart test vectors from
Dash1971/maia-chess-android-preview at
`8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0`:
`lib/src/human_timing.dart` and `test/human_timing_test.dart`.

The adapter ports the complete function, including control-specific scaling after
the rare pause: 1+0 halves/caps at 3 seconds; 2+1, 3+0 and 3+2 use 75%/4.5 seconds.
Other controls retain the original distribution. The input is the configured
initial time and increment, never the remaining clock. Inference consumes the total
target; our additional low-clock waiting cap remains separately documented.
Mobile Maia application code and releases were not changed.
