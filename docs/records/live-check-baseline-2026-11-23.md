# Live-check baseline: November 23, 2026

Dated evidence, not an instruction to reuse this baseline for a later release.

## Baseline declared before the #383 run

23 November 2026, serving release (not the documentation PR):

- Main: `bc226308e6b7c77801dc3d120b5b34872a8fa0c9`.
- Native: `a372615f8a1fe3f6d48ba60913c44d7b6b40da48`;
  tree: `8ca5466297355f02cd67ec71726bb8abcc498839`.
- Inventory SHA256: `9db1ee4beaf764ecce65ce229cacaa7e2825fea603bf1674daa6aea8698b5bbe`.
- Build receipt: `SECURITY381_BUILD.json`; expected Arena host is the existing
  approved canonical host `n066f8597b3952d996bc`.
- Expected result for **each check in the table: pass**. Homepage JSON-LD block
  count is expected to be zero (valid); no record publication or deployment.
- Capture the live continuity snapshot only, without requiring live counts to
  stay frozen. Expect existing games to advance with admissions open throughout.

The baseline result is recorded in the PR. The unchanged
[incident RCA](rca-2026-11-23-security-release-delay.md)
retains the original failure/correction and measured interruption.

### Observed baseline

All listed checks passed on the declared release with games open (23 November,
22:36–22:40 JST). Nine service units and adapter health passed; public WS returned
101; blocked paths and the private/public/missing authorization matrix passed.
All 28 build-receipt class hashes and runtime/source checks matched. Five sampled
real games advanced. All ten About locales and the separate auth-copy advisory
passed; absent homepage JSON-LD parsed as zero valid blocks.

The fresh existing classifier collection at 22:40:25 JST returned
`inventory_verified=true`, using the retained 22:12 advisory scan (no new scan
or report delivery). Racer GHSA-2rpf-mmrc-v68p remains visible as pending with its
public upgrade path blocked; it is not claimed patched. Monitor control hashes
and isolation matched, with no containment or critical drift. Active RELEASE,
both security-reader records and the source archive remained byte-identical.
Continuity counts were captured while games were open, not compared as a frozen
cutover pair. No successful returning-user session is claimed from the signed
rejection/replay test. No service/admission change or deployment occurred.
