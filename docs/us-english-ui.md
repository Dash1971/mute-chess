# English UI policy

**English means US English in Mute Chess.** This applies to inherited UI labels,
help, titles, accessibility announcements and Mute-specific text. It is an
intentional difference from Lichess's source-English wording.

## Native locale selection

Use Lichess's existing `en-US` catalogs. Mute's English picker choice is
**English (US)**. Saved English preferences and sessions, including `en-GB`,
normalize to `en-US`; requests without a supported preference also select US
English. The other nine supported languages are unchanged. No separate language
setting or migration is needed.

Keep the upstream source catalogs intact. Native server and browser translation
handling already falls back to source English for Mute messages absent from
`en-US`. Write those Mute-owned source messages in US English. Fix inherited US
translation gaps in `translation/dest/*/en-US.xml`, rather than maintaining a
second rewrite of the source catalogs. Preserve native keys such as
`premoveCancelled`, `/analyse` routes, protocol values, proper names and quotes.

New or substantively changed Mute messages still need translations in all ten
supported languages. Spelling-only corrections retain equivalent translations.
Existing English-only metadata keeps its whole-sentence construction; changing
one word must not produce a sentence that mixes languages.

## Checks and release status

`NoSweatLanguagesTest` checks English normalization, fallback, the picker label,
and representative translations. A focused word-list check scans compiled US
English overlaid on source fallback, so upstream merges can expose common British
spellings that need a US correction. It is a regression guard, not an exhaustive
language audit. Existing native locale tests cover Insights, Arenas and rematches;
the native build compiles the client catalogs and their typings.

The locale switch is proposed in [native draft PR #11](https://github.com/Dash1971/lila/pull/11)
and [companion draft PR #401](https://github.com/Dash1971/mute-chess/pull/401),
tracking [issue #400](https://github.com/Dash1971/mute-chess/issues/400).
**It remains unmerged and undeployed.** Before the future batch, refresh the
companion pin against the combined reviewed native main and perform the normal
localized page acceptance and release verification. A source pin or passing CI
does not establish deployment.

See the [upstream differences](upstream-alignment.md#supported-differences),
[maintenance overview](maintenance.md#what-we-keep-different) and
[exact departure register](../deploy/lila/upstream-departures.json).
