# Native preset chat, supported languages and bot flairs

## Human-versus-Maia chat

The round uses Lichess’s existing restricted-chat renderer and start/end preset groups for signed-in and anonymous humans in admitted Maia games. It exposes no free-text input. The server checks the persisted `nosweat_game` record against the native game’s human identity/color and bot identity; neither a spectator nor the bot can elicit a response. Other native BOT/friend games are not classified by their title alone.

Allowed opening messages are Hello, Good luck, Have fun! and You too!, while the native UI is in its first-five-plies group. Closing messages are Good game, Well played, Thank you, I've got to go and Bye!, after native game completion. Free text, commands and messages from the wrong phase are consumed without a write in Maia games. Friend chat retains its existing native path.

Native chat filtering, flood limits, timeouts, persistence and publication still apply. Only an accepted, non-troll human write can claim a response. The admission record stores at most two distinct reply claims per phase, so reconnects/process restarts do not reset the allowance. Claims precede a bot reply; a crash at that point can lose one optional reply rather than duplicate it. Finished-game messages use the retained admission identity, independently of engine tracking. Responses use the bot’s real native identity and do not touch inference, ratings, capacity or rematches.

## Ten supported languages

Source of truth: [Mobile Maia’s language catalog at 695c66df](https://github.com/Dash1971/maia-chess-android-preview/blob/695c66df63bf7496d6f11f59dcda930379aee404/lib/src/app_language.dart).

| Mobile Maia | Native locale |
| --- | --- |
| English | en-GB |
| Deutsch | de-DE |
| Français | fr-FR |
| Русский | ru-RU |
| Português (Brasil) | pt-BR |
| हिन्दी | hi-IN |
| 日本語 | ja-JP |
| 简体中文 | zh-CN |
| 한국어 | ko-KR |
| Español | es-ES |

The native picker shows exactly these ten choices. `/translation/select` is permitted through the public gateway for POST only; native session/account preferences and request protection remain in use. Unsupported selections are rejected. Supported regional browser preferences normalize to these locales; unsupported languages fall back through the next supported preference to English. Traditional Chinese browser preferences are not silently substituted with Simplified Chinese. Explicitly choosing 简体中文 still works. None of these ten languages requires a right-to-left layout.

Native Lichess supplies the chess experience translations. Mute-specific sign-in actions, profile/settings labels, engine controls, quality choices and Maia card labels use additive native site messages. Core Maia terminology is reused from Mobile Maia’s ARB catalogs. Added or changed Mute UI text must use these ten catalogs, with key/placeholder parity and localized rendering checked; historical coverage notes are not permission to ship English fallback. No English-text DOM replacement, external translation service or separate language preference is introduced.

## Flairs

The native picker’s **Bot flairs** category collects a small technology-themed set, with additive cyberpunk/cypherpunk search keywords and the requested original artwork. Existing native flair IDs, profile form validation, preference to hide flairs and normal display paths remain intact.

Managed bots with no flair receive one randomly during existing provisioning. The original named roster, sci-fi homage identities and special public aliases receive only the six new custom flairs; a one-time marker preserves their assignments across restarts. Wintermute has a fixed Circuit Knight assignment, as requested by the owner. Other bots use a missing-flair-only update, preserving existing choices. All updates require the managed-bot marker. Ratings, names, history, policies and country fields are untouched; the icons make no claim about a bot’s real nationality.

Static image GET/HEAD requests have their own bounded 6000/minute bucket,
separate from the 600/minute page-action limit. File containment, method and
connection limits remain enforced. The flair picker's Clear action is explicit;
submitting a profile text field does not implicitly clear the saved flair.

## Bot locations

The native free-text profile Location field receives a stable assignment during existing bot provisioning, only when empty. Character locations match their worlds: Wintermute in Villa Straylight, Freeside; Judge Dredd/Anderson in Mega-City One; Blade Runner characters in Los Angeles; Cyberpunk characters in Night City; HAL9000 aboard Discovery One; GLaDOS at Aperture Science. General names receive locations from small themed groups where possible. Public display aliases are resolved without renaming accounts. Human locations and country flags remain untouched. Per the owner’s direction, no explanatory fictional-location note is added to the UI.

## Focused verification

Native `NoSweatPresetChatTest` covers both player authorization paths, phase boundaries, accepted/rejected writes, duplicate/cap suppression and finished-game replies. `NoSweatLanguagesTest` checks the exact ten choices, regional normalization and Chinese boundary. Run native Scala format/compile, the native UI tests/build and the existing gateway tests. Validate every added flair ID and its WebP asset, then inspect the language selector and flair picker through the deployed native interface.

[Implementation history](records/docs398-native-chat-languages-flairs-history.md) retains dated decisions and validation.

<details>
<summary>Historical section links</summary>

<a id="human-versus-maia-chat-70"></a>
- [Human-versus-Maia chat (#70)](records/docs398-native-chat-languages-flairs-history.md#human-versus-maia-chat-70)

<a id="ten-supported-languages-110"></a>
- [Ten supported languages (#110)](records/docs398-native-chat-languages-flairs-history.md#ten-supported-languages-110)

<a id="flairs-89126"></a>
- [Flairs (#89/#126)](records/docs398-native-chat-languages-flairs-history.md#flairs-89126)

<a id="bot-locations-201"></a>
- [Bot locations (#201)](records/docs398-native-chat-languages-flairs-history.md#bot-locations-201)

</details>
