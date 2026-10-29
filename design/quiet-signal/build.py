#!/usr/bin/env python3
"""Build Quiet Signal assets; an external checkout requires --native-dir."""

import argparse
import hashlib
import re
from pathlib import Path
from xml.sax.saxutils import escape

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / "third-party/space-grotesk/SpaceGrotesk[wght].ttf"
FONT_SHA256 = "acad6de1fc93436f5c0f1f4137751ef04f1aea3063e7036535970ffcfbd79f72"
# Original silhouette with an open horizontal interruption, not a colored mask.
KNIGHT = (
    "M35 10L32 2Q39 1 44 8C66 12 80 28 80 52V60H51V66H77L73 76"
    "Q80 81 80 88H16L37 52Q43 43 45 37Q46 34 43 34Q40 34 36 38"
    "L23 45Q18 49 13 47L6 44Q3 42 2 35L28 13Z"
)


def svg(width, content, title="MuteChess"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 96" role="img">\n'
        f"<title>{escape(title)}</title>\n{content}\n</svg>\n"
    )


def mark(color):
    return f'<path transform="translate(6 3)" d="{KNIGHT}" fill="{color}"/>'


def lettering(font, color, value="mutechess"):
    glyphs, cmap, paths, position = font.getGlyphSet(), font.getBestCmap(), [], 0
    for character in value:
        name = cmap[ord(character)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        commands = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m[0]):.3f}".rstrip("0").rstrip("."), pen.getCommands())
        if commands:
            paths.append(f'<path transform="translate({position} 0)" d="{commands}"/>')
        position += font["hmtx"][name][0]
    scale = 75 / font["head"].unitsPerEm
    text = f'<g transform="translate(0 72) scale({scale:g} {-scale:g})" fill="{color}">\n' + "\n".join(paths) + "\n</g>"
    return text, round(position * scale + 2)


def build():
    if hashlib.sha256(FONT.read_bytes()).hexdigest() != FONT_SHA256:
        raise ValueError("Pinned Space Grotesk font checksum mismatch")
    font = instantiateVariableFont(TTFont(FONT), {"wght": 600}, inplace=False)
    text, width = lettering(font, "#e7e9dc")
    light_text, _ = lettering(font, "#24312d")
    assets = {
        "icon.svg": svg(96, mark("#a7d6bb"), "MuteChess — Quiet Signal knight"),
        "icon-light.svg": svg(96, mark("#315f4d"), "MuteChess — Quiet Signal knight"),
        "textmark.svg": svg(width, text),
        "textmark-light.svg": svg(width, light_text),
        "wordmark.svg": svg(width + 112, mark("#a7d6bb") + f'<g transform="translate(112 0)">{text}</g>'),
        "wordmark-light.svg": svg(width + 112, mark("#315f4d") + f'<g transform="translate(112 0)">{light_text}</g>'),
        "watermark-dark.svg": svg(96, mark("#293b34")),
        "watermark-light.svg": svg(96, mark("#d5dfd4")),
        "favicon.svg": svg(96, '<style>path{fill:#315f4d}@media(prefers-color-scheme:dark){path{fill:#a7d6bb}}</style>\n' + mark("#315f4d").replace(' fill="#315f4d"', "")),
    }
    tagline, _ = lettering(font, "#a2b0ac", "Stay human. Play bots.")
    lockup = mark("#a7d6bb") + f'<g transform="translate(112 0)">{text}</g>'
    assets["social.svg"] = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img">\n'
        '<title>MuteChess — Stay human. Play bots.</title>\n'
        '<rect width="1200" height="630" fill="#101719"/>\n'
        f'<g transform="translate(175 165) scale(1.7)">{lockup}</g>\n'
        f'<g transform="translate(185 355) scale(0.72)">{tagline}</g>\n'
        '<path d="M185 500H1015" stroke="#3d4e47" stroke-width="2"/>\n</svg>\n'
    )
    return assets


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native-dir", type=Path)
    args = parser.parse_args()
    assets = build()
    destinations = [ROOT / "design/logo-explorations/final"]
    if args.native_dir:
        native = args.native_dir.resolve()
        if not (native / "modules/web/src/main/ui/layout.scala").is_file():
            parser.error("--native-dir must identify a native Lila source checkout")
        destinations.append(native / "public/nosweat")
        destinations[-1].mkdir(parents=True, exist_ok=True)
        (destinations[-1] / "quiet-signal.css").write_text((ROOT / "design/quiet-signal/quiet-signal.css").read_text())
        (native / "public/images/board/svg/quiet-signal.svg").write_bytes(
            (ROOT / "design/quiet-signal/board.svg").read_bytes()
        )
    for destination in destinations:
        destination.mkdir(parents=True, exist_ok=True)
        for filename, content in assets.items():
            (destination / filename).write_text(content)
    print(f"Built {len(assets)} Quiet Signal SVG assets in {len(destinations)} destination(s)")


if __name__ == "__main__":
    main()
