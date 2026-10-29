"""Generate the Mute Chess outlined wordmarks (fonttools==4.68.0)."""
import argparse
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--lila-root', type=Path, help='Also copy assets into this explicitly selected Lila checkout')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
font = instantiateVariableFont(TTFont(root / 'third-party/oxanium/Oxanium[wght].ttf'), {'wght': 650}, inplace=False)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
scale = 43 / font['head'].unitsPerEm
icon_path = 'M14 8H26V16H38V8H50V16H62V8H74V28L31 62H51V52L66 40V65L73 73H15L20 64L57 35H23L14 26Z M8 76H78V84H8Z'
targets = [root / 'design/logo-explorations/final']
if args.lila_root:
    targets.append(args.lila_root.resolve() / 'public/nosweat')

def lettering(text_color, accent):
    paths, x = [], 0
    for i, char in enumerate('Mute Chess'):
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        paths.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}" fill="{text_color if i < 5 else accent}"/>')
        x += font['hmtx'][name][0] + 3
    return ''.join(paths), round(x * scale)

def svg(width, content):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 88" role="img"><title>Mute Chess</title>{content}</svg>\n'

for target in targets:
    target.mkdir(parents=True, exist_ok=True)
    for suffix, text_color, accent in [('', '#e8e6e3', '#b184ff'), ('-light', '#3d383e', '#7433c9')]:
        paths, width = lettering(text_color, accent)
        icon = f'<path d="{icon_path}" fill="{accent}"/>'
        target.joinpath(f'textmark{suffix}.svg').write_text(svg(width, f'<g transform="translate(0 61) scale({scale} {-scale})">{paths}</g>'))
        target.joinpath(f'wordmark{suffix}.svg').write_text(svg(96 + width, icon + f'<g transform="translate(96 61) scale({scale} {-scale})">{paths}</g>'))
    target.joinpath('icon.svg').write_text(svg(88, f'<path d="{icon_path}" fill="#b184ff"/>'))
    print('Generated Mute Chess assets:', target)
