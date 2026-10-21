// Espace participant : tableau de bord, leçons, exercices, journal, objectifs, évolution, plan personnel, outils, Mon coach, compte.
import { SUITABILITY, EMERGENCY, CALM_TOOLS, CALM_NOTE, COACH } from "../content.js";
import { esc, icon, blocksHTML, fmtDate, fmtShort, fmtTime, toast, $, download, printSection, pageHead } from "./util.js";
import { ui, actions, forms, inputs, changes, rerender, render, go } from "./state.js";
import { exerciseHTML, completeStep, summaryText, breathHTML, saveStateHTML, setSaveState, stopBreath } from "./exercises.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";

/* ---------- Sélecteurs ---------- */
const KIND = { lecon: "Leçon", video: "Vidéo", exercice: "Exercice", reflexion: "Réflexion", bilan: "Bilan" };
const KIND_ICON = { lecon: "book", video: "video", exercice: "edit", reflexion: "pen", bilan: "target" };
const kindLabel = (s) => s.content?.component === "journal" ? "Réflexion" : KIND[s.kind] || "Étape";
const required = (w) => w.steps.filter(s => s.required);
const doneSteps = (w) => required(w).filter(s => S.progress[s.uuid] === "completed");
export const weekUnlocked = (n) => n === 1 || !!S.completions[n - 1] || !!S.enrolment?.unlock_all || store.isStaff();
export const currentWeek = () => { for (let n = 1; n <= C.weeks.length; n++) if (!S.completions[n]) return n; return C.weeks.length || 1; };
const allRequired = () => C.weeks.flatMap(required);
const lessonsAll = () => C.weeks.flatMap(w => w.steps.filter(s => s.kind === "lecon" && s.required));
export const pctDone = () => { const all = allRequired(); return all.length ? Math.round(all.filter(s => S.progress[s.uuid] === "completed").length / all.length * 100) : 0; };
const exercisesAll = () => C.weeks.flatMap(w => w.steps.filter(s => ["exercice", "bilan"].includes(s.kind)).map(s => ({ w, s })));
const onboarded = () => !!(S.enrolment?.suitability_completed_at && S.enrolment?.consented_at);
const mainGoal = () => S.goals.filter(g => g.scope === "principal" && g.status !== "ajuste" && g.status !== "archive").slice(-1)[0];
const unread = () => S.messages.filter(m => m.sender_id !== S.user.id && !m.read_at).length;
function resumeTarget(){
  const last = S.enrolment?.last_step_id;
  if (last) for (const w of C.weeks) { const i = w.steps.findIndex(s => s.uuid === last); if (i >= 0 && weekUnlocked(w.n)) {
    const next = S.progress[last] === "completed" && i < w.steps.length - 1 ? i + 1 : i; return `semaine-${w.n}-${next}`; } }
  const n = currentWeek(), w = C.weeks[n - 1]; if (!w) return "lecons";
  const i = w.steps.findIndex(s => s.required && S.progress[s.uuid] !== "completed");
  return `semaine-${n}-${Math.max(0, i)}`;
}

/* ---------- Coquille ---------- */
const NAV = () => [["espace","Tableau de bord","home"],["lecons","Mes leçons","book"],["exercices","Mes exercices","edit"],["journal","Mon journal","pen"],["objectifs","Mes objectifs","target"],
  ["evolution","Mon évolution","chart"],["plan","Mon plan personnel","leaf"],["outils","Mes outils pour retrouver mon calme","sun"],
  ...(store.plan() !== "autonome" ? [["coach","Mon coach","chat"]] : []),["compte","Mon compte","user"]];
export function memberShell(inner, active = ui.route){
  return `<div class="wrap app"><nav class="side" aria-label="Mon espace"><div class="who"><span class="eyebrow">Mon espace</span><div class="who-name">${esc(S.user.name)}</div><span class="small muted">${esc(C.plans.find(p=>p.id===store.plan())?.short || "")}</span></div>
   ${NAV().map(([k,l,i])=>`<button data-go="${k}" ${active===k?'aria-current="page"':""}>${icon(i)}<span>${l}</span>${k==="coach"&&unread()?`<span class="pill-count">${unread()}</span>`:""}</button>`).join("")}
   <button data-act="logout">${icon("out")}<span>Se déconnecter</span></button></nav><div class="stack-lg fade-in" style="min-width:0">${inner}</div></div>`;
}
const H = (eyebrow, title, lede="") => `<div class="stack" style="gap:6px"><span class="eyebrow">${eyebrow}</span><h1 class="h-page">${title}</h1>${lede?`<p class="muted">${lede}</p>`:""}</div>`;
actions["logout"] = async () => { await store.signOut(); toast("Vous êtes déconnecté·e"); go("accueil"); };

/* ---------- Tableau de bord ---------- */
export function mDash(){
  if (!S.enrolment || !store.enrolmentValid()) {
    const e = S.enrolment;
    const why = !e ? "Aucun programme n’est encore associé à votre compte."
      : S.profile?.account_status === "suspended" || e.suspended ? "Votre accès est suspendu pour le moment."
      : e.admission_status !== "admis" ? "Votre demande est en cours de vérification par l’équipe LE SEUIL."
      : e.access_expires_at && new Date(e.access_expires_at) <= new Date() ? `Votre accès au programme s’est terminé le ${fmtDate(e.access_expires_at)}.`
      : e.access_starts_at && new Date(e.access_starts_at) > new Date() ? `Votre accès ouvrira le ${fmtDate(e.access_starts_at)}.` : "Votre accès n’est pas encore actif.";
    return memberShell(H("Mon espace", `Bonjour, ${esc(S.user.name)}`) + `${switcher()}<div class="card stack"><p>${why}</p><p class="small muted">Pour toute question sur votre accès, écrivez-nous depuis la page <a href="#contact" data-go="contact">Contact</a>. Les articles de la <a href="#bibliotheque" data-go="bibliotheque">Bibliothèque</a> restent en accès libre.</p></div>`);
  }
  const n = currentWeek(), w = C.weeks[n-1], p = pctDone();
  const ls = lessonsAll(), lsDone = ls.filter(s => S.progress[s.uuid] === "completed").length;
  const g = mainGoal(), wg = S.goals.filter(x => x.scope === "hebdomadaire" && x.status === "actif").slice(-1)[0];
  const coachMsg = S.messages.filter(m => m.sender_id !== S.user.id).slice(-1)[0];
  const start = !onboarded();
  return memberShell(`
   ${H("Tableau de bord", `Bonjour, ${esc(S.user.name)}`, "Avancez à votre rythme. Chaque petit pas compte.")}
   ${switcher()}
   <div class="card dash-main">
    <div class="ring" style="--p:${p}" role="img" aria-label="Progression : ${p} %"><span>${p}%</span></div>
    <div class="stack" style="gap:8px;flex:1;min-width:220px">
     <span class="tag">Programme ${esc(C.programme.code)} · ${esc(C.programme.title)}</span>
     <h2 class="h-sub">${start ? "Avant de commencer" : `Semaine ${n} : ${esc(w?.title||"")}`}</h2>
     <p class="muted small">${start ? "Quelques questions et votre consentement, puis vous pourrez commencer la semaine 1." : `${lsDone} leçon${lsDone>1?"s":""} terminée${lsDone>1?"s":""} sur ${ls.length}`}</p>
     <div class="row"><button class="btn btn-primary" data-act="continue">${start ? "Commencer mon programme" : "Continuer mon programme"} ${icon("arrow")}</button></div>
    </div>
   </div>
   <div class="grid g2">
    <div class="card stack" style="gap:8px"><span class="eyebrow">Mon objectif actuel</span>
     ${wg ? `<p class="goal-title">${esc(wg.title)}</p><p class="small muted">Objectif de la semaine ${wg.week_number}</p>` : g ? `<p class="goal-title">${esc(g.title)}</p><p class="small muted">Objectif principal</p>` : `<p class="muted">Vous n’avez pas encore d’objectif.</p>`}
     <button class="linkbtn" data-go="objectifs" style="align-self:flex-start">${wg||g ? "Voir mes objectifs" : "Définir mon objectif"}</button></div>
    ${store.plan() !== "autonome" ? `<div class="card stack" style="gap:8px"><span class="eyebrow">Mon coach</span>
     ${coachMsg ? `<p class="small muted">Dernier message de ${esc(S.coach?.display_name || "votre accompagnante")} · ${fmtShort(coachMsg.created_at)}</p><p class="clamp3">${esc(coachMsg.body)}</p>` : `<p class="muted">Aucun message pour l’instant.</p>`}
     <button class="linkbtn" data-go="coach" style="align-self:flex-start">${unread() ? `${unread()} message${unread()>1?"s":""} non lu${unread()>1?"s":""}` : "Ouvrir Mon coach"}</button></div>`
     : `<button class="card calm-cta" data-go="outils">${icon("sun")}<span><b>Mes outils pour retrouver mon calme</b><span class="small muted">5-4-3-2-1, respiration, détente musculaire</span></span>${icon("arrow")}</button>`}
   </div>
   <div class="quick">${[["lecons","Mes leçons","book"],["journal","Mon journal","pen"],["objectifs","Mes objectifs","target"],["evolution","Mon évolution","chart"]].map(([k,l,i])=>`<button class="quick-btn" data-go="${k}">${icon(i)}<span>${l}</span></button>`).join("")}</div>
   ${store.plan() !== "autonome" ? `<button class="card calm-cta" data-go="outils">${icon("sun")}<span><b>Mes outils pour retrouver mon calme</b><span class="small muted">5-4-3-2-1, respiration, détente musculaire</span></span>${icon("arrow")}</button>` : ""}
   <p class="small muted">${icon("phone")} LE SEUIL n’est pas un service d’urgence. En cas de danger, appelez le SAMU au 185.</p>`);
}
actions["continue"] = () => go(onboarded() ? resumeTarget() : "demarrer");

