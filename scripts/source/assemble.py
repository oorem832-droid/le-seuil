import json, re, os
D = json.load(open('parsed.json'))
def fix(o):
    if isinstance(o, str): return o.replace("'", "’")
    if isinstance(o, list): return [fix(x) for x in o]
    if isinstance(o, dict): return {k: fix(v) for k, v in o.items()}
    return o
D = fix(D)
W = {w['n']: w for w in D['weeks']}

def lesson(key, title, blocks, **kw): return dict(id=key, kind='lecon', title=title, blocks=blocks, **kw)
def video(key, v, **kw):
    return dict(id=key, kind='video', title=v['title'], production=v.get('production', ''), duration=v.get('duration', ''),
                transcript=v['script'], url='', captions_url='', **kw)
def ex(key, title, component, **kw): return dict(id=key, kind='exercice', title=title, component=component, **kw)
F = lambda k, label, type='textarea', **kw: dict(k=k, label=label, type=type, **kw)

def bilan(n, questions, goal_q=None, rating=True):
    fields = []
    if rating: fields.append(F('impact', 'Ces derniers jours, à quel point vos inquiétudes ont-elles pesé sur votre quotidien ?', 'rating', measure='impact', min='Pas du tout', max='Énormément', required=True))
    for i, q in enumerate(questions):
        if goal_q and q == goal_q: fields.append(F('objectif', q, 'goal', hint='Il sera ajouté à Mes objectifs. Un objectif non atteint invite simplement à ajuster votre plan.'))
        else: fields.append(F(f'q{i+1}', q, required=(i == 0)))
    fields.append(F('partage', 'Partager ce bilan avec mon accompagnante', 'share'))
    return dict(id='bilan', kind='bilan', title=f'Bilan de la semaine {n}', component='form', fields=fields)

def quiz(key, title, options, items, explain=''):
    return ex(key, title, 'quiz', options=options, items=[{'t': t, 'a': a} for t, a in items], explanation=explain)

def interleave(w, skip):
    """v1, intro, lessons with remaining non-capture videos between them."""
    vids = [v for v in w['videos'] if v['k'] not in skip]
    steps, vi = [], 0
    for i, l in enumerate(w['lessons']):
        steps.append(lesson(f'l{i+1}', l['title'], l['blocks']))
        if vi < len(vids): steps.append(video(f'v{vids[vi]["k"]}', vids[vi])); vi += 1
    while vi < len(vids): steps.append(video(f'v{vids[vi]["k"]}', vids[vi])); vi += 1
    return steps

def capture(w): return next((v for v in w['videos'] if 'Capture' in v['production']), None)
def last(w): return w['videos'][-1]

def ajout_steps(w, n):
    out = []
    for a in w['ajouts']:
        lb = list(a['intro']); vid = None; exo = None
        for s in a['subs']:
            if s['title'].startswith('VIDÉO COURTE'):
                m = re.match(r'VIDÉO COURTE — (.*?) \((.*)\)', s['title'])
                script = ' '.join(b.get('text', '') for b in s['blocks']).replace('SCRIPT VIDÉO — ', '').strip().strip('«» ').strip()
                vid = dict(title=m.group(1), production=m.group(2), duration='', script=script)
            elif s['title'].startswith('Exercice'):
                exo = s
            else:
                lb.append({'t': 'h', 'text': s['title']}); lb.extend(s['blocks'])
        out.append(lesson('a1', a['title'], lb, required=False, optional=True))
        if vid: out.append(video('av', vid, required=False, optional=True))
        out.append(('EXO', exo))
    return out

weeks = []
# ---------- Semaine 1 ----------
w = W[1]; cap = capture(w)
s = [video('v1', w['videos'][0]), lesson('intro', 'Introduction', w['intro'])] + interleave(w, {1, cap['k'], last(w)['k']})
s += [quiz('q1', 'Fait ou interprétation ?', ['Fait', 'Interprétation'], [('« Une réunion est prévue demain. »', 'Fait'), ('« Je vais être licencié. »', 'Interprétation')],
          'Une interprétation n’est pas nécessairement fausse, mais elle n’est pas toujours confirmée.'),
      video(f'v{cap["k"]}', cap),
      ex('x1', 'Mon journal des inquiétudes', 'repeat', intro='Notez une situation, une pensée inquiète, votre émotion, vos sensations physiques et votre réaction. Notez l’intensité de votre inquiétude entre 0 et 10, sans chercher à obtenir une note parfaite.',
         min=1, addLabel='Ajouter une situation', fields=[F('situation', 'La situation', required=True), F('pensee', 'Ma pensée inquiète', required=True), F('emotion', 'Mon émotion', 'text'),
         F('sensations', 'Mes sensations physiques', 'text'), F('reaction', 'Ma réaction', 'text'), F('intensite', 'Intensité de mon inquiétude', 'scale')]),
      ex('x2', 'Ma fiche en cinq parties', 'form', main=True, intro='Exercice principal : remplissez une fiche en cinq parties à partir d’une situation récente.',
         fields=[F('situation', 'Ce qui s’est passé', required=True), F('pensees', 'Ce que je me suis dit', required=True), F('emotions', 'Ce que j’ai ressenti', required=True),
                 F('corps', 'Les sensations dans mon corps', required=True), F('comportements', 'Ce que j’ai fait ensuite', required=True)]),
      video(f'v{last(w)["k"]}', last(w)),
      bilan(1, w['bilan'], goal_q=w['bilan'][2])]
