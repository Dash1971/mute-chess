from pathlib import Path
from html import escape
root=Path(__file__).parent
icons={
 'a': '''<g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 48h34M19 41c0-9 4-15 12-20l-12 3-5-6 11-8 2-6 7 6c9 1 14 9 12 19l-3 12Z"/><path d="M19 41h24M25 10l3 7"/></g><circle cx="35" cy="16" r="1.8" fill="currentColor"/>''',
 'b': '''<g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7H11a4 4 0 0 0-4 4v10m36-14h10a4 4 0 0 1 4 4v10M7 43v10a4 4 0 0 0 4 4h10m22 0h10a4 4 0 0 0 4-4V43"/><path d="M20 43V21l24 22V21"/></g><path d="M7 29h9v9H7zm41-3h9v9h-9z" fill="currentColor"/>''',
 'c': '''<path d="M14 8h8v9h6V8h8v9h6V8h8v16l-6 6 3 17H17l3-17-6-6Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M13 54h38M20 30h24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M34 25h-5a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8h-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'''
}
titles={'a':'A / The quiet knight','b':'B / The open board','c':'C / The easy rook'}
notes={'a':'A calm, original knight. Closest to the familiar chess-site feel.', 'b':'An open board around an N. More geometric and software-minded.', 'c':'A sturdy rook with a subtle S. Friendly, solid and easy to recognise.'}
for key,icon in icons.items():
 (root/f'{key}-icon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" color="#4d4d4d"><title>{escape(titles[key])}</title>{icon}</svg>')
 (root/f'{key}-wordmark.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 416 68" color="#b9b9b9"><title>nosweatchess — {escape(titles[key])}</title><g transform="translate(0 2)">{icon}</g><text x="78" y="46" font-family="Arial,Helvetica,sans-serif" font-size="38" letter-spacing="-1.5" fill="currentColor">nosweat<tspan font-weight="700">chess</tspan></text></svg>')
rows=[]
for n,(key,icon) in enumerate(icons.items()):
 y=126+n*346
 rows.append(f'''<g transform="translate(48 {y})">
 <text y="0" font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="700" fill="#596152">{escape(titles[key].upper())}</text>
 <text y="30" font-family="Arial,Helvetica,sans-serif" font-size="17" fill="#636962">{escape(notes[key])}</text>
 <rect y="54" width="1344" height="225" rx="12" fill="#fff" stroke="#d9ddd5"/>
 <g transform="translate(25 80) scale(1.18)" color="#3d443b">{icon}</g>
 <text x="122" y="131" font-family="Arial,Helvetica,sans-serif" font-size="44" letter-spacing="-1.9" fill="#3d443b">nosweat<tspan font-weight="700">chess</tspan></text>
 <text x="1018" y="96" font-family="Arial,Helvetica,sans-serif" font-size="12" letter-spacing="2" fill="#7e867c">SMALL / SINGLE COLOUR</text>
 <g transform="translate(1018 113) scale(.55)" color="#3d443b">{icon}</g>
 <g transform="translate(1084 113) scale(.4)" color="#3d443b">{icon}</g>
 <rect x="0" y="180" width="1344" height="99" rx="0" fill="#262421"/>
 <g transform="translate(25 198) scale(.68)" color="#bababa">{icon}</g>
 <text x="83" y="232" font-family="Arial,Helvetica,sans-serif" font-size="27" letter-spacing="-1" fill="#bababa">nosweat<tspan font-weight="700">chess</tspan></text>
 <g font-family="Arial,Helvetica,sans-serif" font-size="15" fill="#bababa"><text x="360" y="230">PLAY</text><text x="440" y="230">PUZZLES</text><text x="548" y="230">LEARN</text><text x="643" y="230">WATCH</text><text x="742" y="230">COMMUNITY</text><text x="891" y="230">TOOLS</text><text x="1212" y="230">SIGN IN</text></g>
 </g>''')
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1184" viewBox="0 0 1440 1184">
 <rect width="1440" height="1184" fill="#f0f2eb"/>
 <text x="48" y="53" font-family="Arial,Helvetica,sans-serif" font-size="29" font-weight="700" letter-spacing="-1" fill="#30372f">nosweatchess / logo directions</text>
 <text x="48" y="84" font-family="Arial,Helvetica,sans-serif" font-size="16" fill="#636962">Three original vector marks. Same neutral Lichess-style header. No theme redesign.</text>
 {''.join(rows)}
 <text x="48" y="1170" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#767e72">CONCEPT STUDY · Icons are custom SVG. Wordmarks use system type for this preview; final lettering will be outlined.</text>
 </svg>'''
(root/'comparison.svg').write_text(svg)
(root/'index.html').write_text('<!doctype html><html><meta charset="utf-8"><title>No Sweat Chess — logo directions</title><style>*{box-sizing:border-box}body{margin:0;background:#f0f2eb}svg{display:block;width:100%;height:auto}</style>'+svg+'</html>')
print(root.resolve())
