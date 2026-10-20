// Mode démonstration : aucune base de données. Les données fictives vivent dans ce navigateur
// (localStorage). Les règles de sécurité réelles sont dans Postgres ; ici, seule la logique
// fonctionnelle est reproduite pour pouvoir explorer la maquette.
import { ARTICLES, VIDEOS, PLANS, PROGRAMME_01, COACH } from '../content.js';

const KEY = 'leseuil-demo-v3';
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
  const prog = { id: 'p-01', slug: PROGRAMME_01.slug, code: PROGRAMME_01.code, title: PROGRAMME_01.title, summary: PROGRAMME_01.summary, intro: txt(PROGRAMME_01.intro),
    objectives: PROGRAMME_01.objectives, status: 'demo', cover_hue: 'sage', sort_order: 1, questionnaires_enabled: false, measures: PROGRAMME_01.measures };
  const weeks = [], steps = [];
  PROGRAMME_01.weeks.forEach(w => {
    const wid = `w${w.n}`; weeks.push({ id: wid, programme_id: prog.id, week_number: w.n, title: w.title, intro: txt(w.intro) });
    w.steps.forEach((s, i) => { const { id: key, kind, title, required, ...content } = s;
      steps.push({ id: `${wid}-${key}`, week_id: wid, step_key: key, position: i, kind, title, required: required ?? kind !== 'video', content }); });
  });
  const t = {
    profiles: PERSONAS.map(p => ({ id: p.id, first_name: p.first_name, email: p.email, role: p.role, newsletter_opt_in: false, analytics_opt_in: false, reminders_opt_in: false, created_at: daysFrom(-30) })),
    coach_profiles: [{ user_id: COACH.id, display_name: COACH.name, public_title: COACH.title, bio: COACH.bio, verified: COACH.verified, hours: COACH.hours,
      response_delay: COACH.delay, limits: COACH.limits.join('\n'), active: true }],
    feature_flags: { payments: false, written_support: true, support_calls: true, questionnaires: false, public_signup: true },
    programmes: [prog], programme_weeks: weeks, programme_steps: steps,
    articles: ARTICLES.map(a => ({ id: a.id, slug: a.id, title: a.title, category: a.cat, excerpt: a.excerpt, body: a.body, read_minutes: a.read, cover_hue: a.hue, topic_slug: a.topic, status: 'published', published_at: a.date })),
    enrolments: [
      { id: 'e-awa', user_id: 'u-awa', programme_id: prog.id, plan: 'ecrit', status: 'demo', coach_id: COACH.id, suitability_completed_at: daysFrom(-14), consented_at: daysFrom(-14), share_summaries: true, share_goals: true, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-14) },
      { id: 'e-koffi', user_id: 'u-koffi', programme_id: prog.id, plan: 'appels', status: 'demo', coach_id: COACH.id, suitability_completed_at: daysFrom(-7), consented_at: daysFrom(-7), share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-7) },
      { id: 'e-mariam', user_id: 'u-mariam', programme_id: prog.id, plan: 'autonome', status: 'demo', coach_id: null, suitability_completed_at: null, consented_at: null, share_summaries: false, share_goals: false, questionnaires_enabled: false, last_step_id: null, unlock_all: false, created_at: daysFrom(-1) },
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
  t.resource_suggestions.push({ id: id(), enrolment_id: 'e-awa', coach_id: COACH.id, kind: 'article', ref: 'dormir-tete', title: 'Dormir quand la tête ne s’arrête pas', note: 'Peut vous aider pour les inquiétudes du soir.', adequacy_reviewed: true, created_at: daysFrom(-2) });
  return t;
}

