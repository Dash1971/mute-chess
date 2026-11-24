# Security policy

## Report a vulnerability privately

Use [Security → Report a vulnerability](https://github.com/Dash1971/mute-chess/security/advisories/new)
on this repository. GitHub private vulnerability reporting is enabled.
Do not open a public issue with exploit details, credentials or private data.
For a Mute-specific problem in the Lila fork, report it here as well so we can
coordinate the native fix and companion pin update privately.

Include the affected page/component, observed date, release revision if known,
expected and actual behavior, impact and minimal reproduction. Redact account
cookies, shared tokens, private Nostr keys (`nsec`), backup keys and other secrets.
Use your own disposable account/data and avoid disrupting games or accessing
other people's information. We do not promise a response deadline or bounty.

## Supported version

Security fixes target the currently deployed release at
[mutechess.org](https://mutechess.org/), identified by its `X-NoSweat-Revision`
response header and active release records. There is no maintained support line
for older snapshots, the retired prototype or arbitrary self-hosted changes.
The latest `main` commit can differ from the deployed revision.

For upstream Lichess vulnerabilities, follow
[Lichess's security policy](https://github.com/lichess-org/lila/security/policy).
Our [security maintenance guide](docs/security-maintenance.md) explains dependency
and advisory verification; it is separate from this reporting channel.
