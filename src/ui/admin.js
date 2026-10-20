// Administration : contenus (programmes, semaines, leçons, vidéos, exercices, articles), inscriptions,
// équipe et accompagnantes, fonctionnalités, contact, confidentialité et traçabilité.
// L'administration ne voit jamais les réflexions, exercices ou journaux des participants.
import { esc, icon, fmtDate, toast, $, blocksToText, textToBlocks } from "./util.js";
import { ui, actions, forms, changes, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";

const A = ui.admin;
const TABS = [["vue","Vue d’ensemble","chart"],["programmes","Programmes","path"],["articles","Articles","book"],["inscriptions","Inscriptions","users"],["equipe","Équipe et accompagnantes","user"],["fonctionnalites","Fonctionnalités","bell"],["contact","Messages de contact","chat"],["confidentialite","Confidentialité et traçabilité","shield"]];
const PLAN = { autonome: "Autonome", ecrit: "Accompagnement écrit", appels: "Accompagnement par appels" };
const ROLE = { member: "Participant", editor: "Rédaction", coach: "Accompagnante", admin: "Administration" };
const STATUS = { draft: "Brouillon", demo: "Maquette (visible)", published: "Publié", archived: "Archivé" };
const ART_CATS = ["Comprendre ses émotions","Le quotidien et le bien-être","Parentalité","Vie professionnelle","Déconstruire les idées reçues","Paroles de professionnels"];

async function need(key, fn){
  if (A[key] !== undefined || A["_l_"+key]) return;
  A["_l_"+key] = true;
  try { A[key] = await fn(); } catch(e) { console.error(e); A[key] = null; toast("Chargement impossible."); }
  A["_l_"+key] = false; rerender();
}
const drop = (...keys) => keys.forEach(k => { delete A[k]; });
const loading = `<p class="muted">Chargement…</p>`;
function shell(inner, tab){
  return `<div class="wrap app"><nav class="side" aria-label="Administration"><div class="who"><span class="eyebrow">Administration</span><div class="who-name">${esc(S.user.name)}</div><span class="small muted">${ROLE[S.user.role]}</span></div>
   ${TABS.filter(([k]) => S.user.role === "admin" || ["programmes","articles"].includes(k)).map(([k,l,i])=>`<button data-act="a-tab" data-v="${k}" ${tab===k?'aria-current="page"':""}>${icon(i)}<span>${l}</span></button>`).join("")}
   <button data-act="logout">${icon("out")}<span>Se déconnecter</span></button></nav><div class="stack-lg fade-in" style="min-width:0">${inner}</div></div>`;
}
const H = (t, extra="", lede="") => `<div class="section-head" style="margin:0"><div class="stack" style="gap:6px"><span class="eyebrow">Administration</span><h1 class="h-page">${t}</h1>${lede?`<p class="muted">${lede}</p>`:""}</div>${extra}</div>`;
actions["a-tab"] = async (b) => { ui.adminTab = b.dataset.v; ui.editing = null; ui.confirm = null; drop("overview","stats","enrolments","team","coaches","privacy","contact","log","referrals","programmes","articles"); A.prog = null; A.progId = null; await store.loadContent(); go("admin"); };

export function aMain(){
  const t = ui.adminTab;
  if (S.user.role === "editor" && !["programmes","articles"].includes(t)) ui.adminTab = "programmes";
  return ({ vue: aOverview, programmes: aProgrammes, articles: aArticles, inscriptions: aEnrolments, equipe: aTeam, fonctionnalites: aFlags, contact: aContact, confidentialite: aPrivacy }[ui.adminTab] || aOverview)();
}

/* ---------- Vue d'ensemble ---------- */
function aOverview(){
  need("overview", () => api.overview()); need("stats", () => api.stats(store.PROGRAMME_SLUG));
  const o = A.overview || {}, st = A.stats || [];
  const suppressed = st.length && st[0].completed === null;
  return shell(`${H("Vue d’ensemble")}
   ${DEMO?`<div class="notice">${icon("info")}<span>Maquette : chiffres issus des données fictives de ce navigateur.</span></div>`:""}
   <div class="kpis">${[["Participants",o.members],["Accompagnantes",o.coaches],["Inscriptions",o.enrolments],["Articles publiés",o.published_articles],["Orientations ouvertes",o.open_referrals],["Demandes de confidentialité",o.open_privacy_requests],["Messages non lus",o.unread_contact]].map(([l,v])=>`<div class="kpi"><span class="small muted">${l}</span><b>${A.overview?v??0:"…"}</b></div>`).join("")}</div>
   <div class="card stack"><h2 class="h-sub">Participants ayant terminé chaque semaine</h2><p class="small muted">Valeurs agrégées uniquement. Les réponses, journaux et messages des participants ne sont jamais accessibles à l’administration.</p>
    ${suppressed?`<p class="muted">Moins de 5 inscriptions : chiffres masqués pour protéger l’anonymat.</p>`:`<div class="bars">${st.map(s=>{const v = s.enrolled?Math.round(s.completed/s.enrolled*100):0;return `<div class="bar-row"><span>Semaine ${s.week_number}</span><span class="track"><i style="width:${v}%"></i></span><span class="num">${v} %</span></div>`;}).join("")||loading}</div>`}</div>`, "vue");
}

/* ---------- Éditeur de programmes ---------- */
function aProgrammes(){
  need("programmes", async () => (await api.content(true)).programmes);
  return shell(`${H("Programmes", `<button class="btn btn-primary" data-act="a-newprog">${icon("plus")}Nouveau programme</button>`, "Créez et modifiez les programmes sans toucher au code. Le catalogue peut accueillir onze programmes.")}
   ${ui.editing==="newprog" ? `<form class="card stack" id="a-newprogform"><div class="grid g3" style="gap:12px"><div class="field"><label class="flabel" for="np-title">Titre</label><input id="np-title" type="text" required></div>
     <div class="field"><label class="flabel" for="np-code">Numéro</label><input id="np-code" type="text" placeholder="02"></div><div class="field"><label class="flabel" for="np-slug">Identifiant d’adresse</label><input id="np-slug" type="text" placeholder="sommeil"></div></div>
     <p class="small muted">Six semaines vides seront créées. Le programme reste en brouillon tant que vous ne le publiez pas.</p><div class="row"><button class="btn btn-primary btn-sm" type="submit">Créer</button><button type="button" class="btn btn-soft btn-sm" data-act="a-cancel">Annuler</button></div></form>` : ""}
   <div class="table-wrap"><table><thead><tr><th>N°</th><th>Programme</th><th>Statut</th><th>Questionnaires</th><th></th></tr></thead><tbody>
    ${A.programmes ? A.programmes.map(p=>`<tr><td class="num">${esc(p.code||"—")}</td><td><b>${esc(p.title)}</b></td><td><span class="badge ${p.status==="published"?"ok":""}">${STATUS[p.status]}</span></td><td>${p.questionnaires_enabled?"Activés":"Désactivés"}</td><td><button class="btn btn-soft btn-sm" data-act="a-openprog" data-id="${p.uuid}">Modifier</button></td></tr>`).join("") : `<tr><td colspan="5">${loading}</td></tr>`}
   </tbody></table></div>`, "programmes");
}
actions["a-newprog"] = () => { ui.editing = "newprog"; rerender(); };
actions["a-cancel"] = () => { ui.editing = null; rerender(); };
forms["a-newprogform"] = async () => {
  const title = $("#np-title").value.trim(); if (!title) return;
  const slug = ($("#np-slug").value.trim() || title).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const p = await api.saveProgramme({ title, slug, code: $("#np-code").value.trim(), summary: "", intro: "", objectives: [], status: "draft", measures: C.programme?.measures || [], hue: "forest" });
  ui.editing = null; drop("programmes"); toast("Programme créé"); go(`admin-programme-${p.uuid}`);
};
actions["a-openprog"] = (b) => go(`admin-programme-${b.dataset.id}`);

async function loadProg(id){
  const all = (await api.content(true)).programmes; A.prog = all.find(p => p.uuid === id); A.weeks = await api.weeks(id); A.progId = id;
}
export function aProgramme(id){
  if (A.progId !== id || !A.prog) { if (!A._lp) { A._lp = true; loadProg(id).then(()=>{ A._lp = false; rerender(); }); } return shell(loading, "programmes"); }
  const p = A.prog, m = p.measures?.[0] || {};
  return shell(`<div class="stack" style="gap:6px"><button class="linkbtn small" data-act="a-tab" data-v="programmes" style="align-self:flex-start">${icon("back")} Programmes</button><h1 class="h-page">${esc(p.title)}</h1></div>
   <form class="card stack" id="a-progform">
    <div class="grid g3" style="gap:12px"><div class="field"><label class="flabel" for="pg-title">Titre</label><input id="pg-title" type="text" value="${esc(p.title)}"></div>
     <div class="field"><label class="flabel" for="pg-code">Numéro</label><input id="pg-code" type="text" value="${esc(p.code||"")}"></div>
     <div class="field"><label class="flabel" for="pg-status">Statut</label><select id="pg-status">${Object.entries(STATUS).map(([k,l])=>`<option value="${k}" ${p.status===k?"selected":""}>${l}</option>`).join("")}</select></div></div>
    <div class="field"><label class="flabel" for="pg-sum">Résumé</label><textarea id="pg-sum" rows="2">${esc(p.summary)}</textarea></div>
    <div class="field"><label class="flabel" for="pg-intro">Présentation</label><textarea id="pg-intro" rows="4">${esc(Array.isArray(p.intro)?p.intro.join("\n\n"):p.intro)}</textarea></div>
    <div class="field"><label class="flabel" for="pg-obj">Objectifs pédagogiques (un par ligne)</label><textarea id="pg-obj" rows="4">${esc((p.objectives||[]).join("\n"))}</textarea></div>
    <div class="field"><label class="flabel" for="pg-measure">Autoévaluation 0–10 (question posée au début et dans chaque bilan)</label><input id="pg-measure" type="text" value="${esc(m.label||"")}"></div>
    <label class="check"><input type="checkbox" id="pg-q" ${p.questionnaires_enabled?"checked":""}><span>Autoriser les questionnaires PHQ-9 / GAD-7 pour ce programme (forfaits 2 et 3 uniquement). <b>À n’activer qu’après validation de la supervision, de la revue des résultats, du consentement et de la réponse aux risques.</b> Ils restent désactivés tant que la fonctionnalité générale et l’activation par participant ne sont pas faites.</span></label>
    <div class="row"><button class="btn btn-primary" type="submit">Enregistrer</button><button type="button" class="btn btn-soft" data-act="a-preview" data-n="1">${icon("eye")}Prévisualiser</button></div></form>
   <h2 class="h-sub">Les six semaines</h2>
   <div class="stack">${A.weeks.map(w=>`<div class="ex-item"><span class="kind-ico">${w.n}</span><div class="stack" style="gap:2px;min-width:0"><b>${esc(w.title)}</b><span class="small muted">${w.steps.length} étapes · ${w.steps.filter(s=>s.kind==="lecon").length} leçons · ${w.steps.filter(s=>s.kind==="video").length} vidéos · ${w.steps.filter(s=>["exercice","bilan"].includes(s.kind)).length} exercices et bilans</span></div><button class="btn btn-soft btn-sm" data-go="admin-semaine-${p.uuid}-${w.n}">Modifier</button></div>`).join("")}</div>`, "programmes");
}
forms["a-progform"] = async () => {
  const p = A.prog, m = p.measures?.[0] || { key: "impact", min: "Pas du tout", max: "Énormément" };
  const label = $("#pg-measure").value.trim();
  const upd = { ...p, title: $("#pg-title").value.trim(), code: $("#pg-code").value.trim(), status: $("#pg-status").value, summary: $("#pg-sum").value.trim(), intro: $("#pg-intro").value.trim(),
    objectives: $("#pg-obj").value.split("\n").map(x=>x.trim()).filter(Boolean), questionnaires_enabled: $("#pg-q").checked, measures: label ? [{ ...m, label }] : [] };
  try { await api.saveProgramme(upd); A.prog = upd; drop("programmes"); await store.loadContent(); toast(upd.status==="draft"?"Enregistré (brouillon, non visible)":"Programme enregistré"); rerender(); }
  catch(e) { console.error(e); toast("Enregistrement impossible."); }
};
actions["a-preview"] = (b) => { C.weeks = A.weeks; C.programme = A.prog; go(`apercu-${b.dataset.n||1}-0`); };

const KINDS = { lecon: "Leçon", video: "Vidéo", exercice: "Exercice", reflexion: "Réflexion", bilan: "Bilan" };
export function aWeek(pid, n){
  if (A.progId !== pid) { A.prog = null; return aProgramme(pid); }
  const w = A.weeks.find(x => x.n === n); if (!w) return shell(`<p class="muted">Semaine introuvable.</p>`, "programmes");
  return shell(`<div class="stack" style="gap:6px"><button class="linkbtn small" data-go="admin-programme-${pid}" style="align-self:flex-start">${icon("back")} ${esc(A.prog.title)}</button><h1 class="h-page">Semaine ${n}</h1></div>
   <form class="card stack" id="a-weekform"><div class="field"><label class="flabel" for="wk-title">Titre de la semaine</label><input id="wk-title" type="text" value="${esc(w.title)}"></div>
    <div class="field"><label class="flabel" for="wk-intro">Message d’accueil</label><textarea id="wk-intro" rows="3">${esc(w.intro)}</textarea></div>
    <div class="row"><button class="btn btn-primary btn-sm" type="submit">Enregistrer</button><button type="button" class="btn btn-soft btn-sm" data-act="a-preview" data-n="${n}">${icon("eye")}Prévisualiser la semaine</button></div></form>
   <div class="section-head" style="margin:0"><h2 class="h-sub" style="margin:0">Étapes</h2><div class="row">${Object.entries(KINDS).map(([k,l])=>`<button class="btn btn-soft btn-sm" data-go="admin-etape-${pid}-${n}-new-${k}">${icon("plus")}${l}</button>`).join("")}</div></div>
   <div class="stack">${w.steps.map((s,i)=>`<div class="ex-item"><span class="tag">${KINDS[s.kind]}</span><div class="stack" style="gap:2px;min-width:0"><b>${esc(s.title)}</b><span class="small muted">${s.required?"Obligatoire":"Facultatif"}${s.content?.component?` · ${esc(s.content.component)}`:""}${s.kind==="video"?(s.content?.url?" · vidéo en ligne":" · vidéo à produire"):""}</span></div>
     <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn btn-soft btn-sm" data-act="a-move" data-i="${i}" data-d="-1" aria-label="Monter" ${i===0?"disabled":""}>${icon("up")}</button><button class="btn btn-soft btn-sm" data-act="a-move" data-i="${i}" data-d="1" aria-label="Descendre" ${i===w.steps.length-1?"disabled":""}>${icon("down")}</button>
      <button class="btn btn-soft btn-sm" data-go="admin-etape-${pid}-${n}-${i}">Modifier</button>
      ${ui.confirm===s.uuid?`<button class="btn btn-primary btn-sm" data-act="a-delstep" data-id="${s.uuid}">Confirmer</button>`:`<button class="btn btn-soft btn-sm" data-act="a-askdel" data-id="${s.uuid}" aria-label="Supprimer">${icon("trash")}</button>`}</div></div>`).join("") || `<p class="muted">Aucune étape.</p>`}</div>`, "programmes");
}
const curWeek = () => A.weeks.find(x => x.n === ui.params[1]);
forms["a-weekform"] = async () => { const w = curWeek(); w.title = $("#wk-title").value.trim(); w.intro = $("#wk-intro").value.trim(); await api.saveWeek(w); toast("Semaine enregistrée"); };
actions["a-move"] = async (b) => { const w = curWeek(), i = +b.dataset.i, j = i + +b.dataset.d; [w.steps[i], w.steps[j]] = [w.steps[j], w.steps[i]]; await api.reorderSteps(w.steps); rerender(); };
actions["a-askdel"] = (b) => { ui.confirm = b.dataset.id; rerender(); };
actions["a-delstep"] = async (b) => { const w = curWeek(); await api.deleteStep(b.dataset.id); w.steps = w.steps.filter(s => s.uuid !== b.dataset.id); await api.reorderSteps(w.steps); ui.confirm = null; toast("Étape supprimée"); rerender(); };

export function aStep(pid, n, idx, newKind){
  if (A.progId !== pid) { A.prog = null; return aProgramme(pid); }
  const w = A.weeks.find(x => x.n === n);
  const s = idx === "new" ? { kind: newKind, title: "", required: newKind !== "video", content: newKind === "bilan" ? { component: "form", fields: [] } : newKind === "reflexion" ? { component: "journal", prompt: "" } : newKind === "exercice" ? { component: "form", fields: [] } : {} } : w.steps[+idx];
  const c = s.content || {};
  const { component, intro, main, optional, prompt, url, captions_url, transcript, duration, production, blocks, placeholder, source, paragraphs, ...cfg } = c;
  let specific = "";
  if (s.kind === "lecon") specific = `<div class="field"><label class="flabel" for="st-blocks">Texte de la leçon</label><textarea id="st-blocks" rows="14">${esc(blocksToText(blocks || (paragraphs||[]).map(t=>({t:"p",text:t}))))}</textarea>
     <span class="hint">Une ligne vide sépare les paragraphes. « - » pour une liste, « 1. » pour une liste numérotée, « ## » pour un intertitre.</span></div>`;
  else if (s.kind === "video") specific = `<div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="st-url">Adresse de la vidéo (MP4)</label><input id="st-url" type="text" value="${esc(url||"")}"><label class="btn btn-soft btn-sm file-btn">${icon("download")}Téléverser une vidéo<input type="file" accept="video/mp4,video/webm" data-upload="st-url"></label></div>
     <div class="field"><label class="flabel" for="st-cap">Sous-titres (.vtt)</label><input id="st-cap" type="text" value="${esc(captions_url||"")}"><label class="btn btn-soft btn-sm file-btn">${icon("download")}Téléverser des sous-titres<input type="file" accept=".vtt,text/vtt" data-upload="st-cap"></label></div></div>
     <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="st-dur">Durée</label><input id="st-dur" type="text" value="${esc(duration||"")}"></div><div class="field"><label class="flabel" for="st-prod">Note de production (non visible des participants)</label><input id="st-prod" type="text" value="${esc(production||"")}"></div></div>
     <div class="field"><label class="flabel" for="st-tr">Transcription</label><textarea id="st-tr" rows="8">${esc(transcript||"")}</textarea><span class="hint">Affichée sous la vidéo, et seule si la vidéo n’est pas encore en ligne.</span></div>`;
  else specific = `<div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="st-comp">Composant</label><select id="st-comp">${[["form","Formulaire (champs, échelles, choix, listes)"],["repeat","Fiche répétable"],["quiz","Quiz"],["journal","Question de réflexion (journal)"],["breath","Respiration guidée"]].map(([k,l])=>`<option value="${k}" ${component===k?"selected":""}>${l}</option>`).join("")}</select></div>
      <label class="check" style="align-self:end"><input type="checkbox" id="st-main" ${main?"checked":""}><span>Exercice principal de la semaine</span></label></div>
     <div class="field"><label class="flabel" for="st-intro">Consigne</label><textarea id="st-intro" rows="3">${esc(intro||"")}</textarea></div>
     ${component==="journal"||s.kind==="reflexion" ? `<div class="field"><label class="flabel" for="st-prompt">Question de réflexion</label><input id="st-prompt" type="text" value="${esc(prompt||"")}"></div>` : ""}
     <div class="field"><label class="flabel" for="st-cfg">Configuration avancée (JSON)</label><textarea id="st-cfg" rows="12" class="mono">${esc(JSON.stringify(cfg, null, 2))}</textarea>
      <span class="hint">Champs : {"fields":[{"k":"situation","label":"La situation","type":"textarea","required":true}]}. Types : text, textarea, scale, rating, choice, checks, repeat, goal, share. Quiz : {"options":[…],"items":[{"t":"…","a":"…"}],"explanation":"…"}.</span></div>`;
  return shell(`<div class="stack" style="gap:6px"><button class="linkbtn small" data-go="admin-semaine-${pid}-${n}" style="align-self:flex-start">${icon("back")} Semaine ${n}</button><h1 class="h-page">${idx==="new"?"Nouvelle étape":esc(s.title)}</h1><span class="tag" style="align-self:flex-start">${KINDS[s.kind]}</span></div>
   <form class="card stack" id="a-stepform" data-idx="${idx}" data-kind="${s.kind}">
    <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="st-title">Titre</label><input id="st-title" type="text" value="${esc(s.title)}" required></div>
     <div class="stack" style="gap:6px;align-self:end"><label class="check"><input type="checkbox" id="st-req" ${s.required?"checked":""}><span>Obligatoire pour terminer la semaine</span></label><label class="check"><input type="checkbox" id="st-opt" ${optional?"checked":""}><span>Afficher « facultatif »</span></label></div></div>
    ${specific}
    <div class="row"><button class="btn btn-primary" type="submit">Enregistrer</button><button type="button" class="btn btn-soft" data-go="admin-semaine-${pid}-${n}">Annuler</button></div><p id="st-out" class="small" role="status"></p></form>`, "programmes");
}
changes.push(t => {
  if (!t.dataset.upload) return false;
  const f = t.files?.[0]; if (!f) return true;
  toast("Téléversement…");
  api.uploadMedia(f).then(url => { $("#"+t.dataset.upload).value = url; toast("Fichier téléversé"); }).catch(e => { console.error(e); toast("Téléversement impossible."); });
  return true;
});
forms["a-stepform"] = async (f) => {
  const w = curWeek(), idx = f.dataset.idx, kind = f.dataset.kind;
  const old = idx === "new" ? null : w.steps[+idx];
  let content = {};
  if (kind === "lecon") content = { blocks: textToBlocks($("#st-blocks").value) };
  else if (kind === "video") content = { url: $("#st-url").value.trim(), captions_url: $("#st-cap").value.trim(), duration: $("#st-dur").value.trim(), production: $("#st-prod").value.trim(), transcript: $("#st-tr").value.trim() };
  else {
    let cfg; try { cfg = JSON.parse($("#st-cfg").value || "{}"); } catch(e) { $("#st-out").textContent = "La configuration avancée n’est pas un JSON valide : " + e.message; return; }
    content = { ...cfg, component: $("#st-comp").value, intro: $("#st-intro").value.trim(), main: $("#st-main").checked };
    if ($("#st-prompt")) content.prompt = $("#st-prompt").value.trim();
  }
  if ($("#st-opt").checked) content.optional = true;
  const step = { uuid: old?.uuid, key: old?.key || kind[0] + Date.now().toString(36), kind, title: $("#st-title").value.trim(), required: $("#st-req").checked, content, position: old ? old.position : w.steps.length };
  if (!step.title) { $("#st-out").textContent = "Ajoutez un titre."; return; }
  try { await api.saveStep(w.uuid, step); A.weeks = await api.weeks(A.progId); toast("Étape enregistrée"); go(`admin-semaine-${A.progId}-${w.n}`); }
  catch(e) { console.error(e); $("#st-out").textContent = "Enregistrement impossible."; }
};

/* ---------- Articles ---------- */
function aArticles(){
  need("articles", async () => (await api.content(true)).articles);
  const list = A.articles || [];
  const a = ui.editing ? (ui.editing==="new" ? {id:"",title:"",cat:ART_CATS[0],read:5,excerpt:"",body:[""],status:"draft"} : list.find(x=>x.id===ui.editing)) : null;
  return shell(`${H("Articles du Journal", a?"":`<button class="btn btn-primary" data-act="a-newart">${icon("plus")}Nouvel article</button>`)}
   ${a?`<form class="card stack" id="artform"><h2 class="h-sub" style="margin:0">${ui.editing==="new"?"Nouvel article":"Modifier l’article"}</h2>
     <div class="field"><label class="flabel" for="a-title">Titre</label><input id="a-title" type="text" value="${esc(a.title)}" required></div>
     <div class="grid g3" style="gap:12px"><div class="field"><label class="flabel" for="a-cat">Rubrique</label><select id="a-cat">${ART_CATS.map(c=>`<option ${c===a.cat?"selected":""}>${c}</option>`).join("")}</select></div>
      <div class="field"><label class="flabel" for="a-read">Temps de lecture (min)</label><input id="a-read" type="text" inputmode="numeric" value="${a.read}"></div>
      <div class="field"><label class="flabel" for="a-status">Statut</label><select id="a-status"><option value="draft" ${a.status!=="published"?"selected":""}>Brouillon</option><option value="published" ${a.status==="published"?"selected":""}>Publié</option></select></div></div>
     <div class="field"><label class="flabel" for="a-ex">Chapeau</label><textarea id="a-ex" rows="2">${esc(a.excerpt)}</textarea></div>
     <div class="field"><label class="flabel" for="a-body">Texte</label><textarea id="a-body" rows="12">${esc(a.body.join("\n\n"))}</textarea><span class="hint">Séparez les paragraphes par une ligne vide.</span></div>
     <div class="row"><button class="btn btn-primary" type="submit">Enregistrer</button><button class="btn btn-soft" type="button" data-act="a-cancel">Annuler</button></div><p id="a-out" class="small" role="status"></p></form>`:""}
   <div class="table-wrap"><table><thead><tr><th>Titre</th><th>Rubrique</th><th>Date</th><th>Statut</th><th></th></tr></thead><tbody>
    ${A.articles ? list.map(x=>`<tr><td><b>${esc(x.title)}</b></td><td>${esc(x.cat)}</td><td class="num">${esc(fmtDate(x.date))}</td><td><span class="badge ${x.status==="published"?"ok":""}">${x.status==="published"?"Publié":"Brouillon"}</span></td><td><div class="row" style="flex-wrap:nowrap"><button class="btn btn-soft btn-sm" data-act="a-editart" data-id="${x.id}">Modifier</button>${x.status==="published"?`<button class="btn btn-soft btn-sm" data-go="article-${x.id}">Voir</button>`:""}</div></td></tr>`).join("") : `<tr><td colspan="5">${loading}</td></tr>`}
   </tbody></table></div>`, "articles");
}
actions["a-newart"] = () => { ui.editing = "new"; rerender(); };
actions["a-editart"] = (b) => { ui.editing = b.dataset.id; rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); };
forms["artform"] = async () => {
  const title = $("#a-title").value.trim(); if (!title) { $("#a-out").textContent = "Ajoutez un titre."; return; }
  const prev = (A.articles||[]).find(x => x.id === ui.editing);
  const d = { title, cat: $("#a-cat").value, read: parseInt($("#a-read").value) || 5, excerpt: $("#a-ex").value.trim(), status: $("#a-status").value,
    body: $("#a-body").value.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean), wasPublished: prev?.status === "published",
    slug: title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) + "-" + Date.now().toString(36).slice(-4),
    hue: ["sage","forest","gold"][Math.floor(Math.random()*3)] };
  try { await api.saveArticle(ui.editing, d); ui.editing = null; drop("articles"); await store.loadContent(); toast(d.status==="published"?"Article publié":"Brouillon enregistré"); rerender(); }
  catch(e) { console.error(e); $("#a-out").textContent = "Enregistrement impossible."; }
};

