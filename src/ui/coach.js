// Espace accompagnante — distinct du compte participant. Chaque consultation passe par des
// fonctions tracées (access_log). Le journal personnel des participants n'est jamais accessible.
import { esc, icon, fmtDate, fmtShort, fmtTime, toast, $ } from "./util.js";
import { ui, actions, forms, changes, rerender, go } from "./state.js";
import { C, S, api } from "../store.js";

const PLAN = { ecrit: "Accompagnement écrit", appels: "Accompagnement par appels", autonome: "Autonome" };
const ST = { demande: "À confirmer", confirme: "Confirmé", effectue: "Effectué", annule: "Annulé", manque: "Manqué" };
const REF = { hors_cadre: "Besoin hors du cadre de l’accompagnement", besoin_evaluation: "Besoin d’une évaluation par un professionnel", securite: "Préoccupation pour la sécurité", autre: "Autre" };
const KLAB = { suivi: "Accompagnement écrit", question: "Question", pratique: "Pratique" };
const cs = ui.coach;

async function load(what, id){
  try {
    if (what === "list") cs.list = await api.coachParticipants();
    if (what === "cal") cs.calendar = await api.coachCalendar();
    if (what === "one") { cs.data = await api.coachParticipant(id); cs.current = id; }
  } catch(e) { console.error(e); toast("Chargement impossible.");
    if (what === "list") cs.list = cs.list || []; if (what === "cal") cs.calendar = cs.calendar || [];
    if (what === "one") { go("accompagnante-participants"); return; } }
  rerender();
}
const NAV = [["accompagnante","Tableau de bord","home"],["accompagnante-participants","Participants","list"],["accompagnante-messages","Messages","chat"],["accompagnante-agenda","Agenda","cal"]];
function shell(inner, active){
  return `<div class="wrap app"><nav class="side" aria-label="Espace accompagnante"><div class="who"><span class="eyebrow">Espace accompagnante</span><div class="who-name">${esc(S.coachProfile?.display_name || S.user.name)}</div><span class="small muted">${esc(S.coachProfile?.public_title || "")}</span></div>
   ${NAV.map(([k,l,i])=>`<button data-go="${k}" ${active===k?'aria-current="page"':""}>${icon(i)}<span>${l}</span></button>`).join("")}
   <button data-act="logout">${icon("out")}<span>Se déconnecter</span></button></nav>
   <div class="stack-lg fade-in" style="min-width:0">${inner}
   <p class="small muted">${icon("lock")} Vos consultations sont enregistrées dans le journal de traçabilité. Le journal personnel des participants n’est pas accessible.</p></div></div>`;
}
const H = (t, lede="") => `<div class="stack" style="gap:6px"><span class="eyebrow">Espace accompagnante</span><h1 class="h-page">${t}</h1>${lede?`<p class="muted">${lede}</p>`:""}</div>`;
const loading = `<p class="muted">Chargement…</p>`;

export function cDash(){
  if (!cs.list) { load("list"); return shell(H("Tableau de bord") + loading, "accompagnante"); }
  if (!cs.calendar) { load("cal"); }
  const L = cs.list, cal = cs.calendar || [];
  const soon = cal.filter(a => ["demande","confirme"].includes(a.status) && new Date(a.starts_at) > new Date());
  const toConfirm = soon.filter(a => a.status === "demande");
  const unread = L.reduce((s,p)=>s+p.unread,0), refs = L.reduce((s,p)=>s+p.open_referrals,0), att = L.reduce((s,p)=>s+(p.needs_attention||0),0);
  return shell(`${H(`Bonjour, ${esc(S.user.name)}`, "Voici ce qui demande votre attention aujourd’hui.")}
   <div class="kpis">${[["Participants accompagnés",L.length],["Messages non lus",unread],["Rendez-vous à confirmer",toConfirm.length],["Rendez-vous à venir",soon.length],["Orientations ouvertes",refs]].map(([l,v])=>`<div class="kpi"><span class="small muted">${l}</span><b>${v}</b></div>`).join("")}</div>
   ${att ? `<div class="notice" role="alert">${icon("flag")}<span><b>${att} questionnaire${att>1?"s":""} à revoir en priorité.</b> Aucune décision n’est prise automatiquement : appliquez la procédure de sécurité validée.</span></div>` : ""}
   <div class="grid g2">
    <section class="card stack"><h2 class="h-sub">Messages en attente</h2>${L.filter(p=>p.unread).map(p=>`<button class="row-btn" data-act="c-open" data-id="${p.enrolment_id}"><b>${esc(p.first_name)}</b><span class="small muted">${PLAN[p.plan]}</span><span class="pill-count">${p.unread}</span></button>`).join("") || `<p class="muted small">Aucun message en attente.</p>`}</section>
    <section class="card stack"><h2 class="h-sub">Prochains rendez-vous</h2>${soon.slice(0,5).map(a=>`<button class="row-btn" data-act="c-open" data-id="${a.enrolment_id}"><b>${fmtShort(a.starts_at)} · ${fmtTime(a.starts_at)}</b><span>${esc(a.first_name)} · échange ${a.session_number}</span><span class="badge ${a.status==="confirme"?"ok":""}">${ST[a.status]}</span></button>`).join("") || `<p class="muted small">Aucun rendez-vous à venir.</p>`}</section>
   </div>`, "accompagnante");
}

