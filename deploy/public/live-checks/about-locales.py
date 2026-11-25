"""ADVISORY: translated About-page content; never holds admissions.
Committed from the 23 November live checks (#383)."""
from pathlib import Path
import http.client,json,re,xml.etree.ElementTree as ET
from html.parser import HTMLParser
root=Path('/opt/nosweatchess/current').resolve(); reports=[]
class Items(HTMLParser):
 def __init__(self):super().__init__();self.depth=0;self.items=[];self.cur='';self.lang=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang')
  if tag=='li':
   if self.depth==0:self.cur=''
   self.depth+=1
 def handle_endtag(self,tag):
  if tag=='li' and self.depth:
   self.depth-=1
   if not self.depth:self.items.append(self.cur)
 def handle_data(self,data):
  if self.depth:self.cur+=data
norm=lambda s:' '.join(s.split())
for locale in ['en-US','de-DE','es-ES','fr-FR','hi-IN','ja-JP','ko-KR','pt-BR','ru-RU','zh-CN']:
 catalog=root/'lila/translation/dest/site'/f'{locale}.xml'
 keys={x.attrib['name']:''.join(x.itertext()) for x in ET.parse(catalog).getroot() if x.tag=='string'}
 if locale=='en-US':
  source={x.attrib['name']:''.join(x.itertext()) for x in ET.parse(root/'lila/translation/source/site.xml').getroot() if x.tag=='string'}
  keys={**source,**keys}
 c=http.client.HTTPConnection('127.0.0.1',29660,timeout=20);c.request('GET','/about',headers={'Host':'mutechess.org','Accept-Language':locale});r=c.getresponse();html=r.read().decode();c.close();assert r.status==200,(locale,r.status)
 page=Items();page.feed(html)
 assert page.lang==locale,(locale,page.lang)
 frontend=[x for x in page.items if 'maiachess.com' in x];engine=[x for x in page.items if 'Maia3 by CSSLab' in x]
 assert len(frontend)==len(engine)==1 and frontend[0]!=engine[0],locale
 source=keys['muteAboutMaiaFrontendSource'];expected=keys['muteAboutMaiaFrontendCredit'].replace('%1$s','maiachess.com').replace('%2$s',source)
 assert norm(expected)==norm(frontend[0]),(locale,page.lang,norm(frontend[0]),norm(expected))
 assert 'https://github.com/CSSLab/maia-platform-frontend' in html and 'https://www.maiachess.com/' in html
 assert not re.search(r'%[12]\$s',frontend[0])
 reports.append({'locale':locale,'htmlLang':page.lang,'status':200,'translatedCreditMatchedCatalog':True,'separateEngineAndFrontend':True})
print(json.dumps({'passed':True,'reports':reports}))