/* ---------- Inscriptions ---------- */
function aEnrolments(){
  need("enrolments", () => api.enrolments()); need("team", () => api.team());
  const coaches = (A.team||[]).filter(t => t.role === "coach" || t.role === "admin");
  return shell(`${H("Inscriptions et forfaits", "", "Tant que le paiement n’est pas ouvert, le forfait et l’accompagnante sont attribués ici. Aucune donnée privée des participants n’apparaît.")}
   <div class="notice">${icon("lock")}<span>Paiement en ligne ${C.flags.payments?"activé":"désactivé"}. Il sera branché côté serveur après validation juridique (prestataire mobile money).</span></div>
   <div class="table-wrap"><table><thead><tr><th>Participant</th><th>Programme</th><th>Forfait</th><th>Accompagnante</th><th>Questionnaires</th><th class="c">Semaines</th><th></th></tr></thead><tbody>
    ${A.enrolments ? A.enrolments.map(r=>`<tr data-row="${r.enrolment_id}"><td><b>${esc(r.first_name||"—")}</b><div class="small muted">${fmtDate(r.created_at)}</div></td><td>${esc(r.programme)}</td>
      <td><select class="sel-inline" id="pl-${r.enrolment_id}">${Object.entries(PLAN).map(([k,l])=>`<option value="${k}" ${r.plan===k?"selected":""}>${l}</option>`).join("")}</select></td>
      <td><select class="sel-inline" id="co-${r.enrolment_id}"><option value="">—</option>${coaches.map(c=>`<option value="${c.id}" ${r.coach_id===c.id?"selected":""}>${esc(c.first_name)}</option>`).join("")}</select></td>
      <td><label class="check small"><input type="checkbox" id="qn-${r.enrolment_id}" ${r.questionnaires_enabled?"checked":""}><span>Activer</span></label></td>
      <td class="c num">${r.weeks_completed} / 6</td><td><button class="btn btn-soft btn-sm" data-act="a-saveenr" data-id="${r.enrolment_id}">Enregistrer</button></td></tr>`).join("") || `<tr><td colspan="7" class="muted">Aucune inscription.</td></tr>` : `<tr><td colspan="7">${loading}</td></tr>`}
   </tbody></table></div>
   <p class="small muted">Questionnaires : sans effet pour le forfait Autonome, et tant que la fonctionnalité générale et le programme ne les autorisent pas.</p>`, "inscriptions");
}
actions["a-saveenr"] = async (b) => {
  const id = b.dataset.id, plan = $("#pl-"+id).value, coach = $("#co-"+id).value;
  if (plan !== "autonome" && !coach) { toast("Choisissez une accompagnante pour ce forfait."); return; }
  try { await api.updateEnrolment(id, plan, coach || null, $("#qn-"+id).checked); drop("enrolments"); toast("Inscription mise à jour"); rerender(); } catch(e) { console.error(e); toast("Mise à jour impossible."); }
};