/* Plusieurs programmes sur le même compte : choix du programme affiché. */
function switcher(){
  if ((S.enrolments || []).length < 2) return "";
  return `<div class="row prog-switch"><label class="small" for="prog-switch">Programme :</label><select id="prog-switch" class="sel-inline">${S.enrolments.map(e => {
    const p = C.programmes.find(x => x.uuid === e.programme_id); return `<option value="${e.id}" ${e.id === S.enrolment?.id ? "selected" : ""}>${esc(p?.title || "Programme")}${store.validEnrolment(e) ? "" : " (inactif)"}</option>`; }).join("")}</select></div>`;
}
changes.push(t => { if (t.id !== "prog-switch") return false; store.switchEnrolment(t.value).then(() => go("espace")); return true; });

/* ---------- Démarrage : adéquation, consentement, point de départ ---------- */
export function mOnboarding(){
  const o = ui.onboarding;
  if (o.stop) {
    const safety = o.stop === "safety";
    return memberShell(`<div class="card urgent stack">
      <h2>${safety ? "Merci de nous l’avoir dit" : "Ce programme n’est pas adapté pour le moment"}</h2>
      ${safety ? `<p>Ce que vous ressentez compte. Un programme d’auto-assistance n’est pas suffisant dans cette situation : vous méritez une aide directe et rapide.</p>
       <div class="grid g3">${EMERGENCY.map(e=>`<div class="emerg"><span class="small">${e.label}</span><span class="price">${e.num}</span></div>`).join("")}</div>
       <p>Vous pouvez aussi vous rendre aux urgences de l’hôpital le plus proche, appeler votre médecin, et rester avec une personne de confiance.</p>
       <p class="small muted">Votre réponse n’a pas été enregistrée.</p>` : `<p>${esc(o.stopText)}</p>`}
      <div class="row"><button class="btn btn-primary" data-go="aide">Trouver une aide appropriée</button><button class="btn btn-soft" data-act="onb-reset">Revenir plus tard</button></div></div>`, "espace");
  }
  const steps = ["Adéquation", "Consentement", "Point de départ"];
  const head = `${H("Avant de commencer", "Bienvenue dans votre programme")}<ol class="stepper">${steps.map((t,i)=>`<li class="${i<o.step?"done":i===o.step?"cur":""}"><span>${i+1}</span>${t}</li>`).join("")}</ol>`;
  let body;
  if (o.step === 0) body = `<form class="card stack" id="onb-suit"><p class="muted">Ces questions nous aident à vérifier que ce programme vous convient. Vos réponses ne sont pas enregistrées : seule la date est conservée.</p>
    ${SUITABILITY.map(q=>`<fieldset class="field"><legend class="flabel">${esc(q.q)}</legend><div class="seg">${["oui","non"].map(v=>`<button type="button" data-act="onb-ans" data-q="${q.id}" data-v="${v}" aria-pressed="${o.answers[q.id]===v}">${v==="oui"?"Oui":"Non"}</button>`).join("")}</div>
     ${q.infoIf && o.answers[q.id]===q.infoIf ? `<p class="small notice calm">${esc(q.info)}</p>` : ""}</fieldset>`).join("")}
    <button class="btn btn-primary" type="submit" style="align-self:flex-start">Continuer</button><p id="onb-out" class="small" role="status"></p></form>`;
  else if (o.step === 1) body = `<form class="card stack" id="onb-consent"><p class="muted">Merci de lire et de confirmer les points suivants.</p>
    <label class="check"><input type="checkbox" required id="k1"><span>Je comprends que LE SEUIL propose de la psychoéducation et de l’auto-assistance, et ne fournit ni diagnostic, ni psychothérapie, ni prise en charge psychiatrique.</span></label>
    <label class="check"><input type="checkbox" required id="k2"><span>Je comprends que LE SEUIL n’est pas un service d’urgence et qu’il n’y a pas de surveillance permanente de mes réponses. En cas de danger, j’appelle le 185.</span></label>
    <label class="check"><input type="checkbox" required id="k3"><span>Je participe de mon plein gré et je peux arrêter à tout moment.</span></label>
    <label class="check"><input type="checkbox" required id="k4"><span>J’ai compris comment mes données sont utilisées : mon journal reste privé${store.plan()!=="autonome"?" ; mon accompagnante voit mes messages, mes rendez-vous et uniquement ce que je choisis de partager":""}.</span></label>
    <button class="btn btn-primary" type="submit" style="align-self:flex-start">Je donne mon accord</button><p id="onb-out" class="small" role="status"></p></form>`;
  else {
    const m = C.programme.measures?.[0];
    const base = S.ratings.find(r => r.week_number === 0 && r.measure_key === m?.key);
    body = `<form class="card stack" id="onb-start"><p class="muted">Pour pouvoir observer votre évolution, notez votre point de départ. Il ne s’agit pas d’un examen.</p>
     ${m ? `<fieldset class="field"><legend class="flabel">${esc(m.label)}</legend><div class="scale">${Array.from({length:11},(_,i)=>`<button type="button" data-act="onb-rate" data-v="${i}" aria-pressed="${(o.rating ?? base?.value)===i}">${i}</button>`).join("")}</div><div class="scale-ends"><span>0 · ${esc(m.min)}</span><span>10 · ${esc(m.max)}</span></div></fieldset>` : ""}
     <div class="field"><label class="flabel" for="onb-goal">Mon objectif principal pour ces six semaines (facultatif)</label><textarea id="onb-goal" rows="2" placeholder="Par exemple : passer moins de temps à ruminer le soir">${esc(mainGoal()?.title||"")}</textarea><span class="hint">Vous pourrez le réviser à tout moment.</span></div>
     <button class="btn btn-gold" type="submit" style="align-self:flex-start">Commencer la semaine 1 ${icon("arrow")}</button></form>`;
  }
  return memberShell(head + body, "espace");
}
actions["onb-ans"] = (b) => { ui.onboarding.answers[b.dataset.q] = b.dataset.v; rerender(); };
actions["onb-rate"] = (b) => { ui.onboarding.rating = +b.dataset.v; rerender(); };
actions["onb-reset"] = () => { ui.onboarding = { step: 0, answers: {} }; go("espace"); };
forms["onb-suit"] = async () => {
  const o = ui.onboarding;
  if (SUITABILITY.some(q => !o.answers[q.id])) { $("#onb-out").textContent = "Merci de répondre à chaque question."; return; }
  const stop = SUITABILITY.find(q => q.stopIf && o.answers[q.id] === q.stopIf);
  if (stop) { o.stop = stop.stop === "safety" ? "safety" : "other"; o.stopText = stop.stop; o.answers = {}; rerender(); return; }
  o.answers = {}; // les réponses ne sont pas conservées
  await store.patchEnrolment({ suitability_completed_at: new Date().toISOString() });
  o.step = 1; rerender();
};
forms["onb-consent"] = async () => {
  if (!["k1","k2","k3","k4"].every(id => $("#"+id).checked)) { $("#onb-out").textContent = "Merci de cocher les quatre points pour continuer."; return; }
  await store.patchEnrolment({ consented_at: new Date().toISOString(), consent_version: "2026-10" });
  ui.onboarding.step = 2; rerender();
};
forms["onb-start"] = async () => {
  const m = C.programme.measures?.[0];
  if (m && ui.onboarding.rating !== undefined) await store.ratingSave(0, m.key, ui.onboarding.rating);
  const goal = $("#onb-goal").value.trim();
  if (goal && goal !== mainGoal()?.title) await store.goalSave({ scope: "principal", week_number: null, title: goal, actions: [], obstacles: "", reflection: "", status: "actif" });
  ui.onboarding = { step: 0, answers: {} };
  go(`semaine-1-0`);
};

