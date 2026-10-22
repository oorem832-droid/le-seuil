// Mode démonstration : aucune base de données. Les données fictives vivent dans ce navigateur
// (localStorage). Les règles de sécurité réelles sont dans Postgres ; ici, seule la logique
// fonctionnelle est reproduite pour pouvoir explorer la maquette.
import { PLANS, COACH, PROGRAMME_CATALOGUE } from '../content.js';
import { LIBRARY, LIBRARY_REFERENCES } from '../library.js';
import { validEnrolment } from './supabase.js';
// Le contenu des leçons n'est jamais dans le dépôt public : il est chargé seulement s'il existe localement (dossier private/).
const PRIV = import.meta.glob('../../private/programme*.js', { eager: true });
const PRIVATE_PROGS = Object.fromEntries(Object.values(PRIV).flatMap(m => Object.values(m)).filter(p => p?.slug).map(p => [p.slug, p]));
// Sans le fichier privé (démo partageable), on affiche des semaines neutres : aucun contenu de leçon réel.
const PLACEHOLDER_WEEKS = Array.from({ length: 6 }, (_, i) => ({ n: i + 1, title: `Semaine ${i + 1}`, intro: '',
  steps: [{ id: 'apercu', kind: 'lecon', title: 'Contenu réservé aux participants', required: true,
    blocks: [{ t: 'p', text: 'Dans cette démonstration, le texte des leçons n’est pas inclus. Sur le site réel, il n’est transmis qu’aux participants inscrits à ce programme, après connexion.' }] }] }));

const KEY = 'leseuil-demo-v6';
const now = () => new Date().toISOString();
const id = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const daysFrom = (d, h = 10) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };

export const PERSONAS = [
  { id: 'u-awa', first_name: 'Awa', email: 'awa.test@leseuil.ci', role: 'member', label: 'Awa · forfait 2, accompagnement écrit' },
  { id: 'u-koffi', first_name: 'Koffi', email: 'koffi.test@leseuil.ci', role: 'member', label: 'Koffi · forfait 3, appels' },
  { id: 'u-mariam', first_name: 'Mariam', email: 'mariam.test@leseuil.ci', role: 'member', label: 'Mariam · forfait 1, autonome' },
  { id: COACH.id, first_name: 'Judie', email: 'judie.test@leseuil.ci', role: 'admin', label: 'Judie Ore · administratrice et accompagnante' },
  { id: 'u-coach2', first_name: 'Accompagnante', email: 'accompagnante.test@leseuil.ci', role: 'coach', label: 'Une autre accompagnante · rôle limité (exemple)' },
];