/* ---------- Équipe et accompagnantes ---------- */
function aTeam(){
  need("team", () => api.team()); need("coaches", () => api.coachProfiles());
  const team = A.team || [], cps = A.coaches || [];
  const editId = ui.editing && ui.editing.startsWith("cp:") ? ui.editing.slice(3) : null;
  const cp = editId ? (cps.find(c => c.user_id === editId) || { user_id: editId, display_name: team.find(t=>t.id===editId)?.first_name || "", public_title: "Accompagnante en bien-être psychologique", bio: "", verified: false, hours: "", response_delay: "", limits: "", active: true }) : null;
  return shell(`${H("Équipe et accompagnantes")}
   <div class="table-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Présentation publique</th><th></th></tr></thead><tbody>
    ${A.team ? team.map(t=>{ const c = cps.find(x=>x.user_id===t.id); return `<tr><td><b>${esc(t.first_name)}</b></td><td>${esc(t.email||"")}</td><td>${ROLE[t.role]}</td><td>${t.role==="coach"?(c?`<span class="badge ${c.verified?"ok":""}">${c.verified?"Vérifiée":"À vérifier"}</span>`:`<span class="badge">À créer</span>`):"—"}</td><td>${t.role==="coach"?`<button class="btn btn-soft btn-sm" data-act="a-editcp" data-id="${t.id}">Présentation</button>`:""}</td></tr>`; }).join("") : `<tr><td colspan="5">${loading}</td></tr>`}
   </tbody></table></div>
   ${cp ? `<form class="card stack" id="a-cpform" data-id="${cp.user_id}"><h2 class="h-sub" style="margin:0">Présentation « Mon coach »</h2>
     <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="cp-name">Nom affiché</label><input id="cp-name" type="text" value="${esc(cp.display_name)}"></div><div class="field"><label class="flabel" for="cp-title">Fonction publique</label><input id="cp-title" type="text" value="${esc(cp.public_title)}"></div></div>
     <div class="field"><label class="flabel" for="cp-bio">Présentation professionnelle</label><textarea id="cp-bio" rows="4">${esc(cp.bio)}</textarea><span class="hint">Décrivez l’accompagnement de manière exacte : pas de titre de psychologue clinicienne ou de psychiatre.</span></div>
     <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="cp-hours">Horaires</label><input id="cp-hours" type="text" value="${esc(cp.hours)}"></div><div class="field"><label class="flabel" for="cp-delay">Délais habituels de réponse</label><input id="cp-delay" type="text" value="${esc(cp.response_delay)}"></div></div>
     <div class="field"><label class="flabel" for="cp-limits">Modalités et limites (une par ligne)</label><textarea id="cp-limits" rows="5">${esc(cp.limits)}</textarea></div>
     <label class="check"><input type="checkbox" id="cp-ver" ${cp.verified?"checked":""}><span>J’ai vérifié cette présentation, les qualifications et les autorisations correspondantes.</span></label>
     <label class="check"><input type="checkbox" id="cp-act" ${cp.active!==false?"checked":""}><span>Présentation active</span></label>
     <div class="row"><button class="btn btn-primary btn-sm" type="submit">Enregistrer</button><button type="button" class="btn btn-soft btn-sm" data-act="a-cancel">Fermer</button></div></form>` : ""}
   <form class="card stack" id="a-roleform"><h2 class="h-sub" style="margin:0">Attribuer un rôle</h2><p class="small muted">La personne doit d’abord avoir créé son compte.</p>
    <div class="grid g3" style="gap:12px"><div class="field"><label class="flabel" for="ro-mail">E-mail du compte</label><input id="ro-mail" type="email"></div>
     <div class="field"><label class="flabel" for="ro-role">Rôle</label><select id="ro-role">${Object.entries(ROLE).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
     <div class="field" style="align-self:end"><button class="btn btn-primary btn-sm" type="submit">Attribuer</button></div></div><p id="ro-out" class="small" role="status"></p></form>`, "equipe");
}
actions["a-editcp"] = (b) => { ui.editing = "cp:" + b.dataset.id; rerender(); };
forms["a-cpform"] = async (f) => {
  const cp = { user_id: f.dataset.id, display_name: $("#cp-name").value.trim(), public_title: $("#cp-title").value.trim(), bio: $("#cp-bio").value.trim(), hours: $("#cp-hours").value.trim(),
    response_delay: $("#cp-delay").value.trim(), limits: $("#cp-limits").value.trim(), verified: $("#cp-ver").checked, active: $("#cp-act").checked };
  try { await api.saveCoachProfile(cp); drop("coaches"); ui.editing = null; toast("Présentation enregistrée"); rerender(); } catch(e) { console.error(e); toast("Enregistrement impossible."); }
};
forms["a-roleform"] = async () => {
  try { await api.setRole($("#ro-mail").value.trim(), $("#ro-role").value); drop("team"); toast("Rôle attribué"); rerender(); }
  catch(e) { $("#ro-out").textContent = e.message?.includes("Aucun") ? "Aucun compte avec cet e-mail." : "Attribution impossible."; }
};

