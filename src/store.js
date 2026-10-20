// État de l'application et passerelle vers les données (Supabase ou démonstration locale).
import { createSupabaseBackend } from './data/supabase.js';
import { createLocalBackend } from './data/local.js';

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const api = URL_ && KEY_ ? createSupabaseBackend(URL_, KEY_) : createLocalBackend();
export const DEMO = api.mode === 'local';
export const PROGRAMME_SLUG = 'inquietudes';

export const C = { articles: [], programmes: [], programme: null, weeks: [], videos: [], plans: [], flags: {} };

const fresh = () => ({ user: null, profile: null, enrolment: null, progress: {}, completions: {}, responses: {}, journal: [], goals: [], ratings: [],
  summaries: {}, saved: { article: new Set(), worksheet: new Set() }, messages: [], appointments: [], suggestions: [], coach: null, questionnaires: [], coachProfile: null });
export let S = fresh();

export const isStaff = () => ['admin', 'editor'].includes(S.user?.role);
export const isCoach = () => S.user?.role === 'coach';
export const plan = () => S.enrolment?.plan || 'autonome';
export const supportOpen = () => (plan() === 'ecrit' && C.flags.written_support) || (plan() === 'appels' && C.flags.support_calls);

export async function loadContent() {
  const staff = isStaff();
  const c = await api.content(staff);
  Object.assign(C, c);
  C.programme = C.programmes.find(p => p.slug === PROGRAMME_SLUG) || C.programmes[0] || null;
  C.weeks = C.programme ? await api.weeks(C.programme.uuid) : [];
}

export async function loadUser() {
  const u = await api.user();
  S = fresh();
  if (!u) return;
  const programmeId = C.programme?.uuid;
  const d = await api.participant(programmeId);
  const p = d.profile;
  S.user = { id: u.id, email: u.email || p.email, name: p.first_name || (u.email || '').split('@')[0], role: p.role };
  S.profile = p; S.enrolment = d.enrolment; S.coach = d.coach; S.questionnaires = d.questionnaires || [];
  d.progress.forEach(r => { S.progress[r.step_id] = r.status; });
  d.completions.forEach(r => { S.completions[r.week_number] = true; });
  d.responses.forEach(r => { S.responses[r.step_id] = r.data; });
  S.journal = d.journal; S.goals = d.goals; S.ratings = d.ratings; S.messages = d.messages; S.appointments = d.appointments; S.suggestions = d.suggestions;
  d.summaries.forEach(r => { S.summaries[r.week_number] = r; });
  d.saved.forEach(r => S.saved[r.kind]?.add(r.ref));
  if (S.user.role === 'coach') S.coachProfile = await api.coachProfile();
  if (isStaff() || isCoach()) { await loadContent(); }
}

let listener = () => {};
export function onEvent(fn) { listener = fn; }

export async function boot() {
  await api.init(async (evt) => {
    if (evt === 'recovery') { listener('recovery'); return; }
    await loadContent(); await loadUser(); listener(evt);
  });
  await loadContent();
  await loadUser();
}

export async function demoLogin(id) { await api.demoLogin(id); await loadContent(); await loadUser(); }
export async function signOut() { await api.signOut(); S = fresh(); await loadContent(); }
export async function resetDemo() { await api.resetDemo(); S = fresh(); await loadContent(); }

// ---------- Écritures du participant ----------
export async function setProgress(stepUuid, status) {
  if (S.progress[stepUuid] === 'completed' && status === 'started') return;
  if (S.progress[stepUuid] === status) return;
  S.progress[stepUuid] = status; await api.setProgress(stepUuid, status);
}
export async function setLastStep(stepUuid) {
  if (!S.enrolment || S.enrolment.last_step_id === stepUuid) return;
  S.enrolment.last_step_id = stepUuid; await api.patchEnrolment({ last_step_id: stepUuid });
}
export async function completeWeek(n) { S.completions[n] = true; await api.completeWeek(n); }
const timers = {};
export function saveResponse(stepUuid, data, immediate = false) {
  S.responses[stepUuid] = data;
  clearTimeout(timers[stepUuid]);
  return new Promise((resolve, reject) => {
    const run = () => api.saveResponse(stepUuid, data).then(resolve, reject);
    if (immediate) run(); else timers[stepUuid] = setTimeout(run, 700);
  });
}
export async function patchEnrolment(patch) { Object.assign(S.enrolment, patch); await api.patchEnrolment(patch); }
export async function journalSave(e) {
  const saved = await api.journalSave(e);
  const i = S.journal.findIndex(j => j.id === saved.id);
  if (i >= 0) S.journal[i] = saved; else S.journal.unshift(saved);
  return saved;
}
export async function journalDelete(id) { await api.journalDelete(id); S.journal = S.journal.filter(j => j.id !== id); }
export async function goalSave(g) {
  const saved = await api.goalSave(g);
  const i = S.goals.findIndex(x => x.id === saved.id);
  if (i >= 0) S.goals[i] = saved; else S.goals.push(saved);
  return saved;
}
export async function goalRevise(old, changes) {
  await goalSave({ ...old, status: 'ajuste' });
  return goalSave({ scope: old.scope, week_number: old.week_number, title: changes.title, actions: changes.actions || old.actions.map(a => ({ ...a, done: false })),
    obstacles: changes.obstacles ?? '', reflection: '', status: 'actif', previous_id: old.id });
}
export async function ratingSave(week, key, value) {
  const r = await api.ratingSave(week, key, value);
  const i = S.ratings.findIndex(x => x.week_number === week && x.measure_key === key);
  if (i >= 0) S.ratings[i] = r; else S.ratings.push(r);
}
export async function summaryShare(week, body) { S.summaries[week] = await api.summaryShare(week, body); }
export async function summaryUnshare(week) { await api.summaryUnshare(week); delete S.summaries[week]; }
export async function toggleSaved(kind, ref) {
  const on = !S.saved[kind].has(ref);
  on ? S.saved[kind].add(ref) : S.saved[kind].delete(ref);
  await api.toggleSaved(kind, ref, on);
  return on;
}
export async function sendMessage(kind, body) { S.messages = await api.sendMessage(kind, body); }
export async function markMessagesRead() {
  if (!S.messages.some(m => m.sender_id !== S.user.id && !m.read_at)) return;
  await api.markMessagesRead(); S.messages.forEach(m => { if (m.sender_id !== S.user.id && !m.read_at) m.read_at = new Date().toISOString(); });
}
export async function requestAppointment(n, startsAt, mode, note) { S.appointments.push(await api.requestAppointment(n, startsAt, mode, note)); S.appointments.sort((a, b) => a.session_number - b.session_number); }
export async function cancelAppointment(id) { await api.cancelAppointment(id); const a = S.appointments.find(x => x.id === id); if (a) a.status = 'annule'; }
export async function profileUpdate(patch) { await api.profileUpdate(patch); Object.assign(S.profile, patch); if (patch.first_name) S.user.name = patch.first_name; }
export async function eraseData() {
  await api.eraseData();
  Object.assign(S, { progress: {}, completions: {}, responses: {}, journal: [], goals: [], ratings: [], summaries: {}, saved: { article: new Set(), worksheet: new Set() } });
  if (S.enrolment) Object.assign(S.enrolment, { last_step_id: null, share_summaries: false, share_goals: false, unlock_all: false });
}