function seed() {
  const txt = (bl) => Array.isArray(bl) ? bl.map(b => typeof b === 'string' ? b : b.text || (b.items || []).join('\n')).join('\n\n') : (bl || '');
  const progs = PROGRAMME_CATALOGUE.map((c, i) => { const P = PRIVATE_PROGS[c.slug];
    return { id: i === 0 ? 'p-01' : 'p-' + c.slug, slug: c.slug, code: c.code, title: c.title, summary: c.summary,
    intro: P ? txt(P.intro) : '', objectives: P?.objectives || [], status: c.status, cover_hue: c.hue,
    sort_order: c.order, questionnaires_enabled: false, measures: P?.measures || [], category: c.category, public_intro: c.intro, public_goal: c.goal,
    benefits: c.benefits, format: 'Leçons interactives, courtes vidéos, exercices et outils pratiques, à votre rythme.', library_categories: c.library, open_for_requests: c.open }; });
  const weeks = [], steps = [];
  progs.forEach((prog, pi) => {
    (PRIVATE_PROGS[prog.slug]?.weeks || PLACEHOLDER_WEEKS).forEach(w => {
      const wid = pi === 0 ? `w${w.n}` : `${prog.slug}-w${w.n}`;
      weeks.push({ id: wid, programme_id: prog.id, week_number: w.n, title: w.title, intro: txt(w.intro) });
      w.steps.forEach((s, i) => { const { id: key, kind, title, required, position_offset, ...content } = s;
        steps.push({ id: `${wid}-${key}`, week_id: wid, step_key: key, position: i, kind, title, required: required ?? kind !== 'video', content }); });
    });
  });
  const prog = progs[0];
  const t = {
    profiles: PERSONAS.map(p => ({ id: p.id, first_name: p.first_name, last_name: 'Démo', email: p.email, role: p.role, account_status: 'active', must_set_password: false, newsletter_opt_in: false, analytics_opt_in: false, reminders_opt_in: false, created_at: daysFrom(-30) })),
    coach_profiles: [{ user_id: COACH.id, display_name: COACH.name, public_title: COACH.title, bio: COACH.bio, verified: COACH.verified, hours: COACH.hours,
      response_delay: COACH.delay, limits: COACH.limits.join('\n'), active: true, availability: { days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' }, response_hours: 48 }],
    feature_flags: { payments: false, written_support: true, support_calls: true, questionnaires: false, public_signup: false },
    programmes: progs, programme_weeks: weeks, programme_steps: steps,
    articles: LIBRARY.map(a => ({ id: a.id, slug: a.slug, title: a.title, category: a.category, excerpt: a.chapeau, sections: a.sections, retenir: a.retenir,
      references_list: LIBRARY_REFERENCES, related: LIBRARY.filter(x => x.category === a.category && x.id !== a.id).slice(0, 3).map(x => x.slug),
      read_minutes: Math.max(1, Math.ceil(a.words / 200)), cover_hue: ['sage','forest','gold'][a.n % 3], etat: a.professional_review ? 'a_relire' : 'publie',
      featured: a.featured, featured_order: a.featured_order, sort_order: a.order, sensitive: a.sensitive, professional_review_required: a.professional_review,
      professional_review_done: false, updated_at: daysFrom(-2) })),
    article_versions: [], enrolment_requests: [
      { id: 'r-demo1', programme_slug: 'inquietudes', plan: 'ecrit', first_name: 'Fatou', last_name: 'Exemple', email: 'fatou.exemple@exemple.ci', phone: '', message: 'Demande fictive de démonstration.', is_adult: true, consent: true, status: 'nouvelle', created_at: daysFrom(-1),
        evaluation: { motif: 'Exemple fictif : je m’inquiète beaucoup pour mon travail depuis quelques mois.', duree: '1 à 6 mois', attentes: 'Mieux comprendre mes inquiétudes et avoir des outils.', suivi: 'Non', adaptation: '', disponibilites: 'En soirée' } },
      { id: 'r-demo-awa', programme_slug: 'inquietudes', plan: 'ecrit', first_name: 'Awa', last_name: 'Démo', email: 'awa.test@leseuil.ci', phone: '+225 00 00 00 00 (fictif)', message: '', is_adult: true, consent: true, status: 'compte_cree', created_at: daysFrom(-16),
        user_id: 'u-awa', enrolment_id: 'e-awa', review_result: 'Demande adaptée au programme 01. Pas de situation d’urgence signalée.', decision_note: 'Acceptée ; formule 2 confirmée.', reviewed_at: daysFrom(-15),
        evaluation: { motif: 'Exemple fictif : inquiétudes le soir, difficultés à m’endormir.', duree: 'Plus de 6 mois', attentes: 'Ruminer moins le soir.', suivi: 'Non', adaptation: 'Préfère l’écrit.', disponibilites: '' } }],
    participant_admin_notes: [],
    enrolments: [
      { id: 'e-awa', user_id: 'u-awa', programme_id: prog.id, plan: 'ecrit', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: COACH.id, suitability_completed_at: daysFrom(-14), consented_at: daysFrom(-14), share_summaries: true, share_goals: true, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-14) },
      { id: 'e-awa2', user_id: 'u-awa', programme_id: 'p-peurs', plan: 'autonome', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: null, suitability_completed_at: daysFrom(-2), consented_at: daysFrom(-2), share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-2) },
      { id: 'e-koffi', user_id: 'u-koffi', programme_id: prog.id, plan: 'appels', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: COACH.id, suitability_completed_at: daysFrom(-7), consented_at: daysFrom(-7), share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-7) },
      { id: 'e-mariam', user_id: 'u-mariam', programme_id: prog.id, plan: 'autonome', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: null, suitability_completed_at: null, consented_at: null, share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-1) },
    ],
    step_progress: [], week_completions: [], exercise_responses: [], journal_entries: [], goals: [], self_ratings: [], shared_summaries: [], saved_items: [],
    messages: [], appointments: [], coach_notes: [], referrals: [], resource_suggestions: [], questionnaire_responses: [], access_log: [],
    contact_messages: [], privacy_requests: [], staff_tasks: [], coach_note_versions: [],
  };
  // Awa : semaines 1 et 2 terminées
  steps.filter(s => s.week_id === 'w1' || s.week_id === 'w2').forEach(s => t.step_progress.push({ enrolment_id: 'e-awa', step_id: s.id, user_id: 'u-awa', status: 'completed', completed_at: daysFrom(-10) }));
  t.week_completions.push({ enrolment_id: 'e-awa', week_number: 1, user_id: 'u-awa', completed_at: daysFrom(-10) }, { enrolment_id: 'e-awa', week_number: 2, user_id: 'u-awa', completed_at: daysFrom(-3) });
  t.self_ratings.push({ id: id(), user_id: 'u-awa', enrolment_id: 'e-awa', week_number: 0, measure_key: 'impact', value: 8, created_at: daysFrom(-14) },
    { id: id(), user_id: 'u-awa', enrolment_id: 'e-awa', week_number: 1, measure_key: 'impact', value: 7, created_at: daysFrom(-10) },
    { id: id(), user_id: 'u-awa', enrolment_id: 'e-awa', week_number: 2, measure_key: 'impact', value: 6, created_at: daysFrom(-3) });
  t.goals.push({ id: id(), user_id: 'u-awa', enrolment_id: 'e-awa', scope: 'principal', week_number: null, title: 'Passer moins de temps à ruminer le soir', actions: [], obstacles: '', reflection: '', status: 'actif', created_at: daysFrom(-14), updated_at: daysFrom(-14) },
    { id: id(), user_id: 'u-awa', enrolment_id: 'e-awa', scope: 'hebdomadaire', week_number: 3, title: 'Tester le plan de résolution sur un problème concret', actions: [{ text: 'Choisir un problème du travail', done: true }, { text: 'Remplir le plan mercredi soir', done: false }], obstacles: '', reflection: '', status: 'actif', created_at: daysFrom(-3), updated_at: daysFrom(-3) });
  t.shared_summaries.push({ id: id(), enrolment_id: 'e-awa', user_id: 'u-awa', week_number: 2, body: 'Ce qui m’a aidée : noter mes inquiétudes le soir. Difficulté : je n’arrive pas encore à les classer quand je suis fatiguée.', shared_at: daysFrom(-3) });
  t.journal_entries.push({ id: id(), user_id: 'u-awa', enrolment_id: 'e-awa', week_number: 2, prompt: 'Note libre', body: 'Exemple fictif : aujourd’hui j’ai remarqué que mes inquiétudes reviennent surtout après les appels avec ma famille.', created_at: daysFrom(-4), updated_at: daysFrom(-4) });
  t.messages.push({ id: id(), enrolment_id: 'e-awa', sender_id: COACH.id, kind: 'suivi', body: 'Bonjour Awa, merci pour votre bilan de la semaine 2. Le fait de noter vos inquiétudes le soir est un vrai pas. Cette semaine, vous pouvez essayer le plan de résolution sur un seul problème, sans chercher la solution parfaite. (Message fictif de démonstration.)', created_at: daysFrom(-2), read_at: null },
    { id: id(), enrolment_id: 'e-awa', sender_id: 'u-awa', kind: 'question', body: 'Merci ! Pour l’exercice de classement, est-ce normal de ne pas savoir dans quelle colonne mettre certaines inquiétudes ?', created_at: daysFrom(-1), read_at: null },
    { id: id(), enrolment_id: 'e-koffi', sender_id: 'u-koffi', kind: 'pratique', body: 'Bonjour, je préfère être appelé après 17 h si possible.', created_at: daysFrom(-2), read_at: null });
  t.appointments.push({ id: id(), enrolment_id: 'e-koffi', session_number: 1, starts_at: daysFrom(-5, 17), duration_minutes: 15, mode: 'telephone', status: 'effectue', participant_note: '', confirmed_at: daysFrom(-6) },
    { id: id(), enrolment_id: 'e-koffi', session_number: 2, starts_at: daysFrom(2, 17), duration_minutes: 15, mode: 'telephone', status: 'demande', participant_note: 'Après 17 h', confirmed_at: null });
  t.step_progress.push(...steps.filter(s => s.week_id === 'w1').map(s => ({ enrolment_id: 'e-koffi', step_id: s.id, user_id: 'u-koffi', status: 'completed', completed_at: daysFrom(-4) })));
  t.week_completions.push({ enrolment_id: 'e-koffi', week_number: 1, user_id: 'u-koffi', completed_at: daysFrom(-4) });
  t.coach_notes.push({ id: id(), enrolment_id: 'e-awa', coach_id: COACH.id, occurred_at: daysFrom(-3), exchange_type: 'message', topic: 'Bilan de la semaine 2 (exemple fictif)',
    needs: '', tools: 'Noter ses inquiétudes le soir', observations: 'A complété les semaines 1 et 2.', actions: 'Essayer le plan de résolution sur un seul problème.',
    next_step: 'Relire le bilan de la semaine 3.', next_contact_at: daysFrom(4), body: '', archived_at: null, version: 1, created_at: daysFrom(-3), updated_at: daysFrom(-3) });
  t.staff_tasks.push({ id: id(), owner_id: COACH.id, title: 'Vérifier le paiement de la prochaine demande', due_at: daysFrom(1), enrolment_id: null, request_id: 'r-demo1', done_at: null, created_at: daysFrom(-1) });
  t.resource_suggestions.push({ id: id(), enrolment_id: 'e-awa', coach_id: COACH.id, kind: 'article', ref: 'sommeil-sortir-de-la-bataille-contre-la-nuit', title: 'Sommeil : sortir de la bataille contre la nuit', note: 'Peut vous aider pour les inquiétudes du soir.', adequacy_reviewed: true, created_at: daysFrom(-2) });
  return t;
}

