from pathlib import Path
# Install fonttools==4.68.0 to regenerate the outlined lettering.
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
root=Path(__file__).resolve().parents[2]
font=instantiateVariableFont(TTFont(root/'third-party/oxanium/Oxanium[wght].ttf'),{'wght':650},inplace=False)
glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
icon='<path d="M14 8H26V16H38V8H50V16H62V8H74V28L31 62H51V52L66 40V65L73 73H15L20 64L57 35H23L14 26Z M8 76H78V84H8Z" fill="#b184ff"/>'
def lettering():
 paths=[];x=0
 for i,c in enumerate('nosweatchess'):
  name=cmap[ord(c)];pen=SVGPathPen(glyphs);glyphs[name].draw(pen)
  paths.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}" fill="'+('#e8e6e3' if i<7 else '#b184ff')+'"/>')
  x+=font['hmtx'][name][0]+3
 return ''.join(paths),x
paths,width=lettering();scale=43/units;total=round(96+width*scale)
word=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} 88" role="img"><title>nosweatchess</title>{icon}<g transform="translate(96 61) scale({scale} {-scale})">{paths}</g></svg>'
mark=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88"><title>nosweatchess</title>{icon}</svg>'
for target in [root/'design/logo-explorations/final',root.parent/'implementation-sources/lila/public/nosweat']:
 target.mkdir(parents=True,exist_ok=True)
 (target/'wordmark.svg').write_text(word)
 (target/'icon.svg').write_text(mark)
print('Created outlined Oxanium wordmark and original cyber-rook SVG:',total,'x 88')
