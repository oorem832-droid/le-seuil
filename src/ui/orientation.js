// LE SEUIL — « Trouver mon programme », page « Besoin d'aide maintenant ? » et administration du questionnaire.
// Principes (cahier « Sécurité, confidentialité et administration du questionnaire ») :
// - aucun diagnostic, aucun niveau de risque, aucune exclusion automatique pour un suivi existant ;
// - aucune réponse enregistrée, aucun nom / e-mail / téléphone demandé ; seuls des compteurs agrégés anonymes ;
// - le questionnaire public reste désactivé (fonctionnalité « orientation ») jusqu'aux validations clinique et juridique.
import { esc, icon, fmtDate, toast } from "./util.js";
import { ui, actions, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";
import { DEFAULT_CONFIG } from "../orientation/default-config.js";
import { visible, safety, immediate, result } from "../orientation/engine.js";

const clone = o => JSON.parse(JSON.stringify(o));
const O = ui.orientation = ui.orientation || { loaded: false, loading: false, data: null, answers: {}, step: 0, tracked: new Set(), country: "" };

async function ensureLoaded(){
  if (O.loaded || O.loading) return;
  O.loading = true;
  try { O.data = await api.orientationLoad(); } catch (e) { O.data = { published: null, draft: null, history: [] }; }
  O.loaded = true; O.loading = false; rerender();
}
const enabled = () => !!C.flags.orientation;
/* Accès par le questionnaire : quand la fonctionnalité est activée, on ne peut demander à rejoindre
   qu'un programme suggéré par le questionnaire. Seuls les identifiants des programmes suggérés sont gardés
   pour la visite en cours (sessionStorage), jamais les réponses. */
const SKEY = "leseuil-suggested";
const readSugg = () => { try { return JSON.parse(sessionStorage.getItem(SKEY) || "[]"); } catch (e) { return []; } };
const writeSugg = (l) => { try { sessionStorage.setItem(SKEY, JSON.stringify(l)); } catch (e) {} };
export const gateOn = () => enabled();
export const screened = (slug) => !gateOn() || readSugg().includes(slug);
const staffPreview = () => store.isStaff() && !enabled();
/** Configuration utilisée par le public : version publiée, sinon (aperçu équipe) le brouillon, sinon la configuration initiale. */
function liveConfig(){
  const d = O.data || {};
  if (enabled() && d.published) return d.published.config;
  if (store.isStaff()) return (d.draft || d.published)?.config || DEFAULT_CONFIG;
  return d.published?.config || DEFAULT_CONFIG;
}
const progs = () => (C.programmes || []).filter(p => ["published", "demo"].includes(p.status));
const helpLink = () => `<a class="help-now" href="#besoin-aide" data-go="besoin-aide">${icon("phone")} Besoin d’aide maintenant ?</a>`;
const paras = t => String(t || "").split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join("");

/* =====================================================================
   Page publique « Besoin d'aide maintenant ? » (toujours disponible)
   ===================================================================== */
export function pHelpNow(){
  ensureLoaded();
  const cfg = liveConfig(), h = cfg.help || DEFAULT_CONFIG.help;
  const res = (cfg.resources || []).filter(r => r.verified && (r.items || []).some(i => i.verified));
  const cur = res.find(r => r.country === O.country);
  const urgent = O.urgent ? cfg.safety?.A : null;
  return `<section class="section"><div class="wrap help-now-page stack-lg">
   ${urgent ? `<div class="notice danger-notice" role="alert">${icon("shield")}<div class="stack" style="gap:6px"><b>${esc(urgent.title)}</b><span>${esc(urgent.text)}</span></div></div>` : ""}
   <div class="stack"><span class="eyebrow">Aide</span><h1 class="h-page">${esc(h.title)}</h1>${paras(h.text)}</div>
   <div class="card stack">
    <label class="flabel" for="hn-country">Choisissez votre pays pour trouver des ressources adaptées</label>
    <select id="hn-country" data-hn-country>
      <option value="">Choisir un pays…</option>
      ${res.map(r => `<option value="${esc(r.country)}" ${r.country === O.country ? "selected" : ""}>${esc(r.name)}</option>`).join("")}
      <option value="autre" ${O.country === "autre" ? "selected" : ""}>Autre pays</option>
    </select>
    ${cur ? `<ul class="hn-list">${cur.items.filter(i => i.verified).map(i => `<li><span>${esc(i.label)}</span>${/^[\d\s·+().-]+$/.test(i.value) ? `<a class="hn-num" href="tel:${esc(i.value.split("·")[0].replace(/\s/g, ""))}">${esc(i.value)}</a>` : `<b>${esc(i.value)}</b>`}</li>`).join("")}</ul>`
      : `<p class="muted">${esc(h.general)}</p>`}
   </div>
   <p class="small muted">${esc(cfg.safety?.always || DEFAULT_CONFIG.safety.always)}</p>
   <div class="row"><button class="btn btn-soft" data-go="aide">Trouver une aide adaptée</button>${O.answers && Object.keys(O.answers).length && !O.urgent ? `<button class="btn btn-ghost" data-go="trouver-mon-programme">Revenir au questionnaire</button>` : ""}</div>
  </div></section>`;
}
document.addEventListener("change", e => { if (e.target.matches?.("[data-hn-country]")) { O.country = e.target.value; rerender(); } });

/* =====================================================================
   Questionnaire public « Trouver mon programme »
   ===================================================================== */
function screens(cfg){
  const list = [{ kind: "intro" }];
  (cfg.questions || []).forEach(q => list.push({ kind: "q", q }));
  list.push({ kind: "safety-intro" });
  (cfg.safetyQuestions || []).forEach(q => { if (visible(q, O.answers)) list.push({ kind: "s", q }); });
  list.push({ kind: "result" });
  return list;
}
export function pFind(){
  ensureLoaded();
  if (!enabled() && !store.isStaff()) return `<section class="section"><div class="wrap stack-lg" style="max-width:720px">
    <span class="eyebrow">Trouver mon programme</span><h1 class="h-page">Bientôt disponible</h1>
    <p class="lede">Le questionnaire d’orientation est en cours de validation par des professionnels. En attendant, vous pouvez découvrir nos programmes.</p>
    <div class="row"><button class="btn btn-primary" data-go="programmes">Découvrir nos programmes ${icon("arrow")}</button></div>${helpLink()}</div></section>`;
  if (!O.loaded) return `<section class="section"><div class="wrap"><p class="muted">Chargement…</p></div></section>`;
  const cfg = liveConfig(), list = screens(cfg);
  O.step = Math.min(O.step, list.length - 1);
  const sc = list[O.step], total = list.length - 2, pos = Math.max(0, Math.min(O.step, total));
  const s = safety(cfg, O.answers);
  const bNote = s.main === "B" && sc.kind !== "result" ? `<div class="notice care-notice" role="status">${icon("info")}<div class="stack" style="gap:4px"><b>${esc(cfg.safety.B.title)}</b><span>${esc(cfg.safety.B.text)}</span>${helpLink()}</div></div>` : "";
  let body = "";
  if (sc.kind === "intro") body = `<h1 class="h-page">${esc(cfg.intro.title)}</h1><p class="lede">${esc(cfg.intro.text)}</p>
     <ul class="find-promises small muted"><li>Pas de compte, pas de nom ni d’e-mail.</li><li>Vos réponses ne sont pas enregistrées.</li><li>Ce n’est pas un diagnostic.</li></ul>
     <div class="row"><button class="btn btn-primary" data-act="or-next">Commencer ${icon("arrow")}</button></div>`;
  else if (sc.kind === "safety-intro") body = `<h2>Quelques questions pour votre sécurité</h2><p class="lede">Elles nous aident à vous orienter vers l’aide la plus adaptée. Vous pouvez répondre « Je préfère ne pas répondre ».</p>
     <div class="row"><button class="btn btn-soft" data-act="or-back">Précédent</button><button class="btn btn-primary" data-act="or-next">Continuer ${icon("arrow")}</button></div>`;
  else if (sc.kind === "q" || sc.kind === "s") body = `<fieldset class="find-q"><legend><h2>${esc(sc.q.text)}</h2></legend>
     <div class="find-opts">${sc.q.options.map(o => `<button type="button" class="find-opt" data-act="or-answer" data-q="${esc(sc.q.id)}" data-o="${esc(o.id)}" aria-pressed="${O.answers[sc.q.id] === o.id}">${esc(o.label)}</button>`).join("")}</div></fieldset>
     <div class="row"><button class="btn btn-soft" data-act="or-back">Précédent</button></div>`;
  else body = resultHTML(cfg);
  return `<section class="section"><div class="wrap find-wrap stack-lg">
    ${staffPreview() ? `<div class="notice">${icon("info")}<span>Aperçu équipe : le questionnaire n’est pas encore publié pour le public (fonctionnalité désactivée).</span></div>` : ""}
    ${sc.kind !== "intro" && sc.kind !== "result" ? `<div class="find-prog" aria-hidden="true"><i style="width:${Math.round(pos / total * 100)}%"></i></div>` : ""}
    ${bNote}
    <div class="card find-card stack">${body}</div>
    ${helpLink()}
  </div></section>`;
}
function resultHTML(cfg){
  const r = result(cfg, O.answers, progs()), sf = cfg.safety;
  const list = r.suggestions.map(x => progs().find(p => p.slug === x.slug)).filter(Boolean);
  writeSugg(list.map(p => p.slug));
  list.forEach(p => { const k = "s:" + p.slug; if (!O.tracked.has(k) && enabled()) { O.tracked.add(k); api.orientationTrack(p.slug, "suggested"); } });
  const cards = list.map(p => `<div class="find-prog-card"><span class="eyebrow">Programme ${esc(p.code || "")}</span><h3>${esc(p.title)}</h3><p class="muted">${esc(p.summary || "")}</p>
     <button class="btn btn-primary btn-sm" data-act="or-choose" data-slug="${esc(p.slug)}">Voir ce programme et faire ma demande ${icon("arrow")}</button></div>`).join("");
  const msg = r.main === "B" ? `<div class="notice care-notice">${icon("info")}<div class="stack" style="gap:6px"><b>${esc(sf.B.title)}</b><span>${esc(sf.B.text)}</span></div></div>
       <div class="row"><button class="btn btn-primary" data-go="besoin-aide">Voir les ressources d’aide</button></div>${list.length ? `<p>${esc(sf.B.programmeText)}</p>` : ""}`
    : r.main === "C" ? `<div class="notice">${icon("info")}<div class="stack" style="gap:6px"><b>${esc(sf.C.title)}</b><span>${esc(sf.C.text)}</span></div></div>`
    : `<p class="lede">${esc(sf.E.text)}</p>`;
  return `<span class="eyebrow">Votre résultat</span>${msg}
    ${r.existingSupport ? `<p class="find-note">${esc(sf.D.text)}</p>` : ""}
    ${list.length ? `<div class="find-results">${cards}</div>` : r.main === "E" || r.main === "C" ? `<p>Nous n’avons pas trouvé de programme correspondant précisément à vos réponses. Vous pouvez parcourir tous nos programmes.</p><div class="row"><button class="btn btn-soft" data-go="programmes">Voir les programmes</button></div>` : ""}
    <p class="small muted">${esc(sf.always)}</p>
    <div class="row"><button class="btn btn-ghost btn-sm" data-act="or-restart">Recommencer</button></div>`;
}
actions["or-next"] = () => { O.step++; rerender(); window.scrollTo?.(0, 0); };
actions["or-back"] = () => { O.step = Math.max(0, O.step - 1); rerender(); };
actions["or-restart"] = () => { O.answers = {}; O.step = 0; O.urgent = false; O.tracked = new Set(); writeSugg([]); rerender(); };
actions["or-answer"] = (b) => {
  const cfg = liveConfig(), q = b.dataset.q, o = b.dataset.o;
  O.answers[q] = o;
  // Les questions dépendantes déjà répondues mais devenues invisibles sont oubliées.
  for (const sq of cfg.safetyQuestions || []) if (!visible(sq, O.answers)) delete O.answers[sq.id];
  if (immediate(cfg, q, o) === "A") { O.urgent = true; writeSugg([]); go("besoin-aide"); return; }   // Situation A : aide urgente immédiatement, rien d'autre.
  O.step++; rerender(); window.scrollTo?.(0, 0);
};
actions["or-choose"] = (b) => { if (enabled()) api.orientationTrack(b.dataset.slug, "chosen"); go("programme-" + b.dataset.slug); };

/* =====================================================================
   Administration : « Questionnaire d'orientation »
   ===================================================================== */
const SUBS = [["apercu","Aperçu"],["questions","Questions"],["regles","Règles"],["securite","Sécurité"],["ressources","Ressources d’aide"],["tester","Tester"],["stats","Statistiques"],["versions","Versions"]];
function work(){
  if (!O.work) { const d = O.data || {}; O.work = clone((d.draft || d.published)?.config || DEFAULT_CONFIG); O.dirty = false; }
  return O.work;
}
const setPath = (obj, path, val) => { const ks = path.split("."); let o = obj; ks.slice(0, -1).forEach(k => o = o[k]); o[ks.at(-1)] = val; };
document.addEventListener("input", e => {
  const el = e.target; if (!el.dataset?.opath || !O.work) return;
  setPath(O.work, el.dataset.opath, el.type === "checkbox" ? el.checked : el.type === "number" ? +el.value : el.value);
  O.dirty = true; const b = document.querySelector("[data-or-dirty]"); if (b) b.hidden = false;
});
document.addEventListener("change", e => { const el = e.target; if (el.dataset?.opath && el.type === "checkbox" && O.work) { setPath(O.work, el.dataset.opath, el.checked); O.dirty = true; } });

export function aOrientation(shell, H){
  ensureLoaded();
  if (!O.loaded) return shell(`${H("Questionnaire d’orientation")}<p class="muted">Chargement…</p>`, "orientation");
  const cfg = work(), d = O.data || {}, sub = O.sub || "apercu";
  const status = `<div class="card or-status">
     <div><b>Questionnaire public :</b> ${enabled() ? `<span class="badge ok">Activé</span>` : `<span class="badge">Désactivé</span>`} <span class="small muted">(Administration → Fonctionnalités)</span></div>
     <div><b>Version publiée :</b> ${d.published ? `n° ${d.published.version} · ${fmtDate(d.published.published_at)}` : "aucune"}</div>
     <div><b>Brouillon :</b> ${d.draft ? `enregistré le ${fmtDate(d.draft.created_at, true)}` : "non enregistré"} <span class="badge warn" data-or-dirty ${O.dirty ? "" : "hidden"}>Modifications non enregistrées</span></div>
     <div class="row" style="gap:8px"><button class="btn btn-primary btn-sm" data-act="or-save">Enregistrer le brouillon</button>
       ${ui.confirm === "or-pub" ? `<input id="or-note" class="input-sm" placeholder="Note de version (facultatif)"><button class="btn btn-gold btn-sm" data-act="or-publish">Confirmer la publication</button><button class="btn btn-soft btn-sm" data-act="or-nopub">Annuler</button>`
         : `<button class="btn btn-soft btn-sm" data-act="or-askpub">Publier le brouillon…</button>`}
       <button class="btn btn-ghost btn-sm" data-go="trouver-mon-programme">Ouvrir le questionnaire</button></div>
     ${d.missing ? `<p class="small" style="color:#9a3b2a">La table de la base de données n’est pas encore créée : appliquez la migration « orientation » dans Supabase pour enregistrer et publier.</p>` : ""}
   </div>`;
  const warn = `<div class="notice">${icon("info")}<span>Avant toute activation : relecture clinique indépendante du questionnaire et des parcours de sécurité, vérification juridique, tests des scénarios, tests mobile et accessibilité, vérification des ressources d’aide. Aucune boîte d’alerte n’est créée : les réponses ne sont ni enregistrées ni surveillées.</span></div>`;
  const tabs = `<div class="tabs or-tabs" role="tablist">${SUBS.map(([k, l]) => `<button role="tab" data-act="or-sub" data-v="${k}" aria-selected="${sub === k}">${l}</button>`).join("")}</div>`;
  const view = { apercu: vPreview, questions: vQuestions, regles: vRules, securite: vSafety, ressources: vResources, tester: vTest, stats: vStats, versions: vVersions }[sub] || vPreview;
  return shell(`${H("Questionnaire d’orientation", "", "« Trouver mon programme » : questions, règles de correspondance avec les programmes, parcours de sécurité et ressources d’aide.")}${warn}${status}${tabs}<div class="stack or-body">${view(cfg)}</div>`, "orientation");
}

function vPreview(cfg){
  const q = (x, safetyQ) => `<li class="card stack" style="gap:6px"><b>${esc(x.text)}</b>${x.showIf ? `<span class="small muted">Affichée seulement si : ${esc(x.showIf)}</span>` : ""}
    <ul class="small">${x.options.map(o => `<li>${esc(o.label)}${safetyQ && o.flag ? ` <span class="badge">Situation ${o.flag}</span>` : ""}</li>`).join("")}</ul></li>`;
  return `<h3>Questions d’orientation</h3><ol class="stack">${cfg.questions.map(x => q(x)).join("")}</ol>
    <h3>Questions de sécurité</h3><ol class="stack">${cfg.safetyQuestions.map(x => q(x, true)).join("")}</ol>`;
}
function vQuestions(cfg){
  const qEd = (x, i, base, safetyQ) => `<div class="card stack or-q">
    <label class="flabel">Question ${i + 1}${safetyQ ? ` · sécurité (${esc(x.role)})` : ""}</label>
    <textarea rows="2" data-opath="${base}.${i}.text">${esc(x.text)}</textarea>
    <div class="stack" style="gap:6px">${x.options.map((o, j) => `<div class="row or-opt"><input value="${esc(o.label)}" data-opath="${base}.${i}.options.${j}.label" aria-label="Option ${j + 1}">
      ${safetyQ ? (o.flag ? `<span class="badge">Situation ${o.flag}</span>` : "") : `<button class="btn btn-soft btn-sm" data-act="or-delopt" data-q="${i}" data-o="${j}" aria-label="Supprimer l’option">✕</button>`}</div>`).join("")}</div>
    ${safetyQ ? "" : `<div class="row" style="gap:8px"><button class="btn btn-soft btn-sm" data-act="or-addopt" data-q="${i}">+ Option</button><button class="btn btn-ghost btn-sm" data-act="or-delq" data-q="${i}">Supprimer la question</button></div>`}
   </div>`;
  return `<h3>Accueil du questionnaire</h3><div class="card stack"><input value="${esc(cfg.intro.title)}" data-opath="intro.title"><textarea rows="2" data-opath="intro.text">${esc(cfg.intro.text)}</textarea></div>
   <h3>Questions d’orientation</h3>${cfg.questions.map((x, i) => qEd(x, i, "questions")).join("")}
   <div><button class="btn btn-soft btn-sm" data-act="or-addq">+ Ajouter une question</button></div>
   <h3>Questions de sécurité</h3><p class="small muted">Les textes sont modifiables. Les situations associées (A à D) et l’ordre sont fixés par le protocole et ne doivent être changés qu’après validation clinique.</p>
   ${cfg.safetyQuestions.map((x, i) => qEd(x, i, "safetyQuestions", true)).join("")}`;
}
function vRules(cfg){
  const ps = progs();
  const pts = (key, slug) => (cfg.rules.find(r => r.option === key && r.programme === slug)?.points) || 0;
  return `<p class="muted">Pour chaque réponse, indiquez combien de points elle donne à chaque programme. Les ${cfg.maxSuggestions} programmes ayant le plus de points sont suggérés (aucun si aucun point).</p>
   <label class="row" style="gap:8px">Nombre de programmes suggérés au maximum <input type="number" min="1" max="3" value="${cfg.maxSuggestions}" data-opath="maxSuggestions" style="width:70px"></label>
   <div class="or-table-wrap"><table class="or-table"><thead><tr><th>Réponse</th>${ps.map(p => `<th>${esc(p.code || "")} ${esc(p.title)}</th>`).join("")}</tr></thead><tbody>
   ${cfg.questions.map(q => `<tr class="or-qrow"><td colspan="${ps.length + 1}"><b>${esc(q.text)}</b></td></tr>${q.options.map(o => `<tr><td>${esc(o.label)}</td>${ps.map(p => `<td><input type="number" min="0" max="9" value="${pts(q.id + ":" + o.id, p.slug)}" data-orrule="${esc(q.id + ":" + o.id)}|${esc(p.slug)}" aria-label="Points pour ${esc(p.title)}"></td>`).join("")}</tr>`).join("")}`).join("")}
   </tbody></table></div>`;
}
document.addEventListener("input", e => {
  const el = e.target; if (!el.dataset?.orrule || !O.work) return;
  const [option, programme] = el.dataset.orrule.split("|"), v = Math.max(0, +el.value || 0);
  O.work.rules = O.work.rules.filter(r => !(r.option === option && r.programme === programme));
  if (v) O.work.rules.push({ option, programme, points: v });
  O.dirty = true; const b = document.querySelector("[data-or-dirty]"); if (b) b.hidden = false;
});
function vSafety(cfg){
  const t = (k, label) => `<div class="card stack"><b>${label}</b>${cfg.safety[k].title !== undefined ? `<input value="${esc(cfg.safety[k].title)}" data-opath="safety.${k}.title">` : ""}<textarea rows="4" data-opath="safety.${k}.text">${esc(cfg.safety[k].text)}</textarea>
    ${k === "B" ? `<label class="row" style="gap:8px"><input type="checkbox" data-opath="safety.B.offerProgramme" ${cfg.safety.B.offerProgramme ? "checked" : ""}> Proposer un programme comme ressource complémentaire (à décider avant lancement)</label><textarea rows="2" data-opath="safety.B.programmeText">${esc(cfg.safety.B.programmeText)}</textarea>` : ""}
    ${k === "C" ? `<label class="row" style="gap:8px"><input type="checkbox" data-opath="safety.C.offerProgramme" ${cfg.safety.C.offerProgramme ? "checked" : ""}> Afficher aussi les programmes suggérés</label>` : ""}</div>`;
  return `${t("A", "Situation A — Danger immédiat signalé (page d’aide urgente, aucun programme, aucun paiement)")}
   ${t("B", "Situation B — Pensées suicidaires déclarées, sans danger immédiat déclaré")}
   ${t("C", "Situation C — Difficultés quotidiennes très importantes")}
   ${t("D", "Situation D — Suivi existant (jamais d’exclusion)")}
   ${t("E", "Situation E — Aucune alerte particulière (aucune mention « risque faible »)")}
   <div class="card stack"><b>Message affiché sur tous les résultats</b><textarea rows="2" data-opath="safety.always">${esc(cfg.safety.always)}</textarea></div>
   <h3>Page « Besoin d’aide maintenant ? »</h3>
   <div class="card stack"><input value="${esc(cfg.help.title)}" data-opath="help.title"><textarea rows="7" data-opath="help.text">${esc(cfg.help.text)}</textarea>
    <label class="flabel">Conseils généraux (pays non choisi ou sans ressource vérifiée)</label><textarea rows="3" data-opath="help.general">${esc(cfg.help.general)}</textarea></div>`;
}
function vResources(cfg){
  return `<p class="muted">Seules les ressources marquées « vérifiée » sont publiées. N’ajoutez jamais un numéro qui n’a pas été vérifié auprès d’une source officielle.</p>
   ${cfg.resources.map((r, i) => `<div class="card stack">
     <div class="row" style="gap:8px"><input value="${esc(r.name)}" data-opath="resources.${i}.name" aria-label="Pays" style="flex:1"><input value="${esc(r.country)}" data-opath="resources.${i}.country" aria-label="Code pays" style="width:70px">
       <label class="row" style="gap:6px"><input type="checkbox" data-opath="resources.${i}.verified" ${r.verified ? "checked" : ""}> Pays publié</label>
       <button class="btn btn-ghost btn-sm" data-act="or-delcountry" data-i="${i}">Supprimer</button></div>
     ${r.items.map((it, j) => `<div class="row or-opt"><input value="${esc(it.label)}" data-opath="resources.${i}.items.${j}.label" aria-label="Libellé" style="flex:2"><input value="${esc(it.value)}" data-opath="resources.${i}.items.${j}.value" aria-label="Numéro ou lien" style="flex:1">
       <label class="row" style="gap:6px"><input type="checkbox" data-opath="resources.${i}.items.${j}.verified" ${it.verified ? "checked" : ""}> Vérifiée</label><button class="btn btn-soft btn-sm" data-act="or-delres" data-i="${i}" data-j="${j}" aria-label="Supprimer">✕</button></div>`).join("")}
     <div><button class="btn btn-soft btn-sm" data-act="or-addres" data-i="${i}">+ Ressource</button></div></div>`).join("")}
   <div><button class="btn btn-soft btn-sm" data-act="or-addcountry">+ Ajouter un pays</button></div>`;
}
const PRESETS = {
  "Profil A — danger immédiat": { "s-pensees": "oui", "s-danger": "oui" },
  "Profil B — pensées, sans danger immédiat": { "q-poids": "moral", "s-pensees": "oui", "s-danger": "non" },
  "Profil C — quotidien très difficile": { "q-poids": "inquietudes", "q-phrase": "pire", "s-quotidien": "souvent", "s-pensees": "non" },
  "Profil D — suivi existant": { "q-poids": "peurs", "q-phrase": "evite", "q-envie": "oser", "s-suivi": "oui", "s-pensees": "non" },
  "Profil E — sans alerte": { "q-poids": "inquietudes", "q-phrase": "pire", "q-envie": "ruminer", "s-suivi": "non", "s-quotidien": "parfois", "s-pensees": "non" },
};
function vTest(cfg){
  const T = O.test || (O.test = {});
  const sel = (q) => `<label class="stack" style="gap:4px"><span class="small"><b>${esc(q.text)}</b></span><select data-ortest="${esc(q.id)}" ${visible(q, T) ? "" : "disabled"}><option value="">—</option>${q.options.map(o => `<option value="${esc(o.id)}" ${T[q.id] === o.id ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></label>`;
  const r = result(cfg, T, progs());
  const names = r.suggestions.map(x => progs().find(p => p.slug === x.slug)?.title + ` (${x.points} pts)`);
  return `<p class="muted">Profils fictifs : rien n’est enregistré. Vérifiez manuellement chaque parcours avant activation.</p>
   <div class="row" style="flex-wrap:wrap;gap:6px">${Object.keys(PRESETS).map(k => `<button class="btn btn-soft btn-sm" data-act="or-preset" data-k="${esc(k)}">${esc(k)}</button>`).join("")}<button class="btn btn-ghost btn-sm" data-act="or-preset" data-k="">Vider</button></div>
   <div class="grid or-test-grid">${cfg.questions.map(sel).join("")}${cfg.safetyQuestions.map(sel).join("")}</div>
   <div class="card stack"><b>Résultat</b>
    <span>Situation : <b>${r.main}</b>${r.existingSupport ? " + D (suivi existant)" : ""}${r.main === "A" ? " → page d’aide urgente immédiatement, aucun programme ni paiement" : ""}</span>
    <span>Programmes suggérés : ${names.length ? esc(names.join(" · ")) : "aucun"}</span></div>`;
}
document.addEventListener("change", e => { const el = e.target; if (el.dataset?.ortest !== undefined && O.test) { if (el.value) O.test[el.dataset.ortest] = el.value; else delete O.test[el.dataset.ortest]; rerender(); } });
function vStats(){
  if (O.stats === undefined) { O.stats = null; api.orientationStats().then(r => { O.stats = r; rerender(); }).catch(() => { O.stats = []; rerender(); }); }
  if (!O.stats) return `<p class="muted">Chargement…</p>`;
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const agg = {}; O.stats.filter(s => s.day >= since).forEach(s => { agg[s.programme_slug] ||= { suggested: 0, chosen: 0 }; agg[s.programme_slug][s.event] += s.count; });
  return `<p class="muted">Compteurs anonymes et agrégés des 30 derniers jours : aucune réponse individuelle ni information de sécurité n’est conservée.</p>
   <table class="or-table"><thead><tr><th>Programme</th><th>Suggéré</th><th>Choisi</th></tr></thead><tbody>
   ${progs().map(p => `<tr><td>${esc(p.title)}</td><td>${agg[p.slug]?.suggested || 0}</td><td>${agg[p.slug]?.chosen || 0}</td></tr>`).join("")}</tbody></table>`;
}
function vVersions(){
  const h = O.data?.history || [];
  return h.length ? `<table class="or-table"><thead><tr><th>Version</th><th>Statut</th><th>Publiée le</th><th>Note</th><th></th></tr></thead><tbody>
    ${h.map(v => `<tr><td>n° ${v.version}</td><td>${v.status === "published" ? "Publiée" : "Archivée"}</td><td>${fmtDate(v.published_at || v.created_at)}</td><td>${esc(v.note || "")}</td><td><button class="btn btn-soft btn-sm" data-act="or-restore" data-id="${esc(v.id)}">Reprendre dans le brouillon</button></td></tr>`).join("")}</tbody></table>`
    : `<p class="muted">Aucune version publiée pour l’instant.</p>`;
}

actions["or-sub"] = (b) => { O.sub = b.dataset.v; rerender(); };
actions["or-addq"] = () => { work().questions.push({ id: "q-" + Date.now().toString(36), text: "Nouvelle question", options: [{ id: "o1", label: "Option 1" }, { id: "o2", label: "Option 2" }] }); O.dirty = true; rerender(); };
actions["or-delq"] = (b) => { const q = work().questions.splice(+b.dataset.q, 1)[0]; O.work.rules = O.work.rules.filter(r => !r.option.startsWith(q.id + ":")); O.dirty = true; rerender(); };
actions["or-addopt"] = (b) => { const q = work().questions[+b.dataset.q]; q.options.push({ id: "o" + Date.now().toString(36), label: "Nouvelle option" }); O.dirty = true; rerender(); };
actions["or-delopt"] = (b) => { const q = work().questions[+b.dataset.q], o = q.options.splice(+b.dataset.o, 1)[0]; O.work.rules = O.work.rules.filter(r => r.option !== q.id + ":" + o.id); O.dirty = true; rerender(); };
actions["or-addcountry"] = () => { work().resources.push({ country: "", name: "Nouveau pays", verified: false, items: [] }); O.dirty = true; rerender(); };
actions["or-delcountry"] = (b) => { work().resources.splice(+b.dataset.i, 1); O.dirty = true; rerender(); };
actions["or-addres"] = (b) => { work().resources[+b.dataset.i].items.push({ label: "", value: "", verified: false }); O.dirty = true; rerender(); };
actions["or-delres"] = (b) => { work().resources[+b.dataset.i].items.splice(+b.dataset.j, 1); O.dirty = true; rerender(); };
actions["or-preset"] = (b) => { O.test = b.dataset.k ? clone(PRESETS[b.dataset.k]) : {}; rerender(); };
actions["or-save"] = async () => {
  try { await api.orientationSaveDraft(work()); O.dirty = false; O.loaded = false; O.data = null; await ensureLoaded(); toast("Brouillon enregistré"); rerender(); }
  catch (e) { console.error(e); toast("Enregistrement impossible. La migration « orientation » est-elle appliquée ?"); }
};
actions["or-askpub"] = () => { ui.confirm = "or-pub"; rerender(); };
actions["or-nopub"] = () => { ui.confirm = null; rerender(); };
actions["or-publish"] = async () => {
  const note = document.getElementById("or-note")?.value || "";
  try { await api.orientationSaveDraft(work()); const v = await api.orientationPublish(note); ui.confirm = null; O.dirty = false; O.loaded = false; O.data = null; await ensureLoaded(); toast(`Version ${v} publiée`); rerender(); }
  catch (e) { console.error(e); toast("Publication impossible."); }
};
actions["or-restore"] = (b) => { const v = (O.data?.history || []).find(x => x.id === b.dataset.id); if (v) { O.work = clone(v.config); O.dirty = true; O.sub = "questions"; toast(`Version ${v.version} reprise dans le brouillon (non enregistré)`); rerender(); } };