/* ---------- Mes leçons ---------- */
export function mLessons(){
  if (!store.enrolmentValid()) return mDash();
  return memberShell(`${H("Mes leçons", esc(C.programme.title), `${pctDone()} % du programme terminé`)}
   <div class="progress" aria-hidden="true"><i style="width:${pctDone()}%"></i></div>
   ${DEMO ? `<label class="check small"><input type="checkbox" id="unlockall" ${S.enrolment?.unlock_all?"checked":""}><span>Maquette : débloquer toutes les semaines</span></label>` : ""}
   <ol class="timeline">${C.weeks.map(w => { const n = w.n, done = !!S.completions[n], open = weekUnlocked(n), cur = !done && open && n === currentWeek();
     const req = required(w), d = doneSteps(w).length;
     const counts = ["lecon","video","exercice"].map(k => { const c = w.steps.filter(s=>s.kind===k && !s.content?.optional).length; return c ? `${c} ${KIND[k].toLowerCase()}${c>1?"s":""}` : ""; }).filter(Boolean).join(" · ");
     return `<li class="${done?"done":cur?"current":open?"":"locked"}"><span class="dot">${done?icon("check"):n}</span><div class="tl-body">
      <div class="row" style="justify-content:space-between"><span class="eyebrow">Semaine ${n}</span><span class="badge ${done?"ok":""}">${done?"Terminée":open?`${d} / ${req.length} étapes`:"À venir"}</span></div>
      <h3 class="h-card">${esc(w.title)}</h3><p class="small muted">${counts}</p>
      ${open ? `<div class="row"><button class="btn ${cur?"btn-primary":"btn-soft"} btn-sm" data-act="open-week" data-n="${n}">${done?"Revoir":d?"Reprendre":"Commencer"}</button></div>`
             : `<span class="small muted row" style="gap:6px">${icon("lock")}S’ouvre après la semaine ${n-1}</span>`}
     </div></li>`; }).join("")}</ol>`);
}
actions["open-week"] = (b) => {
  if (!onboarded()) return go("demarrer");
  const n = +b.dataset.n, w = C.weeks[n-1];
  const i = S.completions[n] ? 0 : Math.max(0, w.steps.findIndex(s => s.required && S.progress[s.uuid] !== "completed"));
  go(`semaine-${n}-${i}`);
};
changes.push(t => { if (t.id !== "unlockall") return false; store.patchEnrolment({ unlock_all: t.checked }).then(rerender); return true; });

/* ---------- Lecteur de semaine ---------- */
export function mPlayer(n, i, preview = false){
  if (!preview && !store.enrolmentValid()) return mDash();
  const w = C.weeks[n-1];
  if (!w) return memberShell(`<p class="muted">Semaine introuvable.</p>`);
  if (!preview && !onboarded()) return mOnboarding();
  if (!preview && !weekUnlocked(n)) return memberShell(`<div class="card stack">${icon("lock")}<h2>Cette semaine n’est pas encore ouverte</h2><p class="muted">Elle s’ouvrira lorsque vous aurez terminé la semaine ${n-1}.</p><button class="btn btn-primary" data-go="lecons" style="align-self:flex-start">Mes leçons</button></div>`, "lecons");
  if (!w.steps.length) return memberShell(`<p class="muted">Le contenu de cette semaine n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>`, "lecons");
  i = Math.max(0, Math.min(i, w.steps.length - 1));
  const s = w.steps[i], c = s.content || {}, done = S.progress[s.uuid] === "completed";
  if (!preview) { store.setLastStep(s.uuid).catch(()=>{}); if (!done) store.setProgress(s.uuid, "started").catch(()=>{}); }
  let body = "";
  if (s.kind === "lecon") body = `${c.placeholder ? `<div class="notice">${icon("info")}<span>Contenu à intégrer : ${esc(c.source||"")}</span></div>` : ""}<div class="prose">${blocksHTML(c.blocks || (c.paragraphs||[]).map(t=>({t:"p",text:t})))}</div>`;
  else if (s.kind === "video") body = videoHTML(s);
  else body = exerciseHTML(s, preview);
  const base = preview ? `apercu-${n}` : `semaine-${n}`;
  const allDone = required(w).every(x => S.progress[x.uuid] === "completed");
  const last = i === w.steps.length - 1;
  const readBtn = (s.kind === "lecon" || s.kind === "video") && !preview
    ? `<button class="btn ${done?"btn-soft":"btn-primary"}" data-act="mark-read" data-w="${s.uuid}" data-next="${last?"":`${base}-${i+1}`}">${done ? (last?"Terminé":"Suivant") : (s.kind==="video"?"J’ai regardé ou lu la vidéo":"J’ai terminé cette leçon")} ${icon(last&&done?"check":"arrow")}</button>`
    : (!last ? `<button class="btn btn-primary" data-go="${base}-${i+1}">Suivant ${icon("arrow")}</button>` : "");
  return `<div class="wrap player">
   <nav class="steps-nav" aria-label="Étapes de la semaine ${n}">
    <button data-go="${preview?"admin":"lecons"}">${icon("back")}${preview?"Retour à l’éditeur":"Mes leçons"}</button>
    <div class="stack" style="gap:2px;padding:10px 12px 6px"><span class="eyebrow">Semaine ${n}${preview?" · aperçu":""}</span><b class="week-name">${esc(w.title)}</b></div>
    <div class="steps-list">${w.steps.map((x,k)=>{ const st = S.progress[x.uuid]; return `<button data-go="${base}-${k}" class="${st==="completed"?"seen":st?"started":""}" ${k===i?'aria-current="step"':""}>
      <span class="sd">${st==="completed"?icon("check"):icon(KIND_ICON[x.kind]||"book")}</span><span class="st-txt">${esc(x.title)}${x.content?.optional?` <em class="opt">facultatif</em>`:""}</span></button>`; }).join("")}</div>
   </nav>
   <section class="stage fade-in" aria-labelledby="steptitle">
    <div class="stack" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="kind-tag">${icon(KIND_ICON[s.kind]||"book")}${kindLabel(s)}${c.main?" · exercice principal":""}${c.optional?" · facultatif":""}</span><span class="small muted">Étape ${i+1} sur ${w.steps.length}</span></div>
     <div class="progress" aria-hidden="true"><i style="width:${((i+1)/w.steps.length)*100}%"></i></div></div>
    <h2 id="steptitle">${esc(s.title)}</h2>
    ${body}
    ${allDone && !preview && (last || s.kind==="bilan" || c.optional) ? `<div class="notice calm">${icon("check")}<span><b>Semaine ${n} terminée.</b> ${n < C.weeks.length ? `La semaine ${n+1} est ouverte.${w.steps.some(x=>x.content?.optional) ? " Les étapes facultatives restent disponibles à tout moment." : ""}` : "Félicitations pour ce chemin parcouru. Retrouvez votre plan dans Mon plan personnel."}</span></div>` : ""}
    <div class="stage-foot">
     <button class="btn btn-soft" data-go="${base}-${Math.max(0,i-1)}" ${i===0?"disabled":""}>${icon("back")}Précédent</button>
     ${readBtn}
     ${allDone && !preview && n < C.weeks.length && (last || s.kind==="bilan" || c.optional) ? `<button class="btn btn-gold" data-act="open-week" data-n="${n+1}">Commencer la semaine ${n+1} ${icon("arrow")}</button>` : ""}
    </div>
   </section></div>`;
}
function videoHTML(s){
  const c = s.content || {};
  const player = c.url ? `<video class="vid" controls preload="metadata" src="${esc(c.url)}">${c.captions_url?`<track kind="captions" srclang="fr" label="Français" src="${esc(c.captions_url)}" default>`:""}</video>`
    : `<div class="video"><div><div class="play">${icon("play")}</div><b>${esc(s.title)}</b><div class="small">Vidéo en cours de production${c.duration?` · environ ${esc(c.duration)}`:""}</div></div></div>`;
  return `${player}${c.transcript ? `<details class="transcript" ${c.url?"":"open"}><summary>Transcription${c.url?"":" (version écrite)"}</summary><div class="prose"><p>${esc(c.transcript)}</p></div></details>` : ""}`;
}
actions["mark-read"] = async (b) => {
  await store.setProgress(b.dataset.w, "completed");
  await afterCompletion(b.dataset.w);
  if (b.dataset.next) go(b.dataset.next); else rerender();
};
actions["ex-complete"] = async (b) => {
  const ok = await completeStep(b.dataset.w);
  if (!ok) return;
  toast("Exercice enregistré");
  await afterCompletion(b.dataset.w);
  const [n, i] = ui.params; const w = C.weeks[n-1];
  if (w && i < w.steps.length - 1 && ui.route === "semaine") go(`semaine-${n}-${i+1}`); else rerender();
};
async function afterCompletion(uuid){
  const w = C.weeks.find(x => x.steps.some(s => s.uuid === uuid));
  if (w && !S.completions[w.n] && required(w).every(s => S.progress[s.uuid] === "completed")) {
    await store.completeWeek(w.n); toast(`Semaine ${w.n} terminée. Bravo !`);
  }
}