for x in ajout_steps(w, 1):
    if isinstance(x, tuple): s.append(ex('a2', 'Ma pause de deux minutes', 'form', required=False, optional=True, intro='Les notes servent à mieux comprendre votre expérience, pas à obtenir un score parfait.',
        fields=[F('avant', 'Avant : à quel point mes inquiétudes occupent-elles mon attention ?', 'scale', required=True), F('apres', 'Après l’exercice : à quel point mes inquiétudes occupent-elles mon attention ?', 'scale'),
                F('remarque', 'Qu’ai-je remarqué ? Puis-je reprendre une petite action utile ?')]))
    else: s.append(x)
weeks.append(dict(n=1, title=w['title'], intro=w['intro'], steps=s))

# ---------- Semaine 2 ----------
w = W[2]; cap = capture(w)
s = [video('v1', w['videos'][0]), lesson('intro', 'Introduction', w['intro'])] + interleave(w, {1, cap['k'], last(w)['k']})
s += [quiz('q1', 'Classer trois exemples', ['Problème actuel', 'Inquiétude hypothétique', 'Mélange des deux'],
           [('« Je dois régler une facture avant vendredi. »', 'Problème actuel'), ('« Et si je perdais mon travail l’année prochaine ? »', 'Inquiétude hypothétique'),
            ('Julie attend la réponse d’un entretien : elle peut vérifier qu’elle a bien envoyé les documents demandés, mais elle ne peut pas obtenir immédiatement une garantie sur la décision.', 'Mélange des deux')],
           'Certaines inquiétudes mélangent les deux. Nous pouvons les séparer en petites parties : ce qui nécessite une action et ce qui reste incertain.'),
      video(f'v{cap["k"]}', cap),
      ex('x1', 'Mon temps des inquiétudes', 'form', main=True, intro='Choisissez une plage de 15 à 20 minutes, plutôt en dehors de l’heure du coucher. Notez les inquiétudes non urgentes au fil de la journée, puis reprenez-les pendant le moment choisi.',
         fields=[F('plage', 'Mon moment choisi (15 à 20 minutes)', 'text', required=True, hint='Par exemple : 18 h 30 – 18 h 50'),
                 F('notes', 'Les inquiétudes notées au fil de la journée', 'repeat', min=1, addLabel='Ajouter une inquiétude', fields=[
                     F('inquietude', 'Mon inquiétude', 'text', required=True), F('type', 'Type', 'choice', options=['Problème actuel', 'Inquiétude hypothétique', 'Mélange des deux'])]),
                 F('releve', 'Au moment prévu : qu’ai-je remarqué en relisant mes notes ?')]),
      ex('r1', 'Mon journal de la semaine', 'journal', prompt='Ce qui a été facile, difficile, ou inattendu.'),
      video(f'v{last(w)["k"]}', last(w)),
      bilan(2, w['bilan'])]
for x in ajout_steps(w, 2):
    if isinstance(x, tuple): s.append(ex('a2', 'Mon expérience', 'form', required=False, optional=True, intro='Je peux choisir une autre technique si celle-ci ne me convient pas.',
        fields=[F('avant', 'Avant : qu’est-ce que je ressens dans mon corps ?', required=True),
                F('apres', 'Après : cette pause m’a-t-elle aidé(e), laissé(e) indifférent(e) ou mis(e) mal à l’aise ?', 'choice', options=['Elle m’a aidé(e)', 'Elle m’a laissé(e) indifférent(e)', 'Elle m’a mis(e) mal à l’aise'])]))
    else:
        s.append(x)
        if x['id'] == 'a1': s.append(dict(id='a3', kind='exercice', title='Une respiration qui me convient', component='breath', required=False, optional=True))
weeks.append(dict(n=2, title=w['title'], intro=w['intro'], steps=s))

