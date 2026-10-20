import re, json
L = open('p01nw.md').read().replace('---', '—').split('\n')
def clean(s):
    s = re.sub(r'\\([~.\-\[\]*\'"])', r'\1', s)
    s = s.replace('**', '').strip()
    return s
def blocks(lines):
    out = []
    for raw in lines:
        s = raw.rstrip()
        if not s.strip(): continue
        if s.startswith('-   '):
            item = clean(s[4:])
            if out and out[-1]['t'] == 'ul': out[-1]['items'].append(item)
            else: out.append({'t': 'ul', 'items': [item]})
            continue
        if s.startswith('    ') and out and out[-1]['t'] == 'ul':
            out[-1]['items'][-1] += ' ' + clean(s); continue
        c = clean(s)
        # inline numbered list "1. a 2. b" in one paragraph
        if re.match(r'^1\. ', c) and re.search(r' 2\. ', c):
            items = [x.strip() for x in re.split(r'\s*\d\.\s', c) if x.strip()]
            out.append({'t': 'ol', 'items': items}); continue
        m = re.match(r'^(\d)\. (.*)', c)
        if m:
            if out and out[-1]['t'] == 'ol': out[-1]['items'].append(m.group(2))
            else: out.append({'t': 'ol', 'items': [m.group(2)]})
            continue
        out.append({'t': 'p', 'text': c})
    return out

# split into level-1 sections
secs = []; cur = None
for line in L:
    if line.startswith('# '):
        cur = {'title': clean(line[2:]), 'lines': []}; secs.append(cur)
    elif cur: cur['lines'].append(line)

def split(lines, prefix):
    pre, subs, cur = [], [], None
    for line in lines:
        if line.startswith(prefix) and not line.startswith(prefix + '#'):
            cur = {'title': clean(line[len(prefix):]), 'lines': []}; subs.append(cur)
        elif cur is not None: cur['lines'].append(line)
        else: pre.append(line)
    return pre, subs

out = {'weeks': []}
for s in secs:
    if s['title'].startswith('Présentation'):
        pre, subs = split(s['lines'], '## ')
        out['presentation'] = blocks(pre)
    m = re.match(r'SEMAINE (\d) — (.*)', s['title'])
    if not m: continue
    w = {'n': int(m.group(1)), 'title': m.group(2), 'lessons': [], 'videos': [], 'activities': [], 'bilan': [], 'ajouts': [], 'extra': []}
    pre, subs = split(s['lines'], '## ')
    w['intro'] = blocks(pre)
    for sub in subs:
        t = sub['title']
        if t.startswith('À vous de jouer'):
            w['activities'] = [i for b in blocks(sub['lines']) for i in b.get('items', [])]
        elif t.startswith('Mini-vidéos'):
            _, vids = split(sub['lines'], '### ')
            for v in vids:
                vm = re.match(r'Vidéo (\d) — (.*)', v['title'])
                txt = [clean(x) for x in v['lines'] if x.strip()]
                prod = next((x for x in txt if x.startswith('Production')), '')
                pm = re.match(r'Production : (.*) • ~?(.*)', prod)
                script = [x for x in txt if not x.startswith('Production') and not x.startswith('SCRIPT')]
                w['videos'].append({'k': int(vm.group(1)), 'title': vm.group(2), 'production': pm.group(1) if pm else '', 'duration': (pm.group(2) if pm else '').replace(' s', ' s'), 'script': ' '.join(script)})
        elif t.startswith('Bilan de la semaine'):
            w['bilan'] = [i for b in blocks(sub['lines']) for i in b.get('items', [])]
        elif t.startswith('AJOUT'):
            ipre, isubs = split(sub['lines'], '### ')
            a = {'title': t.replace('AJOUT — ', ''), 'intro': blocks(ipre), 'subs': []}
            for x in isubs:
                a['subs'].append({'title': x['title'], 'blocks': blocks(x['lines'])})
            w['ajouts'].append(a)
        elif t.startswith('Rappel transversal'):
            out['toolbox_note'] = blocks(sub['lines'])
        else:
            w['lessons'].append({'title': t, 'blocks': blocks(sub['lines'])})
    out['weeks'].append(w)
json.dump(out, open('parsed.json', 'w'), ensure_ascii=False, indent=1)
for w in out['weeks']:
    print(w['n'], len(w['lessons']), len(w['videos']), len(w['activities']), len(w['bilan']), [a['title'][:30] for a in w['ajouts']], [s['title'][:25] for a in w['ajouts'] for s in a['subs']])
print(json.dumps(out['weeks'][0]['videos'][0], ensure_ascii=False)[:300])
print(json.dumps(out['weeks'][2]['lessons'][1], ensure_ascii=False)[:400])
print(json.dumps(out['weeks'][4]['ajouts'][0]['subs'][-1], ensure_ascii=False)[:300])