/* ---------- Mes exercices ---------- */
export function mExercises(){
  const status = (s) => S.progress[s.uuid] === "completed" ? ["ok","Terminé"] : S.responses[s.uuid] || S.progress[s.uuid] ? ["","En cours"] : ["mute","Non commencé"];
  return memberShell(`${H("Mes exercices", "Vos exercices, semaine par semaine", "Vous pouvez revenir compléter ou modifier un exercice à tout moment.")}
   ${C.weeks.map(w => `<section class="stack" style="gap:10px"><h2 class="h-sub">Semaine ${w.n} · ${esc(w.title)}</h2>
    <div class="ex-list">${w.steps.map((s,i)=>({s,i})).filter(({s})=>["exercice","bilan"].includes(s.kind)).map(({s,i}) => { const [cls, lab] = status(s); const open = weekUnlocked(w.n);
     return `<div class="ex-item"><span class="kind-ico">${icon(KIND_ICON[s.kind])}</span><div class="stack" style="gap:2px;min-width:0"><b>${esc(s.title)}</b><span class="small muted">${kindLabel(s)}${s.content?.main?" · principal":""}${s.content?.optional?" · facultatif":""}</span></div>
      <span class="badge ${cls}">${lab}</span>${open?`<button class="btn btn-soft btn-sm" data-act="goto-step" data-r="semaine-${w.n}-${i}">${lab==="Terminé"?"Revoir":"Ouvrir"}</button>`:`<span class="small muted">${icon("lock")}</span>`}</div>`; }).join("")}</div></section>`).join("")}`);
}
actions["goto-step"] = (b) => { if (!onboarded()) return go("demarrer"); go(b.dataset.r); };

/* ---------- Mon journal ---------- */
const prompts = () => [["","Note libre"], ...C.weeks.flatMap(w => w.steps.filter(s=>s.content?.component==="journal").map(s=>[s.content.prompt, `Semaine ${w.n} · ${s.content.prompt}`])),
  ...C.weeks.flatMap(w => (w.steps.find(s=>s.kind==="bilan")?.content?.fields||[]).filter(f=>f.type==="textarea"||!f.type).map(f=>[f.label, `Semaine ${w.n} · ${f.label}`]))];
