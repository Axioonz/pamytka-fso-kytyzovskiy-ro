"""Local law checks. Credentials never enter the memo or config."""
import argparse, copy, datetime as dt, getpass, hashlib, http.cookiejar, json
import os, re, shutil, tempfile, unicodedata, urllib.request, urllib.parse, urllib.error
from pathlib import Path
from lxml import html

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
DATA = BASE / 'data/laws.json'
STATE = BASE / '.session/cookies.json'

class LoginRequired(Exception): pass
class Unavailable(Exception): pass

def now(): return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
def read(path): return json.loads(path.read_text(encoding='utf8'))
def normal(s):
    return ' '.join(unicodedata.normalize('NFC',s).replace('\u200b','').replace('\ufeff','').split())
def digest(s): return hashlib.sha256(normal(s).encode()).hexdigest()
def atomic(path, text):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(dir=path.parent,suffix='.tmp')
    try:
        with os.fdopen(fd,'w',encoding='utf8',newline='') as f:
            f.write(text); f.flush(); os.fsync(f.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name): os.unlink(name)
def write(path,obj): atomic(path,json.dumps(obj,ensure_ascii=False,indent=2))
def units(text):
    lines=text.splitlines(); articles=any(re.match(r'^Статья\s+\d',x.strip(),re.I) for x in lines)
    result=[]; chapter=''; start=None; number=''
    def finish(end):
        if start is not None:
            body='\n'.join(lines[start:end]).strip()
            result.append(dict(key=chapter+':'+number,chapter=chapter,number=number,text=body,hash=digest(body)))
    for i,line in enumerate(lines):
        s=line.strip(); ch=re.match(r'^(?:Глава|Раздел)\s+([IVXLCDM\d]+)(?:\.|\s|$)',s,re.I)
        if ch: finish(i); start=None; chapter=ch[1].upper(); continue
        m=re.match(r'^Статья\s+(\d+(?:\.\d+)*)(?:\.)?(?=\s|$)',s,re.I) if articles else re.match(r'^(?:Пункт\s+)?(\d+(?:\.\d+)+)(?:\.)?\s',s,re.I)
        if m: finish(i); start=i; number=m[1]
        if re.match(r'^Нормативно-правовой акт подписан',s): finish(i);start=None;break
    finish(len(lines))
    if not result or len({x['key'] for x in result})!=len(result): raise Unavailable('Неизвестная или неоднозначная нумерация')
    return result
def rendered(el):
    tag=el.tag.lower() if isinstance(el.tag,str) else ''
    if tag in ('script','style'): return ''
    if tag=='br': return '\n'
    s=el.text or ''
    for c in el: s+=rendered(c)+(c.tail or '')
    if tag=='li' and el.getparent().tag.lower()=='ol':
        n=int(el.getparent().get('start','1'))
        for c in el.getparent():
            if c.tag!='li':continue
            n=int(c.get('value',n))
            if c is el:break
            n+=1
        s=str(n)+'. '+s
    return '\n'+s+'\n' if tag in ('div','p','ol','ul','li','h1','h2','h3','h4','blockquote') else s
def extract(source,url,doc):
    if '/login' in urllib.parse.urlsplit(url).path: raise LoginRequired('Нужно повторно войти')
    root=html.fromstring(source)
    if root.xpath('//input[@type="password"]') or 'Вы должны быть авторизованы' in root.text_content(): raise LoginRequired('Получена страница входа')
    posts=root.xpath(doc.get('xpath','//article[contains(concat(" ",normalize-space(@class)," ")," message--post ")]//*[contains(concat(" ",normalize-space(@class)," ")," message-body ")]//*[contains(concat(" ",normalize-space(@class)," ")," bbWrapper ")]'))
    index=doc.get('postIndex',0)
    if index<0 or index>=len(posts): raise Unavailable('Нужное сообщение закона отсутствует')
    text='\n'.join(x.strip() for x in rendered(posts[index]).splitlines() if x.strip())
    if len(text)<250:raise Unavailable('Пустой или слишком короткий текст')
    parsed=units(text)
    pattern=doc.get('expectedText')
    if pattern and not re.search(pattern,text,re.I):raise Unavailable('Текст не соответствует ожидаемому документу')
    dates=re.findall(r'(?:редакци[яи]|измен[её]н[оаы]?)[^\n]{0,70}?(\d{2}\.\d{2}\.\d{4})',text,re.I)
    return dict(id=doc['id'],title=doc['title'],url=doc['url'],editionDate=dates[-1] if dates else None,checkedAt=now(),hash=digest(text),text=text,articles=parsed)
