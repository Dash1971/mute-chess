# Operations

This is an index of existing procedures, not a portable release runner. The
[prototype runbook](../archive/node-prototype/operations.md) is historical and
must not be used for the current site.

| Task | Procedure and access |
| --- | --- |
| Run a separate development instance | Public [installation guide](installation.md); local Ubuntu environment and disposable data |
| Build and verify native source | Public [native development](../deploy/lila/README.md) and [fork contract](native-fork.md) |
| Prepare and activate a public release | Public [deployment guide](../deploy/public/README.md); authorized operator/root access to the existing host |
| Baseline, critical/advisory gates and reopening | Public [committed live checks](../deploy/public/live-checks/README.md) |
| Verify deployed dependencies, runtimes and source | Public [security maintenance](security-maintenance.md); private runtime/build receipts and OpenClaw access |
| Weekly host updates and required reboot | Existing private host command `/usr/local/sbin/mutechess-weekly-update.sh`; authorized operator only |
| Planned release fingerprint change | Private host-monitor planned-maintenance wrapper, invoked through its operator runbook; declare only intended paths, including `/opt/nosweatchess/current/RELEASE.json` |
| Encrypted backup and isolated restore check | [Deployment backup boundary](../deploy/public/README.md#service-isolation-and-migration); private root-owned keys, archives and off-host access |
| Regular upstream merge or urgent security backport | Public [maintenance guide](maintenance.md) and [upstream policy](upstream-alignment.md) |

The weekly-update command path was confirmed read-only on November 24, 2026;
its implementation is root-only. The separate `/usr/local/sbin/nosweat-monitor`
is a host collection interface, not the planned-maintenance wrapper. No verified
public command/path for that wrapper is available in this repository: the
authorized operator must obtain its current private runbook before a cutover.
These installed tools and their protected configuration, credentials and runbooks
remain outside the repository. Do not invent substitute monitor/update procedures
or treat this index as permission to run maintenance.

## Release documents and evidence

The release operator assembles the payload during an authorized build.
`deploy/public/install.py` **consumes**, rather than creates, `RELEASE.json` and
`BUILD.md`. There is no checked-in one-command generator for these documents.

- `RELEASE.json` identifies the verified Mute main commit, branch, source check,
  upstream components and actual native commit/tree. Use real build/source
  verification results; merging a PR is not evidence of deployment.
- `BUILD.md` accompanies the source archive with build instructions and retained
  build notes. It is an operator-prepared payload input, not a file to find at
  the repository root. Match current build claims to the real release receipt;
  inherited notes are historical, not proof of a new rebuild.
- Current release documents and original receipts are retained under
  `/opt/nosweatchess/current/corresponding-source/`. Current security verification
  and its compatibility reader must match that release. Follow the
  [completion checklist](security-maintenance.md#every-deployment-completion-check).

No secrets, keys, account data or backups belong in the public source package.
See [verified release history](releases.md) for dated release identities and
[terminology](glossary.md) for historical names.

<details>
<summary>Preserved earlier section URLs</summary>

<a id="private-development-server"></a>
- [Private development server](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/operations.md#private-development-server)

<a id="installed-layout"></a>
- [Installed layout](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/operations.md#installed-layout)

<a id="bootstrap-a-fresh-dedicated-host"></a>
- [Bootstrap a fresh dedicated host](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/operations.md#bootstrap-a-fresh-dedicated-host)

<a id="after-installing-in-a-path-readable-by-the-service-user"></a>
- [After installing in a path readable by the service user:](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/operations.md#after-installing-in-a-path-readable-by-the-service-user)

<a id="access-without-a-domain-or-cloudflare"></a>
- [Access without a domain or Cloudflare](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/operations.md#access-without-a-domain-or-cloudflare)

<a id="checks-and-tests"></a>
- [Checks and tests](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/operations.md#checks-and-tests)

</details>
