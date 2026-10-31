# Native image and GIF dependency (#155)

Deployment is **HELD during the active study**. This source change does not build,
install, start or verify a live renderer. Follow the existing verified-main release
workflow and checked maintenance window after the hold is explicitly lifted. Do
not restart services or interrupt games to test this dependency during the study.

The native Lila image/GIF endpoints stream responses from official
[lichess-org/lila-gif](https://github.com/lichess-org/lila-gif), with the bounded
Quiet Signal theme extension in `lila-gif-moss.patch`. Its upstream default
`gif.lichess.ovh` is unavailable from this host.
The public installation therefore requires a locally built artifact and configures
`game.gifUrl = "http://127.0.0.1:6175"`. Do not expose that service directly through
the tunnel or public firewall. Lila retains request validation, export limits and
rate limiting.

## Exact source and build

`gif-renderer.json` pins official commit
`a92511ae3be69c0c0a4002c39fa6cf92f4c93768`, the SHA-256 of its complete unmodified
`git archive HEAD`, its Cargo.lock, the exact moss patch and Rust **1.99.1**. The target is
`x86_64-unknown-linux-gnu`. The locked Shakmaty dependency requires Rust 1.95 or
later. Use Python 3.12+, Git, Rustup with that exact toolchain/target, and the C
compiler, linker and make provided by Ubuntu's build-essential package. Sprite
generation uses exactly **NumPy 2.2.6**, **Pillow 11.3.0** and **resvg 0.45.1**.
Use a Python 3.12 virtual environment with `numpy==2.2.6` and `Pillow==11.3.0`
(also recorded in the patch's `theme/requirements-sprites.txt`); install resvg with its pinned version and locked Rust
dependencies, or a separately hash-verified official binary. Prepare
those build tools through the reviewed operations workflow; this helper does not
install toolchains or packages.

After the hold, build as an **unprivileged operator** in a clean Ubuntu 24.04
x86-64 environment compatible with the deployment host. Example, with reviewed
source checkout and artifact paths:

```sh
git clone https://github.com/lichess-org/lila-gif.git /BUILD/lila-gif
git -C /BUILD/lila-gif checkout --detach a92511ae3be69c0c0a4002c39fa6cf92f4c93768
python3 deploy/public/gif-renderer.py prepare /BUILD/lila-gif /BUILD/gif-renderer
python3 deploy/public/gif-renderer.py verify /BUILD/gif-renderer
```

The helper rejects root, non-Linux/non-x86-64 builders, changed tracked source,
source/lock/toolchain mismatches and existing output. It extracts only the verified
archive into a fresh temporary build tree, so unrelated untracked checkout files
cannot enter the build. It applies only the hash-verified moss patch, checks the
generation-tool versions, runs the patch's Python generator tests, then runs
the official `theme/make-sprites.py --theme
quiet-signal` generator. It requires all 40 moss piece-set sprites and verifies
that no existing upstream sprite changed. The extension retains exact native
square colors **#c7cfba / #668478**. It then runs `cargo +1.99.1 test --locked --target
x86_64-unknown-linux-gnu --jobs 2` followed by the corresponding release build.
Cargo fetches dependencies with the checksums in the pinned lockfile; the runtime
does not fetch dependencies. Do not copy a binary out of upstream's current
Debian Trixie image onto Ubuntu 24.04: its dynamic libc requirements may be newer.
Check `ldd`/version requirements on the actual built artifact before deployment.

The resulting directory contains exactly:

- `lila-gif`: Linux x86-64 ELF executable, containing upstream sprites and font.
- `lila-gif-upstream.tar`: complete pinned source, including all asset licenses.
- `lila-gif-moss.tar`: reviewed patch plus all 40 generated moss sprites.
- `BUILD.json`: source/toolchain pins, compiler version, generated-sprite hashes,
  source-overlay hash and binary SHA-256.

Copy this directory to **`PAYLOAD/gif-renderer`** alongside the normal payload.
Include `gif-renderer.py`, `gif-renderer.json`, `lila-gif-moss.patch`, this document and its tests in
`PAYLOAD/deployment/public`, and `third-party/lila-gif` in the existing notices.
Do not put the binary or generated artifact directory into the source repository.

The receipt records the trusted operator's build; it is not a cryptographic build
attestation or a claim of reproducible compilation. Installer verification checks
the fixed official source archive, exact theme patch, all 40 source-overlay
sprite hashes, toolchain pins, ELF target and binary content
hash without executing the binary. It rejects missing/tampered artifacts before
creating service accounts or changing the release. Installed binary, receipt and
source are root-owned, without group/world write access; reverified content and
receipt are included in the release identity. `corresponding-source` includes
`lila-gif-upstream.tar`, `lila-gif-moss.tar`, `lila-gif-BUILD.json`, the build
helper/pin and notices. To reproduce, extract the upstream tar, apply the overlay's
patch and copy its `theme/sprites/quiet-signal-*.gif` files into the same tree;
the original six themes and upstream assets retain their original bytes.

## Isolated runtime and compatibility

The seventh public role is `nosweat-gif`, with unit `nosweatchess-gif.service`.
It listens only on **127.0.0.1:6175**. The shared isolation policy allows new
connections to that listener only from the application UID or root; the renderer
cannot initiate network connections, access the databases, read application
configuration/secrets, or write persistent state. Established replies remain
allowed. Its release is read-only, capabilities are empty and two Tokio workers
share a **100% CPU quota**. The app depends on the renderer unit. Direct policy
migrations refuse an installed renderer whose files are missing, unverified,
non-root-owned or group/world writable.

The provisional **768M memory cap** includes headroom above a source-derived
363.37 MiB of eagerly decoded sprite pixels (280 sprites, each 720 × 1890 bytes),
plus embedded GIFs, allocator, font and request buffers. This is not measured RSS
or capacity evidence. Measure startup/one-export RSS after the hold before changing
the cap. The runtime needs no Python, resvg, browser, ffmpeg or writable data.

Upstream supports six board themes and its listed aliases. The source extension
adds `quiet-signal` as the seventh supported theme and uses the existing renderer
and generator. **Do not map it to brown or silently substitute a theme.** Unknown
names still fail normally. The custom theme's sprite references, palette,
filtering and preservation of the original six themes are part of the renderer
patch's tests. Native board preferences, orientation, annotations and generation
semantics otherwise remain unchanged.

## Verification after the hold

Do not call source integration a working production service until these pass:

1. Build/tests and ELF/native-library compatibility on the actual target host;
   retain receipt and a verified-main source archive.
2. Validate systemd units and nftables rules. Verify renderer startup/readiness,
   restart behavior and measured memory. Check all public identities' connection
   boundaries and confirm secrets/databases remain inaccessible to `nosweat-gif`.
3. Fetch one small position and one short game directly as an operator, then
   through Lila and the public gateway. Verify `image/gif`, a decodable GIF,
   expected position/mainline, orientation, highlights and player options.
4. Confirm the gateway's narrow GET/HEAD `/export/fen.gif` allowance and the
   existing `/analysis/export.gif` and `/game/export/gif/...` paths. Never proxy
   arbitrary renderer paths. Check exact moss square colors and every piece set.
5. Confirm invalid/oversized PGN rejection, native rate limits and no persisted
   imported game or unexpected database writes from standalone export.

Keep the previous application release, units and isolation policy for rollback.
Rollback must restore the matching app configuration, renderer dependency and
network policy together; switching only the app symlink is insufficient when
moving back across this service addition. Do not resume/extend a study as part of
this installation.
