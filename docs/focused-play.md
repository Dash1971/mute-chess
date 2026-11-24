# Focused Mute Chess experience

Quick pairing and Custom Play assign a Maia opponent through the existing native
pool, without a public human lobby or manual bot chooser. Anonymous games are
casual; signed-in Nostr accounts can play rated games with native Glicko behavior.
The pool contains 10,000 persistent identities and shares a twenty-game Maia cap.
See the [site manual](site-manual.md) and [catalog](catalog-roster.md).

## Navigation and homepage

Play includes Arena tournaments. Learn is limited to Chess basics and Practice;
Puzzles, Community, Tools, Donate, profile and settings retain their supported
functions. Approved public host Arenas use native discovery and the homepage
spotlight. Watch, the opening explorer and unsupported feeds remain hidden.

The homepage keeps native quick-pair controls and live online/game counters.
Finished-game New opponent returns through the native homepage pool route;
pairing starts after lobby initialization and uses the native game-start sound.
Header search and hide-on-scroll behavior remain native. Public-name search
retains bounded results, escaping, rate limits and canonical profile URLs.

## Identity and sign-in

Nostr keys provide stable identity. Create a key and play, saved-key return,
existing-key import and browser signers use the same verified account. Back up
private keys locally; no `nsec` belongs in a public profile or search request.
Second-factor input follows verified signed-login state and cannot reveal an
unverified account's security settings. See [sign-in and backup](nostr-sign-in-backup.md).

Chosen public names are editable and case-insensitively unique under the native
reservation rules. Permanent canonical IDs, stored keys, ratings and histories
do not change. Human profiles/hovercards link the public npub; bot accounts retain
native BOT labels and have no Nostr identity. Chat, statistics and game metadata
render public names as escaped presentation while keeping canonical IDs for
links, ownership and stored history.

## Friends and invitations

Signed-in humans can follow/block and challenge other humans through native
profiles and hovercards. Native ownership, preferences, blocks, clocks and rating
rules remain authoritative. Anonymous/open challenges, self/variant challenges,
manual bot opponents and public API tokens remain unavailable.

Friend routes and challenge room updates pass through the existing gateway
allowlist and authentication. Online-friend labels show public names while
presence keys, counts and links remain canonical; old payloads retain safe
fallback. Existing cached friend metadata can take up to ten minutes to refresh.
A follow does not force presence or add a new per-friend polling service.

## Analysis, community and footer

[Analysis](analysis-presentation.md) preserves native review and adds Maia,
stacked premoves, [Brilliant detection](brilliant-moves.md) and
[Maia Lab](maia-lab.md). Forum posting is available immediately to signed-in
humans, with native moderation, permissions and anti-spam controls.

The footer offers About, FAQ, Contact, Terms, Privacy, source and social links.
Public questions use the forum; vulnerabilities use [private GitHub reporting](../SECURITY.md).
Official Nostr contact remains available for sensitive account/privacy/payment
matters. Do not invent an email, company, jurisdiction or legal guarantees.
[Donate](lightning-patrons.md) retains explicit invoice and verified receipt flows.

## Maintained boundaries

Keep native rules, clocks, game completion, ratings, identities and anti-abuse
behavior. Unsupported links use the translated native notice; hidden upstream
implementation need not be deleted. All new or changed UI text uses the ten
native catalogs. [Implementation history](records/focused-play-history.md)
retains detailed hooks and regression evidence without making old approvals new.

<details>
<summary>Historical section links</summary>

<a id="october-31-header-corrections-122124"></a>
- [October 31 header corrections (#122/#124)](records/focused-play-history.md#october-31-header-corrections-122124)

<a id="native-live-counters-181"></a>
- [Native live counters (#181)](records/focused-play-history.md#native-live-counters-181)

<a id="new-opponent-pool-bootstrap-196"></a>
- [New opponent pool bootstrap (#196)](records/focused-play-history.md#new-opponent-pool-bootstrap-196)

<a id="native-maia-game-start-sound-206"></a>
- [Native Maia game-start sound (#206)](records/focused-play-history.md#native-maia-game-start-sound-206)

<a id="public-names-in-native-game-metadata-210"></a>
- [Public names in native game metadata (#210)](records/focused-play-history.md#public-names-in-native-game-metadata-210)

<a id="nostr-as-the-public-human-identity-212"></a>
- [Nostr as the public human identity (#212)](records/focused-play-history.md#nostr-as-the-public-human-identity-212)

<a id="native-friend-and-challenge-routing-253"></a>
- [Native friend and challenge routing (#253)](records/focused-play-history.md#native-friend-and-challenge-routing-253)

<a id="online-friend-public-names-259"></a>
- [Online-friend public names (#259)](records/focused-play-history.md#online-friend-public-names-259)

</details>