export function mJournal(){
  const q = ui.journalQuery.trim().toLowerCase(), wk = ui.journalWeek;
  const entries = S.journal.filter(e => (wk==="all" || String(e.week_number)===wk) && (!q || (e.body+" "+(e.prompt||"")).toLowerCase().includes(q)));
  const exs = C.weeks.flatMap(w => w.steps.filter(s => ["exercice","bilan"].includes(s.kind) && S.responses[s.uuid] && s.content?.component!=="journal" && s.content?.component!=="breath").map(s => ({ w, s, txt: summaryText(s, S.responses[s.uuid]) })))
    .filter(x => x.txt && (wk==="all" || String(x.w.n)===wk) && (!q || (x.s.title+" "+x.txt).toLowerCase().includes(q)));
  const ed = ui.journalEdit || {};
  const editor = `<form class="card stack journal-editor" id="journalform">
    <div class="row" style="justify-content:space-between"><h2 class="h-sub" style="margin:0">${ed.id ? "Modifier l’entrée" : "Nouvelle entrée"}</h2>${saveStateHTML()}</div>
    <div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="je-week">Semaine associée</label><select id="je-week"><option value="">Aucune</option>${C.weeks.map(w=>`<option value="${w.n}" ${String(ed.week_number ?? currentWeek())===String(w.n)?"selected":""}>Semaine ${w.n}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="je-prompt">Question de réflexion</label><select id="je-prompt">${prompts().map(([v,l])=>`<option value="${esc(v)}" ${(ed.prompt||"")===v?"selected":""}>${esc(l)}</option>`).join("")}</select></div></div>
    <div class="field"><label class="flabel" for="je-body">Mon texte</label><textarea id="je-body" rows="6" placeholder="Qu’avez-vous remarqué aujourd’hui ?">${esc(ed.body||"")}</textarea><span class="hint">Enregistrement automatique. Votre journal est privé : personne d’autre que vous ne le lit.</span></div>
    <div class="row"><button class="btn btn-primary" type="submit">${ed.id ? "Terminer" : "Enregistrer"}</button>${ed.id?`<button type="button" class="btn btn-soft" data-act="je-new">Nouvelle entrée</button>`:""}</div></form>`;
  return memberShell(`${H("Mon journal", "Un espace rien qu’à vous")}
   ${DEMO ? `<div class="notice">${icon("lock")}<span>Maquette : vos notes restent dans ce navigateur. N’y écrivez pas d’informations personnelles réelles.</span></div>` : ""}
   ${editor}
   <div class="row journal-tools">
    <label class="search grow">${icon("search")}<span class="sr">Rechercher</span><input id="jq" type="text" placeholder="Rechercher dans mon journal" value="${esc(ui.journalQuery)}"></label>
    <label class="sr" for="jw">Filtrer par semaine</label><select id="jw" class="sel-inline"><option value="all">Toutes les semaines</option>${C.weeks.map(w=>`<option value="${w.n}" ${wk===String(w.n)?"selected":""}>Semaine ${w.n}</option>`).join("")}</select>
    <button class="btn btn-soft btn-sm" data-act="je-export-txt">${icon("download")}Texte</button><button class="btn btn-soft btn-sm" data-act="je-export-pdf">${icon("download")}PDF</button>
   </div>
   <div class="tabs" role="tablist">${[["notes",`Mes entrées (${entries.length})`],["exercices",`Mes réponses aux exercices (${exs.length})`]].map(([k,l])=>`<button role="tab" data-act="jtab" data-v="${k}" aria-selected="${ui.journalTab===k}">${l}</button>`).join("")}</div>
   ${ui.journalTab==="notes" ? `<div class="stack">${entries.map(e=>`<article class="entry"><div class="row" style="justify-content:space-between"><span class="small muted">${fmtDate(e.created_at, true)}${e.week_number?` · ${esc(C.programme.title)} · semaine ${e.week_number}`:""}</span>
      <span class="row" style="gap:6px">${ui.confirm===e.id?`<span class="small">Supprimer ?</span><button class="btn btn-primary btn-sm" data-act="je-del" data-id="${e.id}">Oui</button><button class="btn btn-soft btn-sm" data-act="je-nodel">Non</button>`:`<button class="linkbtn small" data-act="je-edit" data-id="${e.id}">Modifier</button><button class="linkbtn small" data-act="je-askdel" data-id="${e.id}">Supprimer</button>`}</span></div>
      ${e.prompt?`<p class="entry-prompt">${esc(e.prompt)}</p>`:""}<p class="entry-body">${esc(e.body)}</p></article>`).join("") || `<p class="muted">Aucune entrée${q||wk!=="all"?" ne correspond à votre recherche":" pour l’instant"}.</p>`}</div>`
     : `<div class="stack">${exs.map(x=>`<article class="entry"><span class="small muted">Semaine ${x.w.n} · ${kindLabel(x.s)}</span><h3 class="h-card">${esc(x.s.title)}</h3><pre class="entry-body pre">${esc(x.txt)}</pre></article>`).join("") || `<p class="muted">Vos réponses aux exercices apparaîtront ici.</p>`}</div>`}`);
}
actions["jtab"] = (b) => { ui.journalTab = b.dataset.v; rerender(); };
let jTimer;
async function journalAutosave(){
  const body = $("#je-body")?.value || ""; if (!body.trim()) return;
  setSaveState("Enregistrement…");
  try {
    const wkv = $("#je-week").value;
    const e = await store.journalSave({ id: ui.journalEdit?.id, week_number: wkv ? +wkv : null, prompt: $("#je-prompt").value || null, body });
    ui.journalEdit = { ...e }; setSaveState(`Enregistré à ${fmtTime(new Date())}`);
  } catch(err) { console.error(err); setSaveState("Échec de l’enregistrement"); }
}
inputs.push(t => {
  if (t.id === "je-body") { clearTimeout(jTimer); setSaveState("Modifications non enregistrées"); jTimer = setTimeout(journalAutosave, 900); return true; }
  if (t.id === "jq") { ui.journalQuery = t.value; rerender(); return true; }
  return false;
});
changes.push(t => {
  if (t.id === "jw") { ui.journalWeek = t.value; rerender(); return true; }
  if ((t.id === "je-week" || t.id === "je-prompt") && ui.journalEdit?.id) { journalAutosave(); return true; }
  return false;
});
forms["journalform"] = async () => { clearTimeout(jTimer); if (!$("#je-body").value.trim()) { setSaveState("Écrivez quelques mots avant d’enregistrer."); return; } await journalAutosave(); ui.journalEdit = null; toast("Entrée enregistrée"); rerender(); };
actions["je-new"] = () => { ui.journalEdit = null; setSaveState(""); rerender(); };
actions["je-edit"] = (b) => { ui.journalEdit = { ...S.journal.find(e => e.id === b.dataset.id) }; setSaveState(""); rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); };
actions["je-askdel"] = (b) => { ui.confirm = b.dataset.id; rerender(); };
actions["je-nodel"] = () => { ui.confirm = null; rerender(); };
actions["je-del"] = async (b) => { await store.journalDelete(b.dataset.id); if (ui.journalEdit?.id === b.dataset.id) ui.journalEdit = null; ui.confirm = null; toast("Entrée supprimée"); rerender(); };
function journalText(){
  const lines = [`Mon journal — LE SEUIL`, `${C.programme.title}`, `Exporté le ${fmtDate(new Date(), true)}`, ""];
  S.journal.slice().reverse().forEach(e => { lines.push(`— ${fmtDate(e.created_at, true)}${e.week_number?` · semaine ${e.week_number}`:""}`); if (e.prompt) lines.push(e.prompt); lines.push(e.body, ""); });
  lines.push("", "Mes réponses aux exercices", "");
  C.weeks.forEach(w => w.steps.forEach(s => { const d = S.responses[s.uuid]; if (d && ["exercice","bilan"].includes(s.kind) && s.content?.component!=="journal") { const t = summaryText(s, d); if (t) lines.push(`Semaine ${w.n} · ${s.title}`, t, ""); } }));
  return lines.join("\n");
}
actions["je-export-txt"] = () => download(`mon-journal-le-seuil-${new Date().toISOString().slice(0,10)}.txt`, journalText());
actions["je-export-pdf"] = () => printSection(`<pre class="pre">${esc(journalText())}</pre>`, "Mon journal");

/* ---------- Mes objectifs ---------- */
export function mGoals(){
  const principal = S.goals.filter(g => g.scope === "principal").sort((a,b)=>a.created_at.localeCompare(b.created_at));
  const cur = principal.filter(g => g.status !== "ajuste" && g.status !== "archive").slice(-1)[0];
  const weekly = S.goals.filter(g => g.scope === "hebdomadaire");
  const active = weekly.filter(g => g.status === "actif").sort((a,b)=>(a.week_number||0)-(b.week_number||0));
  const past = [...principal.filter(g=>g!==cur), ...weekly.filter(g => g.status !== "actif")].sort((a,b)=>b.updated_at?.localeCompare(a.updated_at||"")||0);
  const editing = ui.goalEdit;
  const goalCard = (g) => {
    const edit = editing === g.id;
    if (edit) return `<form class="card stack" id="goalform" data-id="${g.id}"><div class="field"><label class="flabel" for="g-title">Objectif révisé</label><textarea id="g-title" rows="2">${esc(g.title)}</textarea></div>
      <div class="field"><label class="flabel" for="g-obst">Ce qui a fait obstacle (facultatif)</label><textarea id="g-obst" rows="2">${esc(g.obstacles)}</textarea></div>
      <p class="small muted">L’objectif précédent sera conservé dans votre historique.</p><div class="row"><button class="btn btn-primary btn-sm" type="submit">Enregistrer la révision</button><button type="button" class="btn btn-soft btn-sm" data-act="g-cancel">Annuler</button></div></form>`;
    const acts = g.actions || [];
    const allDone = acts.length && acts.every(a => a.done);
    return `<article class="card stack goal" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="eyebrow">${g.scope==="principal"?"Objectif principal":`Semaine ${g.week_number||"—"}`}</span><span class="badge ${g.status==="atteint"?"ok":""}">${g.status==="atteint"?"Atteint":"En cours"}</span></div>
      <p class="goal-title">${esc(g.title)}</p>
      ${g.scope==="hebdomadaire" ? `<div class="stack" style="gap:6px"><span class="flabel">Mes actions concrètes</span>${acts.map((a,i)=>`<label class="check"><input type="checkbox" data-goal="${g.id}" data-i="${i}" ${a.done?"checked":""}><span>${esc(a.text)}</span></label>`).join("") || `<span class="small muted">Ajoutez une ou deux actions réalistes.</span>`}
        <div class="row" style="flex-wrap:nowrap"><label class="sr" for="ga-${g.id}">Nouvelle action</label><input type="text" id="ga-${g.id}" placeholder="Une petite action réaliste"><button class="btn btn-soft btn-sm" data-act="g-addaction" data-id="${g.id}">Ajouter</button></div></div>
        <div class="field"><label class="flabel" for="go-${g.id}">Obstacles rencontrés</label><textarea id="go-${g.id}" data-goalobst="${g.id}" rows="2">${esc(g.obstacles)}</textarea></div>
        ${(g.week_number||0) < currentWeek() && !allDone ? `<p class="small notice calm">${icon("info")}<span>Un objectif non atteint est une information utile, pas un échec. Qu’est-ce qui a fait obstacle ? Que pourriez-vous ajuster ?</span></p>` : ""}` : ""}
      <div class="row">${g.status!=="atteint"?`<button class="btn btn-soft btn-sm" data-act="g-done" data-id="${g.id}">${icon("check")}Marquer comme atteint</button>`:""}<button class="btn btn-soft btn-sm" data-act="g-revise" data-id="${g.id}">Réviser</button></div></article>`;
  };
  return memberShell(`${H("Mes objectifs", "Avancer par petits pas", "Des objectifs concrets et réalistes, que vous pouvez ajuster à tout moment.")}
   <section class="stack"><h2 class="h-sub">Mon objectif principal</h2>
    ${cur ? goalCard(cur) : `<form class="card stack" id="goalnew-main"><div class="field"><label class="flabel" for="gm-title">Ce que j’aimerais voir changer d’ici la fin du programme</label><textarea id="gm-title" rows="2" placeholder="Par exemple : passer moins de temps à ruminer le soir"></textarea></div><button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Définir mon objectif</button></form>`}</section>
   <section class="stack"><div class="row" style="justify-content:space-between"><h2 class="h-sub" style="margin:0">Mes objectifs de la semaine</h2></div>
    ${active.map(goalCard).join("")}
    <form class="card-flat stack" id="goalnew-week"><div class="grid g2" style="gap:12px"><div class="field"><label class="flabel" for="gw-title">Nouvel objectif hebdomadaire</label><input id="gw-title" type="text" placeholder="Un petit objectif pour cette semaine"></div>
     <div class="field"><label class="flabel" for="gw-week">Semaine</label><select id="gw-week">${C.weeks.map(w=>`<option value="${w.n}" ${w.n===currentWeek()?"selected":""}>Semaine ${w.n}</option>`).join("")}</select></div></div>
     <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">${icon("plus")}Ajouter</button></form></section>
   ${store.plan()!=="autonome" ? `<label class="check card-flat"><input type="checkbox" id="share-goals" ${S.enrolment?.share_goals?"checked":""}><span><b>Partager mes objectifs avec mon accompagnante.</b> Elle pourra voir vos objectifs, vos actions et les obstacles notés, jamais votre journal. Vous pouvez retirer ce partage à tout moment.</span></label>` : ""}
   <section class="stack"><h2 class="h-sub">Mes objectifs précédents</h2>${past.length ? `<ul class="hist">${past.map(g=>`<li><span class="badge ${g.status==="atteint"?"ok":""}">${g.status==="atteint"?"Atteint":g.status==="ajuste"?"Ajusté":"Archivé"}</span><span>${esc(g.title)}</span><span class="small muted">${g.scope==="principal"?"Principal":`Semaine ${g.week_number}`}</span></li>`).join("")}</ul>` : `<p class="muted small">Vos objectifs révisés ou atteints apparaîtront ici.</p>`}</section>`);
}
forms["goalnew-main"] = async () => { const t = $("#gm-title").value.trim(); if (!t) return; await store.goalSave({ scope: "principal", week_number: null, title: t, actions: [], obstacles: "", reflection: "", status: "actif" }); toast("Objectif enregistré"); rerender(); };
forms["goalnew-week"] = async () => { const t = $("#gw-title").value.trim(); if (!t) return; await store.goalSave({ scope: "hebdomadaire", week_number: +$("#gw-week").value, title: t, actions: [], obstacles: "", reflection: "", status: "actif" }); toast("Objectif ajouté"); rerender(); };
forms["goalform"] = async (f) => { const g = S.goals.find(x => x.id === f.dataset.id); const t = $("#g-title").value.trim(); if (!t) return; await store.goalRevise(g, { title: t, obstacles: $("#g-obst").value.trim() }); ui.goalEdit = null; toast("Objectif révisé"); rerender(); };
actions["g-revise"] = (b) => { ui.goalEdit = b.dataset.id; rerender(); };
actions["g-cancel"] = () => { ui.goalEdit = null; rerender(); };
actions["g-done"] = async (b) => { const g = S.goals.find(x => x.id === b.dataset.id); await store.goalSave({ ...g, status: "atteint" }); toast("Bravo !"); rerender(); };
actions["g-addaction"] = async (b) => { const g = S.goals.find(x => x.id === b.dataset.id); const inp = $("#ga-"+g.id); const v = inp.value.trim(); if (!v) return; await store.goalSave({ ...g, actions: [...(g.actions||[]), { text: v, done: false }] }); rerender(); };
changes.push(t => {
  if (t.dataset.goal) { const g = S.goals.find(x => x.id === t.dataset.goal); const acts = (g.actions||[]).map((a,i)=> i === +t.dataset.i ? { ...a, done: t.checked } : a); store.goalSave({ ...g, actions: acts }).then(rerender); return true; }
  if (t.dataset.goalobst) { const g = S.goals.find(x => x.id === t.dataset.goalobst); store.goalSave({ ...g, obstacles: t.value }).then(()=>toast("Enregistré")); return true; }
  if (t.id === "share-goals") { store.patchEnrolment({ share_goals: t.checked }).then(()=>{ toast(t.checked ? "Objectifs partagés avec votre accompagnante" : "Partage des objectifs retiré"); }); return true; }
  return false;
});

/* ---------- Mon évolution ---------- */
function ratingChart(measure){
  const pts = [0,1,2,3,4,5,6].map(n => ({ n, r: S.ratings.find(x => x.week_number === n && x.measure_key === measure.key) }));
  const W = 560, Hh = 220, l = 34, r = 14, t = 16, b = 34, x = (n) => l + n * (W - l - r) / 6, y = (v) => t + (10 - v) * (Hh - t - b) / 10;
  const have = pts.filter(p => p.r);
  const line = have.map((p,i) => `${i?"L":"M"}${x(p.n)},${y(p.r.value)}`).join("");
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Évolution de vos notes de 0 à 10, du début à la semaine 6">
    ${[0,5,10].map(v=>`<line x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}" class="grid-l"/><text x="${l-8}" y="${y(v)+4}" class="ax" text-anchor="end">${v}</text>`).join("")}
    ${pts.map(p=>`<text x="${x(p.n)}" y="${Hh-10}" class="ax" text-anchor="middle">${p.n===0?"Début":"S"+p.n}</text>`).join("")}
    ${have.length>1?`<path d="${line}" class="ln"/>`:""}
    ${have.map((p,i)=>`<circle cx="${x(p.n)}" cy="${y(p.r.value)}" r="${i===have.length-1?6:4}" class="pt ${i===have.length-1?"last":""}"/><text x="${x(p.n)}" y="${y(p.r.value)-11}" class="val" text-anchor="middle">${p.r.value}</text>`).join("")}
   </svg></div>`;
}
const canQuestionnaires = () => store.plan() !== "autonome" && C.flags.questionnaires && C.programme?.questionnaires_enabled && S.enrolment?.questionnaires_enabled;
export function mProgress(){
  const m = C.programme.measures?.[0];
  const exAll = exercisesAll(), exDone = exAll.filter(({s}) => S.progress[s.uuid] === "completed");
  const goals = S.goals, reached = goals.filter(g => g.status === "atteint").length;
  const base = S.ratings.find(r => r.week_number === 0), latest = S.ratings.filter(r=>r.week_number>0).sort((a,b)=>b.week_number-a.week_number)[0];
  return memberShell(`${H("Mon évolution", "Ce qui change, à votre rythme", "Un suivi personnel et non clinique. Ces notes vous aident à observer votre expérience ; elles ne constituent ni un diagnostic ni une mesure clinique.")}
   ${m ? `<section class="card stack"><h2 class="h-sub">${esc(m.label)}</h2><p class="small muted">Échelle personnelle de 0 (${esc(m.min)}) à 10 (${esc(m.max)}). Notée au début puis dans chaque bilan.</p>${ratingChart(m)}
     <form class="row" id="rate-now"><label class="small" for="rn">Ajouter ou modifier la note de la semaine ${currentWeek()} :</label><select id="rn" class="sel-inline">${Array.from({length:11},(_,i)=>`<option ${S.ratings.find(r=>r.week_number===currentWeek())?.value===i?"selected":""}>${i}</option>`).join("")}</select><button class="btn btn-soft btn-sm" type="submit">Enregistrer</button></form></section>` : ""}
   <div class="grid g3">
    <div class="kpi"><span class="small muted">Exercices terminés</span><b>${exDone.length}<small> / ${exAll.length}</small></b></div>
    <div class="kpi"><span class="small muted">Objectifs atteints</span><b>${reached}<small> / ${goals.length}</small></b></div>
    <div class="kpi"><span class="small muted">Entrées de journal</span><b>${S.journal.length}</b></div>
   </div>
   <section class="card stack"><h2 class="h-sub">Bilan du début et de la fin du programme</h2>
    ${base ? `<div class="compare"><div><span class="small muted">Au début</span><b>${base.value}/10</b></div><span>${icon("arrow")}</span><div><span class="small muted">${latest?`Semaine ${latest.week_number}`:"Maintenant"}</span><b>${latest?latest.value+"/10":"—"}</b></div></div>` : `<p class="muted small">Votre point de départ sera noté au démarrage du programme.</p>`}
    <p class="small muted">${S.completions[6] ? "Votre bilan final se trouve dans la semaine 6 : « Le chemin parcouru »." : "Le bilan final sera complété en semaine 6."} Si vous n’avez pas constaté les progrès espérés, cela ne signifie pas que vous avez échoué.</p></section>
   <section class="stack"><h2 class="h-sub">Mes réflexions récentes</h2>${S.journal.slice(0,3).map(e=>`<div class="entry"><span class="small muted">${fmtDate(e.created_at)}</span><p class="clamp3">${esc(e.body)}</p></div>`).join("") || `<p class="muted small">Aucune réflexion pour l’instant.</p>`}<button class="linkbtn" data-go="journal" style="align-self:flex-start">Ouvrir Mon journal</button></section>
   ${canQuestionnaires() ? `<section class="card stack"><h2 class="h-sub">Questionnaires d’accompagnement</h2><p class="small muted">Activés par votre accompagnante dans le cadre de votre forfait. Ils sont revus par une personne ; aucun résultat ne déclenche de diagnostic ou de décision automatique.</p><p class="small muted">Le contenu validé des questionnaires doit être ajouté par l’administration avant utilisation.</p></section>` : ""}`);
}
forms["rate-now"] = async () => { const m = C.programme.measures?.[0]; await store.ratingSave(currentWeek(), m.key, +$("#rn").value); toast("Note enregistrée"); rerender(); };

/* ---------- Mon plan personnel ---------- */
const planStep = () => { for (const w of C.weeks) { const s = w.steps.find(x => x.content?.plan); if (s) return { w, s }; } return null; };
export function mPlan(){
  const ps = planStep(); if (!ps) return memberShell(`<p class="muted">Le plan personnel n’est pas disponible.</p>`);
  const d = S.responses[ps.s.uuid] || {};
  const kept = Object.values(S.responses).find(r => Array.isArray(r?.techniques))?.techniques || [];
  return memberShell(`${H("Mon plan personnel", "Mon plan pour continuer à avancer", "Conservez ce plan dans un endroit accessible et modifiez-le si votre situation évolue.")}
   ${!S.completions[5] ? `<div class="notice calm">${icon("info")}<span>Vous construirez ce plan en semaine 6. Vous pouvez le commencer dès maintenant.</span></div>` : ""}
   <div class="card stack">${exerciseHTML(ps.s)}</div>
   ${kept.length ? `<div class="card-flat stack"><h3 class="h-card">Les techniques que j’ai choisi de conserver</h3><ul class="ticks">${kept.map(k=>`<li>${esc(k)}</li>`).join("")}</ul></div>` : ""}
   <div class="card-flat stack"><h3 class="h-card">En cas d’urgence</h3><p>${EMERGENCY.map(e=>`${e.label} : <b>${e.num}</b>`).join(" · ")}</p></div>
   <div class="row"><button class="btn btn-soft" data-act="plan-txt">${icon("download")}Télécharger (texte)</button><button class="btn btn-soft" data-act="plan-pdf">${icon("download")}Télécharger (PDF)</button></div>`, "plan");
}
const planText = () => { const ps = planStep(); return `Mon plan pour continuer à avancer — LE SEUIL\n${C.programme.title}\n\n${summaryText(ps.s, S.responses[ps.s.uuid]||{})}\n\nEn cas d’urgence : ${EMERGENCY.map(e=>`${e.label} ${e.num}`).join(" · ")}\n`; };
actions["plan-txt"] = () => download("mon-plan-le-seuil.txt", planText());
actions["plan-pdf"] = () => printSection(`<pre class="pre">${esc(planText())}</pre>`, "Mon plan personnel");

/* ---------- Mes outils pour retrouver mon calme ---------- */
export function mTools(){
  return memberShell(`${H("Mes outils pour retrouver mon calme", "Trois techniques facultatives, disponibles à tout moment", "Choisissez ce qui vous convient. Vous n’avez rien à réussir.")}
   ${CALM_TOOLS.map(t=>`<article class="card stack tool"><div class="row" style="justify-content:space-between"><h2 class="h-sub" style="margin:0">${esc(t.title)}</h2><span class="tag">Semaine ${t.week}</span></div>
     <div class="tool-grid"><div><span class="eyebrow">Quand essayer</span><p>${esc(t.quand)}</p></div>
      <div><span class="eyebrow">Comment faire</span><ol>${t.comment.map(c=>`<li>${esc(c)}</li>`).join("")}</ol></div>
      <div><span class="eyebrow">Si cela ne me convient pas</span><p>${esc(t.sinon)}</p></div>
      <div><span class="eyebrow">Que faire ensuite ?</span><p>${esc(t.ensuite)}</p></div></div>
     ${t.breath ? breathHTML() : ""}</article>`).join("")}
   <p class="small muted">${esc(CALM_NOTE)} En cas de danger, appelez le SAMU au 185.</p>`, "outils");
}

/* ---------- Mon coach ---------- */
export function mCoach(){
  if (store.plan() === "autonome") return memberShell(`${H("Mon coach", "Accompagnement")}<div class="card stack"><p>Votre forfait Autonome n’inclut pas d’accompagnement.</p><p class="muted small">Les forfaits 2 et 3 ajoutent un accompagnement écrit ou six échanges de 15 minutes.</p><button class="btn btn-soft btn-sm" data-go="programmes" style="align-self:flex-start">Voir les forfaits</button></div>`);
  const cp = S.coach || { display_name: COACH.name, public_title: COACH.title, bio: COACH.bio, verified: COACH.verified, hours: COACH.hours, response_delay: COACH.delay, limits: COACH.limits.join("\n") };
  const open = store.supportOpen(), ecrit = store.plan() === "ecrit";
  store.markMessagesRead().catch(()=>{});
  const kinds = ecrit ? [["question","Question sur le programme"],["pratique","Information pratique"]] : [["pratique","Information pratique ou administrative"]];
  const KLAB = { suivi: "Accompagnement écrit", question: "Question", pratique: "Pratique" };
  const thread = `<div class="thread">${S.messages.map(m => { const mine = m.sender_id === S.user.id;
    return `<div class="msg ${mine?"mine":""}"><div class="msg-meta">${mine?"Vous":esc(cp.display_name)} · ${fmtDate(m.created_at, true)} · <span class="tag">${KLAB[m.kind]}</span></div><p>${esc(m.body)}</p></div>`; }).join("") || `<p class="muted small">Aucun message pour l’instant.</p>`}</div>`;
  const compose = open ? `<form class="stack" id="msgform"><div class="field"><label class="flabel" for="msg-kind">Type de message</label><select id="msg-kind">${kinds.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></div>
     <div class="field"><label class="flabel" for="msg-body">Votre message</label><textarea id="msg-body" rows="4" maxlength="5000"></textarea><span class="hint">${esc(cp.response_delay)}. Ne partagez pas d’informations urgentes : en cas de danger, appelez le 185.</span></div>
     <button class="btn btn-primary" type="submit" style="align-self:flex-start">${icon("send")}Envoyer</button></form>` : `<p class="small muted">${icon("lock")} La messagerie ouvrira lorsque le cadre de l’accompagnement aura été validé.</p>`;
  const appts = !ecrit ? (() => {
    const next = [1,2,3,4,5,6].find(n => !S.appointments.some(a => a.session_number === n && a.status !== "annule"));
    const ST = { demande: "Demandé", confirme: "Confirmé", effectue: "Effectué", annule: "Annulé", manque: "Manqué" };
    return `<section class="card stack"><h2 class="h-sub">Mes six échanges de 15 minutes</h2>
     <div class="sessions">${[1,2,3,4,5,6].map(n => { const a = S.appointments.filter(x => x.session_number === n && x.status !== "annule").slice(-1)[0];
       return `<div class="session ${a?.status||""}"><span class="eyebrow">Échange ${n}</span>${a ? `<b>${fmtDate(a.starts_at, true)}</b><span class="small">${a.mode==="video"?"Vidéo":"Téléphone"} · ${ST[a.status]}</span>${["demande","confirme"].includes(a.status) && new Date(a.starts_at) > new Date() ? `<button class="linkbtn small" data-act="appt-cancel" data-id="${a.id}">Annuler</button>` : ""}` : `<span class="small muted">À planifier</span>`}</div>`; }).join("")}</div>
     ${open && next ? `<form class="stack" id="apptform"><h3 class="h-card">Demander l’échange ${next}</h3><div class="grid g3" style="gap:12px">
       <div class="field"><label class="flabel" for="ap-date">Date et heure souhaitées</label><input id="ap-date" type="datetime-local" required></div>
       <div class="field"><label class="flabel" for="ap-mode">Modalité</label><select id="ap-mode"><option value="telephone">Téléphone</option><option value="video">Vidéo</option></select></div>
       <div class="field"><label class="flabel" for="ap-note">Précision pratique (facultatif)</label><input id="ap-note" type="text" maxlength="500" placeholder="Par exemple : après 17 h"></div></div>
       <input type="hidden" id="ap-n" value="${next}"><button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">${icon("cal")}Envoyer la demande</button>
       <p class="small muted">Votre accompagnante confirme le créneau. Un rappel vous est envoyé la veille.</p><p id="ap-out" class="small" role="status"></p></form>` : !open ? `<p class="small muted">${icon("lock")} La prise de rendez-vous ouvrira lorsque le cadre de l’accompagnement aura été validé.</p>` : ""}
    </section>`; })() : "";
  const shared = Object.values(S.summaries).sort((a,b)=>a.week_number-b.week_number);
  return memberShell(`${H("Mon coach", ecrit ? "Accompagnement écrit" : "Accompagnement par appels")}
   <div class="notice">${icon("phone")}<span><b>Mon coach n’est pas un service d’urgence.</b> Les messages ne sont pas lus en continu. En cas de danger, appelez le SAMU au 185 ou rendez-vous aux urgences.</span></div>
   <section class="card coach-card"><div class="coach-ava" aria-hidden="true">${esc(cp.display_name.split(" ").map(x=>x[0]).join(""))}</div>
    <div class="stack" style="gap:8px;min-width:0"><div><h2 class="h-sub" style="margin:0">${esc(cp.display_name)}</h2><p class="muted">${esc(cp.public_title)}</p></div>
     <span class="tag ${cp.verified?"":"warn"}">${cp.verified?`${icon("check")}Présentation vérifiée par LE SEUIL`:"Présentation en cours de vérification"}</span>
     <p>${esc(cp.bio)}</p>
     <div class="grid g2" style="gap:12px"><div><span class="eyebrow">Horaires</span><p class="small">${esc(cp.hours)}</p></div><div><span class="eyebrow">Délais de réponse</span><p class="small">${esc(cp.response_delay)}</p></div></div>
     <details><summary class="linkbtn">Modalités et limites de l’accompagnement</summary><ul class="ticks small" style="margin-top:10px">${String(cp.limits||"").split("\n").filter(Boolean).map(l=>`<li>${esc(l)}</li>`).join("")}</ul></details></div></section>
   ${appts}
   <section class="card stack"><h2 class="h-sub">${ecrit ? "Mes messages" : "Messagerie pratique"}</h2>
    <p class="small muted">${ecrit ? "Accompagnement écrit chaque semaine et questions en lien avec le programme." : "Pour les questions pratiques et administratives : horaires, changement de rendez-vous, accès. L’accompagnement se fait pendant vos six échanges."}</p>
    ${thread}${compose}</section>
   <section class="card stack"><h2 class="h-sub">Ce que je partage</h2>
    <p class="small muted">Votre journal personnel n’est jamais partagé. Vous choisissez ce que votre accompagnante peut voir.</p>
    <label class="check"><input type="checkbox" id="share-sum" ${S.enrolment.share_summaries?"checked":""}><span>Mes bilans de semaine, lorsque je choisis de les partager</span></label>
    <label class="check"><input type="checkbox" id="share-goals" ${S.enrolment.share_goals?"checked":""}><span>Mes objectifs et leur avancement</span></label>
    ${shared.length ? `<ul class="hist">${shared.map(s=>`<li><span class="tag">Semaine ${s.week_number}</span><span class="small muted">Partagé le ${fmtDate(s.shared_at)}</span><button class="linkbtn small" data-act="unshare" data-w="${s.week_number}">Retirer le partage</button></li>`).join("")}</ul>` : `<p class="small muted">Aucun bilan partagé.</p>`}</section>
   ${S.suggestions.length ? `<section class="card stack"><h2 class="h-sub">Ressources proposées par votre accompagnante</h2>${S.suggestions.map(r=>`<div class="ex-item">${icon(r.kind==="article"?"book":"leaf")}<div class="stack" style="gap:2px;min-width:0"><b>${esc(r.title)}</b>${r.note?`<span class="small muted">${esc(r.note)}</span>`:""}</div>${r.kind==="article"?`<button class="btn btn-soft btn-sm" data-go="article-${esc(r.ref)}">Lire</button>`:""}</div>`).join("")}</section>` : ""}`);
}
forms["msgform"] = async (f) => {
  const body = $("#msg-body").value.trim(); if (!body) return;
  try { await store.sendMessage($("#msg-kind").value, body); toast("Message envoyé"); rerender(); }
  catch(e) { console.error(e); toast("Envoi impossible. Ce type de message n’est peut-être pas prévu par votre forfait."); }
};
forms["apptform"] = async () => {
  const v = $("#ap-date").value; if (!v) return;
  const d = new Date(v); if (d <= new Date()) { $("#ap-out").textContent = "Choisissez une date à venir."; return; }
  try { await store.requestAppointment(+$("#ap-n").value, d.toISOString(), $("#ap-mode").value, $("#ap-note").value.trim()); toast("Demande envoyée"); rerender(); }
  catch(e) { console.error(e); $("#ap-out").textContent = "La demande n’a pas pu être envoyée."; }
};
actions["appt-cancel"] = async (b) => { await store.cancelAppointment(b.dataset.id); toast("Rendez-vous annulé"); rerender(); };
actions["unshare"] = async (b) => { await store.summaryUnshare(+b.dataset.w); toast("Partage retiré"); rerender(); };
changes.push(t => { if (t.id === "share-sum") { store.patchEnrolment({ share_summaries: t.checked }).then(()=>toast(t.checked ? "Partage des bilans autorisé" : "Partage des bilans retiré")); return true; } return false; });

/* ---------- Mon compte ---------- */
export function mAccount(){
  const pl = C.plans.find(p => p.id === store.plan());
  return memberShell(`${H("Mon compte", "Mon compte et mes préférences")}
   <div class="grid g2">
    <form class="card stack" id="profileform"><h2 class="h-sub" style="margin:0">Profil</h2><div class="field"><label class="flabel" for="p-name">Prénom</label><input id="p-name" type="text" value="${esc(S.user.name)}"></div><div class="field"><label class="flabel" for="p-mail">E-mail</label><input id="p-mail" type="email" value="${esc(S.user.email||"")}" disabled></div><button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Mettre à jour</button></form>
    <div class="card stack"><h2 class="h-sub" style="margin:0">Accès au programme</h2><p>${esc(C.programme.title)}</p><p class="small muted">${esc(pl?.name||"")} · ${S.enrolment?.status==="demo"?"accès de démonstration":"accès actif"} · inscrit le ${fmtDate(S.enrolment?.created_at)}</p>
     <h3 class="h-card">Reçus de paiement</h3><p class="small muted">Aucun paiement. ${C.flags.payments?"":"Les paiements ne sont pas encore ouverts."}</p></div>
    <div class="card stack"><h2 class="h-sub" style="margin:0">Préférences</h2>
     <label class="check"><input type="checkbox" data-pref="reminders_opt_in" ${S.profile?.reminders_opt_in?"checked":""}><span>Recevoir des rappels pour avancer dans mon programme</span></label>
     <label class="check"><input type="checkbox" data-pref="newsletter_opt_in" ${S.profile?.newsletter_opt_in?"checked":""}><span>Recevoir la lettre d’information du Journal du Seuil</span></label>
     <label class="check"><input type="checkbox" data-pref="analytics_opt_in" ${S.profile?.analytics_opt_in?"checked":""}><span>Autoriser des statistiques anonymes d’utilisation</span></label>
     <p class="small muted">Vos réponses et votre journal ne sont jamais utilisés à des fins statistiques individuelles.</p></div>
    <div class="card stack"><h2 class="h-sub" style="margin:0">Confidentialité et données</h2>
     <div class="row"><button class="btn btn-soft btn-sm" data-act="export-data">${icon("download")}Télécharger mes données</button>${DEMO?"":`<button class="btn btn-soft btn-sm" data-act="privreq" data-t="erasure">Demander la suppression de mon compte</button>`}</div>
     ${ui.confirm==="wipe"?`<p class="small"><b>Effacer toutes vos données de programme ? Exercices, journal, objectifs et progression seront définitivement supprimés.</b></p><div class="row"><button class="btn btn-primary btn-sm" data-act="wipe">Oui, tout effacer</button><button class="btn btn-soft btn-sm" data-act="nowipe">Annuler</button></div>`:`<button class="btn btn-ghost btn-sm" data-act="askwipe" style="align-self:flex-start">Effacer mes données de programme</button>`}</div>
   </div>`);
}
forms["profileform"] = async () => { await store.profileUpdate({ first_name: $("#p-name").value.trim() || S.user.name }); toast("Profil mis à jour"); rerender(); };
changes.push(t => { if (!t.dataset.pref) return false; store.profileUpdate({ [t.dataset.pref]: t.checked }).then(()=>toast("Préférence enregistrée")); return true; });
actions["export-data"] = async () => { const d = await api.exportData(); download(`mes-donnees-le-seuil-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(d, null, 2), "application/json"); };
actions["privreq"] = async (b) => { try { await api.privacyRequest(b.dataset.t); toast("Demande envoyée. Nous vous répondrons par e-mail."); } catch(e) { toast("Envoi impossible. Réessayez plus tard."); } };
actions["askwipe"] = () => { ui.confirm = "wipe"; rerender(); };
actions["nowipe"] = () => { ui.confirm = null; rerender(); };
actions["wipe"] = async () => { await store.eraseData(); ui.confirm = null; toast("Vos données de programme ont été effacées"); rerender(); };

export { stopBreath };
