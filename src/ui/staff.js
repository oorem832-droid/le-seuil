// Espace accompagnante — LE SEUIL.
// Pour la fondatrice (administratrice et accompagnante) et les accompagnantes. Chaque consultation passe par
// des fonctions serveur tracées ; les droits sont vérifiés par la base, pas par l'affichage des boutons.
// Les journaux personnels des participants ne sont jamais accessibles ici.
import { esc, icon, fmtDate, fmtShort, fmtTime, toast, $, download } from "./util.js";
import { ui, actions, forms, changes, inputs, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";
import { EVALUATION_QUESTIONS } from "../content.js";
import { requestsPanel, newParticipantForm, adminEnrolmentPanel, setAfterChange } from "./admin2.js";

if (!ui.staff) ui.staff = { f: { q: "", programme: "all", plan: "all", state: "all", week: "all" }, tab: "info", showArchived: false, editNote: null, versions: {}, mfa: null };
const st = ui.staff;
const cache = {};
async function need(key, fn) {
  // Données propres au compte connecté : vidées si l'utilisateur change.
  if (cache._uid !== S.user?.id) { Object.keys(cache).forEach(k => delete cache[k]); cache._uid = S.user?.id; }
  if (cache[key] !== undefined || cache["_l_" + key]) return;
  cache["_l_" + key] = true;
  try { cache[key] = await fn(); } catch (e) { console.error(e); cache[key] = null; toast(e?.message?.includes("authoris") || e?.message?.includes("double") ? "Accès refusé. Vérifiez votre double authentification." : "Chargement impossible."); }
  cache["_l_" + key] = false; rerender();
}
export const dropStaff = (...keys) => { if (!keys.length) Object.keys(cache).forEach(k => delete cache[k]); else keys.forEach(k => Object.keys(cache).filter(x => x === k || x.startsWith(k + ":")).forEach(x => delete cache[x])); };
const loading = `<p class="muted">Chargement…</p>`;
const err = (e) => toast(e?.message || "Action impossible.");

export const PLAN = { autonome: "P1 · Autonome", ecrit: "P2 · Écrit", appels: "P3 · Appels" };
const STATE = { actif: ["Actif", "ok"], en_attente: ["En attente", "warn"], termine: ["Terminé", "mute"], suspendu: ["Suspendu", "warn"], archive: ["Archivé", "mute"] };
const APPT = { demande: "À confirmer", confirme: "Prévu", reporte: "Reporté", effectue: "Effectué", annule: "Annulé", manque: "Manqué" };
const EXCH = { message: "Message écrit", telephone: "Appel téléphonique", video: "Visioconférence", autre: "Autre" };
const REF = { hors_cadre: "Besoin hors du cadre de l’accompagnement", besoin_evaluation: "Besoin d’une évaluation par un professionnel", securite: "Préoccupation pour la sécurité", autre: "Autre" };
const KLAB = { suivi: "Accompagnement écrit", question: "Question", pratique: "Logistique" };
const DAYS = [[1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Jeu"], [5, "Ven"], [6, "Sam"], [7, "Dim"]];
const role = () => S.user?.role;
const isAdmin = () => role() === "admin";
const isTeam = () => ["admin", "coach"].includes(role());
const badge = (state) => { const [l, c] = STATE[state] || [state, ""]; return `<span class="badge ${c}">${l}</span>`; };
const dtLocal = (d) => { const x = d ? new Date(d) : new Date(); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const fromLocal = (v) => v ? new Date(v).toISOString() : null;
const pname = (p) => `${esc(p.first_name || "")} ${esc(p.last_name || "")}`.trim();

/* ---------- Menu privé ---------- */
const MENU = [
  ["accompagnante", "Tableau de bord", "home", () => isTeam()],
  ["accompagnante-demandes", "Demandes et évaluations initiales", "bell", () => isAdmin()],
  ["accompagnante-participants", "Mes participants", "users", () => isTeam()],
  ["accompagnante-messages", "Messages et échanges", "chat", () => isTeam()],
  ["accompagnante-agenda", "Agenda et rendez-vous", "cal", () => isTeam()],
  ["accompagnante-taches", "Mes tâches", "check", () => isTeam()],
  ["accompagnante-programmes", "Gestion des programmes", "path", () => ["admin", "editor"].includes(role())],
  ["admin", "Administration", "shield", () => ["admin", "editor"].includes(role())],
  ["accompagnante-parametres", "Paramètres et sécurité", "lock", () => !!S.user],
];
const ROLE_LABEL = { admin: "Administratrice · accompagnante", coach: "Accompagnante", editor: "Rédaction" };
export function staffShell(inner, active) {
  const mfaWarn = isTeam() && !DEMO && S.security && !S.security.mfa_enrolled && active !== "accompagnante-parametres";
  return `<div class="wrap app staff"><nav class="side" aria-label="Espace accompagnante"><div class="who"><span class="eyebrow">Espace accompagnante</span><div class="who-name">${esc(S.coachProfile?.display_name || S.user.name)}</div><span class="small muted">${ROLE_LABEL[role()] || ""}</span></div>
   ${MENU.filter(m => m[3]()).map(([k, l, i]) => `<button data-go="${k}" ${active === k ? 'aria-current="page"' : ""}>${icon(i)}<span>${l}</span></button>`).join("")}
   <button data-act="logout">${icon("out")}<span>Déconnexion</span></button></nav>
   <div class="stack-lg fade-in" style="min-width:0">
    ${mfaWarn ? `<div class="notice" role="note">${icon("shield")}<span><b>Sécurisez votre compte.</b> Activez la double authentification avant de travailler avec de vrais dossiers. <button class="linkbtn" data-go="accompagnante-parametres">Paramètres et sécurité</button></span></div>` : ""}
    ${inner}
    <p class="small muted">${icon("lock")} Vos consultations et modifications sont enregistrées dans le journal de traçabilité. Les journaux personnels des participants ne sont jamais accessibles.</p></div></div>`;
}
const H = (t, lede = "", extra = "") => `<div class="section-head" style="margin:0"><div class="stack" style="gap:6px"><span class="eyebrow">Espace accompagnante</span><h1 class="h-page">${t}</h1>${lede ? `<p class="muted">${lede}</p>` : ""}</div>${extra}</div>`;

/* ---------- Tableau de bord ---------- */
export function sDash() {
  need("dash", () => api.staffDashboard());
  const d = cache.dash;
  const head = `<div class="stack" style="gap:6px"><span class="eyebrow">Bonjour, ${esc(S.user.name)}</span><h1 class="h-page">Espace accompagnante — LE SEUIL</h1><p class="muted">Suivi des participants et gestion des accompagnements</p></div>`;
  if (!d) return staffShell(head + (d === null ? `<p class="muted">Tableau de bord indisponible.</p>` : loading), "accompagnante");
  const k = (label, value, sub, to) => `<button class="kpi kpi-btn" data-go="${to}"><span class="small muted">${label}</span><b>${value ?? "—"}</b>${sub ? `<span class="small muted">${sub}</span>` : ""}</button>`;
  const max = Math.max(1, ...d.by_programme.map(x => x.n));
  return staffShell(`${head}
   ${DEMO ? `<div class="notice">${icon("info")}<span>Maquette : indicateurs calculés à partir des données fictives de ce navigateur.</span></div>` : ""}
   ${d.scope === "mine" ? `<p class="small muted">Indicateurs calculés sur les participants qui vous sont attribués.</p>` : ""}
   <div class="kpis kpis-wide">
    ${k("Participants actifs", d.active, d.pending_access ? `${d.pending_access} en attente d’accès` : "", "accompagnante-participants")}
    ${d.requests_new !== null && d.requests_new !== undefined ? k("Nouvelles demandes", d.requests_new, d.requests_to_review ? `${d.requests_to_review} à examiner au total` : "", "accompagnante-demandes") : ""}
    ${k("Messages P2 en attente", d.p2_pending, d.p2_overdue ? `${d.p2_overdue} au-delà du délai annoncé` : "", "accompagnante-messages")}
    ${k("Appels P3 à venir", d.p3_upcoming, d.p3_to_confirm ? `${d.p3_to_confirm} à confirmer` : "", "accompagnante-agenda")}
    ${k("Bilans et suivis à préparer", d.bilans_to_prepare + d.notes_follow_up, `${d.bilans_to_prepare} bilan${d.bilans_to_prepare > 1 ? "s" : ""} P2 · ${d.notes_follow_up} suivi${d.notes_follow_up > 1 ? "s" : ""} prévu${d.notes_follow_up > 1 ? "s" : ""}`, "accompagnante-agenda")}
    ${k("Fin de programme sous 14 jours", d.ending_soon, "", "accompagnante-agenda")}
    ${k("Tâches à faire", d.tasks_due, "aujourd’hui ou en retard", "accompagnante-taches")}
   </div>
   <div class="grid g2">
    <section class="card stack"><h2 class="h-sub">Participants actifs par programme</h2>
     ${d.by_programme.length ? `<div class="bars">${d.by_programme.map(x => `<div class="bar-row"><span>${esc(x.programme)}</span><div class="track"><i style="width:${Math.round(x.n / max * 100)}%"></i></div><b class="num">${x.n}</b></div>`).join("")}</div>` : `<p class="muted small">Aucun participant actif.</p>`}</section>
    <section class="card stack"><h2 class="h-sub">Participants actifs par forfait</h2>
     <div class="plan-split">${[["autonome", "P1 · Parcours autonome"], ["ecrit", "P2 · Accompagnement écrit"], ["appels", "P3 · Accompagnement par appel"]].map(([p, l]) => `<div class="plan-chip"><b class="num">${d.by_plan?.[p] ?? 0}</b><span class="small">${l}</span></div>`).join("")}</div>
     ${d.open_referrals ? `<p class="small">${icon("flag")} ${d.open_referrals} orientation${d.open_referrals > 1 ? "s" : ""} ouverte${d.open_referrals > 1 ? "s" : ""} à suivre.</p>` : ""}</section>
   </div>`, "accompagnante");
}

/* ---------- Demandes et évaluations initiales (administration) ---------- */
export function sRequests() {
  return requestsPanel((inner) => staffShell(inner, "accompagnante-demandes"));
}

/* ---------- Mes participants ---------- */
export function sParticipants() {
  need("list", () => api.staffParticipants());
  const L = cache.list || [], f = st.f;
  const progs = [...new Map(L.map(p => [p.programme_id, p.programme])).entries()];
  const q = f.q.trim().toLowerCase();
  const rows = L.filter(p => (!q || `${p.first_name} ${p.last_name} ${p.participant_code}`.toLowerCase().includes(q))
    && (f.programme === "all" || p.programme_id === f.programme) && (f.plan === "all" || p.plan === f.plan)
    && (f.state === "all" || p.state === f.state) && (f.week === "all" || String(p.current_week) === f.week));
  const sel = (id, label, opts, val) => `<label class="small" for="${id}">${label}</label><select id="${id}" class="sel-inline"><option value="all">Tous</option>${opts.map(([v, l]) => `<option value="${esc(v)}" ${val === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  return staffShell(`${H("Mes participants", isAdmin() ? "Tous les participants dont le compte a été créé par l’administration." : "Les participants qui vous sont attribués.",
      isAdmin() && !ui.newParticipant ? `<button class="btn btn-primary" data-act="sp-new">${icon("plus")}Nouveau participant</button>` : "")}
   ${ui.newParticipant && isAdmin() ? newParticipantForm(ui.newParticipant) : ""}
   <label class="search">${icon("search")}<span class="sr">Rechercher un participant</span><input id="sp-q" type="search" placeholder="Rechercher par nom ou identifiant" value="${esc(f.q)}"></label>
   <div class="row filters">
    ${sel("sp-prog", "Programme", progs, f.programme)}
    ${sel("sp-plan", "Forfait", Object.entries(PLAN), f.plan)}
    ${sel("sp-state", "Statut", Object.entries(STATE).map(([k, v]) => [k, v[0]]), f.state)}
    ${sel("sp-week", "Semaine", [1, 2, 3, 4, 5, 6].map(n => [String(n), "Semaine " + n]), f.week)}
   </div>
   <div class="table-wrap"><table class="parts"><thead><tr><th>Participant</th><th>Programme</th><th>Forfait</th><th>Période</th><th class="c">Semaine</th><th>Progression</th><th>Statut</th><th>Prochain échange</th><th></th></tr></thead><tbody>
    ${cache.list === undefined ? `<tr><td colspan="9">${loading}</td></tr>` : rows.map(p => { const pct = p.steps_total ? Math.round(p.steps_done / p.steps_total * 100) : 0;
      return `<tr><td><b>${pname(p)}</b><div class="small muted">${esc(p.participant_code)}${p.coach_name && !p.coached_by_me ? ` · ${esc(p.coach_name)}` : ""}</div></td><td>${esc(p.programme)}</td><td>${PLAN[p.plan]}</td>
       <td class="num nowrap">${fmtShort(p.starts_at)} → ${p.ends_at ? fmtShort(p.ends_at) : "—"}<div class="small muted">début · fin prévue</div></td><td class="c num">${p.current_week} / 6</td>
       <td><div class="mini-bar" role="img" aria-label="${pct} % des leçons terminées"><i style="width:${pct}%"></i></div><span class="small muted">${p.steps_done} / ${p.steps_total}</span></td>
       <td>${badge(p.state)}</td><td class="num">${p.next_appointment ? `${fmtShort(p.next_appointment)} · ${fmtTime(p.next_appointment)}` : "—"}</td>
       <td><button class="btn btn-soft btn-sm" data-act="sp-open" data-id="${p.enrolment_id}">Ouvrir</button></td></tr>`; }).join("") || `<tr><td colspan="9" class="muted">Aucun participant ne correspond à ces filtres.</td></tr>`}
   </tbody></table></div>
   <p class="small muted">${rows.length} inscription${rows.length > 1 ? "s" : ""} affichée${rows.length > 1 ? "s" : ""}. L’accès à un programme ne donne jamais accès aux autres.</p>`, "accompagnante-participants");
}
inputs.push(t => { if (t.id !== "sp-q") return false; st.f.q = t.value; rerender(); return true; });
changes.push(t => { const m = { "sp-prog": "programme", "sp-plan": "plan", "sp-state": "state", "sp-week": "week" }[t.id]; if (!m) return false; st.f[m] = t.value; rerender(); return true; });
actions["sp-open"] = (b) => { st.tab = b.dataset.tab || "info"; st.editNote = null; go(`accompagnante-p-${b.dataset.id}`); };
actions["sp-new"] = () => { ui.newParticipant = {}; rerender(); };
// Après une action d'administration (admin2.js) : rafraîchir les données et ouvrir le bon écran.
setAfterChange((ev) => {
  dropStaff();
  if (ev?.open) go("accompagnante-participants");
  else if (ev?.created) { ui.newParticipant = null; go(ev.created.enrolment_id ? `accompagnante-p-${ev.created.enrolment_id}` : "accompagnante-participants"); }
});

/* ---------- Fiche individuelle ---------- */
export function sParticipant(eid) {
  need("p:" + eid, () => api.staffParticipant(eid));
  const d = cache["p:" + eid];
  const back = `<button class="linkbtn small" data-go="accompagnante-participants" style="align-self:flex-start">${icon("back")} Mes participants</button>`;
  if (!d) return staffShell(back + (d === null ? `<p class="muted">Dossier inaccessible.</p>` : loading), "accompagnante-participants");
  const i = d.info, mine = i.coached_by_me;
  const tabs = [["info", "Informations générales"], ["evaluation", "Évaluation initiale"], ["progression", "Progression"],
    ...(mine ? [["notes", "Notes de suivi"], ["echanges", i.plan === "appels" ? "Rendez-vous et messages" : "Messages et bilans"], ["orientation", "Orientation et ressources"], ["historique", "Historique"]] : [])];
  if (!tabs.some(t => t[0] === st.tab)) st.tab = "info";
  const body = { info: tInfo, evaluation: tEval, progression: tProgress, notes: tNotes, echanges: tExchanges, orientation: tOrientation, historique: tHistory }[st.tab](d);
  return staffShell(`<div class="stack" style="gap:6px">${back}
     <h1 class="h-page">${pname(i)}</h1>
     <p class="muted">${esc(i.participant_code)} · ${esc(i.programme)} · ${PLAN[i.plan]} · ${badge(i.state)}</p></div>
   <div class="row small"><span class="tag ${i.share_summaries ? "" : "mute"}">${i.share_summaries ? "Bilans partagés" : "Bilans non partagés"}</span><span class="tag ${i.share_goals ? "" : "mute"}">${i.share_goals ? "Objectifs partagés" : "Objectifs non partagés"}</span><span class="tag mute">${icon("lock")}Journal privé</span></div>
   ${!mine ? `<div class="notice">${icon("lock")}<span>Notes de suivi, messages et bilans : réservés à l’accompagnante attribuée${i.coach_name ? ` (${esc(i.coach_name)})` : ""}.</span></div>` : ""}
   <div class="tabs" role="tablist" aria-label="Dossier du participant">${tabs.map(([k, l]) => `<button role="tab" data-act="sp-tab" data-v="${k}" aria-selected="${st.tab === k}">${l}</button>`).join("")}</div>
   <section class="card stack" role="tabpanel">${body}</section>`, "accompagnante-participants");
}
actions["sp-tab"] = (b) => { st.tab = b.dataset.v; st.editNote = null; rerender(); };
const reloadP = () => { dropStaff("p", "list", "dash", "agenda"); rerender(); };
const curEid = () => ui.params?.[0];

function dl(rows) { return `<dl class="facts">${rows.filter(r => r).map(([k, v]) => `<div><dt>${k}</dt><dd>${v || "—"}</dd></div>`).join("")}</dl>`; }
function tInfo(d) {
  const i = d.info;
  return `<h2 class="h-card">Identité et coordonnées</h2>
   ${dl([["Prénom et nom", pname(i)], ["Identifiant interne", esc(i.participant_code)], ["E-mail", esc(i.email || "")], ["Téléphone", esc(i.phone || "")]])}
   <h2 class="h-card">Programme et forfait</h2>
   ${dl([["Programme", esc(i.programme)], ["Forfait", PLAN[i.plan]], ["Accompagnante", esc(i.coach_name || (i.plan === "autonome" ? "Sans accompagnement (P1)" : "À attribuer"))]])}
   <h2 class="h-card">Dates</h2>
   ${dl([["Inscription", fmtDate(i.created_at)], ["Début de participation", fmtDate(i.starts_at)], ["Fin prévue", i.ends_at ? fmtDate(i.ends_at) : ""]])}
   <h2 class="h-card">Statut</h2>
   ${dl([["Participation", badge(i.state)], ["Compte", i.account_status === "suspended" ? "Suspendu" : i.must_set_password ? "Accès non encore activé" : "Actif"],
     i.can_admin ? ["Paiement / admission", `${esc(i.payment_status)} · ${esc(i.admission_status)}`] : null, i.can_admin ? ["Dernière connexion", i.last_sign_in_at ? fmtDate(i.last_sign_in_at, true) : "Jamais"] : null])}
   ${i.can_admin ? `<h2 class="h-card">Gestion administrative</h2>${adminEnrolmentPanel(i.user_id)}` : ""}`;
}
const EVAL = Object.fromEntries(EVALUATION_QUESTIONS.map(q => [q.k, q.label]));
const REQ = { nouvelle: "Nouvelle demande", en_cours: "En cours d’examen", infos_demandees: "Informations complémentaires demandées", acceptee: "Acceptée", orientation: "Orientation proposée", refusee: "Non retenue", compte_cree: "Compte créé" };
function tEval(d) {
  const e = d.evaluation;
  if (!e) return `<p class="muted">Aucune évaluation initiale n’est reliée à ce participant.</p>`;
  const ans = Object.entries(e.answers || {}).filter(([, v]) => v);
  return `<p class="small muted">Évaluation des besoins et de l’adéquation remplie avant l’inscription le ${fmtDate(e.created_at)}. Ce n’est pas un diagnostic.</p>
   ${ans.length ? `<dl class="facts facts-wide">${ans.map(([k, v]) => `<div><dt>${esc(EVAL[k] || k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : `<p class="muted small">Aucune réponse détaillée.</p>`}
   ${e.message ? `<p class="small"><b>Message :</b> « ${esc(e.message)} »</p>` : ""}
   <h2 class="h-card">Examen et décision</h2>
   ${dl([["Statut de la demande", REQ[e.status] || e.status], ["Résultat de l’examen administratif", esc(e.review_result || "")], ["Décision d’admission ou d’orientation", esc(e.decision_note || "")], ["Examinée le", e.reviewed_at ? fmtDate(e.reviewed_at) : ""]])}`;
}
function tProgress(d) {
  const p = d.progress, i = d.info;
  const r = p.ratings;
  return `<div class="weeks-strip">${[1, 2, 3, 4, 5, 6].map(n => `<span class="${p.weeks_completed.includes(n) ? "done" : ""}">S${n}</span>`).join("")}</div>
   <div class="table-wrap"><table><thead><tr><th>Semaine</th><th>Leçons et étapes</th><th class="c">Exercices réalisés</th></tr></thead><tbody>
    ${p.weeks.map(w => `<tr><td><b>Semaine ${w.n}</b><div class="small muted">${esc(w.title)}</div></td><td><div class="mini-bar"><i style="width:${w.total ? Math.round(w.done / w.total * 100) : 0}%"></i></div><span class="small muted">${w.done} / ${w.total}</span></td><td class="c num">${w.exercises_done}</td></tr>`).join("")}</tbody></table></div>
   <p class="small muted">Seul l’avancement est visible ici : jamais le contenu des exercices ni du journal.</p>
   ${dl([["Dernière activité", p.last_activity ? fmtDate(p.last_activity, true) : "Aucune"]])}
   <p class="small muted">Date de la dernière étape ouverte ou terminée. Le participant en est informé dans « Mon compte ».</p>
   <h2 class="h-card">Objectifs personnels</h2>
   ${p.goals ? (p.goals.length ? `<ul class="hist">${p.goals.map(g => `<li><span class="tag">${g.scope === "principal" ? "Principal" : "Semaine " + g.week_number}</span><span>${esc(g.title)}</span></li>`).join("")}</ul>` : `<p class="muted small">Aucun objectif.</p>`)
     : `<p class="muted small">${icon("lock")} Le participant n’a pas choisi de partager ses objectifs.</p>`}
   <h2 class="h-card">Indicateur personnel 0–10 (non diagnostique)</h2>
   ${r ? (r.length ? `<div class="bars">${r.map(x => `<div class="bar-row"><span>${x.week === 0 ? "Point de départ" : "Semaine " + x.week}</span><div class="track"><i style="width:${x.value * 10}%"></i></div><b class="num">${x.value}/10</b></div>`).join("")}</div>` : `<p class="muted small">Aucune note.</p>`)
     : `<p class="muted small">${icon("lock")} Visible uniquement si le participant partage ses bilans.</p>`}`;
}

/* Notes de suivi */
function noteForm(eid, n) {
  const v = (k) => esc(n?.[k] || "");
  return `<form class="card-lite stack" id="sp-noteform" data-id="${n?.id || ""}"><b>${n?.id ? "Modifier la note" : "Nouvelle note de suivi"}</b>
   <div class="grid g3" style="gap:10px">
    <div class="field"><label class="flabel" for="nt-when">Date et heure</label><input id="nt-when" type="datetime-local" value="${dtLocal(n?.occurred_at)}"></div>
    <div class="field"><label class="flabel" for="nt-type">Type d’échange</label><select id="nt-type">${Object.entries(EXCH).map(([k, l]) => `<option value="${k}" ${n?.exchange_type === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label class="flabel" for="nt-topic">Sujet principal abordé</label><input id="nt-topic" type="text" maxlength="500" value="${v("topic")}" required></div></div>
   <div class="field"><label class="flabel" for="nt-needs">Difficultés et besoins exprimés</label><textarea id="nt-needs" rows="2" maxlength="5000">${v("needs")}</textarea><span class="hint">Uniquement si c’est nécessaire au suivi.</span></div>
   <div class="grid g2" style="gap:10px">
    <div class="field"><label class="flabel" for="nt-tools">Outils ou exercices discutés</label><textarea id="nt-tools" rows="2" maxlength="2000">${v("tools")}</textarea></div>
    <div class="field"><label class="flabel" for="nt-obs">Observations factuelles et pertinentes</label><textarea id="nt-obs" rows="2" maxlength="5000">${v("observations")}</textarea></div>
    <div class="field"><label class="flabel" for="nt-actions">Actions convenues</label><textarea id="nt-actions" rows="2" maxlength="2000">${v("actions")}</textarea></div>
    <div class="field"><label class="flabel" for="nt-next">Prochaine étape</label><textarea id="nt-next" rows="2" maxlength="2000">${v("next_step")}</textarea></div></div>
   <div class="field" style="max-width:280px"><label class="flabel" for="nt-nextat">Date éventuelle du prochain contact</label><input id="nt-nextat" type="datetime-local" value="${n?.next_contact_at ? dtLocal(n.next_contact_at) : ""}"></div>
   <p class="small muted">Notes factuelles, sans diagnostic. Chaque modification conserve la version précédente.</p>
   <div class="row"><button class="btn btn-primary btn-sm" type="submit">Enregistrer la note</button>${n?.id ? `<button type="button" class="btn btn-soft btn-sm" data-act="nt-cancel">Annuler</button>` : ""}</div></form>`;
}
function tNotes(d) {
  const eid = d.info.enrolment_id, list = (d.notes || []).filter(n => st.showArchived || !n.archived_at);
  const editing = st.editNote ? (d.notes || []).find(n => n.id === st.editNote) : null;
  return `<p class="small muted">${icon("lock")} Visibles par vous uniquement. Elles n’apparaissent pas dans l’espace du participant.</p>
   ${noteForm(eid, editing)}
   <div class="row" style="justify-content:space-between"><label class="check small"><input type="checkbox" id="nt-archived" ${st.showArchived ? "checked" : ""}><span>Afficher les notes archivées</span></label>
    <button class="btn btn-soft btn-sm" data-act="nt-export">${icon("download")}Exporter (demande d’accès)</button></div>
   ${list.map(n => `<article class="entry note ${n.archived_at ? "archived" : ""}">
     <div class="row" style="justify-content:space-between"><b>${esc(n.topic || "Note")}</b><span class="small muted">${fmtDate(n.occurred_at || n.created_at, true)} · ${EXCH[n.exchange_type] || ""}${n.archived_at ? " · archivée" : ""}</span></div>
     ${n.body ? `<p class="entry-body">${esc(n.body)}</p>` : ""}
     ${dl([n.needs ? ["Difficultés et besoins", esc(n.needs)] : null, n.tools ? ["Outils ou exercices", esc(n.tools)] : null, n.observations ? ["Observations", esc(n.observations)] : null,
       n.actions ? ["Actions convenues", esc(n.actions)] : null, n.next_step ? ["Prochaine étape", esc(n.next_step)] : null, n.next_contact_at ? ["Prochain contact", fmtDate(n.next_contact_at, true)] : null])}
     <div class="row small">${!n.archived_at ? `<button class="linkbtn" data-act="nt-edit" data-id="${n.id}">Modifier</button>` : ""}
      <button class="linkbtn" data-act="nt-archive" data-id="${n.id}" data-v="${n.archived_at ? "0" : "1"}">${n.archived_at ? "Désarchiver" : "Archiver"}</button>
      ${n.versions ? `<button class="linkbtn" data-act="nt-versions" data-id="${n.id}">Historique (${n.versions} version${n.versions > 1 ? "s" : ""} précédente${n.versions > 1 ? "s" : ""})</button>` : `<span class="muted">Version ${n.version || 1}</span>`}</div>
     ${st.versions[n.id] ? `<div class="versions">${st.versions[n.id].map(v => `<p class="small"><span class="muted">Version ${v.version} · remplacée le ${fmtDate(v.edited_at, true)} :</span> ${esc(v.snapshot?.topic || "")} — ${esc(v.snapshot?.actions || v.snapshot?.body || "")}</p>`).join("") || `<p class="small muted">Aucune version précédente.</p>`}</div>` : ""}
    </article>`).join("") || `<p class="muted small">Aucune note.</p>`}`;
}
forms["sp-noteform"] = async (f) => {
  const topic = $("#nt-topic").value.trim(); if (!topic) return toast("Indiquez le sujet principal.");
  const n = { id: f.dataset.id || null, occurred_at: fromLocal($("#nt-when").value) || new Date().toISOString(), exchange_type: $("#nt-type").value, topic,
    needs: $("#nt-needs").value.trim(), tools: $("#nt-tools").value.trim(), observations: $("#nt-obs").value.trim(), actions: $("#nt-actions").value.trim(),
    next_step: $("#nt-next").value.trim(), next_contact_at: fromLocal($("#nt-nextat").value) };
  try { await api.noteSave(curEid(), n); st.editNote = null; toast("Note enregistrée"); reloadP(); } catch (e) { err(e); }
};
actions["nt-edit"] = (b) => { st.editNote = b.dataset.id; rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); };
actions["nt-cancel"] = () => { st.editNote = null; rerender(); };
actions["nt-archive"] = async (b) => { try { await api.noteArchive(b.dataset.id, b.dataset.v === "1"); toast(b.dataset.v === "1" ? "Note archivée (conservée)" : "Note désarchivée"); reloadP(); } catch (e) { err(e); } };
actions["nt-versions"] = async (b) => { if (st.versions[b.dataset.id]) { delete st.versions[b.dataset.id]; return rerender(); } try { st.versions[b.dataset.id] = await api.noteVersions(b.dataset.id); rerender(); } catch (e) { err(e); } };
actions["nt-export"] = async () => {
  try { const r = await api.exportNotes(curEid(), "Export par l’accompagnante attribuée"); download(`notes-de-suivi-${curEid()}.json`, JSON.stringify(r, null, 2), "application/json"); toast("Export téléchargé (action tracée)"); } catch (e) { err(e); }
};
changes.push(t => { if (t.id !== "nt-archived") return false; st.showArchived = t.checked; rerender(); return true; });

/* Messages, bilans et rendez-vous */
function apptRow(a, withName) {
  const future = new Date(a.starts_at) > new Date(), open = ["demande", "confirme", "reporte"].includes(a.status);
  return `<div class="appt"><div class="stack" style="gap:2px"><b>${fmtDate(a.starts_at)} · ${fmtTime(a.starts_at)}${withName ? ` · ${pname(a)}` : ""}</b><span class="small muted">Échange ${a.session_number} sur 6 · ${a.mode === "video" ? "Vidéo" : "Téléphone"} · 15 min${a.participant_note ? ` · « ${esc(a.participant_note)} »` : ""}</span></div>
   <span class="badge ${["confirme", "effectue", "reporte"].includes(a.status) ? "ok" : a.status === "demande" ? "warn" : "mute"}">${APPT[a.status] || a.status}</span>
   <div class="row" style="gap:6px">${a.status === "demande" ? `<button class="btn btn-primary btn-sm" data-act="ap-set" data-id="${a.id}" data-s="confirme">Confirmer</button>` : ""}
    ${open && !future ? `<button class="btn btn-soft btn-sm" data-act="ap-set" data-id="${a.id}" data-s="effectue">Effectué</button><button class="btn btn-soft btn-sm" data-act="ap-set" data-id="${a.id}" data-s="manque">Manqué</button>` : ""}
    ${open && future ? `<button class="linkbtn small" data-act="ap-set" data-id="${a.id}" data-s="annule">Annuler</button>` : ""}
    ${withName ? `<button class="linkbtn small" data-act="sp-open" data-id="${a.enrolment_id}" data-tab="echanges">Dossier</button>` : ""}</div></div>`;
}
actions["ap-set"] = async (b) => { try { await api.coachAppointment(b.dataset.id, b.dataset.s); toast("Rendez-vous mis à jour"); reloadP(); } catch (e) { err(e); } };
function tExchanges(d) {
  const i = d.info, c = d.coach || {};
  const tasks = `<h2 class="h-card">Actions de suivi en attente</h2>${taskList(d.tasks || [], false)}
    <form class="row" id="sp-taskform" style="flex-wrap:wrap"><label class="sr" for="tk-title-p">Nouvelle action</label><input id="tk-title-p" type="text" maxlength="300" placeholder="Nouvelle action (sans information clinique)" style="flex:1;min-width:200px"><input id="tk-due-p" type="datetime-local" aria-label="Échéance"><button class="btn btn-soft btn-sm" type="submit">${icon("plus")}Ajouter</button></form>`;
  if (i.plan === "autonome") return `<p class="muted">Aucun échange n’est inclus dans le parcours autonome (P1).</p>${tasks}`;
  const thread = `<div class="thread">${(c.messages || []).map(m => `<div class="msg ${m.from_participant ? "" : "mine"}"><div class="msg-meta">${m.from_participant ? esc(i.first_name) : "Vous"} · ${fmtDate(m.created_at, true)} · <span class="tag">${KLAB[m.kind] || m.kind}</span></div><p>${esc(m.body)}</p></div>`).join("") || `<p class="muted small">Aucun message.</p>`}</div>`;
  const ecrit = i.plan === "ecrit";
  const kinds = ecrit ? [["suivi", "Accompagnement écrit de la semaine"], ["pratique", "Information pratique"]] : [["pratique", "Message logistique (organisation des appels)"]];
  const replyForm = `<form class="stack" id="sp-msgform"><div class="field"><label class="flabel" for="ms-kind">Type</label><select id="ms-kind">${kinds.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="ms-body">${ecrit ? "Votre réponse" : "Message logistique"}</label><textarea id="ms-body" rows="4" maxlength="5000"></textarea><span class="hint">${ecrit ? "Soutien écrit hebdomadaire, dans le délai annoncé : ce n’est ni une messagerie illimitée ni une surveillance permanente." : "Le forfait 3 ne comprend pas de soutien écrit hebdomadaire : messages d’organisation uniquement."}</span></div>
     <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">${icon("send")}Envoyer</button></form>`;
  if (ecrit) {
    return `${d.reply_due ? `<div class="notice ${new Date(d.reply_due) < new Date() ? "warn" : ""}">${icon("chat")}<span>Réponse attendue avant le <b>${fmtDate(d.reply_due, true)}</b>${new Date(d.reply_due) < new Date() ? " : délai annoncé dépassé." : "."}</span></div>` : ""}
     <h2 class="h-card">Historique des échanges</h2>${thread}${replyForm}
     <h2 class="h-card">Bilans hebdomadaires partagés</h2>
     ${i.share_summaries ? ((c.summaries || []).map(s => `<article class="entry"><span class="small muted">Semaine ${s.week_number} · partagé le ${fmtDate(s.shared_at)}</span><pre class="entry-body pre">${esc(s.body)}</pre></article>`).join("") || `<p class="muted small">Aucun bilan partagé.</p>`) : `<p class="muted small">${icon("lock")} Le participant n’a pas autorisé le partage de ses bilans.</p>`}
     ${tasks}`;
  }
  const appts = c.appointments || [], calls = d.calls || { done: 0, planned: 0 };
  const slots = [1, 2, 3, 4, 5, 6].map(n => { const a = appts.find(x => x.session_number === n);
    const done = a && ["effectue", "manque"].includes(a.status);
    return `<div class="slot"><div class="row" style="justify-content:space-between"><b>Échange ${n}</b>${a ? "" : `<span class="small muted">Non planifié</span>`}</div>
      ${a ? apptRow({ ...a, first_name: i.first_name }, false) : ""}
      ${!done ? `<form class="row sched-form" data-n="${n}" style="flex-wrap:wrap;gap:6px"><label class="sr" for="sc-${n}">Date et heure</label><input id="sc-${n}" type="datetime-local" value="${a && ["demande", "confirme", "reporte"].includes(a.status) ? dtLocal(a.starts_at) : ""}">
        <select id="sc-mode-${n}" aria-label="Mode"><option value="telephone" ${a?.mode === "video" ? "" : "selected"}>Téléphone</option><option value="video" ${a?.mode === "video" ? "selected" : ""}>Vidéo</option></select>
        <button class="btn btn-soft btn-sm" type="submit">${a && ["confirme", "reporte"].includes(a.status) ? "Reporter" : a?.status === "demande" ? "Confirmer à cette date" : "Planifier"}</button></form>` : ""}</div>`; }).join("");
  return `<div class="kpis"><div class="kpi"><span class="small muted">Appels effectués</span><b>${calls.done} / 6</b></div><div class="kpi"><span class="small muted">Prévus</span><b>${calls.planned}</b></div><div class="kpi"><span class="small muted">Restants à planifier</span><b>${Math.max(0, 6 - calls.done - calls.planned)}</b></div></div>
   <p class="small muted">Six échanges de 15 minutes, par téléphone ou vidéo, dans vos disponibilités. Après chaque échange, ajoutez une note de suivi.</p>
   <div class="slots">${slots}</div>
   <h2 class="h-card">Messages logistiques</h2>${thread}${replyForm}${tasks}`;
}
forms["sp-msgform"] = async () => { const body = $("#ms-body").value.trim(); if (!body) return; try { await api.coachSend(curEid(), $("#ms-kind").value, body); toast("Message envoyé"); reloadP(); } catch (e) { err(new Error("Envoi impossible pour ce forfait.")); } };
document.addEventListener("submit", async (e) => {
  const f = e.target; if (!f.classList?.contains("sched-form")) return; e.preventDefault();
  const n = +f.dataset.n, v = $("#sc-" + n).value; if (!v) return toast("Choisissez une date et une heure.");
  try { await api.scheduleAppointment(curEid(), n, fromLocal(v), $("#sc-mode-" + n).value); toast("Échange planifié"); reloadP(); } catch (e2) { err(e2); }
});
forms["sp-taskform"] = async () => { const t = $("#tk-title-p").value.trim(); if (!t) return; try { await api.taskSave({ title: t, due_at: fromLocal($("#tk-due-p").value), enrolment_id: curEid() }); toast("Action ajoutée"); reloadP(); } catch (e) { err(e); } };

function tOrientation(d) {
  const c = d.coach || {};
  return `<h2 class="h-card">Orientation</h2><p class="small muted">Pour un besoin qui dépasse le cadre de l’accompagnement. Suivez la procédure d’orientation validée par LE SEUIL ; aucune évaluation de risque n’est produite automatiquement.</p>
   <form class="stack card-lite" id="sp-refform"><div class="field"><label class="flabel" for="rf-cat">Motif</label><select id="rf-cat">${Object.entries(REF).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
    <div class="field"><label class="flabel" for="rf-desc">Description</label><textarea id="rf-desc" rows="2"></textarea></div>
    <div class="field"><label class="flabel" for="rf-act">Action engagée</label><textarea id="rf-act" rows="2" placeholder="Par exemple : orientation vers le médecin traitant, information sur les numéros d’urgence"></textarea></div>
    <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">${icon("flag")}Enregistrer l’orientation</button></form>
   ${(c.referrals || []).map(r => `<article class="entry"><div class="row" style="justify-content:space-between"><span class="tag ${r.status === "ouverte" ? "warn" : ""}">${r.status === "ouverte" ? "Ouverte" : "Clôturée"}</span><span class="small muted">${fmtDate(r.created_at, true)}</span></div><b>${REF[r.category]}</b>${r.description ? `<p>${esc(r.description)}</p>` : ""}${r.action_taken ? `<p class="small muted">Action : ${esc(r.action_taken)}</p>` : ""}
     ${r.status === "ouverte" ? `<button class="btn btn-soft btn-sm" data-act="rf-close" data-id="${r.id}" style="align-self:flex-start">Clôturer</button>` : ""}</article>`).join("")}
   <h2 class="h-card">Ressources proposées</h2>
   <form class="stack card-lite" id="sp-sugform"><div class="field"><label class="flabel" for="sg-ref">Ressource</label><select id="sg-ref">
     <optgroup label="Articles de la Bibliothèque">${C.articles.filter(a => a.etat === "publie").map(a => `<option value="article|${a.slug}|${esc(a.title)}">${esc(a.title)}</option>`).join("")}</optgroup></select></div>
    <div class="field"><label class="flabel" for="sg-note">Message au participant (facultatif)</label><input id="sg-note" type="text" maxlength="300"></div>
    <label class="check"><input type="checkbox" id="sg-ok"><span>J’ai vérifié que cette ressource est adaptée à la situation de ce participant.</span></label>
    <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Proposer</button></form>
   ${(c.suggestions || []).map(s => `<div class="ex-item">${icon("leaf")}<b>${esc(s.title)}</b><span class="small muted">${fmtDate(s.created_at)}</span></div>`).join("")}`;
}
forms["sp-refform"] = async () => { try { await api.coachReferral(curEid(), $("#rf-cat").value, $("#rf-desc").value.trim(), $("#rf-act").value.trim()); toast("Orientation enregistrée"); reloadP(); } catch (e) { err(e); } };
actions["rf-close"] = async (b) => { try { await api.coachCloseReferral(b.dataset.id, ""); toast("Orientation clôturée"); reloadP(); } catch (e) { err(e); } };
forms["sp-sugform"] = async () => { if (!$("#sg-ok").checked) return toast("Confirmez d’abord l’adéquation de la ressource."); const [kind, ref, title] = $("#sg-ref").value.split("|");
  try { await api.coachSuggest(curEid(), kind, ref, title, $("#sg-note").value.trim()); toast("Ressource proposée"); reloadP(); } catch (e) { err(e); } };
function tHistory(d) {
  return `<p class="small muted">Vos actions sur ce dossier (journal de traçabilité).</p><ul class="hist">${(d.coach?.history || []).map(h => `<li><span class="small muted">${fmtDate(h.created_at, true)}</span><span>${esc(String(h.action).replace(/_/g, " "))}</span></li>`).join("") || `<li class="muted">Aucun historique.</li>`}</ul>`;
}

/* ---------- Messages et échanges ---------- */
export function sMessages() {
  need("list", () => api.staffParticipants());
  const L = (cache.list || []).filter(p => p.coached_by_me && p.plan !== "autonome")
    .sort((a, b) => (a.reply_due || "9").localeCompare(b.reply_due || "9") || (b.unread || 0) - (a.unread || 0));
  return staffShell(`${H("Messages et échanges", "Participants P2 (accompagnement écrit) et P3 (messages logistiques) qui vous sont attribués.")}
   <p class="small muted">${icon("info")} Le soutien écrit P2 est hebdomadaire, dans le délai annoncé : ce n’est ni une messagerie illimitée ni une surveillance permanente.</p>
   <div class="stack">${cache.list === undefined ? loading : L.map(p => { const late = p.reply_due && new Date(p.reply_due) < new Date();
     return `<button class="row-btn" data-act="sp-open" data-id="${p.enrolment_id}" data-tab="echanges"><b>${pname(p)}</b><span class="small muted">${PLAN[p.plan]} · semaine ${p.current_week}</span>
      ${p.reply_due ? `<span class="badge ${late ? "warn" : ""}">${late ? "Délai dépassé" : "Réponse avant le " + fmtShort(p.reply_due)}</span>` : p.unread ? `<span class="pill-count">${p.unread} non lu${p.unread > 1 ? "s" : ""}</span>` : `<span class="small muted">À jour</span>`}</button>`; }).join("") || `<p class="muted">Aucun participant P2 ou P3 ne vous est attribué.</p>`}</div>`, "accompagnante-messages");
}

/* ---------- Agenda et rendez-vous ---------- */
const avText = (a) => { const av = a?.availability; if (!av?.days?.length) return "Disponibilités non renseignées : tous les créneaux sont acceptés."; return `${DAYS.filter(([n]) => av.days.includes(n)).map(([, l]) => l).join(", ")}, de ${av.start || "—"} à ${av.end || "—"} (heure d’Abidjan)`; };
export function sAgenda() {
  need("agenda", () => api.staffAgenda());
  const a = cache.agenda;
  if (!a) return staffShell(H("Agenda et rendez-vous") + (a === null ? `<p class="muted">Agenda indisponible.</p>` : loading), "accompagnante-agenda");
  const upcoming = a.calls.filter(c => new Date(c.starts_at) > new Date(Date.now() - 864e5));
  const byDay = {}; upcoming.forEach(c => { const k = new Date(c.starts_at).toDateString(); (byDay[k] = byDay[k] || []).push(c); });
  const line = (p, extra, tab = "info") => `<button class="row-btn" data-act="sp-open" data-id="${p.enrolment_id}" data-tab="${tab}"><b>${pname(p)}</b>${extra}</button>`;
  const sec = (title, inner, empty) => `<section class="card stack"><h2 class="h-sub">${title}</h2>${inner || `<p class="muted small">${empty}</p>`}</section>`;
  return staffShell(`${H("Agenda et rendez-vous", "", `<button class="btn btn-soft btn-sm" data-go="accompagnante-parametres">${icon("cal")}Mes disponibilités</button>`)}
   <div class="notice calm">${icon("cal")}<span><b>Vos disponibilités :</b> ${avText(a.availability)}. Délai de réponse P2 annoncé : ${a.availability?.response_hours || 48} h. Aucun créneau n’est proposé en dehors de ces plages : l’agenda ne promet jamais une disponibilité permanente.</span></div>
   ${sec("Appels P3 programmés", Object.values(byDay).map(list => `<div class="stack" style="gap:6px"><h3 class="h-card">${fmtDate(list[0].starts_at)}</h3>${list.map(c => apptRow(c, true)).join("")}</div>`).join(""), "Aucun appel prévu.")}
   <div class="grid g2">
    ${sec("Messages P2 en attente", a.p2_messages.map(p => line(p, `<span class="badge ${new Date(p.due_at) < new Date() ? "warn" : ""}">avant le ${fmtShort(p.due_at)} · ${fmtTime(p.due_at)}</span>`, "echanges")).join(""), "Aucun message en attente.")}
    ${sec("Bilans écrits P2 à réaliser", a.p2_bilans.map(p => line(p, `<span class="small muted">Bilan de la semaine ${p.week_number} partagé le ${fmtShort(p.shared_at)}</span>`, "echanges")).join(""), "Aucun bilan à préparer.")}
    ${sec("Suivis prévus (notes)", a.follow_ups.map(p => line(p, `<span class="small muted">${fmtShort(p.next_contact_at)} · ${esc(p.next_step || "")}</span>`, "notes")).join(""), "Aucun suivi prévu.")}
    ${sec("Programmes proches de leur terme", a.ending_soon.map(p => line(p, `<span class="small muted">fin le ${fmtDate(p.ends_at)}</span>`)).join(""), "Aucun programme ne se termine dans les trois prochaines semaines.")}
    ${a.requests ? sec("Demandes initiales à examiner", a.requests.map(r => `<button class="row-btn" data-go="accompagnante-demandes"><b>${esc(r.first_name)} ${esc(r.last_name)}</b><span class="small muted">${esc(REQ[r.status] || r.status)} · reçue le ${fmtShort(r.created_at)}</span></button>`).join(""), "Aucune demande en attente.") : ""}
    ${a.admin_follow_ups ? sec("Suivis administratifs", a.admin_follow_ups.map(p => line(p, `<span class="badge warn">${p.reason === "paiement" ? "Paiement à confirmer" : "Admission à décider"}</span>`)).join(""), "Aucun suivi administratif.") : ""}
   </div>
   ${sec("Mes rappels", taskList(a.tasks.filter(t => !t.done_at).slice(0, 6), true) + `<button class="linkbtn small" data-go="accompagnante-taches" style="align-self:flex-start">Toutes mes tâches</button>`, "")}`, "accompagnante-agenda");
}

/* ---------- Mes tâches ---------- */
function taskList(tasks, withName) {
  if (!tasks.length) return `<p class="muted small">Aucune tâche.</p>`;
  return `<ul class="tasks">${tasks.map(t => { const late = !t.done_at && t.due_at && new Date(t.due_at) < new Date();
    return `<li class="${t.done_at ? "done" : ""}"><label class="check"><input type="checkbox" data-task="${t.id}" ${t.done_at ? "checked" : ""}><span>${esc(t.title)}</span></label>
     <span class="small ${late ? "warn-fg" : "muted"}">${t.due_at ? (late ? "En retard · " : "") + fmtDate(t.due_at, true) : "Sans échéance"}</span>
     ${withName && t.enrolment_id ? `<button class="linkbtn small" data-act="sp-open" data-id="${t.enrolment_id}">${pname(t) || "Dossier"}</button>` : ""}
     ${withName && t.request_id && isAdmin() ? `<button class="linkbtn small" data-go="accompagnante-demandes">Demande</button>` : ""}</li>`; }).join("")}</ul>`;
}
changes.push(t => { if (!t.dataset?.task) return false; api.taskDone(t.dataset.task, t.checked).then(() => { toast(t.checked ? "Tâche réalisée" : "Tâche rouverte"); dropStaff("agenda", "dash", "p"); rerender(); }).catch(err); return true; });
export function sTasks() {
  need("agenda", () => api.staffAgenda()); need("list", () => api.staffParticipants());
  const a = cache.agenda, L = cache.list || [];
  const open = (a?.tasks || []).filter(t => !t.done_at), done = (a?.tasks || []).filter(t => t.done_at);
  return staffShell(`${H("Mes tâches", "Rappels internes et actions de suivi. N’y inscrivez aucune information clinique.")}
   <form class="card stack" id="sp-newtask"><b>Nouveau rappel</b>
    <div class="grid g3" style="gap:10px"><div class="field"><label class="flabel" for="tk-title">Intitulé</label><input id="tk-title" type="text" maxlength="300" required></div>
     <div class="field"><label class="flabel" for="tk-due">Échéance</label><input id="tk-due" type="datetime-local"></div>
     <div class="field"><label class="flabel" for="tk-part">Dossier concerné (facultatif)</label><select id="tk-part"><option value="">—</option>${L.filter(p => isAdmin() || p.coached_by_me).map(p => `<option value="${p.enrolment_id}">${pname(p)} · ${esc(p.programme)}</option>`).join("")}</select></div></div>
    <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">${icon("plus")}Ajouter</button></form>
   <section class="card stack"><h2 class="h-sub">À faire</h2>${a ? taskList(open, true) : loading}</section>
   ${a?.follow_ups?.length ? `<section class="card stack"><h2 class="h-sub">Suivis prévus dans vos notes</h2>${a.follow_ups.map(p => `<button class="row-btn" data-act="sp-open" data-id="${p.enrolment_id}" data-tab="notes"><b>${pname(p)}</b><span class="small muted">${fmtDate(p.next_contact_at, true)} · ${esc(p.next_step || "")}</span></button>`).join("")}</section>` : ""}
   <details class="card"><summary class="h-sub">Réalisées ces 14 derniers jours (${done.length})</summary>${taskList(done, true)}</details>`, "accompagnante-taches");
}
forms["sp-newtask"] = async () => { const t = $("#tk-title").value.trim(); if (!t) return;
  try { await api.taskSave({ title: t, due_at: fromLocal($("#tk-due").value), enrolment_id: $("#tk-part").value || null }); toast("Rappel ajouté"); dropStaff("agenda", "dash"); rerender(); } catch (e) { err(e); } };

/* ---------- Paramètres et sécurité ---------- */
export function sSettings() {
  need("sec", () => api.security()); need("factors", () => api.mfaFactors());
  if (isTeam()) need("agenda", () => api.staffAgenda());
  const sec = cache.sec || {}, factors = (cache.factors || []).filter(f => f.status === "verified"), m = st.mfa;
  const av = cache.agenda?.availability || {}, days = av.availability?.days || [];
  return staffShell(`${H("Paramètres et sécurité")}
   <section class="card stack"><h2 class="h-sub">${icon("shield")} Double authentification</h2>
    ${DEMO ? `<div class="notice">${icon("info")}<span>Maquette : la double authentification n’est pas simulée. Sur le site relié à Supabase, elle utilise une application d’authentification (codes à 6 chiffres).</span></div>` : ""}
    <p>${factors.length ? `<span class="badge ok">Activée</span> Un code vous est demandé à chaque connexion.` : `<span class="badge warn">Non activée</span> Elle est indispensable avant d’utiliser de vrais dossiers.`}
      ${sec.mfa_required ? ` Elle est <b>obligatoire</b> pour toute l’équipe.` : ""}</p>
    ${!factors.length && !m ? `<button class="btn btn-primary btn-sm" data-act="mfa-start" style="align-self:flex-start">Activer la double authentification</button>` : ""}
    ${m ? `<div class="mfa-setup stack"><p class="small">1. Scannez ce code avec une application d’authentification (par exemple Google Authenticator, Microsoft Authenticator ou 2FAS).</p>
       <img src="${esc(m.qr)}" alt="Code QR de configuration de la double authentification" width="180" height="180" class="qr">
       <p class="small muted">Ou saisissez la clé : <code>${esc(m.secret)}</code></p>
       <form class="row" id="mfa-verify"><label class="flabel" for="mfa-code">2. Code à 6 chiffres</label><input id="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" style="max-width:140px"><button class="btn btn-primary btn-sm" type="submit">Valider</button></form></div>` : ""}
    ${factors.map(f => `<div class="row small"><span>${esc(f.friendly_name || "Application d’authentification")} · ajoutée le ${fmtDate(f.created_at)}</span><button class="linkbtn" data-act="mfa-remove" data-id="${f.id}">Retirer</button></div>`).join("")}
    ${isAdmin() && !DEMO ? `<label class="check"><input type="checkbox" id="mfa-req" ${sec.mfa_required ? "checked" : ""} ${factors.length ? "" : "disabled"}><span>Exiger la double authentification pour toute l’équipe (administration et accompagnantes).${factors.length ? "" : " Activez d’abord la vôtre."}</span></label>` : ""}
   </section>
   ${isTeam() ? `<form class="card stack" id="av-form"><h2 class="h-sub">${icon("cal")} Mes disponibilités</h2>
    <p class="small muted">Les rendez-vous P3 ne peuvent être pris que dans ces plages (heure d’Abidjan). Le délai de réponse P2 sert au suivi des messages en attente.</p>
    <fieldset class="field"><legend class="flabel">Jours</legend><div class="row">${DAYS.map(([n, l]) => `<label class="check small"><input type="checkbox" name="av-day" value="${n}" ${days.includes(n) ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></fieldset>
    <div class="grid g3" style="gap:10px"><div class="field"><label class="flabel" for="av-start">De</label><input id="av-start" type="time" value="${esc(av.availability?.start || "08:00")}"></div>
     <div class="field"><label class="flabel" for="av-end">À</label><input id="av-end" type="time" value="${esc(av.availability?.end || "18:00")}"></div>
     <div class="field"><label class="flabel" for="av-hrs">Délai de réponse P2 (heures)</label><input id="av-hrs" type="number" min="1" max="336" value="${av.response_hours || 48}"></div></div>
    <div class="grid g2" style="gap:10px"><div class="field"><label class="flabel" for="av-text">Horaires affichés aux participants</label><input id="av-text" type="text" maxlength="200" value="${esc(av.hours || "")}"></div>
     <div class="field"><label class="flabel" for="av-delay">Délai annoncé aux participants</label><input id="av-delay" type="text" maxlength="200" value="${esc(av.response_delay || "")}"></div></div>
    <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Enregistrer</button></form>` : ""}
   <form class="card stack" id="pw-form"><h2 class="h-sub">${icon("lock")} Mot de passe</h2>
    <div class="grid g2" style="gap:10px"><div class="field"><label class="flabel" for="pw-1">Nouveau mot de passe (10 caractères minimum)</label><input id="pw-1" type="password" autocomplete="new-password" minlength="10"></div>
     <div class="field"><label class="flabel" for="pw-2">Confirmation</label><input id="pw-2" type="password" autocomplete="new-password" minlength="10"></div></div>
    <button class="btn btn-soft btn-sm" type="submit" style="align-self:flex-start">Changer le mot de passe</button></form>
   <section class="card stack"><h2 class="h-sub">Bonnes pratiques</h2><ul class="ticks"><li>Déconnectez-vous sur un ordinateur partagé.</li><li>Ne transmettez jamais un code de connexion, même à l’équipe technique.</li><li>N’exportez un dossier que pour une demande d’accès légale ; l’export est tracé.</li></ul>
    <button class="btn btn-soft btn-sm" data-act="logout" style="align-self:flex-start">${icon("out")}Déconnexion</button></section>`, "accompagnante-parametres");
}
actions["mfa-start"] = async () => { try { const r = await api.mfaEnroll(); st.mfa = { id: r.id, qr: r.totp?.qr_code, secret: r.totp?.secret }; rerender(); } catch (e) { err(e); } };
forms["mfa-verify"] = async () => { const code = $("#mfa-code").value.trim(); if (!/^\d{6}$/.test(code)) return toast("Saisissez le code à 6 chiffres.");
  try { await api.mfaVerify(st.mfa.id, code); st.mfa = null; dropStaff(); await store.refreshSecurity(); toast("Double authentification activée"); rerender(); } catch (e) { err(new Error("Code incorrect. Réessayez.")); } };
actions["mfa-remove"] = async (b) => { if (!confirmOnce("mfa-remove")) return toast("Cliquez à nouveau pour confirmer le retrait.");
  try { await api.mfaUnenroll(b.dataset.id); dropStaff(); await store.refreshSecurity(); toast("Facteur retiré"); rerender(); } catch (e) { err(new Error("Retrait impossible : reconnectez-vous avec votre code puis réessayez.")); } };
changes.push(t => { if (t.id !== "mfa-req") return false; api.requireMfa(t.checked).then(() => { toast(t.checked ? "Double authentification obligatoire pour l’équipe" : "Obligation retirée"); dropStaff("sec"); rerender(); }).catch(e => { t.checked = !t.checked; err(e); }); return true; });
forms["av-form"] = async () => {
  const days = [...document.querySelectorAll('input[name="av-day"]:checked')].map(x => +x.value);
  const s = $("#av-start").value, e = $("#av-end").value; if (days.length && s >= e) return toast("L’heure de fin doit suivre l’heure de début.");
  try { await api.setAvailability(days.length ? { days, start: s, end: e } : {}, Math.max(1, Math.min(336, +$("#av-hrs").value || 48)), $("#av-text").value.trim(), $("#av-delay").value.trim()); dropStaff("agenda"); toast("Disponibilités enregistrées"); rerender(); } catch (e2) { err(e2); }
};
forms["pw-form"] = async () => { const a = $("#pw-1").value, b = $("#pw-2").value; if (a.length < 10) return toast("10 caractères minimum."); if (a !== b) return toast("Les deux mots de passe diffèrent.");
  try { await api.updatePassword(a); $("#pw-1").value = $("#pw-2").value = ""; toast("Mot de passe modifié"); } catch (e) { err(e); } };
let pending = null; const confirmOnce = (k) => { if (pending === k) { pending = null; return true; } pending = k; setTimeout(() => { if (pending === k) pending = null; }, 4000); return false; };

/* ---------- Vérification en deux étapes à la connexion ---------- */
export function sVerify() {
  return `<section class="section"><div class="wrap narrow" style="margin:0 auto"><form class="card stack" id="mfa-login" style="max-width:420px;margin:0 auto">
   <span class="eyebrow">Connexion sécurisée</span><h1 class="h-page" style="font-size:1.8rem">Code de vérification</h1>
   <p class="muted">Saisissez le code à 6 chiffres affiché par votre application d’authentification.</p>
   <div class="field"><label class="flabel" for="mfa-login-code">Code</label><input id="mfa-login-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" autofocus></div>
   <button class="btn btn-primary" type="submit">Vérifier</button>
   <button class="linkbtn small" type="button" data-act="logout" style="align-self:flex-start">Se déconnecter</button></form></div></section>`;
}
forms["mfa-login"] = async () => {
  const code = $("#mfa-login-code").value.trim(); if (!/^\d{6}$/.test(code)) return toast("Saisissez le code à 6 chiffres.");
  try { const f = (await api.mfaFactors()).find(x => x.status === "verified"); await api.mfaVerify(f.id, code); dropStaff(); await store.reloadAfterMfa(); go("accompagnante"); }
  catch (e) { toast("Code incorrect ou expiré."); }
};
