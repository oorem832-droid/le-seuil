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

const KEY = 'leseuil-demo-v5';
const now = () => new Date().toISOString();
const id = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const daysFrom = (d, h = 10) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };

export const PERSONAS = [
  { id: 'u-awa', first_name: 'Awa', email: 'awa.test@leseuil.ci', role: 'member', label: 'Awa · forfait 2, accompagnement écrit' },
  { id: 'u-koffi', first_name: 'Koffi', email: 'koffi.test@leseuil.ci', role: 'member', label: 'Koffi · forfait 3, appels' },
  { id: 'u-mariam', first_name: 'Mariam', email: 'mariam.test@leseuil.ci', role: 'member', label: 'Mariam · forfait 1, autonome' },
  { id: COACH.id, first_name: 'Judie', email: 'judie.test@leseuil.ci', role: 'coach', label: 'Judie Ore · Espace accompagnante' },
  { id: 'u-admin', first_name: 'Administration', email: 'admin.test@leseuil.ci', role: 'admin', label: 'Administration' },
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
      response_delay: COACH.delay, limits: COACH.limits.join('\n'), active: true }],
    feature_flags: { payments: false, written_support: true, support_calls: true, questionnaires: false, public_signup: false },
    programmes: progs, programme_weeks: weeks, programme_steps: steps,
    articles: LIBRARY.map(a => ({ id: a.id, slug: a.slug, title: a.title, category: a.category, excerpt: a.chapeau, sections: a.sections, retenir: a.retenir,
      references_list: LIBRARY_REFERENCES, related: LIBRARY.filter(x => x.category === a.category && x.id !== a.id).slice(0, 3).map(x => x.slug),
      read_minutes: Math.max(1, Math.ceil(a.words / 200)), cover_hue: ['sage','forest','gold'][a.n % 3], etat: a.professional_review ? 'a_relire' : 'publie',
      featured: a.featured, featured_order: a.featured_order, sort_order: a.order, sensitive: a.sensitive, professional_review_required: a.professional_review,
      professional_review_done: false, updated_at: daysFrom(-2) })),
    article_versions: [], enrolment_requests: [
      { id: 'r-demo1', programme_slug: 'inquietudes', plan: 'ecrit', first_name: 'Fatou', last_name: 'Exemple', email: 'fatou.exemple@exemple.ci', phone: '', message: 'Demande fictive de démonstration.', is_adult: true, consent: true, status: 'nouvelle', created_at: daysFrom(-1) }],
    participant_admin_notes: [],
    enrolments: [
      { id: 'e-awa', user_id: 'u-awa', programme_id: prog.id, plan: 'ecrit', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: COACH.id, suitability_completed_at: daysFrom(-14), consented_at: daysFrom(-14), share_summaries: true, share_goals: true, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-14) },
      { id: 'e-awa2', user_id: 'u-awa', programme_id: 'p-peurs', plan: 'autonome', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: null, suitability_completed_at: daysFrom(-2), consented_at: daysFrom(-2), share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-2) },
      { id: 'e-koffi', user_id: 'u-koffi', programme_id: prog.id, plan: 'appels', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: COACH.id, suitability_completed_at: daysFrom(-7), consented_at: daysFrom(-7), share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-7) },
      { id: 'e-mariam', user_id: 'u-mariam', programme_id: prog.id, plan: 'autonome', status: 'active', admission_status: 'admis', payment_status: 'offert', suspended: false, access_expires_at: daysFrom(60), coach_id: null, suitability_completed_at: null, consented_at: null, share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-1) },
    ],
    step_progress: [], week_completions: [], exercise_responses: [], journal_entries: [], goals: [], self_ratings: [], shared_summaries: [], saved_items: [],
    messages: [], appointments: [], coach_notes: [], referrals: [], resource_suggestions: [], questionnaire_responses: [], access_log: [],
    contact_messages: [], privacy_requests: [],
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