export function createLocalBackend() {
  let T; try { T = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!T || !T.programmes) T = seed();
  let uid = null; try { uid = localStorage.getItem(KEY + '-user'); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(T)); if (uid) localStorage.setItem(KEY + '-user', uid); else localStorage.removeItem(KEY + '-user'); } catch (e) {} };
  const me = () => T.profiles.find(p => p.id === uid);
  const myEnrolment = () => T.enrolments.find(e => e.user_id === uid);
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
    async signUp(first_name, email) {
      const u = 'u-' + id().slice(0, 8);
      T.profiles.push({ id: u, first_name, email, role: 'member', created_at: now() }); uid = u; persist(); return { needsConfirmation: false };
    },
    async signOut() { uid = null; persist(); },
    async resetPassword() {}, async updatePassword() {},

    async content(staff) {
      return {
        articles: T.articles.filter(a => staff || a.status === 'published').map(a => ({ uuid: a.id, id: a.slug, title: a.title, cat: a.category, excerpt: a.excerpt, body: a.body,
          read: a.read_minutes, date: a.published_at || a.created_at, hue: a.cover_hue, topic: a.topic_slug, status: a.status })),
        programmes: T.programmes.filter(p => staff || ['demo', 'published'].includes(p.status)).map(p => ({ uuid: p.id, slug: p.slug, code: p.code, title: p.title, summary: p.summary, intro: p.intro,
          objectives: p.objectives, status: p.status, hue: p.cover_hue, measures: p.measures, questionnaires_enabled: p.questionnaires_enabled, sort: p.sort_order })),
        videos: VIDEOS.map(v => ({ ...v })),
        plans: PLANS.map(p => ({ id: p.id, name: p.name, short: p.short, price: parseInt(p.price.replace(/\D/g, '')), lines: p.lines, featured: !!p.featured })),
        flags: { ...T.feature_flags },
      };
    },
    async weeks(programmeId) {
      const withSteps = !!uid;
      return T.programme_weeks.filter(w => w.programme_id === programmeId).sort((a, b) => a.week_number - b.week_number).map(w => ({
        uuid: w.id, n: w.week_number, title: w.title, intro: w.intro || '',
        steps: withSteps ? T.programme_steps.filter(s => s.week_id === w.id).sort((a, b) => a.position - b.position)
          .map(s => ({ uuid: s.id, key: s.step_key, kind: s.kind, title: s.title, required: s.required, position: s.position, content: s.content })) : [] }));
    },

    async participant(programmeId) {
      const profile = me();
      let e = myEnrolment();
      if (!e && profile.role === 'member') { e = { id: 'e-' + id().slice(0, 8), user_id: uid, programme_id: programmeId, plan: 'autonome', status: 'demo', coach_id: null, share_summaries: false, share_goals: false, questionnaires_enabled: false, unlock_all: false, created_at: now() }; T.enrolments.push(e); persist(); }
      const by = (t) => e ? T[t].filter(r => r.enrolment_id === e.id) : [];
      return { profile, enrolment: e || null, progress: by('step_progress'), completions: by('week_completions'), responses: by('exercise_responses'),
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
        published_articles: T.articles.filter(a => a.status === 'published').length, open_privacy_requests: T.privacy_requests.filter(r => r.status !== 'done').length,
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
      if (slug === 'new') T.articles.unshift({ id: d.slug, slug: d.slug, title: d.title, category: d.cat, excerpt: d.excerpt, body: d.body, read_minutes: d.read, cover_hue: d.hue, status: d.status, published_at: d.status === 'published' ? now() : null });
      else { const a = T.articles.find(x => x.slug === slug); Object.assign(a, { title: d.title, category: d.cat, excerpt: d.excerpt, body: d.body, read_minutes: d.read, status: d.status });
        if (d.status === 'published' && !a.published_at) a.published_at = now(); }
      persist();
    },
    async saveProgramme(p) {
      const row = { title: p.title, summary: p.summary, intro: p.intro, objectives: p.objectives, status: p.status, code: p.code, questionnaires_enabled: !!p.questionnaires_enabled, measures: p.measures, cover_hue: p.hue };
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
