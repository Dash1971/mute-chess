"""CRITICAL: existing deployed-source/runtime checks, read-only (#383).
Expected versions come from the independently hash-pinned reviewed inventory.
No record publication, archive rewrite, service/admission or classifier changes.
Run with games open before maintenance; use matching fresh smoke outputs.
"""
import re


def verify_jars(names,role,expected):
 selected=[n for n in names if n.startswith(('io.netty.','com.fasterxml.jackson.','org.jsoup.jsoup-','com.google.guava.guava-','com.sun.mail.jakarta.mail-'))]
 for name in selected:
  if name.startswith('io.netty.'):
   assert '-'+expected['Netty' if role=='lila' else 'lila-ws Netty'] in name,name
  if name.startswith('com.fasterxml.jackson.'):
   assert '-'+expected['Jackson'] in name,name
 if role=='lila':
  for prefix,key in [('org.jsoup.jsoup-','org.jsoup:jsoup'),('com.google.guava.guava-','com.google.guava:guava'),('com.sun.mail.jakarta.mail-','com.sun.mail:jakarta.mail')]:
   assert [n for n in names if n.startswith(prefix)]==[prefix+expected[key]+'.jar']


def verify_node(actual,expected):
 assert actual=={'node':expected['version'],'undici':expected['embeddedUndici']}


def normalized_release(version):
 # PEP 440 release segments permit 26.2 == 26.2.0; never strip prerelease tags.
 if not re.fullmatch(r'\d+(?:\.\d+)*',version):return version
 segments=list(map(int,version.split('.')))
 while len(segments)>1 and segments[-1]==0:segments.pop()
 return tuple(segments)


def verify_python(actual,inv):
 assert normalized_release(actual['pip'])==normalized_release(inv['buildAndTest']['pip'])
 for name in ['numpy','onnxruntime','chess']:
  assert actual[name]==inv['runtime']['python'][name],name


def verify_java(observed,package_version):
 expected=package_version.split('+',1)[0]
 match=re.search(r'\bJDK ([^\s]+)',observed)
 assert match and match[1]==expected,observed