def changes(old,new):
    a={x['key']:x for x in old['articles']}; b={x['key']:x for x in new['articles']}; out=[]
    removed=set(a)-set(b); added=set(b)-set(a)
    # Same body under another number is evidence of renumbering, not proof of repeal.
    def body(x):return normal(re.sub(r'^(?:Статья\s+|Пункт\s+)?\d+(?:\.\d+)*\.?\s*','',x['text'],count=1))
    for k in sorted(removed):
        matches=[j for j in added if body(a[k])==body(b[j])]
        if len(matches)==1:
            j=matches[0];out.append(dict(kind='нумерация изменена',old=k,new=j));added.remove(j)
        else:out.append(dict(kind='статья удалена',old=k))
    out.extend(dict(kind='статья добавлена',new=k) for k in sorted(added))
    for k in sorted(set(a)&set(b)):
        if digest(a[k]['text'])!=digest(b[k]['text']):
            kind='отмечена утрата силы' if re.search(r'утратил[аи]?\s+силу|отменен[ао]?|отменён[ао]?',b[k]['text'],re.I) else 'статья изменена'
            out.append(dict(kind=kind,old=k,new=k))
    if not out and old['hash']!=new['hash']:out.append(dict(kind='изменение вне статей',all=True))
    return out
def config():
    cfg=read(BASE/'config.json'); seen=set()
    for d in cfg['documents']:
        if d['id'] in seen:raise ValueError('Повторный ID '+d['id'])
        seen.add(d['id'])
        if d.get('enabled',True):
            u=urllib.parse.urlsplit(d['url'])
            if u.scheme!='https' or u.hostname!='forum.russia.online':raise ValueError('Ожидается официальный HTTPS-адрес')
    return cfg
def opener():
    jar=http.cookiejar.CookieJar()
    if STATE.exists():
        for c in read(STATE):
            jar.set_cookie(http.cookiejar.Cookie(0,c['name'],c['value'],None,False,c['domain'],c['domain'].startswith('.'),c['domain'].startswith('.'),c.get('path','/'),True,c.get('secure',True),c.get('expires'),False,None,None,{},False))
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)),jar
def save_session(cookies):
    write(STATE,cookies)
    try:os.chmod(STATE,0o600)
    except OSError:pass