# ---------- Semaine 3 ----------
w = W[3]; cap = capture(w)
s = [video('v1', w['videos'][0]), lesson('intro', 'Introduction', w['intro'])] + interleave(w, {1, cap['k'], last(w)['k']})
s += [video(f'v{cap["k"]}', cap),
      ex('x1', 'Mon plan de résolution de problème', 'form', main=True, intro='Écrivez un seul problème concret, listez au moins trois options (y compris demander une aide adaptée), comparez-les, puis choisissez une action réalisable.',
         fields=[F('probleme', '1. Mon problème actuel, concret et précis (en une phrase)', 'text', required=True),
                 F('options', '2 et 3. Mes options, leurs avantages, leurs contraintes et leurs risques', 'repeat', min=3, addLabel='Ajouter une option', fields=[
                     F('option', 'Option', 'text', required=True), F('avantages', 'Avantages', 'text'), F('contraintes', 'Contraintes et risques', 'text')]),
                 F('choix', '4. La solution réaliste que je choisis d’essayer', 'text', required=True),
                 F('quoi', '5. Mon plan : quoi ?', 'text', required=True), F('quand', 'Quand ?', 'text', required=True), F('ou', 'Où ?', 'text'), F('qui', 'Avec qui ?', 'text'), F('comment', 'Comment ?', 'text')]),
      ex('r1', 'Mon journal de la semaine', 'journal', prompt='Qu’ai-je tenté ? Que s’est-il passé ? Que vais-je ajuster ?'),
      video(f'v{last(w)["k"]}', last(w)),
      bilan(3, w['bilan'])]
weeks.append(dict(n=3, title=w['title'], intro=w['intro'], steps=s))

# ---------- Semaine 4 ----------
w = W[4]; cap = capture(w)
s = [video('v1', w['videos'][0]), lesson('intro', 'Introduction', w['intro'])] + interleave(w, {1, cap['k'], last(w)['k']})
s += [quiz('q1', 'Fait ou interprétation ?', ['Fait', 'Interprétation'], [('« On m’a demandé de corriger deux pages. »', 'Fait'), ('« Mon responsable pense que je suis incapable. »', 'Interprétation')],
           'Une pensée n’est pas toujours un fait. Une pensée équilibrée n’est pas forcément positive : elle doit rester crédible, nuancée et respectueuse de votre situation.'),
      video(f'v{cap["k"]}', cap),
      ex('x1', 'Mon journal de pensées', 'form', main=True, intro='Choisissez une situation supportable ; n’utilisez pas cet exercice pour nier une menace réelle.',
         fields=[F('situation', 'La situation', required=True), F('pensee', 'La pensée qui m’est venue', required=True), F('emotion', 'Mon émotion', 'text'), F('intensite', 'Intensité de l’émotion', 'scale'),
                 F('pour', 'Les faits qui semblent la soutenir'), F('autres', 'Les autres éléments, qui me donnent une autre perspective'),
                 F('bienveillance', 'Ce que je dirais à une personne que j’apprécie dans la même situation'), F('equilibree', 'Une formulation plus équilibrée', required=True),
                 F('intensite_apres', 'Intensité de l’émotion après l’exercice (sans obligation qu’elle diminue)', 'scale')]),
      video(f'v{last(w)["k"]}', last(w)),
      bilan(4, w['bilan'])]
weeks.append(dict(n=4, title=w['title'], intro=w['intro'], steps=s))

# ---------- Semaine 5 ----------
w = W[5]; cap = capture(w)
s = [video('v1', w['videos'][0]), lesson('intro', 'Introduction', w['intro'])] + interleave(w, {1, cap['k'], last(w)['k']})
s += [quiz('q1', 'Utile ou répétitif ?', ['Vérification utile', 'Vérification répétitive'],
           [('Vérifier l’adresse d’un rendez-vous.', 'Vérification utile'), ('Relire quinze fois un message déjà vérifié.', 'Vérification répétitive')],
           'Chercher une information utile ou demander du soutien n’est pas un problème. Ce sont surtout les vérifications répétitives, qui n’apportent plus d’information nouvelle, qui peuvent entretenir l’inquiétude.'),
      video(f'v{cap["k"]}', cap),
      ex('x1', 'Mon petit défi face à l’incertitude', 'form', main=True,
         intro='Choisissez une situation simple, sûre et sans enjeu important. Ne réduisez jamais des vérifications nécessaires à la sécurité, aux soins, à la protection d’une personne ou à une situation urgente.',
         fields=[F('situation', 'La situation', required=True), F('habitude', 'Ma vérification ou demande de réassurance habituelle', required=True), F('changement', 'Le petit changement que je choisis', required=True),
                 F('prediction', 'Ce que je pense qu’il va se passer (ma prédiction)', required=True), F('inquietude', 'Mon inquiétude avant l’essai', 'scale', required=True),
                 F('resultat', 'Après l’essai : ce qui s’est réellement passé', required=True, after=True), F('appris', 'Ce que j’ai appris', required=True, after=True)]),
      video(f'v{last(w)["k"]}', last(w)),
      bilan(5, w['bilan'], goal_q=w['bilan'][3])]