export function createLocalBackend() {
  let T; try { T = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!T || !T.programmes) T = seed();
  let uid = null; try { uid = localStorage.getItem(KEY + '-user'); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); if (uid) localStorage.setItem(KEY + '-user', uid); else localStorage.removeItem(KEY + '-user'); } catch (e) {} };
  const me = () => T.profiles.find(p => p.id === uid);
  let curEid = null;
  const myEnrolment = () => T.enrolments.find(e => e.id === curEid && e.user_id === uid) || T.enrolments.find(e => e.user_id === uid);
  const eid = () => myEnrolment()?.id;
  const log = (action, enrolment_id, details = {}) => T.access_log.unshift({ id: T.access_log.length + 1, actor_id: uid, actor_role: me()?.role, action, enrolment_id, details, created_at: now() });
  const name = (u) => T.profiles.find(p => p.id === u)?.first_name || '';
  const supportOpen = (e) => (e.plan === 'ecrit' && T.feature_flags.written_support) || (e.plan === 'appels' && T.feature_flags.support_calls);
  const kindAllowed = (e, k) => k === 'pratique' || e.plan === 'ecrit';
  const canQ = (e) => T.feature_flags.questionnaires && e.plan !== 'autonome' && e.questionnaires_enabled && T.programmes.find(p => p.id === e.programme_id)?.questionnaires_enabled;
  const deny = (m = 'Action non autorisée') => { throw new Error(m); };
  const coachOf = (e) => e && e.coach_id === uid;
  const isAdmin = () => me()?.role === 'admin';
  const isTeam = () => ['admin', 'coach'].includes(me()?.role);
  const requireTeam = () => { if (!isTeam()) deny(); };
  const pcode = (u) => 'LS-' + String(u).replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
  const prog = (e) => T.programmes.find(p => p.id === e.programme_id);
  const stepsOf = (pid) => { const ws = T.programme_weeks.filter(w => w.programme_id === pid).map(w => w.id); return T.programme_steps.filter(s => ws.includes(s.week_id)); };
  const stateOf = (e) => e.status === 'cancelled' ? 'archive' : (e.suspended || T.profiles.find(p => p.id === e.user_id)?.account_status === 'suspended') ? 'suspendu'
    : (e.status === 'completed' || (e.access_expires_at && e.access_expires_at <= now()) || T.week_completions.filter(c => c.enrolment_id === e.id).length >= 6) ? 'termine'
    : (e.admission_status !== 'admis' || !['paye', 'offert'].includes(e.payment_status)) ? 'en_attente' : 'actif';
  const replyDue = (e) => { if (e.plan !== 'ecrit') return null; const ms = T.messages.filter(m => m.enrolment_id === e.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (!ms.length || ms[0].sender_id !== e.user_id) return null; const h = T.coach_profiles.find(c => c.user_id === e.coach_id)?.response_hours || 48;
    return new Date(new Date(ms[0].created_at).getTime() + h * 36e5).toISOString(); };
  const scope = () => T.enrolments.filter(e => isAdmin() || e.coach_id === uid);
  const mine = () => T.enrolments.filter(e => e.coach_id === uid);
  const pendingBilans = () => T.shared_summaries.filter(s => { const e = T.enrolments.find(x => x.id === s.enrolment_id); return e && coachOf(e) && e.plan === 'ecrit'
    && !T.messages.some(m => m.enrolment_id === s.enrolment_id && m.sender_id === uid && m.kind === 'suivi' && m.created_at > s.shared_at); });
  const within = (t) => { const a = T.coach_profiles.find(c => c.user_id === uid)?.availability; if (!a?.days) return true;
    const d = new Date(new Date(t).getTime()); const dow = d.getUTCDay() || 7; const hm = d.toISOString().slice(11, 16); const end = new Date(d.getTime() + 15 * 6e4).toISOString().slice(11, 16);
    return a.days.includes(dow) && hm >= (a.start || '00:00') && end <= (a.end || '23:59'); };
  const fullName = (u) => { const p = T.profiles.find(x => x.id === u); return { first_name: p?.first_name || '', last_name: p?.last_name || '' }; };
  const done = (x) => { persist(); return x; };

  return {
    mode: 'local',
    personas: PERSONAS,
    async init() { return uid ? { id: uid, email: me()?.email } : null; },
    async user() { return uid ? { id: uid, email: me()?.email } : null; },
    async demoLogin(personaId) { uid = personaId; persist(); },
    async resetDemo() { T = seed(); uid = null; persist(); },
    async signIn() { deny('Mode démonstration : choisissez un compte de test.'); },
    async signOut() { uid = null; persist(); },
    async resetPassword() {}, async updatePassword() { const p = me(); if (p) { p.must_set_password = false; persist(); } },

    async content(staff) {
      return {
        articles: T.articles.filter(a => staff || a.etat === 'publie').sort((a, b) => a.sort_order - b.sort_order).map(a => ({ uuid: a.id, id: a.slug, slug: a.slug, title: a.title, cat: a.category,
          excerpt: a.excerpt, sections: a.sections || [], body: [a.excerpt], retenir: a.retenir || '', refs: a.references_list || [], related: a.related || [], read: a.read_minutes, hue: a.cover_hue,
          etat: a.etat, featured: a.featured, featured_order: a.featured_order, order: a.sort_order, sensitive: a.sensitive, review_required: a.professional_review_required,
          review_done: a.professional_review_done, image_url: a.image_url, image_alt: a.image_alt, updated_at: a.updated_at })),
        programmes: T.programmes.filter(p => staff || ['demo', 'published'].includes(p.status)).sort((a, b) => a.sort_order - b.sort_order).map(p => ({ uuid: p.id, slug: p.slug, code: p.code,
          title: p.title, summary: p.summary, intro: p.intro, objectives: p.objectives, status: p.status, hue: p.cover_hue, measures: p.measures, questionnaires_enabled: p.questionnaires_enabled,
          sort: p.sort_order, category: p.category || '', public_intro: p.public_intro || '', public_goal: p.public_goal || '', benefits: p.benefits || [], format: p.format || '',
          library_categories: p.library_categories || [], open: p.open_for_requests !== false })),
        videos: [],
        plans: PLANS.map(p => ({ id: p.id, name: p.name, short: p.short, price: parseInt(p.price.replace(/\D/g, '')), lines: p.lines, featured: !!p.featured })),
        flags: { ...T.feature_flags },
      };
    },
    async weeks(programmeId) {
      const role = me()?.role;
      const allowed = role === 'admin' || role === 'editor' || role === 'coach' || T.enrolments.some(e => e.user_id === uid && e.programme_id === programmeId && validEnrolment(e) && me()?.account_status !== 'suspended');
      if (!allowed) return [];
      return T.programme_weeks.filter(w => w.programme_id === programmeId).sort((a, b) => a.week_number - b.week_number).map(w => ({
        uuid: w.id, n: w.week_number, title: w.title, intro: w.intro || '',
        steps: T.programme_steps.filter(s => s.week_id === w.id).sort((a, b) => a.position - b.position)
          .map(s => ({ uuid: s.id, key: s.step_key, kind: s.kind, title: s.title, required: s.required, position: s.position, content: s.content })) }));
    },

    async participant(pref) {
      const profile = me();
      const enrolments = T.enrolments.filter(x => x.user_id === uid);
      const e = enrolments.find(x => x.id === pref) || enrolments.find(validEnrolment) || enrolments[0] || null;
      curEid = e?.id || null;
      const by = (t) => e ? T[t].filter(r => r.enrolment_id === e.id) : [];
      return { profile, enrolments, enrolment: e || null, progress: by('step_progress'), completions: by('week_completions'), responses: by('exercise_responses'),
        journal: T.journal_entries.filter(j => j.user_id === uid).sort((a, b) => b.created_at.localeCompare(a.created_at)),
        goals: by('goals'), ratings: by('self_ratings'), summaries: by('shared_summaries'), saved: T.saved_items.filter(s => s.user_id === uid),
        messages: by('messages').sort((a, b) => a.created_at.localeCompare(b.created_at)), appointments: by('appointments').sort((a, b) => a.session_number - b.session_number),
        suggestions: by('resource_suggestions'), questionnaires: by('questionnaire_responses'),
        coach: e?.coach_id ? T.coach_profiles.find(c => c.user_id === e.coach_id) || null : null };
    },
    async setProgress(step_id, status) {
      const r = T.step_progress.find(p => p.enrolment_id === eid() && p.step_id === step_id);
      if (r) { r.status = status; if (status === 'completed') r.completed_at = now(); }
      else T.step_progress.push({ enrolment_id: eid(), step_id, user_id: uid, status, started_at: now(), completed_at: status === 'completed' ? now() : null });
      persist();
    },
    async completeWeek(n) { if (!T.week_completions.some(c => c.enrolment_id === eid() && c.week_number === n)) T.week_completions.push({ enrolment_id: eid(), week_number: n, user_id: uid, completed_at: now() }); persist(); },
    async saveResponse(step_id, data) {
      const r = T.exercise_responses.find(p => p.enrolment_id === eid() && p.step_id === step_id);
      if (r) { r.data = data; r.updated_at = now(); } else T.exercise_responses.push({ enrolment_id: eid(), step_id, user_id: uid, data, updated_at: now() });
      persist();
    },
    async patchEnrolment(patch) {
      const allowed = ['suitability_completed_at', 'consent_version', 'consented_at', 'share_summaries', 'share_goals', 'last_step_id', 'unlock_all'];
      Object.keys(patch).forEach(k => { if (!allowed.includes(k)) deny(); });
      Object.assign(myEnrolment(), patch); persist();
    },
    async journalSave(e) {
      if (e.id) { const j = T.journal_entries.find(x => x.id === e.id && x.user_id === uid); Object.assign(j, { body: e.body, prompt: e.prompt, week_number: e.week_number, updated_at: now() }); return done(j); }
      const j = { id: id(), user_id: uid, enrolment_id: eid(), week_number: e.week_number, prompt: e.prompt, body: e.body, created_at: now(), updated_at: now() };
      T.journal_entries.unshift(j); return done(j);
    },
    async journalDelete(jid) { T.journal_entries = T.journal_entries.filter(j => !(j.id === jid && j.user_id === uid)); persist(); },
    async goalSave(g) {
      if (g.id) { const x = T.goals.find(y => y.id === g.id && y.user_id === uid); Object.assign(x, g, { updated_at: now() }); return done(x); }
      const x = { ...g, id: id(), user_id: uid, enrolment_id: eid(), created_at: now(), updated_at: now() }; T.goals.push(x); return done(x);
    },
    async ratingSave(week_number, measure_key, value) {
      let r = T.self_ratings.find(x => x.enrolment_id === eid() && x.week_number === week_number && x.measure_key === measure_key);
      if (r) r.value = value; else { r = { id: id(), user_id: uid, enrolment_id: eid(), week_number, measure_key, value, created_at: now() }; T.self_ratings.push(r); }
      return done(r);
    },
    async summaryShare(week_number, body) {
      let r = T.shared_summaries.find(x => x.enrolment_id === eid() && x.week_number === week_number);
      if (r) Object.assign(r, { body, shared_at: now() }); else { r = { id: id(), enrolment_id: eid(), user_id: uid, week_number, body, shared_at: now() }; T.shared_summaries.push(r); }
      return done(r);
    },
    async summaryUnshare(week_number) { T.shared_summaries = T.shared_summaries.filter(x => !(x.enrolment_id === eid() && x.week_number === week_number)); persist(); },
    async toggleSaved(kind, ref, on) {
      T.saved_items = T.saved_items.filter(s => !(s.user_id === uid && s.kind === kind && s.ref === ref));
      if (on) T.saved_items.push({ user_id: uid, kind, ref, created_at: now() }); persist();
    },
    async sendMessage(kind, body) {
      const e = myEnrolment(); if (!e || !supportOpen(e) || !kindAllowed(e, kind)) deny('Ce type de message n’est pas prévu par votre forfait.');
      T.messages.push({ id: id(), enrolment_id: e.id, sender_id: uid, kind, body, created_at: now(), read_at: null }); persist();
      return T.messages.filter(m => m.enrolment_id === e.id);
    },
    async markMessagesRead() { T.messages.forEach(m => { if (m.enrolment_id === eid() && m.sender_id !== uid && !m.read_at) m.read_at = now(); }); persist(); },
    async requestAppointment(session_number, starts_at, mode, participant_note) {
      const e = myEnrolment(); if (e.plan !== 'appels' || !supportOpen(e)) deny();
      if (T.appointments.some(a => a.enrolment_id === e.id && a.session_number === session_number)) deny('Cet échange est déjà planifié.');
      const a = { id: id(), enrolment_id: e.id, session_number, starts_at, duration_minutes: 15, mode, status: 'demande', participant_note, confirmed_at: null, created_at: now() };
      T.appointments.push(a); return done(a);
    },
    async cancelAppointment(aid) { const a = T.appointments.find(x => x.id === aid && x.enrolment_id === eid()); a.status = 'annule'; persist(); },
    async profileUpdate(patch) { Object.assign(me(), patch); persist(); },
    async privacyRequest(type, details = '') { T.privacy_requests.unshift({ id: id(), user_id: uid, type, details, status: 'open', created_at: now() }); persist(); },
    async eraseData() {
      ['exercise_responses', 'step_progress', 'week_completions', 'journal_entries', 'goals', 'self_ratings', 'shared_summaries', 'saved_items'].forEach(t => { T[t] = T[t].filter(r => r.user_id !== uid); });
      const e = myEnrolment(); if (e) Object.assign(e, { unlock_all: false, last_step_id: null, share_summaries: false, share_goals: false }); persist();
    },
    async exportData() {
      const e = myEnrolment(), mine = (t) => T[t].filter(r => r.user_id === uid);
      return { profil: me(), inscriptions: e ? [e] : [], journal: mine('journal_entries'), exercices: mine('exercise_responses'), objectifs: mine('goals'),
        autoevaluations: mine('self_ratings'), bilans_partages: mine('shared_summaries'), messages: T.messages.filter(m => m.enrolment_id === e?.id),
        rendez_vous: T.appointments.filter(a => a.enrolment_id === e?.id), exporte_le: now() };
    },
    async submitContact(m) { T.contact_messages.unshift({ id: id(), ...m, handled: false, created_at: now() }); persist(); },

    // ---------- Espace accompagnante ----------
    async coachProfile() { return T.coach_profiles.find(c => c.user_id === uid) || null; },
    async coachParticipants() {
      log('coach_list_participants', null); persist();
      return T.enrolments.filter(e => e.coach_id === uid && e.plan !== 'autonome').map(e => ({
        enrolment_id: e.id, first_name: name(e.user_id), programme_id: e.programme_id, programme: T.programmes.find(p => p.id === e.programme_id)?.title, plan: e.plan, status: e.status,
        current_week: Math.min(6, T.week_completions.filter(c => c.enrolment_id === e.id).length + 1),
        unread: T.messages.filter(m => m.enrolment_id === e.id && m.sender_id === e.user_id && !m.read_at).length,
        next_appointment: T.appointments.filter(a => a.enrolment_id === e.id && ['demande', 'confirme'].includes(a.status) && a.starts_at > now()).map(a => a.starts_at).sort()[0] || null,
        open_referrals: T.referrals.filter(r => r.enrolment_id === e.id && r.status === 'ouverte').length, needs_attention: 0,
        share_summaries: e.share_summaries, share_goals: e.share_goals, created_at: e.created_at }));
    },
    async coachParticipant(eId) {
      const e = T.enrolments.find(x => x.id === eId); if (!coachOf(e)) deny();
      log('coach_view_participant', eId);
      T.messages.forEach(m => { if (m.enrolment_id === eId && m.sender_id === e.user_id && !m.read_at) m.read_at = now(); });
      persist();
      const by = (t) => T[t].filter(r => r.enrolment_id === eId);
      return {
        enrolment: { id: e.id, plan: e.plan, status: e.status, created_at: e.created_at, share_summaries: e.share_summaries, share_goals: e.share_goals, first_name: name(e.user_id),
          programme: T.programmes.find(p => p.id === e.programme_id)?.title, weeks_completed: by('week_completions').map(c => c.week_number).sort() },
        messages: by('messages').sort((a, b) => a.created_at.localeCompare(b.created_at)).map(m => ({ id: m.id, kind: m.kind, body: m.body, created_at: m.created_at, from_participant: m.sender_id === e.user_id, read_at: m.read_at })),
        appointments: by('appointments').sort((a, b) => a.session_number - b.session_number),
        summaries: e.share_summaries ? by('shared_summaries').sort((a, b) => a.week_number - b.week_number) : [],
        goals: e.share_goals ? by('goals').filter(g => g.status !== 'archive') : [],
        questionnaires: canQ(e) ? by('questionnaire_responses') : null,
        notes: by('coach_notes').filter(n => n.coach_id === uid).sort((a, b) => b.created_at.localeCompare(a.created_at)),
        referrals: by('referrals').sort((a, b) => b.created_at.localeCompare(a.created_at)),
        suggestions: by('resource_suggestions'),
        history: T.access_log.filter(l => l.enrolment_id === eId && l.actor_id === uid).slice(0, 50),
      };
    },
    async coachCalendar() {
      log('coach_view_calendar', null); persist();
      return T.appointments.filter(a => coachOf(T.enrolments.find(e => e.id === a.enrolment_id))).map(a => ({ ...a, first_name: name(T.enrolments.find(e => e.id === a.enrolment_id).user_id) }))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    },
    async coachSend(eId, kind, body) {
      const e = T.enrolments.find(x => x.id === eId); if (!coachOf(e) || !supportOpen(e) || !kindAllowed(e, kind)) deny('Ce type de message n’est pas prévu par ce forfait.');
      const m = { id: id(), enrolment_id: eId, sender_id: uid, kind, body, created_at: now(), read_at: null }; T.messages.push(m); log('messages_insert', eId, { id: m.id }); persist();
    },
    async coachNote(eId, body) { if (!coachOf(T.enrolments.find(x => x.id === eId))) deny(); const n = { id: id(), enrolment_id: eId, coach_id: uid, body, created_at: now() }; T.coach_notes.push(n); log('coach_notes_insert', eId, { id: n.id }); persist(); },
    async coachReferral(eId, category, description, action_taken) { if (!coachOf(T.enrolments.find(x => x.id === eId))) deny(); const r = { id: id(), enrolment_id: eId, coach_id: uid, category, description, action_taken, status: 'ouverte', created_at: now() }; T.referrals.push(r); log('referrals_insert', eId, { id: r.id }); persist(); },
    async coachCloseReferral(rid, action_taken) { const r = T.referrals.find(x => x.id === rid && x.coach_id === uid); Object.assign(r, { status: 'cloturee', action_taken, closed_at: now() }); log('referrals_update', r.enrolment_id, { id: rid }); persist(); },
    async coachSuggest(eId, kind, ref, title, note) { if (!coachOf(T.enrolments.find(x => x.id === eId))) deny(); T.resource_suggestions.push({ id: id(), enrolment_id: eId, coach_id: uid, kind, ref, title, note, adequacy_reviewed: true, created_at: now() }); log('resource_suggestions_insert', eId); persist(); },
    async coachAppointment(aid, status, start) {
      const a = T.appointments.find(x => x.id === aid); if (!coachOf(T.enrolments.find(e => e.id === a?.enrolment_id))) deny();
      a.status = status; if (start) a.starts_at = start; if (status === 'confirme') { a.confirmed_at = now(); a.reminder_at = new Date(new Date(a.starts_at) - 864e5).toISOString(); }
      log('coach_appointment_' + status, a.enrolment_id, { appointment: aid }); persist();
    },
    async coachReviewQuestionnaire() { deny('Questionnaires désactivés.'); },

    // ---------- Espace accompagnante (v4) ----------
    async staffDashboard() {
      requireTeam(); log('staff_dashboard', null); persist();
      const sc = scope().map(e => ({ ...e, st: stateOf(e) })), act = sc.filter(e => e.st === 'actif'), soon = new Date(Date.now() + 14 * 864e5).toISOString();
      const byProg = {}; act.forEach(e => { const t = prog(e)?.title; byProg[t] = (byProg[t] || 0) + 1; });
      return { scope: isAdmin() ? 'all' : 'mine', active: act.length, pending_access: sc.filter(e => e.st === 'en_attente').length,
        requests_new: isAdmin() ? T.enrolment_requests.filter(r => r.status === 'nouvelle').length : null,
        requests_to_review: isAdmin() ? T.enrolment_requests.filter(r => ['nouvelle', 'en_cours', 'infos_demandees', 'acceptee'].includes(r.status)).length : null,
        by_programme: Object.entries(byProg).map(([programme, n]) => ({ programme, n })),
        by_plan: { autonome: act.filter(e => e.plan === 'autonome').length, ecrit: act.filter(e => e.plan === 'ecrit').length, appels: act.filter(e => e.plan === 'appels').length },
        p2_pending: mine().filter(replyDue).length, p2_overdue: mine().filter(e => replyDue(e) && replyDue(e) < now()).length,
        p3_upcoming: T.appointments.filter(a => coachOf(T.enrolments.find(e => e.id === a.enrolment_id)) && ['demande', 'confirme', 'reporte'].includes(a.status) && a.starts_at > now()).length,
        p3_to_confirm: T.appointments.filter(a => coachOf(T.enrolments.find(e => e.id === a.enrolment_id)) && a.status === 'demande' && a.starts_at > now()).length,
        bilans_to_prepare: pendingBilans().length,
        notes_follow_up: T.coach_notes.filter(n => n.coach_id === uid && !n.archived_at && n.next_contact_at && Math.abs(new Date(n.next_contact_at) - Date.now()) < 7 * 864e5).length,
        ending_soon: act.filter(e => e.access_expires_at && e.access_expires_at > now() && e.access_expires_at < soon).length,
        tasks_due: T.staff_tasks.filter(t => t.owner_id === uid && !t.done_at && (!t.due_at || t.due_at <= new Date(Date.now() + 864e5).toISOString())).length,
        open_referrals: T.referrals.filter(r => coachOf(T.enrolments.find(e => e.id === r.enrolment_id)) && r.status === 'ouverte').length,
        security: { role: me()?.role, aal: 'aal1', mfa_enrolled: false, mfa_required: false, session_ok: true, demo: true } };
    },
    async staffParticipants() {
      requireTeam(); log('staff_list_participants', null); persist();
      return scope().map(e => { const p = prog(e), all = stepsOf(e.programme_id).map(s => s.id);
        return { enrolment_id: e.id, user_id: e.user_id, participant_code: pcode(e.user_id), ...fullName(e.user_id), programme_id: e.programme_id, programme: p?.title, plan: e.plan,
          starts_at: e.access_starts_at || e.created_at, ends_at: e.access_expires_at, current_week: Math.min(6, T.week_completions.filter(c => c.enrolment_id === e.id).length + 1),
          steps_done: T.step_progress.filter(x => x.enrolment_id === e.id && x.status === 'completed' && all.includes(x.step_id)).length, steps_total: all.length, state: stateOf(e),
          next_appointment: (coachOf(e) || isAdmin()) ? T.appointments.filter(a => a.enrolment_id === e.id && ['demande', 'confirme', 'reporte'].includes(a.status) && a.starts_at > now()).map(a => a.starts_at).sort()[0] || null : null,
          coached_by_me: coachOf(e), coach_name: T.coach_profiles.find(c => c.user_id === e.coach_id)?.display_name || null,
          unread: coachOf(e) ? T.messages.filter(m => m.enrolment_id === e.id && m.sender_id === e.user_id && !m.read_at).length : null, reply_due: coachOf(e) ? replyDue(e) : null }; })
        .sort((a, b) => a.first_name.localeCompare(b.first_name));
    },
    async staffParticipant(eId) {
      requireTeam(); const e = T.enrolments.find(x => x.id === eId); if (!e || !(isAdmin() || coachOf(e))) deny();
      log('staff_view_participant', eId);
      const p = prog(e), pr = T.profiles.find(x => x.id === e.user_id), req = T.enrolment_requests.filter(r => r.enrolment_id === eId || (r.user_id === e.user_id && !r.enrolment_id)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const done = T.step_progress.filter(x => x.enrolment_id === eId && x.status === 'completed').map(x => x.step_id);
      const res = {
        info: { enrolment_id: e.id, user_id: e.user_id, participant_code: pcode(e.user_id), first_name: pr?.first_name, last_name: pr?.last_name, email: pr?.email, phone: req?.phone || null,
          programme: p?.title, programme_id: p?.id, plan: e.plan, state: stateOf(e), status: e.status, payment_status: e.payment_status, admission_status: e.admission_status,
          suspended: e.suspended, account_status: pr?.account_status, must_set_password: pr?.must_set_password, last_sign_in_at: isAdmin() ? daysFrom(-1) : null,
          created_at: e.created_at, starts_at: e.access_starts_at || e.created_at, access_starts_at: e.access_starts_at || null, ends_at: e.access_expires_at, coach_id: e.coach_id,
          coach_name: T.coach_profiles.find(c => c.user_id === e.coach_id)?.display_name || null, questionnaires_enabled: e.questionnaires_enabled,
          share_summaries: e.share_summaries, share_goals: e.share_goals, coached_by_me: coachOf(e), can_admin: isAdmin() },
        evaluation: req ? { request_id: req.id, created_at: req.created_at, status: req.status, answers: req.evaluation || {}, message: req.message, review_result: req.review_result || null,
          decision_note: req.decision_note || null, reviewed_at: req.reviewed_at || null } : null,
        progress: { weeks_completed: T.week_completions.filter(c => c.enrolment_id === eId).map(c => c.week_number).sort(),
          weeks: T.programme_weeks.filter(w => w.programme_id === e.programme_id).sort((a, b) => a.week_number - b.week_number).map(w => { const ss = T.programme_steps.filter(s => s.week_id === w.id);
            return { n: w.week_number, title: w.title, done: ss.filter(s => done.includes(s.id)).length, total: ss.length, exercises_done: ss.filter(s => done.includes(s.id) && ['exercice', 'bilan'].includes(s.kind)).length }; }),
          last_activity: T.step_progress.filter(x => x.enrolment_id === eId).map(x => x.completed_at || x.started_at).filter(Boolean).sort().slice(-1)[0] || null,
          goals: e.share_goals ? T.goals.filter(g => g.enrolment_id === eId && g.status !== 'archive').map(g => ({ scope: g.scope, week_number: g.week_number, title: g.title, status: g.status })) : null,
          ratings: e.share_summaries ? T.self_ratings.filter(r => r.enrolment_id === eId).sort((a, b) => a.week_number - b.week_number).map(r => ({ week: r.week_number, key: r.measure_key, value: r.value })) : null },
        tasks: T.staff_tasks.filter(t => t.owner_id === uid && t.enrolment_id === eId),
      };
      if (coachOf(e)) {
        res.coach = await this.coachParticipant(eId);
        res.notes = T.coach_notes.filter(n => n.enrolment_id === eId && n.coach_id === uid).sort((a, b) => (b.occurred_at || b.created_at).localeCompare(a.occurred_at || a.created_at))
          .map(n => ({ ...n, versions: T.coach_note_versions.filter(v => v.note_id === n.id).length }));
        res.reply_due = replyDue(e);
        res.calls = { done: T.appointments.filter(a => a.enrolment_id === eId && a.status === 'effectue').length, planned: T.appointments.filter(a => a.enrolment_id === eId && ['demande', 'confirme', 'reporte'].includes(a.status)).length };
      }
      persist(); return res;
    },
    async staffAgenda() {
      requireTeam(); log('staff_view_agenda', null); persist();
      const who = (eId) => fullName(T.enrolments.find(x => x.id === eId)?.user_id);
      return {
        availability: (() => { const c = T.coach_profiles.find(x => x.user_id === uid); return c ? { availability: c.availability || {}, hours: c.hours, response_hours: c.response_hours || 48, response_delay: c.response_delay } : null; })(),
        calls: T.appointments.filter(a => coachOf(T.enrolments.find(e => e.id === a.enrolment_id)) && a.starts_at > new Date(Date.now() - 7 * 864e5).toISOString())
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)).map(a => ({ ...a, ...who(a.enrolment_id) })),
        p2_messages: mine().filter(replyDue).map(e => ({ enrolment_id: e.id, ...who(e.id), due_at: replyDue(e) })).sort((a, b) => a.due_at.localeCompare(b.due_at)),
        p2_bilans: pendingBilans().map(s => ({ enrolment_id: s.enrolment_id, ...who(s.enrolment_id), week_number: s.week_number, shared_at: s.shared_at })),
        follow_ups: T.coach_notes.filter(n => n.coach_id === uid && !n.archived_at && n.next_contact_at && n.next_contact_at > new Date(Date.now() - 14 * 864e5).toISOString())
          .map(n => ({ enrolment_id: n.enrolment_id, ...who(n.enrolment_id), next_contact_at: n.next_contact_at, next_step: n.next_step })).sort((a, b) => a.next_contact_at.localeCompare(b.next_contact_at)),
        requests: isAdmin() ? T.enrolment_requests.filter(r => ['nouvelle', 'en_cours', 'infos_demandees', 'acceptee'].includes(r.status)) : null,
        ending_soon: scope().filter(e => stateOf(e) === 'actif' && e.access_expires_at && e.access_expires_at < new Date(Date.now() + 21 * 864e5).toISOString())
          .map(e => ({ enrolment_id: e.id, ...who(e.id), ends_at: e.access_expires_at })),
        admin_follow_ups: isAdmin() ? scope().filter(e => stateOf(e) === 'en_attente').map(e => ({ enrolment_id: e.id, ...who(e.id), reason: !['paye', 'offert'].includes(e.payment_status) ? 'paiement' : 'admission' })) : null,
        tasks: T.staff_tasks.filter(t => t.owner_id === uid && (!t.done_at || t.done_at > new Date(Date.now() - 14 * 864e5).toISOString())).map(t => ({ ...t, ...(t.enrolment_id ? who(t.enrolment_id) : {}) })),
      };
    },
    async exportNotes(eId, reason) {
      const e = T.enrolments.find(x => x.id === eId); if (!(coachOf(e) || (isAdmin() && (reason || '').length >= 10))) deny('Export non autorisé (motif d’au moins 10 caractères requis pour l’administration).');
      log('staff_export_notes', eId, { reason }); persist();
      return { exported_at: now(), reason, notes: T.coach_notes.filter(n => n.enrolment_id === eId).map(n => ({ ...n, versions: T.coach_note_versions.filter(v => v.note_id === n.id) })) };
    },
    async scheduleAppointment(eId, n, startsAt, mode) {
      const e = T.enrolments.find(x => x.id === eId); if (!coachOf(e)) deny(); if (e.plan !== 'appels') deny('Les rendez-vous concernent uniquement le forfait 3.');
      if (startsAt <= now()) deny('Choisissez une date à venir.'); if (!within(startsAt)) deny('Ce créneau est en dehors de vos disponibilités.');
      let a = T.appointments.find(x => x.enrolment_id === eId && x.session_number === n);
      if (a && ['effectue', 'manque'].includes(a.status)) deny('Cet échange a déjà eu lieu.');
      const st = a && ['confirme', 'reporte'].includes(a.status) && a.starts_at !== startsAt ? 'reporte' : 'confirme';
      if (!a) { a = { id: id(), enrolment_id: eId, session_number: n, duration_minutes: 15, participant_note: '', created_at: now() }; T.appointments.push(a); }
      Object.assign(a, { starts_at: startsAt, mode, status: st, confirmed_at: now(), reminder_at: new Date(new Date(startsAt) - 864e5).toISOString() });
      log('coach_appointment_' + st, eId, { appointment: a.id, session: n }); persist(); return a.id;
    },
    async setAvailability(av, hrs, hoursText, delayText) {
      requireTeam(); let c = T.coach_profiles.find(x => x.user_id === uid);
      if (!c) { c = { user_id: uid, display_name: me()?.first_name || 'Accompagnante', public_title: 'Accompagnante en bien-être psychologique', bio: '', verified: false, limits: '', active: true }; T.coach_profiles.push(c); }
      Object.assign(c, { availability: av || {}, response_hours: hrs, hours: hoursText || '', response_delay: delayText || '' }); log('coach_set_availability', null); persist();
    },
    async noteSave(eId, n) {
      const e = T.enrolments.find(x => x.id === eId); if (!coachOf(e)) deny();
      const fields = { occurred_at: n.occurred_at || now(), exchange_type: n.exchange_type, topic: n.topic, needs: n.needs, tools: n.tools, observations: n.observations, actions: n.actions, next_step: n.next_step, next_contact_at: n.next_contact_at || null };
      if (n.id) { const old = T.coach_notes.find(x => x.id === n.id && x.coach_id === uid); if (!old) deny();
        const { id: _i, enrolment_id: _e, coach_id: _c, ...snap } = old; T.coach_note_versions.push({ id: id(), note_id: old.id, version: old.version || 1, snapshot: snap, edited_by: uid, edited_at: now() });
        Object.assign(old, fields, { version: (old.version || 1) + 1, updated_at: now() }); log('coach_notes_update', eId, { id: old.id }); }
      else { const x = { id: id(), enrolment_id: eId, coach_id: uid, body: '', ...fields, archived_at: null, version: 1, created_at: now(), updated_at: now() }; T.coach_notes.push(x); log('coach_notes_insert', eId, { id: x.id }); }
      persist();
    },
    async noteArchive(nid, archived) { const n = T.coach_notes.find(x => x.id === nid && x.coach_id === uid); if (!n) deny();
      const { id: _i, enrolment_id: _e, coach_id: _c, ...snap } = n; T.coach_note_versions.push({ id: id(), note_id: n.id, version: n.version || 1, snapshot: snap, edited_by: uid, edited_at: now() });
      n.archived_at = archived ? now() : null; n.version = (n.version || 1) + 1; log('coach_notes_update', n.enrolment_id, { id: nid }); persist(); },
    async noteVersions(nid) { const n = T.coach_notes.find(x => x.id === nid && x.coach_id === uid); if (!n) return []; return T.coach_note_versions.filter(v => v.note_id === nid).sort((a, b) => b.version - a.version); },
    async taskSave(t) { requireTeam();
      if (t.enrolment_id && !(isAdmin() || coachOf(T.enrolments.find(e => e.id === t.enrolment_id)))) deny();
      if (t.id) Object.assign(T.staff_tasks.find(x => x.id === t.id && x.owner_id === uid), { title: t.title, due_at: t.due_at || null });
      else T.staff_tasks.push({ id: id(), owner_id: uid, title: t.title, due_at: t.due_at || null, enrolment_id: t.enrolment_id || null, request_id: t.request_id || null, done_at: null, created_at: now() });
      persist(); },
    async taskDone(tid, done) { const t = T.staff_tasks.find(x => x.id === tid && x.owner_id === uid); if (t) { t.done_at = done ? now() : null; persist(); } },
    async security() { return { role: me()?.role, aal: 'aal1', mfa_enrolled: false, mfa_required: false, session_ok: true, demo: true }; },
    async aal() { return { currentLevel: 'aal1', nextLevel: 'aal1' }; },
    async mfaFactors() { return []; },
    async mfaEnroll() { deny('Dans la maquette, la double authentification n’est pas simulée : elle fonctionne sur le site relié à Supabase.'); },
    async mfaVerify() { deny('Non disponible dans la maquette.'); },
    async mfaUnenroll() { deny('Non disponible dans la maquette.'); },
    async requireMfa() { deny('Non disponible dans la maquette.'); },

    // ---------- Administration ----------
    async overview() {
      return { members: T.profiles.filter(p => p.role === 'member').length, coaches: T.profiles.filter(p => p.role === 'coach').length, enrolments: T.enrolments.length,
        published_articles: T.articles.filter(a => a.etat === 'publie').length, open_privacy_requests: T.privacy_requests.filter(r => r.status !== 'done').length,
        unread_contact: T.contact_messages.filter(c => !c.handled).length, open_referrals: T.referrals.filter(r => r.status === 'ouverte').length };
    },
    async stats() { const total = T.enrolments.length; return [1, 2, 3, 4, 5, 6].map(n => ({ week_number: n, completed: total < 5 ? null : T.week_completions.filter(c => c.week_number === n).length, enrolled: total })); },
    async enrolments() {
      return T.enrolments.map(e => ({ enrolment_id: e.id, first_name: name(e.user_id), programme: T.programmes.find(p => p.id === e.programme_id)?.title, plan: e.plan, status: e.status,
        coach_id: e.coach_id, coach_name: T.coach_profiles.find(c => c.user_id === e.coach_id)?.display_name || null, questionnaires_enabled: e.questionnaires_enabled,
        weeks_completed: T.week_completions.filter(c => c.enrolment_id === e.id).length, created_at: e.created_at }));
    },
    async updateEnrolment(eId, plan, coach, qn) {
      const e = T.enrolments.find(x => x.id === eId); Object.assign(e, { plan, coach_id: plan === 'autonome' ? null : coach || null, questionnaires_enabled: plan === 'autonome' ? false : !!qn });
      log('admin_update_enrolment', eId, { plan, coach, questionnaires: qn }); persist();
    },
    async team() { return T.profiles.filter(p => p.role !== 'member').map(p => ({ id: p.id, first_name: p.first_name, email: p.email, role: p.role, created_at: p.created_at })); },
    async setRole(email, role) { const p = T.profiles.find(x => x.email?.toLowerCase() === email.toLowerCase()); if (!p) deny('Aucun compte avec cet e-mail'); p.role = role; log('admin_set_role', null, { user: p.id, role }); persist(); },
    async setFlag(k, v) { T.feature_flags[k] = v; log('admin_set_flag', null, { flag: k, enabled: v }); persist(); },
    async privacyList() { return T.privacy_requests; },
    async resolvePrivacy(rid) { Object.assign(T.privacy_requests.find(r => r.id === rid), { status: 'done', resolved_at: now() }); persist(); },
    async contactList() { return T.contact_messages; },
    async markContact(cid) { T.contact_messages.find(c => c.id === cid).handled = true; persist(); },
    async accessLog() { return T.access_log.slice(0, 200); },
    async referralsAll() { return T.referrals; },
    async saveArticle(slug, d) {
      if (d.etat === 'publie' && d.review_required && !d.review_done) deny('Cet article doit être relu par un professionnel qualifié avant publication.');
      const row = { title: d.title, category: d.cat, excerpt: d.excerpt, sections: d.sections, retenir: d.retenir, references_list: d.refs, related: d.related, read_minutes: d.read,
        etat: d.etat, featured: d.featured, featured_order: d.featured_order || null, sort_order: d.order || 0, sensitive: d.sensitive, professional_review_required: d.review_required,
        professional_review_done: d.review_done, image_url: d.image_url || null, image_alt: d.image_alt || null, updated_at: now() };
      if (slug === 'new') T.articles.push({ id: 'a-' + id().slice(0, 6), slug: d.slug, cover_hue: d.hue, ...row });
      else { const a = T.articles.find(x => x.slug === slug); T.article_versions.unshift({ id: id(), article_id: a.id, created_at: now(), snapshot: { ...a } }); Object.assign(a, row); }
      persist();
    },
    async articleVersions(uuid) { return T.article_versions.filter(v => v.article_id === uuid).slice(0, 20); },
    async submitRequest(r) { T.enrolment_requests.unshift({ id: id(), ...r, status: 'nouvelle', created_at: now() }); persist(); },
    async requests() { return T.enrolment_requests; },
    async updateRequest(rid, patch) { Object.assign(T.enrolment_requests.find(r => r.id === rid), patch, { updated_at: now() }); persist(); },
    async participants() {
      return T.enrolments.map(e => { const p = T.profiles.find(x => x.id === e.user_id) || {}; const pr = T.programmes.find(x => x.id === e.programme_id) || {};
        return { enrolment_id: e.id, user_id: e.user_id, first_name: p.first_name, last_name: p.last_name || '', email: p.email, programme_id: pr.id, programme: pr.title, plan: e.plan,
          status: e.status, payment_status: e.payment_status, admission_status: e.admission_status, access_starts_at: e.access_starts_at || null, access_expires_at: e.access_expires_at || null,
          suspended: !!e.suspended, account_status: p.account_status || 'active', must_set_password: !!p.must_set_password, last_sign_in_at: p.must_set_password ? null : daysFrom(-1),
          coach_id: e.coach_id, coach_name: T.coach_profiles.find(c => c.user_id === e.coach_id)?.display_name || null, questionnaires_enabled: e.questionnaires_enabled,
          weeks_completed: T.week_completions.filter(c => c.enrolment_id === e.id).length, created_at: e.created_at }; });
    },
    async createParticipant(d) {
      if (T.profiles.some(p => p.email?.toLowerCase() === d.email.toLowerCase())) deny('Un compte existe déjà avec cet e-mail.');
      const u = 'u-' + id().slice(0, 8);
      T.profiles.push({ id: u, first_name: d.first_name, last_name: d.last_name, email: d.email, role: 'member', account_status: 'active', must_set_password: true, created_at: now() });
      const e = { id: 'e-' + id().slice(0, 8), user_id: u, programme_id: d.programme_id, plan: d.plan, status: 'active', payment_status: d.payment_status, admission_status: d.admission_status,
        access_starts_at: d.access_starts_at || null, access_expires_at: d.access_expires_at || null, suspended: false, coach_id: d.plan === 'autonome' ? null : d.coach_id || null,
        share_summaries: false, share_goals: false, questionnaires_enabled: false, created_at: now() };
      T.enrolments.push(e);
      if (d.admin_note) T.participant_admin_notes.unshift({ id: id(), user_id: u, body: d.admin_note, created_at: now() });
      log(d.send_now ? 'admin_create_participant_and_invite' : 'admin_create_participant', e.id, { user: u }); persist();
      return { ok: true, user_id: u, enrolment_id: e.id, invited: !!d.send_now };
    },
    async sendAccess(userId) { const p = T.profiles.find(x => x.id === userId); p.must_set_password = true; log('admin_send_access', null, { user: userId }); persist(); return { ok: true, method: 'invite' }; },
    async setAccountStatus(userId, status) { T.profiles.find(x => x.id === userId).account_status = status; log('admin_account_' + status, null, { user: userId }); persist(); },
    async saveEnrolment(r) {
      const e = T.enrolments.find(x => x.id === r.enrolment_id);
      Object.assign(e, { plan: r.plan, coach_id: r.plan === 'autonome' ? null : r.coach_id || null, questionnaires_enabled: r.plan === 'autonome' ? false : !!r.questionnaires_enabled,
        status: r.status, payment_status: r.payment_status, admission_status: r.admission_status, access_starts_at: r.access_starts_at || null, access_expires_at: r.access_expires_at || null, suspended: !!r.suspended });
      log('admin_save_enrolment', e.id, { plan: r.plan }); persist();
    },
    async addEnrolment(userId, d) {
      const e = { id: 'e-' + id().slice(0, 8), user_id: userId, programme_id: d.programme_id, plan: d.plan, status: 'active', payment_status: d.payment_status, admission_status: d.admission_status,
        access_starts_at: d.access_starts_at || null, access_expires_at: d.access_expires_at || null, suspended: false, coach_id: d.plan === 'autonome' ? null : d.coach_id || null, created_at: now() };
      T.enrolments.push(e); log('admin_add_enrolment', e.id, { user: userId }); persist(); return e.id;
    },
    async adminNotes(userId) { return T.participant_admin_notes.filter(n => n.user_id === userId); },
    async addAdminNote(userId, body) { T.participant_admin_notes.unshift({ id: id(), user_id: userId, body, created_at: now() }); persist(); },
    async saveProgramme(p) {
      const row = { title: p.title, summary: p.summary, intro: p.intro, objectives: p.objectives, status: p.status, code: p.code, questionnaires_enabled: !!p.questionnaires_enabled, measures: p.measures, cover_hue: p.hue,
        category: p.category, public_intro: p.public_intro, public_goal: p.public_goal, benefits: p.benefits, format: p.format, library_categories: p.library_categories, open_for_requests: p.open !== false };
      if (p.uuid) Object.assign(T.programmes.find(x => x.id === p.uuid), row);
      else { const pid = 'p-' + id().slice(0, 8); T.programmes.push({ id: pid, slug: p.slug, sort_order: T.programmes.length + 1, ...row });
        [1, 2, 3, 4, 5, 6].forEach(n => T.programme_weeks.push({ id: `${pid}-w${n}`, programme_id: pid, week_number: n, title: `Semaine ${n}`, intro: '' })); p.uuid = pid; }
      persist(); return p;
    },
    async saveWeek(w) { Object.assign(T.programme_weeks.find(x => x.id === w.uuid), { title: w.title, intro: w.intro }); persist(); },
    async saveStep(weekUuid, s) {
      if (s.uuid) Object.assign(T.programme_steps.find(x => x.id === s.uuid), { kind: s.kind, title: s.title, required: s.required, content: s.content, position: s.position });
      else T.programme_steps.push({ id: `${weekUuid}-${s.key}`, week_id: weekUuid, step_key: s.key, position: s.position, kind: s.kind, title: s.title, required: s.required, content: s.content });
      persist();
    },
    async deleteStep(sid) { T.programme_steps = T.programme_steps.filter(s => s.id !== sid); persist(); },
    async reorderSteps(steps) { steps.forEach((s, i) => { const x = T.programme_steps.find(y => y.id === s.uuid); if (x) x.position = i; }); persist(); },
    async uploadMedia(file) { return URL.createObjectURL(file); },
    async coachProfiles() { return T.coach_profiles; },
    async saveCoachProfile(cp) { const x = T.coach_profiles.find(c => c.user_id === cp.user_id); if (x) Object.assign(x, cp); else T.coach_profiles.push(cp); persist(); },
  };
}
