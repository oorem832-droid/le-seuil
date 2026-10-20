// Accès Supabase. Toutes les règles de sécurité sont appliquées côté base (RLS) ;
// ce fichier ne fait que traduire les appels.
import { createClient } from '@supabase/supabase-js';

export function createSupabaseBackend(url, key) {
  const sb = createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } });
  const ok = (r) => { if (r.error) throw r.error; return r.data; };
  let uid = null, eid = null;
  const base = () => location.origin + location.pathname;

  const mapStep = (s) => ({ uuid: s.id, key: s.step_key, kind: s.kind, title: s.title, required: s.required, position: s.position, content: s.content || {} });
  const mapWeek = (w) => ({ uuid: w.id, n: w.week_number, title: w.title, intro: w.intro || '',
    steps: (w.programme_steps || []).sort((a, b) => a.position - b.position).map(mapStep) });
  const mapProg = (p) => ({ uuid: p.id, slug: p.slug, code: p.code, title: p.title, summary: p.summary, intro: p.intro, objectives: p.objectives || [],
    status: p.status, hue: p.cover_hue, measures: p.measures || [], questionnaires_enabled: p.questionnaires_enabled, sort: p.sort_order });

  return {
    mode: 'supabase',
    sb,
    // ---------- Auth ----------
    async init(onEvent) {
      const { data: { session } } = await sb.auth.getSession();
      uid = session?.user?.id || null;
      if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash);
      sb.auth.onAuthStateChange((event, sess) => {
        const next = sess?.user?.id || null;
        if (event === 'PASSWORD_RECOVERY') onEvent('recovery');
        else if (next !== uid) { uid = next; eid = null; onEvent(next ? 'signin' : 'signout'); }
      });
      return session?.user || null;
    },
    async user() { const { data } = await sb.auth.getUser(); return data.user; },
    async signIn(email, password) { const r = await sb.auth.signInWithPassword({ email, password }); if (r.error) throw r.error; uid = r.data.user.id; },
    async signUp(first_name, email, password) {
      const r = await sb.auth.signUp({ email, password, options: { emailRedirectTo: base() + '#espace', data: { first_name, is_adult: true } } });
      if (r.error) throw r.error; if (r.data.session) uid = r.data.user.id; return { needsConfirmation: !r.data.session };
    },
    async signOut() { await sb.auth.signOut(); uid = null; eid = null; },
    async resetPassword(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: base() + '#nouveau-mot-de-passe' })); },
    async updatePassword(password) { ok(await sb.auth.updateUser({ password })); },

    // ---------- Contenus ----------
    async content(staff) {
      const [arts, progs, vids, plans, flags] = await Promise.all([
        sb.from('articles').select('*').order('published_at', { ascending: false, nullsFirst: true }),
        sb.from('programmes').select('*').order('sort_order'),
        sb.from('videos').select('*').order('sort_order'),
        sb.from('plans').select('*').order('sort_order'),
        sb.from('feature_flags').select('key, enabled'),
      ]);
      return {
        articles: ok(arts).filter(a => staff || a.status === 'published').map(a => ({ uuid: a.id, id: a.slug, title: a.title, cat: a.category, excerpt: a.excerpt,
          body: a.body || [], read: a.read_minutes, date: a.published_at || a.created_at, hue: a.cover_hue, topic: a.topic_slug, status: a.status })),
        programmes: ok(progs).map(mapProg),
        videos: ok(vids).map(v => ({ uuid: v.id, title: v.title, who: [v.speaker, v.credentials].filter(Boolean).join(' · '), len: v.duration_label, desc: v.description, url: v.video_url, transcript: v.transcript })),
        plans: ok(plans).map(p => ({ id: p.tier, name: p.name, short: p.short_name, price: p.price_fcfa, lines: p.features, featured: p.tier === 'ecrit' })),
        flags: Object.fromEntries(ok(flags).map(f => [f.key, f.enabled])),
      };
    },
    async weeks(programmeId) {
      const data = ok(await sb.from('programme_weeks').select('id, week_number, title, intro, programme_steps(*)').eq('programme_id', programmeId).order('week_number'));
      return data.map(mapWeek);
    },

    // ---------- Participant ----------
    async participant(programmeId) {
      const profile = ok(await sb.from('profiles').select('*').eq('id', uid).single());
      let enrolment = null;
      if (profile.role === 'member' || profile.role === 'admin' || profile.role === 'editor') {
        enrolment = ok(await sb.from('enrolments').select('*').eq('user_id', uid).eq('programme_id', programmeId).maybeSingle());
        if (!enrolment && profile.role === 'member') enrolment = ok(await sb.from('enrolments').insert({ user_id: uid, programme_id: programmeId }).select().single());
      }
      eid = enrolment?.id || null;
      const out = { profile, enrolment, progress: [], completions: [], responses: [], journal: [], goals: [], ratings: [], summaries: [], saved: [],
        messages: [], appointments: [], suggestions: [], coach: null, questionnaires: [] };
      const [saved, journal] = await Promise.all([sb.from('saved_items').select('*'), sb.from('journal_entries').select('*').order('created_at', { ascending: false })]);
      out.saved = ok(saved); out.journal = ok(journal);
      if (!eid) return out;
      const q = (t) => sb.from(t).select('*').eq('enrolment_id', eid);
      const res = await Promise.all([q('step_progress'), q('week_completions'), q('exercise_responses'), q('goals').order('created_at'),
        q('self_ratings').order('week_number'), q('shared_summaries'), q('messages').order('created_at'), q('appointments').order('session_number'),
        q('resource_suggestions').order('created_at', { ascending: false }), q('questionnaire_responses').order('created_at')]);
      [out.progress, out.completions, out.responses, out.goals, out.ratings, out.summaries, out.messages, out.appointments, out.suggestions, out.questionnaires] = res.map(ok);
      if (enrolment.coach_id) out.coach = ok(await sb.from('coach_profiles').select('*').eq('user_id', enrolment.coach_id).maybeSingle());
      return out;
    },
    async setProgress(step_id, status) {
      const row = { enrolment_id: eid, step_id, user_id: uid, status };
      if (status === 'completed') row.completed_at = new Date().toISOString();
      ok(await sb.from('step_progress').upsert(row));
    },
    async completeWeek(week_number) { ok(await sb.from('week_completions').upsert({ enrolment_id: eid, week_number, user_id: uid })); },
    async saveResponse(step_id, data) { ok(await sb.from('exercise_responses').upsert({ enrolment_id: eid, step_id, user_id: uid, data, updated_at: new Date().toISOString() })); },
    async patchEnrolment(patch) { ok(await sb.from('enrolments').update(patch).eq('id', eid)); },
    async journalSave(e) {
      if (e.id) return ok(await sb.from('journal_entries').update({ body: e.body, prompt: e.prompt, week_number: e.week_number }).eq('id', e.id).select().single());
      return ok(await sb.from('journal_entries').insert({ user_id: uid, enrolment_id: eid, week_number: e.week_number, prompt: e.prompt, body: e.body }).select().single());
    },
    async journalDelete(id) { ok(await sb.from('journal_entries').delete().eq('id', id)); },
    async goalSave(g) {
      const row = { scope: g.scope, week_number: g.week_number, title: g.title, actions: g.actions, obstacles: g.obstacles, reflection: g.reflection, status: g.status, previous_id: g.previous_id || null };
      if (g.id) return ok(await sb.from('goals').update(row).eq('id', g.id).select().single());
      return ok(await sb.from('goals').insert({ ...row, user_id: uid, enrolment_id: eid }).select().single());
    },
    async ratingSave(week_number, measure_key, value) {
      return ok(await sb.from('self_ratings').upsert({ user_id: uid, enrolment_id: eid, week_number, measure_key, value }, { onConflict: 'enrolment_id,week_number,measure_key' }).select().single());
    },
    async summaryShare(week_number, body) { return ok(await sb.from('shared_summaries').upsert({ enrolment_id: eid, user_id: uid, week_number, body, shared_at: new Date().toISOString() }, { onConflict: 'enrolment_id,week_number' }).select().single()); },
    async summaryUnshare(week_number) { ok(await sb.from('shared_summaries').delete().eq('enrolment_id', eid).eq('week_number', week_number)); },
    async toggleSaved(kind, ref, on) {
      if (on) ok(await sb.from('saved_items').upsert({ user_id: uid, kind, ref }));
      else ok(await sb.from('saved_items').delete().match({ user_id: uid, kind, ref }));
    },
    async sendMessage(kind, body) { ok(await sb.from('messages').insert({ enrolment_id: eid, sender_id: uid, kind, body })); return (await sb.from('messages').select('*').eq('enrolment_id', eid).order('created_at')).data; },
    async markMessagesRead() { await sb.from('messages').update({ read_at: new Date().toISOString() }).eq('enrolment_id', eid).neq('sender_id', uid).is('read_at', null); },
    async requestAppointment(session_number, starts_at, mode, participant_note) {
      return ok(await sb.from('appointments').insert({ enrolment_id: eid, session_number, starts_at, mode, participant_note }).select().single());
    },
    async cancelAppointment(id) { ok(await sb.from('appointments').update({ status: 'annule' }).eq('id', id)); },
    async profileUpdate(patch) { ok(await sb.from('profiles').update(patch).eq('id', uid)); },
    async privacyRequest(type, details = '') { ok(await sb.from('privacy_requests').insert({ user_id: uid, type, details })); },
    async eraseData() { ok(await sb.rpc('erase_my_programme_data')); },
    async exportData() { return ok(await sb.rpc('export_my_data')); },
    async submitContact(m) { ok(await sb.from('contact_messages').insert(m)); },

    // ---------- Espace accompagnante ----------
    async coachProfile() { return ok(await sb.from('coach_profiles').select('*').eq('user_id', uid).maybeSingle()); },
    async coachParticipants() { return ok(await sb.rpc('coach_participants')); },
    async coachParticipant(id) { return ok(await sb.rpc('coach_participant', { eid: id })); },
    async coachCalendar() { return ok(await sb.rpc('coach_calendar')); },
    async coachSend(id, kind, body) { ok(await sb.from('messages').insert({ enrolment_id: id, sender_id: uid, kind, body })); },
    async coachNote(id, body) { ok(await sb.from('coach_notes').insert({ enrolment_id: id, coach_id: uid, body })); },
    async coachReferral(id, category, description, action_taken) { ok(await sb.from('referrals').insert({ enrolment_id: id, coach_id: uid, category, description, action_taken })); },
    async coachCloseReferral(id, action_taken) { ok(await sb.from('referrals').update({ status: 'cloturee', action_taken, closed_at: new Date().toISOString() }).eq('id', id)); },
    async coachSuggest(id, kind, ref, title, note) { ok(await sb.from('resource_suggestions').insert({ enrolment_id: id, coach_id: uid, kind, ref, title, note, adequacy_reviewed: true })); },
    async coachAppointment(id, status, start) { ok(await sb.rpc('coach_update_appointment', { aid: id, new_status: status, new_start: start || null })); },
    async coachReviewQuestionnaire(id, note) { ok(await sb.rpc('coach_review_questionnaire', { qid: id, note })); },

    // ---------- Administration ----------
    async overview() { return ok(await sb.rpc('admin_overview'))[0] || {}; },
    async stats(slug) { return ok(await sb.rpc('admin_programme_stats', { p_slug: slug })); },
    async enrolments() { return ok(await sb.rpc('admin_enrolments')); },
    async updateEnrolment(id, plan, coach, qn) { ok(await sb.rpc('admin_update_enrolment', { eid: id, new_plan: plan, new_coach: coach || null, new_questionnaires: !!qn })); },
    async team() { return ok(await sb.rpc('admin_team')); },
    async setRole(email, role) { ok(await sb.rpc('set_user_role', { target_email: email, new_role: role })); },
    async setFlag(k, v) { ok(await sb.rpc('admin_set_flag', { k, v })); },
    async privacyList() { return ok(await sb.from('privacy_requests').select('*').order('created_at', { ascending: false })); },
    async resolvePrivacy(id) { ok(await sb.from('privacy_requests').update({ status: 'done', resolved_at: new Date().toISOString() }).eq('id', id)); },
    async contactList() { return ok(await sb.from('contact_messages').select('*').order('created_at', { ascending: false })); },
    async markContact(id) { ok(await sb.from('contact_messages').update({ handled: true }).eq('id', id)); },
    async accessLog() { return ok(await sb.from('access_log').select('*').order('created_at', { ascending: false }).limit(200)); },
    async referralsAll() { return ok(await sb.from('referrals').select('*').order('created_at', { ascending: false })); },
    async saveArticle(slug, d) {
      const row = { title: d.title, category: d.cat, read_minutes: d.read, excerpt: d.excerpt, body: d.body, status: d.status };
      if (d.status === 'published' && !d.wasPublished) row.published_at = new Date().toISOString();
      if (slug === 'new') ok(await sb.from('articles').insert({ ...row, slug: d.slug, author_id: uid, cover_hue: d.hue }));
      else ok(await sb.from('articles').update(row).eq('slug', slug));
    },
    async saveProgramme(p) {
      const row = { title: p.title, summary: p.summary, intro: p.intro, objectives: p.objectives, status: p.status, code: p.code,
        questionnaires_enabled: !!p.questionnaires_enabled, measures: p.measures, cover_hue: p.hue };
      if (p.uuid) return mapProg(ok(await sb.from('programmes').update(row).eq('id', p.uuid).select().single()));
      const created = ok(await sb.from('programmes').insert({ ...row, slug: p.slug }).select().single());
      await sb.from('programme_weeks').insert([1, 2, 3, 4, 5, 6].map(n => ({ programme_id: created.id, week_number: n, title: `Semaine ${n}` })));
      return mapProg(created);
    },
    async saveWeek(w) { ok(await sb.from('programme_weeks').update({ title: w.title, intro: w.intro }).eq('id', w.uuid)); },
    async saveStep(weekUuid, s) {
      const row = { kind: s.kind, title: s.title, required: s.required, content: s.content, position: s.position };
      if (s.uuid) ok(await sb.from('programme_steps').update(row).eq('id', s.uuid));
      else ok(await sb.from('programme_steps').insert({ ...row, week_id: weekUuid, step_key: s.key }));
    },
    async deleteStep(uuid) { ok(await sb.from('programme_steps').delete().eq('id', uuid)); },
    async reorderSteps(steps) { await Promise.all(steps.map((s, i) => sb.from('programme_steps').update({ position: i }).eq('id', s.uuid))); },
    async uploadMedia(file) {
      const path = `${Date.now()}-${file.name.normalize('NFD').replace(/[^\w.-]+/g, '-')}`;
      ok(await sb.storage.from('programme-media').upload(path, file, { upsert: false }));
      return sb.storage.from('programme-media').getPublicUrl(path).data.publicUrl;
    },
    async coachProfiles() { return ok(await sb.from('coach_profiles').select('*')); },
    async saveCoachProfile(cp) {
      const row = { user_id: cp.user_id, display_name: cp.display_name, public_title: cp.public_title, bio: cp.bio, verified: cp.verified,
        verified_at: cp.verified ? (cp.verified_at || new Date().toISOString()) : null, hours: cp.hours, response_delay: cp.response_delay, limits: cp.limits, active: cp.active };
      ok(await sb.from('coach_profiles').upsert(row));
    },
  };
}