/* ---------- Fonctionnalités ---------- */
const FL = [["payments","Paiement en ligne","Après validation juridique et choix du prestataire (mobile money, carte). Le paiement se fait côté serveur."],
  ["written_support","Accompagnement écrit (forfait 2)","Après validation du cadre, des limites, des délais et de la procédure d’orientation."],
  ["support_calls","Échanges par appels (forfait 3)","Après validation du cadre, des limites, des délais et de la procédure d’orientation."],
  ["questionnaires","Questionnaires PHQ-9 / GAD-7 (forfaits 2 et 3)","Après validation de la supervision, des délais de revue, du consentement et de la réponse aux risques. Jamais pour le forfait Autonome."],
  ["public_signup","Création de comptes","Ouvre l’inscription gratuite au programme de démonstration."]];
function aFlags(){
  return shell(`${H("Fonctionnalités", "", "Activez une fonctionnalité uniquement lorsque ses prérequis sont validés. Chaque changement est enregistré dans le journal de traçabilité.")}
   <div class="stack">${FL.map(([k,l,req])=>`<div class="card flag-row"><div class="stack" style="gap:4px;min-width:0"><b>${l}</b><span class="small muted">${req}</span></div>
     <span class="badge ${C.flags[k]?"ok":""}">${C.flags[k]?"Activée":"Désactivée"}</span>
     ${ui.confirm===k?`<div class="row" style="gap:6px"><span class="small">${C.flags[k]?"Désactiver ?":"Les prérequis sont validés ?"}</span><button class="btn btn-primary btn-sm" data-act="a-flag" data-k="${k}">Confirmer</button><button class="btn btn-soft btn-sm" data-act="a-noflag">Annuler</button></div>`
       :`<button class="btn btn-soft btn-sm" data-act="a-askflag" data-k="${k}">${C.flags[k]?"Désactiver":"Activer"}</button>`}</div>`).join("")}</div>`, "fonctionnalites");
}
actions["a-askflag"] = (b) => { ui.confirm = b.dataset.k; rerender(); };
actions["a-noflag"] = () => { ui.confirm = null; rerender(); };
actions["a-flag"] = async (b) => { const k = b.dataset.k; try { await api.setFlag(k, !C.flags[k]); C.flags[k] = !C.flags[k]; ui.confirm = null; toast("Fonctionnalité mise à jour"); rerender(); } catch(e) { toast("Action impossible."); } };

