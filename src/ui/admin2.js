// Administration (suite) : demandes d'inscription, participants (comptes créés par l'administration),
// Bibliothèque éditoriale (relecture, aperçu, publication, versions).
import { esc, icon, fmtDate, toast, $ } from "./util.js";
import { ui, actions, forms, changes, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";
import { CATEGORIES } from "./library.js";

const A = ui.admin;
const PLAN = { autonome: "Formule 1 · Autonome", ecrit: "Formule 2 · Écrit", appels: "Formule 3 · Appels" };
const PAY = { non_paye: "Non payé", en_attente: "Paiement en attente", paye: "Payé", offert: "Offert" };
const ADM = { en_attente: "Admission en attente", admis: "Admis", refuse: "Refusé" };
const REQ = { nouvelle: "Nouvelle", en_cours: "En cours", acceptee: "Acceptée", refusee: "Refusée" };
const ETAT = { brouillon: "Brouillon", a_relire: "À relire", publie: "Publié" };
const loading = `<p class="muted">Chargement…</p>`;
const H = (t, extra = "", lede = "") => `<div class="section-head" style="margin:0"><div class="stack" style="gap:6px"><span class="eyebrow">Administration</span><h1 class="h-page">${t}</h1>${lede ? `<p class="muted">${lede}</p>` : ""}</div>${extra}</div>`;
async function need(key, fn) {
  if (A[key] !== undefined || A["_l_" + key]) return;
  A["_l_" + key] = true;
  try { A[key] = await fn(); } catch (e) { console.error(e); A[key] = null; toast("Chargement impossible."); }
  A["_l_" + key] = false; rerender();
}
const drop = (...k) => k.forEach(x => delete A[x]);
const d10 = (d) => d ? new Date(d).toISOString().slice(0, 10) : "";
const fromDate = (v, end) => v ? new Date(v + (end ? "T23:59:59" : "T00:00:00")).toISOString() : null;
const err = (e) => toast(e?.message || "Action impossible.");

/* ---------- Demandes d'inscription ---------- */
export function aRequests(shell) {
  need("requests", () => api.requests());
  const list = A.requests || [];
  const f = ui.reqFilter || "ouvertes";
  const rows = list.filter(r => f === "toutes" || (f === "ouvertes" ? ["nouvelle", "en_cours"].includes(r.status) : r.status === f));
  const prog = (slug) => C.programmes.find(p => p.slug === slug)?.title || slug;
  return shell(`${H("Demandes d’inscription", "", "Une demande ne crée pas de compte. Après vérification de la demande, de l’adéquation du programme et du paiement, créez le participant.")}
   <div class="chips">${[["ouvertes", "À traiter"], ["acceptee", "Acceptées"], ["refusee", "Refusées"], ["toutes", "Toutes"]].map(([k, l]) => `<button class="chip" data-act="req-filter" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
   <div class="stack">${A.requests ? rows.map(r => `<article class="card stack req" style="gap:10px">
     <div class="row" style="justify-content:space-between"><b>${esc(r.first_name)} ${esc(r.last_name)}</b><span class="badge ${r.status === "acceptee" ? "ok" : r.status === "refusee" ? "mute" : "warn"}">${REQ[r.status]}</span></div>
     <p class="small">${esc(prog(r.programme_slug))} · ${PLAN[r.plan] || r.plan}</p>
     <p class="small muted">${esc(r.email)}${r.phone ? " · " + esc(r.phone) : ""} · reçue le ${fmtDate(r.created_at)}</p>
     ${r.message ? `<p class="small entry-body">« ${esc(r.message)} »</p>` : ""}
     <div class="field"><label class="flabel" for="rn-${r.id}">Note interne</label><input id="rn-${r.id}" type="text" value="${esc(r.admin_note || "")}" maxlength="500"></div>
     <div class="row">${["nouvelle", "en_cours"].includes(r.status) ? `<button class="btn btn-primary btn-sm" data-act="req-create" data-id="${r.id}">${icon("user")}Créer le participant</button>
       <button class="btn btn-soft btn-sm" data-act="req-status" data-id="${r.id}" data-s="en_cours">Marquer en cours</button><button class="btn btn-soft btn-sm" data-act="req-status" data-id="${r.id}" data-s="refusee">Refuser</button>` : ""}
      <button class="btn btn-soft btn-sm" data-act="req-note" data-id="${r.id}">Enregistrer la note</button></div></article>`).join("") || `<p class="muted">Aucune demande.</p>` : loading}</div>`, "demandes");
}
actions["req-filter"] = (b) => { ui.reqFilter = b.dataset.v; rerender(); };
actions["req-status"] = async (b) => { try { await api.updateRequest(b.dataset.id, { status: b.dataset.s, admin_note: $("#rn-" + b.dataset.id)?.value || null }); drop("requests"); toast("Demande mise à jour"); rerender(); } catch (e) { err(e); } };
actions["req-note"] = async (b) => { try { await api.updateRequest(b.dataset.id, { admin_note: $("#rn-" + b.dataset.id).value || null }); drop("requests"); toast("Note enregistrée"); rerender(); } catch (e) { err(e); } };
actions["req-create"] = (b) => { const r = (A.requests || []).find(x => x.id === b.dataset.id); ui.newParticipant = { ...r, fromRequest: r.id }; ui.adminTab = "participants"; go("admin"); };

/* ---------- Participants ---------- */
export function aParticipants(shell) {
  need("participants", () => api.participants()); need("team", () => api.team());
  const coaches = (A.team || []).filter(t => t.role === "coach");
  const progs = C.programmes;
  const np = ui.newParticipant;
  const q = (ui.partQuery || "").toLowerCase();
  const rows = (A.participants || []).filter(r => !q || `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(q));
  const users = [...new Map(rows.map(r => [r.user_id, r])).values()];
  const sel = ui.partSel;
  const form = np ? `<form class="card stack" id="np-form" novalidate><h2 class="h-sub" style="margin:0">Nouveau participant</h2>
    ${np.fromRequest ? `<p class="small muted">Prérempli depuis la demande de ${esc(np.first_name)} ${esc(np.last_name)}.</p>` : ""}
    <div class="grid g3" style="gap:12px">
     <div class="field"><label class="flabel" for="np-first">Prénom *</label><input id="np-first" type="text" value="${esc(np.first_name || "")}" required></div>
     <div class="field"><label class="flabel" for="np-last">Nom *</label><input id="np-last" type="text" value="${esc(np.last_name || "")}" required></div>
     <div class="field"><label class="flabel" for="np-mail">E-mail (identifiant) *</label><input id="np-mail" type="email" value="${esc(np.email || "")}" required></div></div>
    <div class="grid g3" style="gap:12px">
     <div class="field"><label class="flabel" for="np-prog">Programme attribué *</label><select id="np-prog">${progs.map(p => `<option value="${p.uuid}" ${np.programme_slug === p.slug ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="np-plan">Formule *</label><select id="np-plan">${Object.entries(PLAN).map(([k, l]) => `<option value="${k}" ${np.plan === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="np-coach">Accompagnante (formules 2 et 3)</label><select id="np-coach"><option value="">—</option>${coaches.map(c => `<option value="${c.id}">${esc(c.first_name)}</option>`).join("")}</select></div></div>
    <div class="grid g3" style="gap:12px">
     <div class="field"><label class="flabel" for="np-pay">État du paiement *</label><select id="np-pay">${Object.entries(PAY).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select><span class="hint">Les leçons ne s’ouvrent que si le paiement est « Payé » ou « Offert » et l’admission « Admis ».</span></div>
     <div class="field"><label class="flabel" for="np-adm">Admission *</label><select id="np-adm">${Object.entries(ADM).map(([k, l]) => `<option value="${k}" ${k === "admis" ? "selected" : ""}>${l}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="np-lang">Langue</label><select id="np-lang"><option value="fr">Français</option><option value="en">English</option></select></div></div>
    <div class="grid g2" style="gap:12px">
     <div class="field"><label class="flabel" for="np-start">Début de l’accès</label><input id="np-start" type="date" value="${d10(new Date())}"></div>
     <div class="field"><label class="flabel" for="np-end">Fin de l’accès</label><input id="np-end" type="date" value="${d10(new Date(Date.now() + 70 * 864e5))}"><span class="hint">Six semaines de programme, plus une marge.</span></div></div>
    <div class="field"><label class="flabel" for="np-note">Note administrative protégée (facultatif)</label><textarea id="np-note" rows="2" maxlength="5000"></textarea><span class="hint">Visible par l’administration uniquement. Aucune information clinique.</span></div>
    <label class="check"><input type="checkbox" id="np-consent"><span>Le consentement du participant au traitement de ses données et aux conditions du service a été recueilli. *</span></label>
    <label class="check"><input type="checkbox" id="np-send" checked><span>Envoyer maintenant l’e-mail d’accès (lien à usage unique pour choisir son mot de passe). Décochez pour créer le compte sans l’activer.</span></label>
    <div class="row"><button class="btn btn-primary" type="submit">Créer le participant</button><button type="button" class="btn btn-soft" data-act="np-cancel">Annuler</button></div><p id="np-out" class="small" role="status"></p></form>` : "";
  const detail = sel ? participantDetail(sel, coaches) : "";
  return shell(`${H("Participants", np ? "" : `<button class="btn btn-primary" data-act="np-open">${icon("plus")}Nouveau participant</button>`, "Seule l’administration crée les comptes. Aucune inscription publique n’est possible.")}
   ${DEMO ? `<div class="notice">${icon("info")}<span>Maquette : aucun e-mail n’est réellement envoyé.</span></div>` : ""}
   ${form}${detail}
   <label class="search">${icon("search")}<span class="sr">Rechercher</span><input id="part-q" type="search" placeholder="Rechercher un participant" value="${esc(ui.partQuery || "")}"></label>
   <div class="table-wrap"><table><thead><tr><th>Participant</th><th>Programme</th><th>Formule</th><th>Paiement</th><th>Admission</th><th>Accès jusqu’au</th><th>Compte</th><th></th></tr></thead><tbody>
    ${A.participants ? rows.map(r => `<tr><td><b>${esc(r.first_name)} ${esc(r.last_name)}</b><div class="small muted">${esc(r.email || "")}</div></td><td>${esc(r.programme)}</td><td>${PLAN[r.plan]}</td>
      <td><span class="badge ${["paye", "offert"].includes(r.payment_status) ? "ok" : "warn"}">${PAY[r.payment_status]}</span></td><td><span class="badge ${r.admission_status === "admis" ? "ok" : "warn"}">${ADM[r.admission_status]}</span></td>
      <td class="num">${r.access_expires_at ? fmtDate(r.access_expires_at) : "—"}</td>
      <td>${r.account_status === "suspended" ? `<span class="badge warn">Suspendu</span>` : r.suspended ? `<span class="badge warn">Programme suspendu</span>` : r.must_set_password ? `<span class="badge mute">Accès non activé</span>` : `<span class="badge ok">Actif</span>`}</td>
      <td><button class="btn btn-soft btn-sm" data-act="part-open" data-id="${r.user_id}">Gérer</button></td></tr>`).join("") || `<tr><td colspan="8" class="muted">Aucun participant.</td></tr>` : `<tr><td colspan="8">${loading}</td></tr>`}
   </tbody></table></div>
   <p class="small muted">${users.length} participant${users.length > 1 ? "s" : ""}. L’accès à un programme ne donne jamais accès aux autres programmes.</p>`, "participants");
}
changes.push(t => { if (t.id !== "part-q") return false; ui.partQuery = t.value; rerender(); return true; });
actions["np-open"] = () => { ui.newParticipant = {}; ui.partSel = null; rerender(); };
actions["np-cancel"] = () => { ui.newParticipant = null; rerender(); };
actions["part-open"] = (b) => { ui.partSel = b.dataset.id; ui.newParticipant = null; drop("notes_" + b.dataset.id); rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); };
actions["part-close"] = () => { ui.partSel = null; rerender(); };
forms["np-form"] = async (f) => {
  const out = (m, ok) => { const el = $("#np-out"); el.textContent = m; el.style.color = ok ? "var(--ok)" : "var(--warn-fg)"; };
  const d = { first_name: $("#np-first").value.trim(), last_name: $("#np-last").value.trim(), email: $("#np-mail").value.trim(), programme_id: $("#np-prog").value,
    plan: $("#np-plan").value, coach_id: $("#np-coach").value || null, payment_status: $("#np-pay").value, admission_status: $("#np-adm").value, locale: $("#np-lang").value,
    access_starts_at: fromDate($("#np-start").value), access_expires_at: fromDate($("#np-end").value, true), admin_note: $("#np-note").value.trim(),
    consent_recorded: $("#np-consent").checked, send_now: $("#np-send").checked };
  if (!d.first_name || !d.last_name || !/^\S+@\S+\.\S+$/.test(d.email)) return out("Prénom, nom et e-mail valides sont requis.");
  if (d.plan !== "autonome" && !d.coach_id) return out("Choisissez une accompagnante pour les formules 2 et 3.");
  if (!d.consent_recorded) return out("Le consentement du participant doit avoir été recueilli.");
  if (d.send_now && d.admission_status !== "admis") return out("Admettez le participant avant d’envoyer l’accès, ou décochez l’envoi.");
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    const r = await api.createParticipant(d);
    const from = ui.newParticipant?.fromRequest;
    if (from) await api.updateRequest(from, { status: "acceptee" });
    ui.newParticipant = null; drop("participants", "requests"); ui.partSel = r.user_id;
    toast(r.invited ? "Participant créé. L’e-mail d’accès a été envoyé." : "Participant créé, accès non encore envoyé."); rerender();
  } catch (e) { out(e.message || "Création impossible."); btn.disabled = false; }
};

function participantDetail(userId, coaches) {
  const rows = (A.participants || []).filter(r => r.user_id === userId);
  if (!rows.length) return "";
  const p = rows[0];
  need("notes_" + userId, () => api.adminNotes(userId));
  const notes = A["notes_" + userId] || [];
  const owned = new Set(rows.map(r => r.programme_id));
  const other = C.programmes.filter(x => !owned.has(x.uuid));
  return `<section class="card stack part-detail" aria-labelledby="pd-h">
   <div class="row" style="justify-content:space-between"><div><h2 class="h-sub" id="pd-h" style="margin:0">${esc(p.first_name)} ${esc(p.last_name)}</h2><p class="small muted">${esc(p.email || "")} · ${p.last_sign_in_at ? "dernière connexion le " + fmtDate(p.last_sign_in_at) : "jamais connecté"}</p></div>
    <button class="linkbtn small" data-act="part-close">Fermer</button></div>
   <div class="row">
    <button class="btn btn-soft btn-sm" data-act="part-access" data-id="${userId}" ${p.account_status === "suspended" ? "disabled" : ""}>${icon("send")}${p.must_set_password ? "Envoyer l’accès" : "Renvoyer un lien d’accès"}</button>
    ${p.account_status === "suspended" ? `<button class="btn btn-soft btn-sm" data-act="part-status" data-id="${userId}" data-s="active">Réactiver le compte</button>` : `<button class="btn btn-soft btn-sm" data-act="part-status" data-id="${userId}" data-s="suspended">Suspendre le compte</button>`}
   </div>
   ${rows.map(r => `<form class="card-lite stack enr-form" data-eid="${r.enrolment_id}" id="enr-${r.enrolment_id}">
     <div class="row" style="justify-content:space-between"><b>${esc(r.programme)}</b><span class="small muted">${r.weeks_completed} / 6 semaines terminées</span></div>
     <div class="grid g3" style="gap:10px">
      <div class="field"><label class="flabel" for="e-plan-${r.enrolment_id}">Formule</label><select id="e-plan-${r.enrolment_id}">${Object.entries(PLAN).map(([k, l]) => `<option value="${k}" ${r.plan === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="e-coach-${r.enrolment_id}">Accompagnante</label><select id="e-coach-${r.enrolment_id}"><option value="">—</option>${coaches.map(c => `<option value="${c.id}" ${r.coach_id === c.id ? "selected" : ""}>${esc(c.first_name)}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="e-pay-${r.enrolment_id}">Paiement</label><select id="e-pay-${r.enrolment_id}">${Object.entries(PAY).map(([k, l]) => `<option value="${k}" ${r.payment_status === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="e-adm-${r.enrolment_id}">Admission</label><select id="e-adm-${r.enrolment_id}">${Object.entries(ADM).map(([k, l]) => `<option value="${k}" ${r.admission_status === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="e-start-${r.enrolment_id}">Début de l’accès</label><input type="date" id="e-start-${r.enrolment_id}" value="${d10(r.access_starts_at)}"></div>
      <div class="field"><label class="flabel" for="e-end-${r.enrolment_id}">Fin de l’accès</label><input type="date" id="e-end-${r.enrolment_id}" value="${d10(r.access_expires_at)}"></div></div>
     <div class="row"><label class="check small"><input type="checkbox" id="e-susp-${r.enrolment_id}" ${r.suspended ? "checked" : ""}><span>Suspendre l’accès à ce programme</span></label>
      <label class="check small"><input type="checkbox" id="e-q-${r.enrolment_id}" ${r.questionnaires_enabled ? "checked" : ""}><span>Questionnaires (formules 2 et 3, si le dispositif est validé)</span></label></div>
     <div class="row"><button class="btn btn-primary btn-sm" type="submit">Enregistrer</button><button type="button" class="btn btn-soft btn-sm" data-act="enr-extend" data-eid="${r.enrolment_id}">Prolonger de 4 semaines</button></div></form>`).join("")}
   ${other.length ? `<form class="card-lite stack" id="add-enr" data-uid="${userId}"><b>Attribuer un autre programme</b>
     <div class="grid g3" style="gap:10px"><div class="field"><label class="flabel" for="ae-prog">Programme</label><select id="ae-prog">${other.map(x => `<option value="${x.uuid}">${esc(x.title)}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="ae-plan">Formule</label><select id="ae-plan">${Object.entries(PLAN).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="ae-pay">Paiement</label><select id="ae-pay">${Object.entries(PAY).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div></div>
     <button class="btn btn-soft btn-sm" type="submit" style="align-self:flex-start">${icon("plus")}Attribuer (admission en attente)</button></form>` : ""}
   <div class="stack" style="gap:8px"><b>Notes administratives protégées</b>
    <form class="row" id="note-form" data-uid="${userId}" style="flex-wrap:nowrap"><label class="sr" for="an-body">Nouvelle note</label><input id="an-body" type="text" maxlength="5000" placeholder="Note administrative (aucune information clinique)"><button class="btn btn-soft btn-sm" type="submit">Ajouter</button></form>
    ${notes.map(n => `<p class="small"><span class="muted">${fmtDate(n.created_at)} ·</span> ${esc(n.body)}</p>`).join("")}</div>
  </section>`;
}
forms["add-enr"] = async (f) => { try { await api.addEnrolment(f.dataset.uid, { programme_id: $("#ae-prog").value, plan: $("#ae-plan").value, payment_status: $("#ae-pay").value, admission_status: "en_attente" }); drop("participants"); toast("Programme attribué (admission en attente)"); rerender(); } catch (e) { err(e); } };
forms["note-form"] = async (f) => { const b = $("#an-body").value.trim(); if (!b) return; try { await api.addAdminNote(f.dataset.uid, b); drop("notes_" + f.dataset.uid); rerender(); } catch (e) { err(e); } };
forms["enr-form-any"] = null;
document.addEventListener("submit", async (e) => {
  const f = e.target; if (!f.classList?.contains("enr-form")) return;
  e.preventDefault();
  const id = f.dataset.eid, g = (k) => $(`#e-${k}-${id}`);
  const plan = g("plan").value;
  if (plan !== "autonome" && !g("coach").value) return toast("Choisissez une accompagnante pour les formules 2 et 3.");
  try {
    await api.saveEnrolment({ enrolment_id: id, plan, coach_id: g("coach").value || null, questionnaires_enabled: g("q").checked, status: "active",
      payment_status: g("pay").value, admission_status: g("adm").value, access_starts_at: fromDate(g("start").value), access_expires_at: fromDate(g("end").value, true), suspended: g("susp").checked });
    drop("participants"); toast("Inscription mise à jour"); rerender();
  } catch (e2) { err(e2); }
});
actions["enr-extend"] = (b) => { const el = $(`#e-end-${b.dataset.eid}`); const base = el.value ? new Date(el.value) : new Date(); base.setDate(base.getDate() + 28); el.value = d10(base); toast("Nouvelle date proposée : pensez à enregistrer"); };
actions["part-access"] = async (b) => { try { const r = await api.sendAccess(b.dataset.id); drop("participants"); toast(r?.method === "recovery" ? "Lien de réinitialisation envoyé" : "E-mail d’accès envoyé"); rerender(); } catch (e) { err(e); } };
actions["part-status"] = async (b) => { try { await api.setAccountStatus(b.dataset.id, b.dataset.s); drop("participants"); toast(b.dataset.s === "suspended" ? "Compte suspendu" : "Compte réactivé"); rerender(); } catch (e) { err(e); } };

/* ---------- Bibliothèque (CMS éditorial) ---------- */
const sectionsToText = (secs) => (secs || []).map(s => `## ${s.h}\n\n${(s.p || []).join("\n\n")}`).join("\n\n");
const textToSections = (t) => { const out = []; let cur = null; String(t || "").split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).forEach(c => {
  if (c.startsWith("## ")) { cur = { h: c.slice(3).trim(), p: [] }; out.push(cur); } else { if (!cur) { cur = { h: "", p: [] }; out.push(cur); } cur.p.push(c.replace(/\s*\n\s*/g, " ")); } }); return out; };
export function aLibrary(shell) {
  need("articles", async () => (await api.content(true)).articles);
  const list = A.articles || [];
  const fs = ui.libAdminEtat || "tous", fc = ui.libAdminCat || "toutes", q = (ui.libAdminQ || "").toLowerCase();
  const rows = list.filter(a => (fs === "tous" || a.etat === fs) && (fc === "toutes" || a.cat === fc) && (!q || a.title.toLowerCase().includes(q))).sort((a, b) => (a.order || 0) - (b.order || 0));
  const counts = { brouillon: 0, a_relire: 0, publie: 0 }; list.forEach(a => counts[a.etat] = (counts[a.etat] || 0) + 1);
  const ed = ui.editing && ui.editing.startsWith("art:") ? (ui.editing === "art:new" ? { slug: "new", title: "", cat: CATEGORIES[0], excerpt: "", sections: [], retenir: "", refs: [], related: [], etat: "brouillon", featured: false, sensitive: false, review_required: false, review_done: false, order: list.length + 1 } : list.find(a => a.slug === ui.editing.slice(4))) : null;
  return shell(`${H("La Bibliothèque", ed ? "" : `<button class="btn btn-primary" data-act="art-new">${icon("plus")}Nouvel article</button>`, "Relisez, corrigez puis publiez. Un article n’est visible du public qu’au statut « Publié ».")}
   <div class="kpis">${Object.entries(ETAT).map(([k, l]) => `<div class="kpi"><span class="small muted">${l}</span><b>${counts[k] || 0}</b></div>`).join("")}<div class="kpi"><span class="small muted">Revue professionnelle requise</span><b>${list.filter(a => a.review_required && !a.review_done).length}</b></div></div>
   ${ed ? articleEditor(ed) : ""}
   <div class="row filters"><label class="search grow">${icon("search")}<span class="sr">Rechercher</span><input id="la-q" type="search" placeholder="Rechercher un titre" value="${esc(ui.libAdminQ || "")}"></label>
    <label class="sr" for="la-etat">Statut</label><select id="la-etat" class="sel-inline"><option value="tous">Tous les statuts</option>${Object.entries(ETAT).map(([k, l]) => `<option value="${k}" ${fs === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label class="sr" for="la-cat">Catégorie</label><select id="la-cat" class="sel-inline"><option value="toutes">Toutes les catégories</option>${CATEGORIES.map(c => `<option ${fc === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
   <div class="table-wrap"><table><thead><tr><th>N°</th><th>Titre</th><th>Catégorie</th><th>Statut</th><th>Revue pro</th><th></th></tr></thead><tbody>
    ${A.articles ? rows.map(a => `<tr><td class="num">${a.order || ""}</td><td><b>${esc(a.title)}</b>${a.featured ? ` <span class="tag gold">À la une</span>` : ""}</td><td class="small">${esc(a.cat)}</td>
      <td><span class="badge ${a.etat === "publie" ? "ok" : a.etat === "a_relire" ? "warn" : "mute"}">${ETAT[a.etat]}</span></td>
      <td class="small">${a.review_required ? (a.review_done ? `<span class="badge ok">Faite</span>` : `<span class="badge warn">Requise</span>`) : "—"}</td>
      <td><div class="row" style="flex-wrap:nowrap"><button class="btn btn-soft btn-sm" data-act="art-edit" data-id="${esc(a.slug)}">Modifier</button><button class="btn btn-soft btn-sm" data-go="article-${esc(a.slug)}">Aperçu</button></div></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Aucun article.</td></tr>` : `<tr><td colspan="6">${loading}</td></tr>`}
   </tbody></table></div>`, "bibliotheque");
}
changes.push(t => { const m = { "la-q": "libAdminQ", "la-etat": "libAdminEtat", "la-cat": "libAdminCat" }[t.id]; if (!m) return false; ui[m] = t.value; rerender(); return true; });
actions["art-new"] = () => { ui.editing = "art:new"; rerender(); };
actions["art-edit"] = (b) => { ui.editing = "art:" + b.dataset.id; drop("versions"); rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); };
actions["art-cancel"] = () => { ui.editing = null; rerender(); };

function articleEditor(a) {
  if (a.uuid) need("versions", () => api.articleVersions(a.uuid));
  return `<form class="card stack" id="art-form" data-slug="${esc(a.slug)}"><h2 class="h-sub" style="margin:0">${a.slug === "new" ? "Nouvel article" : "Modifier l’article"}</h2>
   <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="ar-title">Titre</label><input id="ar-title" type="text" value="${esc(a.title)}" required></div>
    <div class="field"><label class="flabel" for="ar-cat">Catégorie</label><select id="ar-cat">${CATEGORIES.map(c => `<option ${a.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div></div>
   <div class="field"><label class="flabel" for="ar-ex">Chapeau (extrait de 1 à 2 phrases)</label><textarea id="ar-ex" rows="3">${esc(a.excerpt)}</textarea></div>
   <div class="field"><label class="flabel" for="ar-body">Corps de l’article</label><textarea id="ar-body" rows="14">${esc(sectionsToText(a.sections))}</textarea><span class="hint">« ## » en début de ligne pour un intertitre ; une ligne vide entre les paragraphes.</span></div>
   <div class="field"><label class="flabel" for="ar-ret">À retenir</label><input id="ar-ret" type="text" value="${esc(a.retenir)}"></div>
   <div class="field"><label class="flabel" for="ar-refs">Références (une par ligne)</label><textarea id="ar-refs" rows="4">${esc((a.refs || []).join("\n"))}</textarea></div>
   <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="ar-rel">Articles liés (identifiants, un par ligne)</label><textarea id="ar-rel" rows="3">${esc((a.related || []).join("\n"))}</textarea></div>
    <div class="stack" style="gap:8px"><div class="field"><label class="flabel" for="ar-img">Image (adresse, facultatif)</label><input id="ar-img" type="text" value="${esc(a.image_url || "")}"></div>
     <div class="field"><label class="flabel" for="ar-alt">Texte alternatif de l’image</label><input id="ar-alt" type="text" value="${esc(a.image_alt || "")}"></div></div></div>
   <div class="grid g3" style="gap:12px"><div class="field"><label class="flabel" for="ar-order">Ordre</label><input id="ar-order" type="text" inputmode="numeric" value="${a.order || ""}"></div>
    <label class="check"><input type="checkbox" id="ar-feat" ${a.featured ? "checked" : ""}><span>À la une</span></label><div class="field"><label class="flabel" for="ar-forder">Position à la une</label><input id="ar-forder" type="text" inputmode="numeric" value="${a.featured_order || ""}"></div></div>
   <label class="check"><input type="checkbox" id="ar-sens" ${a.sensitive ? "checked" : ""}><span>Article sensible : afficher la bannière « Ces informations sont générales… ».</span></label>
   <label class="check"><input type="checkbox" id="ar-revreq" ${a.review_required ? "checked" : ""}><span>Revue par un professionnel qualifié requise avant publication (post-partum, pensées suicidaires, traumatisme, mineurs).</span></label>
   <label class="check"><input type="checkbox" id="ar-revdone" ${a.review_done ? "checked" : ""}><span>La revue professionnelle a été effectuée.</span></label>
   <div class="field"><label class="flabel" for="ar-etat">Statut</label><select id="ar-etat">${Object.entries(ETAT).map(([k, l]) => `<option value="${k}" ${a.etat === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <span class="hint">Vérifiez qu’aucun passage ne prétend poser un diagnostic, remplacer des soins, offrir un suivi d’urgence ou promettre la guérison.</span></div>
   <div class="row"><button class="btn btn-primary" type="submit">Enregistrer</button>${a.slug !== "new" ? `<button type="button" class="btn btn-soft" data-go="article-${esc(a.slug)}">${icon("eye")}Aperçu</button>` : ""}<button type="button" class="btn btn-soft" data-act="art-cancel">Fermer</button></div>
   <p id="ar-out" class="small" role="status"></p>
   ${a.uuid ? `<details><summary class="linkbtn">Versions précédentes (${(A.versions || []).length})</summary><ul class="hist" style="margin-top:8px">${(A.versions || []).map(v => `<li><span class="small muted">${fmtDate(v.created_at, true)}</span><span>${esc(v.snapshot?.title || "")} · ${ETAT[v.snapshot?.etat] || ""}</span><button type="button" class="linkbtn small" data-act="art-restore" data-v="${v.id}">Restaurer dans l’éditeur</button></li>`).join("") || "<li class='muted small'>Aucune version antérieure.</li>"}</ul></details>` : ""}
  </form>`;
}
actions["art-restore"] = (b) => {
  const v = (A.versions || []).find(x => String(x.id) === b.dataset.v)?.snapshot; if (!v) return;
  $("#ar-title").value = v.title || ""; $("#ar-ex").value = v.excerpt || ""; $("#ar-body").value = sectionsToText(v.sections); $("#ar-ret").value = v.retenir || "";
  toast("Version chargée dans l’éditeur : enregistrez pour la restaurer");
};
forms["art-form"] = async (f) => {
  const out = (m) => { $("#ar-out").textContent = m; $("#ar-out").style.color = "var(--warn-fg)"; };
  const slug = f.dataset.slug, prev = (A.articles || []).find(a => a.slug === slug);
  const title = $("#ar-title").value.trim(); if (!title) return out("Ajoutez un titre.");
  const sections = textToSections($("#ar-body").value);
  const words = ($("#ar-ex").value + " " + $("#ar-body").value).split(/\s+/).filter(Boolean).length;
  const d = { title, cat: $("#ar-cat").value, excerpt: $("#ar-ex").value.trim(), sections, retenir: $("#ar-ret").value.trim(), refs: $("#ar-refs").value.split("\n").map(x => x.trim()).filter(Boolean),
    related: $("#ar-rel").value.split("\n").map(x => x.trim()).filter(Boolean), read: Math.max(1, Math.ceil(words / 200)), etat: $("#ar-etat").value, featured: $("#ar-feat").checked,
    featured_order: parseInt($("#ar-forder").value) || null, order: parseInt($("#ar-order").value) || 0, sensitive: $("#ar-sens").checked, review_required: $("#ar-revreq").checked,
    review_done: $("#ar-revdone").checked, wasReviewed: !!prev?.review_done, image_url: $("#ar-img").value.trim(), image_alt: $("#ar-alt").value.trim(),
    slug: title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70), hue: "sage" };
  if (d.image_url && !d.image_alt) return out("Ajoutez un texte alternatif pour l’image.");
  if (d.etat === "publie" && d.review_required && !d.review_done) return out("Cet article doit être relu par un professionnel qualifié avant publication.");
  try { await api.saveArticle(slug, d); drop("articles", "versions"); ui.editing = null; await store.loadContent(); toast(d.etat === "publie" ? "Article publié" : "Article enregistré"); rerender(); }
  catch (e) { out(e.message?.includes("relu") ? "Cet article doit être relu par un professionnel qualifié avant publication." : "Enregistrement impossible."); }
};