for x in ajout_steps(w, 5):
    if isinstance(x, tuple): s.append(ex('a2', 'Mon repérage des tensions', 'form', required=False, optional=True,
        fields=[F('ou', 'Où est-ce que je remarque souvent des tensions ?', required=True), F('avant_apres', 'Qu’est-ce que je ressens avant et après une courte pause ?'),
                F('autre', 'Quelle autre technique puis-je choisir si la PMR ne me convient pas ?')]))
    else: s.append(x)
weeks.append(dict(n=5, title=w['title'], intro=w['intro'], steps=s))

# ---------- Semaine 6 ----------
w = W[6]; cap = capture(w)
s = [video('v1', w['videos'][0]), lesson('intro', 'Introduction', w['intro'])] + interleave(w, {1, cap['k'], last(w)['k']})
s += [ex('x1', 'Le chemin parcouru', 'form', intro='Revoyez l’objectif fixé au début et comparez l’impact de vos inquiétudes au début et maintenant, sur une échelle personnelle de 0 à 10. Ce bilan est personnel et non clinique.',
         fields=[F('objectif_initial', 'Mon objectif de départ', 'goal_recall'), F('change', 'Ce qui a changé', required=True),
                 F('impact', 'Aujourd’hui, à quel point vos inquiétudes pèsent-elles sur votre quotidien ?', 'rating', measure='impact', min='Pas du tout', max='Énormément', required=True, compare=True),
                 F('techniques', 'Les techniques que je souhaite conserver', 'checks', options=['Observer mes inquiétudes', 'Donner un rendez-vous à mes inquiétudes', 'Résoudre un problème', 'Examiner mes pensées',
                   'Faire de la place à l’incertitude', '5-4-3-2-1 : utiliser mes cinq sens', 'Respiration douce', 'Relaxation musculaire progressive'], required=True)]),
      video(f'v{cap["k"]}', cap),
      ex('x2', 'Mon plan pour continuer à avancer', 'form', main=True, plan=True, intro='Conservez ce plan dans un endroit accessible et modifiez-le si votre situation évolue.',
         fields=[F('appris', '1. Ce que j’ai appris sur mes inquiétudes', required=True), F('signes', '2. Mes premiers signes de difficulté', required=True),
                 F('techniques', '3. Les techniques qui m’aident', required=True), F('habitudes', '4. Les petites habitudes que je souhaite conserver'),
                 F('personnes', '5. Les personnes et ressources vers lesquelles me tourner', required=True), F('aggravation', '6. Ce que je ferai si mes difficultés s’aggravent', required=True)]),
      video(f'v{last(w)["k"]}', last(w)),
      bilan(6, w['bilan'], rating=False)]
weeks.append(dict(n=6, title=w['title'], intro=w['intro'], steps=s))

objectives = ['Observer mes inquiétudes : identifier la situation, les pensées, émotions, sensations et comportements.',
  'Donner un rendez-vous à mes inquiétudes : reporter certaines pensées répétitives et non urgentes.',
  'Résoudre un problème : choisir une difficulté concrète et préparer une action.',
  'Examiner mes pensées : distinguer faits et interprétations, envisager une perspective plus équilibrée.',
  'Faire de la place à l’incertitude : réduire progressivement certaines vérifications inutiles dans des situations sûres.']
prog = dict(slug='inquietudes', code='01', title='Apprendre à gérer mes inquiétudes',
  summary='Six semaines pour comprendre comment fonctionnent les inquiétudes et expérimenter des outils pratiques inspirés des TCC.',
  intro=[b['text'] for b in D['presentation'] if b['t'] == 'p'], objectives=objectives,
  measures=[dict(key='impact', label='Ces derniers jours, à quel point vos inquiétudes ont-elles pesé sur votre quotidien ?', min='Pas du tout', max='Énormément')],
  source='LE SEUIL — Programme 01, brouillon avec ancrage et relaxation (rédaction de travail, à valider avant mise en ligne)', weeks=weeks)
js = '// Généré par scripts/source/import-programme-01.sh à partir du document Word du Programme 01.\n// Rédaction de travail — à valider (relecture clinique et pédagogique) avant mise en ligne.\nexport const PROGRAMME_01 = ' + json.dumps(prog, ensure_ascii=False, indent=1) + ';\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'programme01.js'), 'w').write(js)
for w in weeks: print(w['n'], len(w['steps']), [ (x['kind'][0] + ':' + x['id']) for x in w['steps']])