/* ---------- Contact ---------- */
function aContact(){
  need("contact", () => api.contactList());
  return shell(`${H("Messages de contact")}
   <div class="table-wrap"><table><thead><tr><th>Reçu le</th><th>De</th><th>Sujet</th><th>Message</th><th></th></tr></thead><tbody>
    ${A.contact ? A.contact.map(m=>`<tr><td class="num">${fmtDate(m.created_at)}</td><td>${esc(m.name)}<div class="small muted">${esc(m.email)}</div></td><td>${esc(m.subject)}</td><td style="max-width:380px">${esc(m.message)}</td><td>${m.handled?`<span class="badge ok">Traité</span>`:`<button class="btn btn-soft btn-sm" data-act="a-markcontact" data-id="${m.id}">Marquer traité</button>`}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Aucun message.</td></tr>` : `<tr><td colspan="5">${loading}</td></tr>`}
   </tbody></table></div>`, "contact");
}
actions["a-markcontact"] = async (b) => { await api.markContact(b.dataset.id); drop("contact"); rerender(); };

/* ---------- Confidentialité et traçabilité ---------- */
const PRIV = { export: "Copie des données", erasure: "Suppression du compte", rectification: "Rectification", withdraw_consent: "Retrait du consentement" };
function aPrivacy(){
  need("privacy", () => api.privacyList()); need("log", () => api.accessLog()); need("referrals", () => api.referralsAll());
  return shell(`${H("Confidentialité et traçabilité")}
   <h2 class="h-sub">Demandes des participants</h2>
   <div class="table-wrap"><table><thead><tr><th>Demande</th><th>Reçue le</th><th>Statut</th><th></th></tr></thead><tbody>
    ${A.privacy ? A.privacy.map(r=>`<tr><td>${PRIV[r.type]||r.type}</td><td class="num">${fmtDate(r.created_at)}</td><td><span class="badge ${r.status==="done"?"ok":""}">${r.status==="done"?"Traitée":"À traiter"}</span></td><td>${r.status==="done"?"":`<button class="btn btn-soft btn-sm" data-act="a-resolve" data-id="${r.id}">Marquer traitée</button>`}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Aucune demande.</td></tr>` : `<tr><td colspan="4">${loading}</td></tr>`}
   </tbody></table></div>
   <h2 class="h-sub">Orientations ouvertes</h2>
   <p class="small muted">${A.referrals ? `${A.referrals.filter(r=>r.status==="ouverte").length} demande(s) d’orientation ouverte(s). Le détail est géré par l’accompagnante attribuée.` : "…"}</p>
   <h2 class="h-sub">Journal de traçabilité des accès</h2>
   <p class="small muted">Consultations de dossiers, messages, notes, rendez-vous, changements de forfait, de rôle et de fonctionnalités.</p>
   <div class="table-wrap"><table><thead><tr><th>Date</th><th>Rôle</th><th>Action</th><th>Inscription</th></tr></thead><tbody>
    ${A.log ? A.log.map(l=>`<tr><td class="num">${fmtDate(l.created_at,true)}</td><td>${ROLE[l.actor_role]||"—"}</td><td>${esc(l.action.replace(/_/g," "))}</td><td class="small muted mono">${esc(String(l.enrolment_id||"—").slice(0,8))}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">Aucune entrée.</td></tr>` : `<tr><td colspan="4">${loading}</td></tr>`}
   </tbody></table></div>`, "confidentialite");
}
actions["a-resolve"] = async (b) => { await api.resolvePrivacy(b.dataset.id); drop("privacy"); rerender(); };
