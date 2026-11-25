# English UI policy

**English means US English in Mute Chess.** This is an intentional difference
from inherited Lichess wording. It applies to labels, help, titles, accessibility
announcements and other application display text, including the English catalog
source. Native `en-GB` remains a compatibility identifier for existing preferences,
sessions and translation handling; it does not select British spelling.

## Draft implementation

[Issue #400](https://github.com/Dash1971/mute-chess/issues/400) is implemented in
[draft native PR #11](https://github.com/Dash1971/lila/pull/11), with this companion
pin/register update. **Both remain unmerged and undeployed for a future batch.**
The current site can still show inherited British spelling until that release.

The audit corrects 50 existing messages across 19 English catalogs. Examples:
Color/Results by color in Insights, Analyze, favorite, behavior, center, defense,
Practice and canceled. It also localizes three exposed inherited literals:
analysis-board metadata, the replay/analyze hint and screen-reader promotion
cancellation. Existing equivalent translations are retained; 14 missing Hindi
entries are supplied. All 53 changed/new keys are present in all ten supported
catalogs with matching argument signatures.

Do not rename translation keys such as `premoveCancelled`, `/analyse` routes,
module/CSS names, internal cancellation sentinels or saved preferences to change
spelling. Proper names, user content and attributed quotations retain their text.
The audit excludes raw prose in unsupported upstream-only views (moderation,
Tutor and legacy legal pages) and the unfocused Insights presets; Mute uses its
localized focused presets. Those surfaces must meet this policy before any
future request to expose them. No hidden feature is enabled here.

## Verification and future stacking

XML parsing, key/argument parity and source-key/attribute checks cover the changes.
A source-derived localized catalog layout preview is separate from native/live
page verification. The existing companion CI builds and tests the actual pinned
native source. Workflow availability is tracked in the PR checks.
No human or deployed-application acceptance is claimed.

Before the future batch, integrate the native PR through normal review, refresh
the companion pin/tree against the combined reviewed native main, and resolve
any overlap with other pending PRs. The draft inventory is a source target, not
an update to the active host's inventory or security verification. The eventual
application deployment needs the normal current-release verification.

The change is recorded in the [upstream differences](upstream-alignment.md#supported-differences),
[maintenance overview](maintenance.md#what-we-keep-different) and
[exact departure register](../deploy/lila/upstream-departures.json).