export function cParticipants(){
  if (!cs.list) { load("list"); return shell(H("Participants") + loading, "accompagnante-participants"); }
  const f = cs.filters;
  const progs = [...new Map(cs.list.map(p => [p.programme_id, p.programme])).entries()];
  const rows = cs.list.filter(p => (f.programme==="all"||p.programme_id===f.programme) && (f.plan==="all"||p.plan===f.plan) && (f.week==="all"||String(p.current_week)===f.week));
  return shell(`${H("Participants accompagnés")}
   <div class="row filters">
    <label class="small" for="cf-prog">Programme</label><select id="cf-prog" class="sel-inline"><option value="all">Tous</option>${progs.map(([id,t])=>`<option value="${id}" ${f.programme===id?"selected":""}>${esc(t)}</option>`).join("")}</select>
    <label class="small" for="cf-plan">Forfait</label><select id="cf-plan" class="sel-inline"><option value="all">Tous</option><option value="ecrit" ${f.plan==="ecrit"?"selected":""}>Accompagnement écrit</option><option value="appels" ${f.plan==="appels"?"selected":""}>Accompagnement par appels</option></select>
    <label class="small" for="cf-week">Semaine</label><select id="cf-week" class="sel-inline"><option value="all">Toutes</option>${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${f.week===String(n)?"selected":""}>Semaine ${n}</option>`).join("")}</select>
   </div>
   <div class="table-wrap"><table><thead><tr><th>Participant</th><th>Programme</th><th>Forfait</th><th class="c">Semaine</th><th class="c">Non lus</th><th>Prochain rendez-vous</th><th class="c">Orientations</th><th></th></tr></thead><tbody>
    ${rows.map(p=>`<tr><td><b>${esc(p.first_name)}</b></td><td>${esc(p.programme)}</td><td>${PLAN[p.plan]}</td><td class="c num">${p.current_week}</td><td class="c num">${p.unread||"—"}</td><td class="num">${p.next_appointment?fmtDate(p.next_appointment,true):"—"}</td><td class="c num">${p.open_referrals||"—"}</td><td><button class="btn btn-soft btn-sm" data-act="c-open" data-id="${p.enrolment_id}">Ouvrir</button></td></tr>`).join("") || `<tr><td colspan="8" class="muted">Aucun participant ne correspond à ces filtres.</td></tr>`}
   </tbody></table></div>`, "accompagnante-participants");
}
changes.push(t => { const m = { "cf-prog": "programme", "cf-plan": "plan", "cf-week": "week" }[t.id]; if (!m) return false; cs.filters[m] = t.value; rerender(); return true; });
actions["c-open"] = (b) => { cs.data = null; go(`accompagnante-p-${b.dataset.id}`); };

export function cMessages(){
  if (!cs.list) { load("list"); return shell(H("Messages") + loading, "accompagnante-messages"); }
  const L = [...cs.list].sort((a,b)=>b.unread-a.unread);
  return shell(`${H("Messages", "Ouvrez le dossier d’un participant pour lire et répondre.")}
   <div class="stack">${L.map(p=>`<button class="row-btn" data-act="c-open" data-id="${p.enrolment_id}"><b>${esc(p.first_name)}</b><span class="small muted">${PLAN[p.plan]} · semaine ${p.current_week}</span>${p.unread?`<span class="pill-count">${p.unread} non lu${p.unread>1?"s":""}</span>`:`<span class="small muted">À jour</span>`}</button>`).join("")}</div>`, "accompagnante-messages");
}

export function cAgenda(){
  if (!cs.calendar) { load("cal"); return shell(H("Agenda") + loading, "accompagnante-agenda"); }
  const byDay = {};
  cs.calendar.forEach(a => { const k = new Date(a.starts_at).toDateString(); (byDay[k] = byDay[k] || []).push(a); });
  return shell(`${H("Agenda", "Échanges de 15 minutes du forfait 3.")}
   ${Object.entries(byDay).map(([k, list]) => `<section class="stack" style="gap:8px"><h2 class="h-sub">${fmtDate(list[0].starts_at)}</h2>
    ${list.map(a => apptRow(a, true)).join("")}</section>`).join("") || `<p class="muted">Aucun rendez-vous.</p>`}`, "accompagnante-agenda");
}
function apptRow(a, withName){
  const future = new Date(a.starts_at) > new Date();
  return `<div class="appt"><div class="stack" style="gap:2px"><b>${fmtTime(a.starts_at)}${withName?` · ${esc(a.first_name)}`:""}</b><span class="small muted">Échange ${a.session_number} · ${a.mode==="video"?"Vidéo":"Téléphone"}${a.participant_note?` · « ${esc(a.participant_note)} »`:""}</span></div>
   <span class="badge ${a.status==="confirme"||a.status==="effectue"?"ok":""}">${ST[a.status]}</span>
   <div class="row" style="gap:6px">${a.status==="demande"?`<button class="btn btn-primary btn-sm" data-act="c-appt" data-id="${a.id}" data-s="confirme">Confirmer</button>`:""}
    ${a.status==="confirme"&&!future?`<button class="btn btn-soft btn-sm" data-act="c-appt" data-id="${a.id}" data-s="effectue">Effectué</button><button class="btn btn-soft btn-sm" data-act="c-appt" data-id="${a.id}" data-s="manque">Manqué</button>`:""}
    ${["demande","confirme"].includes(a.status)&&future?`<button class="linkbtn small" data-act="c-appt" data-id="${a.id}" data-s="annule">Annuler</button>`:""}
    ${withName?`<button class="linkbtn small" data-act="c-open" data-id="${a.enrolment_id}">Dossier</button>`:""}</div></div>`;
}
actions["c-appt"] = async (b) => {
  try { await api.coachAppointment(b.dataset.id, b.dataset.s); toast("Rendez-vous mis à jour"); }
  catch(e) { console.error(e); toast("Action impossible."); }
  cs.calendar = null; cs.list = null; if (cs.current) { cs.data = null; } rerender();
};

export function cParticipant(id){
  if (!cs.data || cs.current !== id) { load("one", id); return shell(H("Dossier participant") + loading, "accompagnante-participants"); }
  const d = cs.data, e = d.enrolment, ecrit = e.plan === "ecrit";
  const kinds = ecrit ? [["suivi","Accompagnement écrit de la semaine"],["pratique","Information pratique"]] : [["pratique","Information pratique ou administrative"]];
  const weeksDone = e.weeks_completed || [];
  const tabs = [["messages","Messages"],...(ecrit?[]:[["rdv","Rendez-vous"]]),["partage","Bilans et objectifs"],["notes","Notes professionnelles"],["orientation","Orientation"],["ressources","Ressources"],["historique","Historique"]];
  const tab = ui.coachTab || "messages";
  let body = "";
  if (tab === "messages") body = `<div class="thread">${d.messages.map(m=>`<div class="msg ${m.from_participant?"":"mine"}"><div class="msg-meta">${m.from_participant?esc(e.first_name):"Vous"} · ${fmtDate(m.created_at,true)} · <span class="tag">${KLAB[m.kind]}</span></div><p>${esc(m.body)}</p></div>`).join("") || `<p class="muted small">Aucun message.</p>`}</div>
    <form class="stack" id="c-msgform"><div class="field"><label class="flabel" for="cm-kind">Type</label><select id="cm-kind">${kinds.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="cm-body">Votre réponse</label><textarea id="cm-body" rows="5" maxlength="5000"></textarea><span class="hint">Restez dans le cadre de l’accompagnement : pas de diagnostic, pas de traitement. Si la situation le nécessite, utilisez l’onglet Orientation.</span></div>
     <button class="btn btn-primary" type="submit" style="align-self:flex-start">${icon("send")}Envoyer</button></form>`;
  else if (tab === "rdv") body = `<div class="stack">${[1,2,3,4,5,6].map(n => { const a = d.appointments.filter(x=>x.session_number===n).slice(-1)[0]; return a ? apptRow({ ...a, first_name: e.first_name }, false).replace('<b>', `<b>${fmtDate(a.starts_at)} · `) : `<div class="appt"><b>Échange ${n}</b><span class="small muted">Pas encore demandé</span></div>`; }).join("")}</div>`;
  else if (tab === "partage") body = `${e.share_summaries ? (d.summaries.length ? d.summaries.map(s=>`<article class="entry"><span class="small muted">Semaine ${s.week_number} · partagé le ${fmtDate(s.shared_at)}</span><pre class="entry-body pre">${esc(s.body)}</pre></article>`).join("") : `<p class="muted small">Aucun bilan partagé pour l’instant.</p>`) : `<p class="muted small">${icon("lock")} Le participant n’a pas autorisé le partage de ses bilans.</p>`}
     <h3 class="h-card">Objectifs</h3>${e.share_goals ? (d.goals.length ? `<ul class="hist">${d.goals.map(g=>`<li><span class="tag">${g.scope==="principal"?"Principal":"Semaine "+g.week_number}</span><span>${esc(g.title)}${(g.actions||[]).length?` <span class="small muted">· ${g.actions.filter(a=>a.done).length}/${g.actions.length} actions</span>`:""}${g.obstacles?`<br><span class="small muted">Obstacles : ${esc(g.obstacles)}</span>`:""}</span></li>`).join("")}</ul>` : `<p class="muted small">Aucun objectif.</p>`) : `<p class="muted small">${icon("lock")} Le participant n’a pas autorisé le partage de ses objectifs.</p>`}
     <h3 class="h-card">Questionnaires</h3>${d.questionnaires === null ? `<p class="muted small">Non activés pour ce participant. Ils ne sont jamais proposés au forfait Autonome.</p>` : d.questionnaires.map(q=>`<div class="appt"><b>${q.instrument} · semaine ${q.week_number}</b><span>${q.needs_attention?`<span class="badge warn">Revue prioritaire</span>`:""} Total ${q.total}</span>${q.reviewed_at?`<span class="small muted">Revu le ${fmtDate(q.reviewed_at)}</span>`:`<button class="btn btn-soft btn-sm" data-act="c-review" data-id="${q.id}">Marquer comme revu</button>`}</div>`).join("") || `<p class="muted small">Aucun questionnaire.</p>`}`;
  else if (tab === "notes") body = `<p class="small muted">${icon("lock")} Visibles par vous uniquement. Rédigez des notes factuelles et nécessaires au suivi.</p>
     <form class="stack" id="c-noteform"><label class="sr" for="cn-body">Nouvelle note</label><textarea id="cn-body" rows="3" placeholder="Nouvelle note professionnelle"></textarea><button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Ajouter la note</button></form>
     ${d.notes.map(n=>`<article class="entry"><span class="small muted">${fmtDate(n.created_at,true)}</span><p class="entry-body">${esc(n.body)}</p></article>`).join("")}`;
  else if (tab === "orientation") body = `<p class="small muted">Pour une demande qui dépasse le cadre de l’accompagnement ou nécessite une intervention appropriée. Suivez la procédure d’orientation validée par LE SEUIL.</p>
     <form class="stack card-flat" id="c-refform"><div class="field"><label class="flabel" for="cr-cat">Motif</label><select id="cr-cat">${Object.entries(REF).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="cr-desc">Description</label><textarea id="cr-desc" rows="3"></textarea></div>
      <div class="field"><label class="flabel" for="cr-act">Action engagée</label><textarea id="cr-act" rows="2" placeholder="Par exemple : orientation vers le médecin traitant, information sur les numéros d’urgence"></textarea></div>
      <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">${icon("flag")}Enregistrer la demande d’orientation</button></form>
     ${d.referrals.map(r=>`<article class="entry"><div class="row" style="justify-content:space-between"><span class="tag ${r.status==="ouverte"?"warn":""}">${r.status==="ouverte"?"Ouverte":"Clôturée"}</span><span class="small muted">${fmtDate(r.created_at,true)}</span></div><b>${REF[r.category]}</b>${r.description?`<p>${esc(r.description)}</p>`:""}${r.action_taken?`<p class="small muted">Action : ${esc(r.action_taken)}</p>`:""}
       ${r.status==="ouverte"?`<button class="btn btn-soft btn-sm" data-act="c-closeref" data-id="${r.id}" style="align-self:flex-start">Clôturer</button>`:""}</article>`).join("")}`;
  else if (tab === "ressources") body = `<form class="stack card-flat" id="c-sugform"><div class="field"><label class="flabel" for="cs-ref">Ressource</label><select id="cs-ref">
      <optgroup label="Articles de la bibliothèque">${C.articles.filter(a=>a.status==="published").map(a=>`<option value="article|${a.id}|${esc(a.title)}">${esc(a.title)}</option>`).join("")}</optgroup>
      <optgroup label="Programmes">${C.programmes.map(p=>`<option value="programme|${p.slug}|${esc(p.title)}">${esc(p.title)}</option>`).join("")}</optgroup></select></div>
      <div class="field"><label class="flabel" for="cs-note">Message au participant (facultatif)</label><input id="cs-note" type="text" maxlength="300"></div>
      <label class="check"><input type="checkbox" id="cs-ok"><span>J’ai vérifié que cette ressource est adaptée à la situation de ce participant.</span></label>
      <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Proposer</button><p id="cs-out" class="small" role="status"></p></form>
     ${d.suggestions.map(s=>`<div class="ex-item">${icon("leaf")}<b>${esc(s.title)}</b><span class="small muted">${fmtDate(s.created_at)}</span></div>`).join("")}`;
  else body = `<ul class="hist">${d.history.map(h=>`<li><span class="small muted">${fmtDate(h.created_at,true)}</span><span>${esc(h.action.replace(/_/g," "))}</span></li>`).join("") || `<li class="muted">Aucun historique.</li>`}</ul>`;
  return shell(`<div class="stack" style="gap:6px"><button class="linkbtn small" data-go="accompagnante-participants" style="align-self:flex-start">${icon("back")} Participants</button>
     <h1 class="h-page">${esc(e.first_name)}</h1><p class="muted">${esc(e.programme)} · ${PLAN[e.plan]} · inscrit le ${fmtDate(e.created_at)}</p></div>
   <div class="weeks-strip">${[1,2,3,4,5,6].map(n=>`<span class="${weeksDone.includes(n)?"done":""}">S${n}</span>`).join("")}</div>
   <div class="row small"><span class="tag ${e.share_summaries?"":"mute"}">${e.share_summaries?"Bilans partagés":"Bilans non partagés"}</span><span class="tag ${e.share_goals?"":"mute"}">${e.share_goals?"Objectifs partagés":"Objectifs non partagés"}</span><span class="tag mute">${icon("lock")}Journal privé</span></div>
   <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" data-act="c-tab" data-v="${k}" aria-selected="${tab===k}">${l}</button>`).join("")}</div>
   <section class="card stack">${body}</section>`, "accompagnante-participants");
}
actions["c-tab"] = (b) => { ui.coachTab = b.dataset.v; rerender(); };
const reload = () => { const id = cs.current; cs.data = null; cs.list = null; load("one", id); };
forms["c-msgform"] = async () => { const body = $("#cm-body").value.trim(); if (!body) return; try { await api.coachSend(cs.current, $("#cm-kind").value, body); toast("Message envoyé"); reload(); } catch(e) { console.error(e); toast("Envoi impossible pour ce forfait."); } };
forms["c-noteform"] = async () => { const body = $("#cn-body").value.trim(); if (!body) return; await api.coachNote(cs.current, body); toast("Note ajoutée"); reload(); };
forms["c-refform"] = async () => { await api.coachReferral(cs.current, $("#cr-cat").value, $("#cr-desc").value.trim(), $("#cr-act").value.trim()); toast("Demande d’orientation enregistrée"); reload(); };
forms["c-sugform"] = async () => {
  if (!$("#cs-ok").checked) { $("#cs-out").textContent = "Confirmez d’abord la revue d’adéquation."; return; }
  const [kind, ref, title] = $("#cs-ref").value.split("|"); await api.coachSuggest(cs.current, kind, ref, title, $("#cs-note").value.trim()); toast("Ressource proposée"); reload();
};
actions["c-closeref"] = async (b) => { await api.coachCloseReferral(b.dataset.id, ""); toast("Orientation clôturée"); reload(); };
actions["c-review"] = async (b) => { try { await api.coachReviewQuestionnaire(b.dataset.id, ""); reload(); } catch(e) { toast("Questionnaires désactivés."); } };
export function resetCoachCache(){ cs.list = null; cs.calendar = null; cs.data = null; cs.current = null; }