def main():
 import argparse
 args_parser=argparse.ArgumentParser()
 args_parser.add_argument('--expected-main',required=True)
 args_parser.add_argument('--expected-native',required=True)
 args_parser.add_argument('--expected-tree',required=True)
 args_parser.add_argument('--build-receipt',required=True)
 args_parser.add_argument('--expected-inventory',required=True)
 args_parser.add_argument('--expected-arena-host',required=True)
 args_parser.add_argument('--evidence-dir',required=True,type=__import__('pathlib').Path)
 args=args_parser.parse_args()
 from pathlib import Path
 import datetime, hashlib, json, os, re, subprocess, tarfile
 root=Path('/opt/nosweatchess/current').resolve(); cs=root/'corresponding-source'
 release=json.loads((root/'RELEASE.json').read_text())
 assert release['gitCommit']==release['compiledBackendMain']==args.expected_main
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 legacy=cs/'SECURITY279_BUILD.json'; archived=cs/'SECURITY279_ORIGINAL_BUILD.json'; original=archived.read_bytes(); old=json.loads(original)
 assert old['main']=='764fd197e9d3fcd2cdb03b1e45c7982f9e76f0f1'
 buildpath=cs/args.build_receipt; build=json.loads(buildpath.read_text())
 assert build['main']==release['gitCommit']
 assert 'nativePatchSha256' not in release and 'nativePatchSha256' not in build
 assert build['nativeCommit']==release['nativeCommit']==args.expected_native
 assert build['nativeTree']==release['nativeTree']==args.expected_tree
 assert build['nativePinnedSourceVerified']
 assert 'app.version.commit = \"'+release['nativeCommit']+'\"' in build['embeddedApplicationVersion']
 pin=json.loads((cs/'deployment/lila/native-pin.json').read_text())
 assert pin['commit']==release['nativeCommit'] and pin['upstreamBase']==release['upstreamLila']
 for name,digest in build['sourceArchives'].items():assert sha(cs/name)==digest
 for name,expected in [('lila-native.tar',release['nativeCommit']),('mute-chess.tar',release['gitCommit'])]:
  with (cs/name).open('rb') as archive:
   assert subprocess.check_output(['git','get-tar-commit-id'],stdin=archive,text=True).strip()==expected

 assert build['fullBackendRebuildPassed'] is True and build['fullUiBuildPassed'] is True and build['markdownRegressionPassed'] is True
 assert not (cs/'lila-nostr-maia.patch').exists()
 invpath=cs/'docs/security-inventory.json'; inv=json.loads(invpath.read_text()); invsha=sha(invpath)
 assert invsha==args.expected_inventory
 assert inv['upstreamPins']['lila']['fork']==dict(repository=pin['repository'],commit=release['nativeCommit'],tree=release['nativeTree'])
 assert inv['runtime']['mongodb']['version']  # Reviewed, hash-pinned expectation below.
 assert inv['upstreamPins']['lila']['commit']==release['upstreamLila']
 assert inv['upstreamPins']['lila-ws']['commit']==release['upstreamWs']
 selected={}
 for role in ['lila','ws']:
  names=sorted(p.name for p in (root/role/'lib').glob('*.jar'))
  selected[role]=[n for n in names if n.startswith(('io.netty.','com.fasterxml.jackson.','org.jsoup.jsoup-','com.google.guava.guava-','com.sun.mail.jakarta.mail-'))]
  verify_jars(names,role,inv['runtime']['jvm'])
 compiled=[p.read_bytes() for p in (root/'lila/public/compiled').glob('*.js')]
 assert any(re.search((rb"\.version\s*=\s*['\"]"+re.escape(inv['browser']['dompurify']['version'].encode())+rb"['\"]"),s) for s in compiled)
 assert not any(re.search(rb"\.version\s*=\s*['\"]2\.3\.3",s) for s in compiled)
 assert not (root/'lila/ui/bits/src/bits.voiceChat.ts').exists()
 img=(root/'lila/ui/lib/src/view/markdownImgResizer.ts').read_text()
 assert 'escapeHtml(arg.src)' in img and 'escapeHtml(arg.alt)' in img
 pid=subprocess.check_output(['systemctl','show','nosweatchess-redis','-p','MainPID','--value'],text=True).strip();assert pid!='0'
 redisbin=Path('/opt/nosweatchess/tools/redis/usr/bin/redis-server')
 assert sha(redisbin)==sha(Path('/proc/'+pid+'/exe'))==old['redisServerSha256']
 assert sha(cs/'deployment/lila/patches/redis-lua-metadata.patch')==inv['runtime']['redis']['backportSha256']
 redis=subprocess.check_output([str(redisbin.parent/'redis-cli'),'-p','16380','INFO','server'],text=True)
 assert ('redis_version:'+inv['runtime']['redis']['version']) in redis.splitlines() and 'redis_mode:standalone' in redis
 assert subprocess.check_output(['/opt/nosweatchess/tools/mongodb/bin/mongod','--version'],text=True).splitlines()[0]=='db version v'+inv['runtime']['mongodb']['version']
 mongo_pid=subprocess.check_output(['systemctl','show','nosweatchess-mongo','-p','MainPID','--value'],text=True).strip(); assert mongo_pid!='0'
 mongobin=Path('/opt/nosweatchess/tools/mongodb/bin/mongod')
 assert sha(mongobin)==sha(Path('/proc/'+mongo_pid+'/exe'))
 markdown=(root/'lila/modules/markdown/src/main/MarkdownRender.scala').read_text()
 assert 'scalalib.StringUtils.escapeHtmlRaw(text.value)' in markdown
 import zipfile
 markdown_class=None
 for jar in (root/'lila/lib').glob('*.jar'):
  with zipfile.ZipFile(jar) as z:
   if 'lila/markdown/MarkdownRender.class' in z.namelist(): markdown_class=z.read('lila/markdown/MarkdownRender.class')
 assert markdown_class and b'escapeHtmlRaw' in markdown_class
 assert hashlib.sha256(markdown_class).hexdigest()==build['classes']['lila/markdown/MarkdownRender.class']
 study=(root/'lila/app/controllers/Study.scala').read_text()
 config=study.split('  def chapterConfig',1)[1].split('  private[controllers] def chatOf',1)[0]
 assert 'CanView(sc.study)' in config and 'byIdWithChapter(id, chapterId)' in config
 study_class=None
 for jar in (root/'lila/lib').glob('*.jar'):
  with zipfile.ZipFile(jar) as z:
   if 'controllers/Study.class' in z.namelist(): study_class=z.read('controllers/Study.class')
 assert study_class and hashlib.sha256(study_class).hexdigest()==build['classes']['controllers/Study.class']
 httpcheck=json.loads((args.evidence_dir/'STUDY-HTTP-CHECK.json').read_text())
 assert httpcheck['passed'] is True
 httpcheck=dict(httpcheck,evidencePath=str(args.evidence_dir/'STUDY-HTTP-CHECK.json'))
 cloud=Path('/usr/bin/cloudflared');cloud_version=subprocess.check_output([str(cloud),'--version'],text=True).strip()
 assert cloud_version.split()[2]==inv['runtime']['cloudflared']['observedVersion']
 cloudpid=subprocess.check_output(['systemctl','show','nosweat-cloudflared','-p','MainPID','--value'],text=True).strip()
 assert cloudpid!='0' and sha(cloud)==sha(Path('/proc/'+cloudpid+'/exe'))
 os_packages=subprocess.check_output(['dpkg-query','-W','-f=${binary:Package} ${Version}\n','cloudflared','linux-image-'+inv['runtime']['hostOS']['kernel'],'linux-image-generic','linux-libc-dev','linux-perf','linux-tools-common','python3-jwt','ubuntu-drivers-common','openjdk-21-jdk-headless','openjdk-21-jre-headless'],text=True).strip().splitlines()
 assert not Path('/var/run/reboot-required').exists()
 host_record={'canonicalId':args.expected_arena_host}
 conf=Path('/etc/nosweatchess/application.conf').read_text()
 assert 'nosweat.arena.hosts = '+json.dumps([host_record['canonicalId']]) in conf
 account_smoke=json.loads((args.evidence_dir/'ACCOUNT-AUTH-SMOKE.json').read_text())
 assert account_smoke['passed'] and not account_smoke['accountCreated'] and account_smoke['replayStatus']==401
 account_smoke=dict(account_smoke)
 assert build['accountAccessNativeNameRegressionsPassed']
 for name,digest in build['accountAccessArtifacts'].items():assert sha(root/name)==digest,name
 for name in ['controllers/NoSweat.class','lila/user/PublicNameKeys$.class','lila/user/UserRepo.class','lila/user/UserForm$.class','lila/app/NoSweatService$.class']:
  actual=None
  for jar in (root/'lila/lib').glob('*.jar'):
   with zipfile.ZipFile(jar) as z:
    if name in z.namelist():actual=z.read(name)
  assert actual and hashlib.sha256(actual).hexdigest()==build['classes'][name],name
 assert build['featureBoundaryTestsPassed'] and build['nativeBrandingTestsPassed']
 assert build['chatTimeoutRegressionPassed'] and build['structuredDataRegressionPassed'] and build['structuredDataJsonRoundtripPassed']
 public_health=json.loads((args.evidence_dir/'PUBLIC-HEALTH.json').read_text())
 assert public_health['revision']==release['gitCommit'] and public_health['racerUpgradeRefused'] and public_health['websocketStatus']==101
 assert build['regressionOldBehaviorReproduced']=={'expectedAssertionsFailed':True,'exitCodes':{'CHAT':1,'BLOG':1}}
 chat_source=(root/'lila/modules/chat/src/main/ChatApi.scala').read_text()
 chat_publication=chat_source.split('    private def publishModerationTimeout(',1)[1].split('    def delete(',1)[0]
 assert '      if isMod || isRelayMod then' in chat_publication
 assert '        if isNew then Bus.pub(lila.core.security.DeletePublicChats(user.id))' in chat_publication
 assert '\n      if isNew then' not in chat_publication
 structured_source=(root/'lila/modules/ui/src/main/ui/bits.scala').read_text()
 assert 'script(st.tpe := "application/ld+json")(raw(js))' in structured_source
 assert '.replace("<", "\\\\u003c")' in structured_source
 assert 'def structuredData(tpe: String)(json: JsObject) = raw:' not in structured_source
 blog_source=(root/'lila/modules/ublog/src/main/ui/UblogStructuredData.scala').read_text()
 assert '.ifTrue(false)' in blog_source and 'safeJsonValue(json)' in blog_source
 analysis_source=(root/'lila/modules/analyse/src/main/JsonView.scala').read_text()
 assert 'Json.obj("nodesPerMove" -> e.nodesPerMove, "version" -> e.engineVersion)' in analysis_source
 assert 'fishnetKey' not in analysis_source
 for name in ['lila/chat/ChatApi$userChat$.class','lila/ui/bits$.class','lila/ublog/ui/UblogStructuredData.class','lila/web/NoSweatStaticContent$.class']:
  actual=None
  for jar in (root/'lila/lib').glob('*.jar'):
   with zipfile.ZipFile(jar) as z:
    if name in z.namelist():actual=z.read(name)
  assert actual and hashlib.sha256(actual).hexdigest()==build['classes'][name],name

 assert build['runtimeCatalog']['population']==10000 and build['runtimeCatalog']['aliases']==350
 for name,digest in build['runtimeCatalog']['hashes'].items():assert sha(root/'lila/public'/name)==digest
 assert sha(root/'public-surface.mjs')==sha(cs/'deployment/public/public-surface.mjs')
 for name in ['lila/app/NoSweatFeatures$.class','controllers/NoSweatSetup.class']:
  actual=None
  for jar in (root/'lila/lib').glob('*.jar'):
   with zipfile.ZipFile(jar) as z:
    if name in z.namelist():actual=z.read(name)
  assert actual and hashlib.sha256(actual).hexdigest()==build['classes'][name]
 assert build['moderatorOAuthRegressionPassed']
 assert build['applicationConfSha256']==sha(Path('/etc/nosweatchess/application.conf'))
 assert build['relayRegressionsPassed'] and build['arenaAdmissionAndParticipationPassed'] and build['arenaLocaleRenderingPassed']
 for name in ['lila/security/SecurityApi.class','controllers/Api.class','controllers/Tournament.class','lila/relay/RelayRoundForm$.class','lila/tournament/NoSweatArena.class','lila/app/NoSweatArenaRoster$.class']:
  actual=None
  for jar in (root/'lila/lib').glob('*.jar'):
   with zipfile.ZipFile(jar) as z:
    if name in z.namelist():actual=z.read(name)
  assert actual and hashlib.sha256(actual).hexdigest()==build['classes'][name],name
 api=(root/'lila/app/controllers/Api.scala').read_text();tournament=(root/'lila/app/controllers/Tournament.scala').read_text();routes=(root/'lila/conf/routes').read_text()
 assert 'def tournamentGames(id:' not in api and 'def tournamentResults(id:' not in api and 'def tournamentTeams(id:' not in api
 for method in ['downloadGames','downloadResults','apiTeams']:
  fragment=tournament.split('  def '+method+'(',1)[1].split('\n  def ',1)[0]
  assert 'WithVisibleTournament(id)' in fragment
  assert 'controllers.Tournament.'+method in routes
 relay=(root/'lila/modules/relay/src/main/RelayRoundForm.scala').read_text()
 assert 'ip <- resolveIp(url)' in relay and 'if validateIp(ip)' in relay
 assert '!ip.isLoopbackAddress' in relay and '!ip.isSiteLocalAddress' in relay
 assert 'case Some(tour) if env.noSweat.enabled && !env.tournament.noSweatArena.ownerEvent(tour)' in tournament
 security=(root/'lila/modules/security/src/main/SecurityApi.scala').read_text()
 assert 'if scoped.scopes.has(_.Web.Mod) && (mode.notProd || scoped.me.totpSecret.isDefined) then scoped' in security
 assert 'stripRolesOfOAuthUser(access.scoped)' in security
 node=json.loads(subprocess.check_output(['/opt/nosweatchess/tools/node','-p','JSON.stringify({node:process.versions.node,undici:process.versions.undici})'],text=True))
 verify_node(node,inv['runtime']['node'])
 py=json.loads(subprocess.check_output(['/opt/nosweatchess/venv/bin/python','-c','import importlib.metadata as m,json;print(json.dumps({n:m.version(n) for n in ["pip","numpy","onnxruntime","chess"]}))'],text=True))
 verify_python(py,inv)
 assert archived.is_file()
 import mmap
 with cloud.open('rb') as f:
  with mmap.mmap(f.fileno(),0,access=mmap.ACCESS_READ) as blob:
   cloud_modules=sorted(set((a.decode(),v.decode()) for a,v in re.findall(rb'(go\.opentelemetry\.io/otel(?:/sdk|/trace)?)\t(v[0-9.]+)',blob)))
 assert len(cloud_modules)==3 and all(v=='v'+inv['runtime']['cloudflared']['embeddedOpenTelemetry'] for _,v in cloud_modules)
 assert inv['runtime']['cloudflared']['observedVersion']  # Checked against the executable above.
 runtime_record=json.loads((cs/'RUNTIME_SECURITY342_RECORD.json').read_text())
 assert runtime_record['applicationMain']=='c2088ed8dd658d6152c6e818134811b43191b2e4'
 assert runtime_record['inventorySha256']=='1d0f3e84d51f469670ff064a08277dd4cb6323ee2230d8dddaa437463159d736'
 parser_version=inv['buildAndTest']['fast-xml-parser']['version']
 parser=build['translationParser'];assert parser['version']==parser_version and parser['frozenInstallPassed']
 assert sha(cs/'FAST_XML_PARSER318_INSTALLED_PACKAGE.json')==parser['installedPackageSha256']
 assert sha(root/'lila/bin/package.json')==parser['binManifestSha256']
 assert sha(root/'lila/pnpm-lock.yaml')==parser['nativeLockSha256']
 assert json.loads((cs/'FAST_XML_PARSER318_INSTALLED_PACKAGE.json').read_text())['version']==parser_version

 os_record=json.loads((cs/'OS_SECURITY355_RECORD.json').read_text())
 assert os_record['applicationMain']=='2b925bd25d67753c9f1481667dd89f558ea5403e'
 assert os_record['inventorySha256']=='78bf061a1448ce65a468fbe671488f86a0325d8b2883982ea30551a61af23450' # historical record, not current inventory identity
 assert subprocess.check_output(['uname','-r'],text=True).strip()==inv['runtime']['hostOS']['kernel']
 assert Path('/proc/sys/kernel/random/boot_id').read_text().strip()!=os_record['previousBootId']
 requestpref=(root/'lila/modules/pref/src/main/RequestPref.scala').read_text()
 assert 'bgImg' not in requestpref
 assert '.option(pref.bgImgUrl)' in (root/'lila/app/views/base/page.scala').read_text()
 requestpref_class=None
 for jar in (root/'lila/lib').glob('*.jar'):
  with zipfile.ZipFile(jar) as z:
   if 'lila/pref/RequestPref$.class' in z.namelist(): requestpref_class=z.read('lila/pref/RequestPref$.class')
 assert requestpref_class and b'bgImg' not in requestpref_class
 jdk_versions={}
 import pwd
 for unit in ['nosweatchess-app','nosweatchess-ws']:
  java_pid=subprocess.check_output(['systemctl','show',unit,'-p','MainPID','--value'],text=True).strip()
  java_user=pwd.getpwuid(Path('/proc/'+java_pid).stat().st_uid).pw_name
  observed=subprocess.check_output(['runuser','-u',java_user,'--',str(Path('/proc/'+java_pid+'/exe').resolve().with_name('jcmd')),java_pid,'VM.version'],text=True,timeout=15)
  verify_java(observed,inv['runtime']['hostOS']['openjdk-21'])
  jdk_versions[unit]=observed.strip()
 # The reviewed kernel expectation is checked against uname above.
 assert subprocess.check_output(['dpkg-query','-W','-f=${Version}','python3-jwt'],text=True)==inv['runtime']['hostOS']['python3-jwt']
 # Source identity is critical: compare every recorded class, including prior fixes.
 for name,digest in build['classes'].items():
  matches=[]
  for jar in (root/'lila/lib').glob('*.jar'):
   with zipfile.ZipFile(jar) as z:
    if name in z.namelist():matches.append(hashlib.sha256(z.read(name)).hexdigest())
  assert matches==[digest],(name,matches)
 # New guard targets require matching rebuilt WS classes and browser bundles.
 guards=inv['upstreamPins']['lila-ws'].get('securityBackports',[])
 if any(g.get('advisory')=='GHSA-rxpx-6m5g-qm2w' for g in guards):
  assert build['wsRebuilt'] and build['sriValidationRegressionsPassed'] and build['racerMarkerIntegrationPassed']
  assert set(build['wsClasses'])>={'lila/ws/Auth.class','lila/ws/Controller.class','lila/ws/Mongo.class','lila/ws/model$package$Sri$.class'}
  for name,digest in build['wsClasses'].items():
   matches=[]
   for jar in (root/'ws/lib').glob('*.jar'):
    with zipfile.ZipFile(jar) as z:
     if name in z.namelist():matches.append(hashlib.sha256(z.read(name)).hexdigest())
   assert matches==[digest],(name,matches)
  assert build['lobbyIdRegressionsPassed'] and build['securityGuardArtifacts']
  for name,digest in build['securityGuardArtifacts'].items():assert sha(root/name)==digest,name
 assert Path('/opt/nosweatchess/current').resolve()==root
 assert archived.read_bytes()==original
 print(json.dumps({'passed':True,'class':'critical','readOnly':True,'main':release['gitCommit'],'nativeCommit':release['nativeCommit'],'nativeTree':release['nativeTree'],'inventorySha256':invsha,'matchingBuildReceipt':buildpath.name,'classesVerified':len(build['classes']),'historicalReceiptPreserved':True,'compiledDOMPurify':inv['browser']['dompurify']['version'],'verificationOperationRebuiltApplication':False}))


if __name__=='__main__':main()