def request(op,url,data=None):
    q=urllib.request.Request(url,data=data,headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LawSync/1.0'})
    try:
        with op.open(q,timeout=30) as r:return r.read().decode('utf8'),r.url
    except urllib.error.HTTPError as e:
        if e.code==401:raise LoginRequired('Сессия истекла') from e
        raise Unavailable('HTTP '+str(e.code)) from e
def login(cfg,browser=False):
    if not browser:
        op,jar=opener();page,url=request(op,cfg['loginUrl']);root=html.fromstring(page)
        token=root.xpath('//input[@name="_xfToken"]/@value')
        if not token:raise Unavailable('HTTP-вход не распознан. Используйте --login --browser')
        name=input('Имя на форуме: ');password=getpass.getpass('Пароль (не сохраняется): ')
        body=urllib.parse.urlencode({'login':name,'password':password,'_xfToken':token[0],'remember':'1','_xfRedirect':cfg['documents'][0]['url']}).encode();del password
        result,url=request(op,cfg['loginUrl'],body);del body
        extract(result,url,cfg['documents'][0])
        save_session([dict(name=c.name,value=c.value,domain=c.domain,path=c.path,secure=c.secure,expires=c.expires) for c in jar]);print('Локальная HTTP-сессия сохранена.');return
    try:from playwright.sync_api import sync_playwright
    except ImportError:raise Unavailable('Для браузерного входа: pip install playwright; python -m playwright install chromium')
    with sync_playwright() as p:
        profile=BASE/'.session/browser-profile';profile.mkdir(parents=True,exist_ok=True)
        ctx=p.chromium.launch_persistent_context(str(profile),headless=False)
        try:
            page=ctx.new_page();page.goto(cfg['documents'][0]['url']);input('Войдите самостоятельно, откройте закон и нажмите Enter здесь: ')
            extract(page.content(),page.url,cfg['documents'][0])
            save_session([{**c,'expires':int(c['expires']) if c['expires']>0 else None} for c in ctx.cookies()]);print('Сессия сохранена локально; проверка сначала использует HTTP.')
        finally:ctx.close()
def browser_get(doc):
    try:from playwright.sync_api import sync_playwright
    except ImportError:raise Unavailable('HTTP заблокирован. Для резервного режима установите Playwright и выполните --login --browser')
    profile=BASE/'.session/browser-profile'
    if not profile.exists():raise LoginRequired('Для резервного браузерного режима выполните --login --browser')
    with sync_playwright() as p:
        ctx=p.chromium.launch_persistent_context(str(profile),headless=True)
        try:
            page=ctx.new_page();page.goto(doc['url'],wait_until='domcontentloaded',timeout=30000)
            return extract(page.content(),page.url,doc)
        finally:ctx.close()
def dependencies(tree):
    out=[]
    for e in tree.xpath('//*[@data-sync-id]'):
        refs=[]
        if e.get('data-norm'):
            c=json.loads(e.get('data-norm'));refs=c.get('refs') or [dict(doc=c['doc'],a=c['a'],chapter=c.get('chapter',''))];title=c['t']
        else:
            title=' '.join(e.xpath('.//h2/text()'))
            for b in e.xpath('.//*[@data-doc]'):refs.append(dict(doc=b.get('data-doc'),a=b.get('data-article',''),chapter=b.get('data-chapter','')))
        # Old cards sometimes name several articles but only link the first one.
        # Keep their wording and links intact; conservatively flag the whole document.
        if e.get('data-norm') and re.search(r'[,–—]|\d\s*[-]\s*\d',c.get('r','')):
            refs.append(dict(doc=c['doc'],a=''))
        for ground in e.xpath('.//details[contains(@class,"ground")]'):
            nums=' '.join(ground.xpath('.//summary//b/text()'))
            if re.search(r'[,–—]',nums):
                for b in ground.xpath('.//*[@data-doc]'):refs.append(dict(doc=b.get('data-doc'),a=''))
        out.append(dict(id=e.get('data-sync-id'),title=title,refs=refs))
    return out
def affected(deps,docid,diffs):
    keys={x[k] for x in diffs for k in ('old','new') if k in x};all_changed=any(x.get('all') for x in diffs)
    return [x for x in deps if any(r['doc']==docid and (all_changed or not r.get('a') or any(k.split(':')[-1]==r.get('a') and (not r.get('chapter') or k.split(':')[0]==r['chapter']) for k in keys)) for r in x['refs'])]
def commit(db,tree,report,memo):
    olddb=DATA.read_text(encoding='utf8');oldmemo=memo.read_text(encoding='utf8')
    stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');folder=BASE/'backups'/stamp;folder.mkdir(parents=True)
    atomic(folder/'laws.json',olddb);atomic(folder/'index.html',oldmemo)
    docs=json.loads(tree.get_element_by_id('docsData').text);records={d['id']:d for d in db['documents']}
    for d in docs:
        fresh=records.get(d['id'])
        if fresh and d['id'] in {x['id'] for x in report['documents']}:
            d['text']=fresh['text'];d['sourceUrl']=fresh['url'];d['sourceCheckedAt']=fresh['checkedAt']
            d['sourceNote']='Последняя успешная локальная проверка: '+fresh['checkedAt']+('. Пояснения требуют ручной сверки.' if d.get('reviewRequired') or d['id'] in report['changedDocuments'] else '.')
            if d['id'] in report['changedDocuments']:d['reviewRequired']=True
    tree.get_element_by_id('docsData').text=json.dumps(docs,ensure_ascii=False).replace('</script','<\\/script')
    tree.get_element_by_id('lawSyncData').text=json.dumps(dict(checkedAt=report['checkedAt'],pending=db['pending'],errors=report['errors']),ensure_ascii=False).replace('</script','<\\/script')
    try:
        write(DATA,db);atomic(memo,'<!DOCTYPE html>\n'+html.tostring(tree,encoding='unicode'))
    except Exception:
        atomic(DATA,olddb);atomic(memo,oldmemo);raise
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--login',action='store_true');ap.add_argument('--browser',action='store_true');ap.add_argument('--id');args=ap.parse_args();cfg=config()
    if args.login:login(cfg,args.browser);return
    if not STATE.exists():raise LoginRequired('Сначала выполните python law-sync/check.py --login')
    db=read(DATA);new=copy.deepcopy(db);memo=(BASE/cfg.get('memo','../index.html')).resolve();tree=html.fromstring(memo.read_text(encoding='utf8'));deps=dependencies(tree);records={d['id']:d for d in new['documents']};op,_=opener()
    report=dict(checkedAt=now(),documents=[],changedDocuments=[],errors=[]);success=0
    for doc in cfg['documents']:
        if not doc.get('enabled',True) or args.id and doc['id']!=args.id:continue
        try:
            try:
                source,url=request(op,doc['url']);fresh=extract(source,url,doc)
            except Unavailable as e:
                if 'HTTP 403' not in str(e) and 'HTTP 503' not in str(e):raise
                fresh=browser_get(doc)
            old=records.get(doc['id']);diff=changes(old,fresh) if old else [dict(kind='новый документ',all=True)]
            linked=affected(deps,doc['id'],diff);entry=dict(id=doc['id'],title=doc['title'],changes=diff,linked=[dict(id=x['id'],title=x['title']) for x in linked]);report['documents'].append(entry)
            if diff:report['changedDocuments'].append(doc['id']);new['pending']=sorted(set(new.get('pending',[]))|{x['id'] for x in linked})
            records[doc['id']]=fresh;success+=1
            print(doc['title']+': '+('без изменений' if not diff else ', '.join(x['kind']+' '+x.get('old',x.get('new','')) for x in diff)))
            for x in linked:print('  Требует проверки: '+x['title'])
        except (LoginRequired,Unavailable,urllib.error.URLError,ValueError) as e:
            label='требуется авторизация' if isinstance(e,LoginRequired) else 'документ недоступен'
            report['errors'].append(dict(id=doc['id'],status=label,error=str(e)));print(doc['title']+': '+label+' — '+str(e))
            if isinstance(e,LoginRequired):break
    if args.id and not any(x['id']==args.id for x in cfg['documents']):raise ValueError('Неизвестный ID')
    if success:new['documents']=list(records.values());commit(new,tree,report,memo)
    write(BASE/'reports/latest.json',report)
    lines=['Проверка '+report['checkedAt']]
    for d in report['documents']:
        lines.append('\n'+d['title']);lines.extend(x['kind']+' '+x.get('old',x.get('new','')) for x in d['changes']);lines.extend('Требует проверки: '+x['title'] for x in d['linked'])
    lines.extend(x['id']+': '+x['status']+' — '+x['error'] for x in report['errors']);atomic(BASE/'reports/latest.txt','\n'.join(lines));print('Отчёт: law-sync/reports/latest.txt')
    if report['errors']:raise SystemExit(2)
if __name__=='__main__':
    try:main()
    except (LoginRequired,Unavailable,urllib.error.URLError,ValueError) as e:print(str(e));raise SystemExit(2)
