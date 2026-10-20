// Composants d'exercices réutilisables : formulaire (texte, échelle 0–10, choix, cases, liste répétable),
// quiz, journal de réflexion, respiration guidée. Les réponses sont propres à chaque participant.
import { esc, icon, blocksHTML, fmtTime } from "./util.js";
import { ui, actions, inputs, changes, rerender } from "./state.js";
import * as store from "../store.js";
import { C, S } from "../store.js";

export const weekOfStep = (uuid) => C.weeks.find(w => w.steps.some(s => s.uuid === uuid));
const stepByUuid = (uuid) => { for (const w of C.weeks) { const s = w.steps.find(x => x.uuid === uuid); if (s) return s; } return null; };
const data = (uuid) => (S.responses[uuid] = S.responses[uuid] || {});

function getPath(obj, path){ return path.split(".").reduce((o,k)=> o == null ? undefined : o[k], obj); }
function setPath(obj, path, val){
  const ks = path.split("."); let o = obj;
  ks.slice(0,-1).forEach((k,i) => { if (o[k] == null) o[k] = /^\d+$/.test(ks[i+1]) ? [] : {}; o = o[k]; });
  o[ks[ks.length-1]] = val;
}

/* ---------- Indicateur d'enregistrement ---------- */
export function saveStateHTML(){ return `<span class="save-state" aria-live="polite">${ui.saveState || ""}</span>`; }
export function setSaveState(txt){ ui.saveState = txt; document.querySelectorAll(".save-state").forEach(el => el.textContent = txt); }
export async function persist(uuid, immediate=false){
  setSaveState("Enregistrement…");
  store.setProgress(uuid, "started").catch(()=>{});
  try { await store.saveResponse(uuid, S.responses[uuid], immediate); setSaveState(`Enregistré à ${fmtTime(new Date())}`); }
  catch(e){ console.error(e); setSaveState("Échec de l’enregistrement. Vérifiez votre connexion."); }
}

/* ---------- Validation ---------- */
const filled = (v) => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== "";
export function missingFields(step, d){
  const miss = [];
  const c = step.content;
  if (c.component === "quiz") { c.items.forEach((_, i) => { if (!d.answers?.[i]) miss.push(`q${i}`); }); return miss; }
  if (c.component === "journal") { if (!filled(d.text)) miss.push("text"); return miss; }
  if (c.component === "breath") return miss;
  const fields = c.fields || [];
  const check = (fs, obj, prefix) => fs.forEach(f => {
    const v = obj?.[f.k];
    if (f.type === "repeat") {
      const rows = (v || []).filter(r => r && Object.values(r).some(filled));
      if (rows.length < (f.min || (f.required ? 1 : 0))) { miss.push(prefix + f.k); if (!rows.length) f.fields.filter(x => x.required).forEach(x => miss.push(`${prefix}${f.k}.0.${x.k}`)); }
      rows.forEach((r, i) => check(f.fields.filter(x => x.required), r, `${prefix}${f.k}.${i}.`));
    } else if (f.required && !filled(v)) miss.push(prefix + f.k);
  });
  if (c.component === "repeat") {
    const rows = (d.entries || []).filter(r => r && Object.values(r).some(filled));
    if (rows.length < (c.min || 1)) { miss.push("entries"); if (!rows.length) c.fields.filter(x => x.required).forEach(f => miss.push(`entries.0.${f.k}`)); }
    rows.forEach((r, i) => c.fields.filter(x => x.required).forEach(f => { if (!filled(r[f.k])) miss.push(`entries.${i}.${f.k}`); }));
  } else check(fields, d, "");
  return miss;
}
export const isComplete = (uuid) => S.progress[uuid] === "completed";

/* ---------- Rendu des champs ---------- */
const scaleHTML = (uuid, path, val, f) => `<div class="scale" role="group" aria-label="${esc(f.label)}">
  ${Array.from({length:11},(_,i)=>`<button type="button" data-act="ex-set" data-w="${uuid}" data-f="${path}" data-v="${i}" ${f.measure?`data-m="${f.measure}"`:""} aria-pressed="${val===i}">${i}</button>`).join("")}
  </div>${f.min||f.max?`<div class="scale-ends"><span>0 · ${esc(f.min||"")}</span><span>10 · ${esc(f.max||"")}</span></div>`:""}`;

function fieldHTML(uuid, f, val, path, step){
  const id = `f-${uuid}-${path}`.replace(/[^\w-]/g,"_");
  const bad = (ui.missing?.[uuid]||[]).includes(path);
  const lab = `<label for="${id}" class="flabel">${esc(f.label)}${f.required?` <span class="req" aria-label="obligatoire">*</span>`:""}</label>`;
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : "";
  const wrap = (inner, labelEl = lab) => `<div class="field ${bad?"invalid":""}">${labelEl}${inner}${hint}${bad?`<span class="err">À compléter</span>`:""}</div>`;
  const grpLab = `<span class="flabel" id="${id}">${esc(f.label)}${f.required?` <span class="req">*</span>`:""}</span>`;
  switch (f.type) {
    case "text": return wrap(`<input id="${id}" type="text" data-w="${uuid}" data-f="${path}" value="${esc(val)}">`);
    case "scale": case "rating": {
      let extra = "";
      if (f.type === "rating" && f.compare) {
        const base = S.ratings.find(r => r.week_number === 0 && r.measure_key === f.measure);
        extra = `<p class="small muted">Au début du programme, vous aviez noté : <b>${base ? base.value + " / 10" : "pas de note"}</b>.</p>`;
      }
      return wrap(extra + scaleHTML(uuid, path, val, f), grpLab);
    }
    case "choice": return wrap(`<div class="seg" role="group" aria-labelledby="${id}">${f.options.map(o=>`<button type="button" data-act="ex-set" data-w="${uuid}" data-f="${path}" data-v="${esc(o)}" aria-pressed="${val===o}">${esc(o)}</button>`).join("")}</div>`, grpLab);
    case "checks": return wrap(`<div class="checks">${f.options.map((o,i)=>`<label class="check"><input type="checkbox" data-w="${uuid}" data-f="${path}" data-multi="${esc(o)}" ${(val||[]).includes(o)?"checked":""}><span>${esc(o)}</span></label>`).join("")}</div>`, grpLab);
    case "repeat": {
      const rows = val && val.length ? val : [{}];
      return `<fieldset class="repeat ${bad?"invalid":""}"><legend class="flabel">${esc(f.label)}${f.min?` <span class="small muted">(au moins ${f.min})</span>`:""}</legend>
        ${rows.map((r,i)=>`<div class="repeat-row"><div class="repeat-head"><span class="small muted">${i+1}</span>${rows.length>1?`<button type="button" class="linkbtn small" data-act="ex-del" data-w="${uuid}" data-f="${path}" data-i="${i}">Retirer</button>`:""}</div>
          ${f.fields.map(sf => fieldHTML(uuid, sf, r?.[sf.k], `${path}.${i}.${sf.k}`, step)).join("")}</div>`).join("")}
        <button type="button" class="btn btn-soft btn-sm" data-act="ex-add" data-w="${uuid}" data-f="${path}">${icon("plus")}${esc(f.addLabel || "Ajouter")}</button>
        ${bad?`<span class="err">Ajoutez au moins ${f.min||1} élément${(f.min||1)>1?"s":""}.</span>`:""}</fieldset>`;
    }
    case "goal": return wrap(`<textarea id="${id}" data-w="${uuid}" data-f="${path}" rows="2">${esc(val)}</textarea>`);
    case "goal_recall": {
      const g = S.goals.filter(x => x.scope === "principal").sort((a,b)=>a.created_at.localeCompare(b.created_at))[0];
      return `<div class="recall"><span class="flabel">${esc(f.label)}</span>${g?`<p>« ${esc(g.title)} »</p>`:`<p class="muted small">Vous n’aviez pas défini d’objectif principal. Vous pouvez le faire dans <button type="button" class="linkbtn" data-go="objectifs">Mes objectifs</button>.</p>`}</div>`;
    }
    case "share": {
      if (store.plan() === "autonome") return "";
      if (!store.supportOpen()) return `<p class="small muted">${icon("lock")} Le partage avec votre accompagnante sera possible lorsque l’accompagnement sera ouvert.</p>`;
      const wk = weekOfStep(uuid)?.n, shared = !!S.summaries[wk];
      return `<label class="check share"><input type="checkbox" data-w="${uuid}" data-f="${path}" ${val?"checked":""}><span><b>Partager ce bilan avec mon accompagnante.</b> Seules vos réponses à ce bilan sont transmises, jamais votre journal. Vous pouvez retirer ce partage à tout moment depuis Mon coach.${shared?` <span class="tag">Partagé</span>`:""}</span></label>`;
    }
    default: return wrap(`<textarea id="${id}" data-w="${uuid}" data-f="${path}" rows="3">${esc(val)}</textarea>`);
  }
}

/* ---------- Rendu d'une étape exercice / bilan ---------- */
export function exerciseHTML(step, preview=false){
  const c = step.content, uuid = step.uuid, d = S.responses[uuid] || {};
  let body = "";
  if (c.component === "quiz") {
    body = `<div class="stack">${c.items.map((it,i)=>{ const a = d.answers?.[i];
      return `<div class="quiz-q ${(ui.missing?.[uuid]||[]).includes("q"+i)?"invalid":""}"><b>${esc(it.t)}</b><div class="seg">${c.options.map(o=>`<button type="button" data-act="ex-quiz" data-w="${uuid}" data-i="${i}" data-v="${esc(o)}" aria-pressed="${a===o}">${esc(o)}</button>`).join("")}</div>
       ${a?`<span class="fb ${a===it.a?"ok":"soft"}">${a===it.a?"Oui, c’est bien cela.":`Pas tout à fait : il s’agit plutôt de « ${esc(it.a)} ».`}</span>`:""}</div>`; }).join("")}
      ${c.explanation && Object.keys(d.answers||{}).length===c.items.length ? `<div class="notice calm">${icon("info")}<span>${esc(c.explanation)}</span></div>` : ""}</div>`;
  } else if (c.component === "journal") {
    body = `<div class="field"><label class="flabel" for="j-${uuid}">${esc(c.prompt)}</label><textarea id="j-${uuid}" rows="6" data-w="${uuid}" data-f="text">${esc(d.text)}</textarea>
      <span class="hint">Cette réflexion est ajoutée à Mon journal. Elle reste privée.</span></div>`;
  } else if (c.component === "breath") {
    body = breathHTML();
  } else if (c.component === "repeat") {
    const rows = d.entries && d.entries.length ? d.entries : [{}];
    const bad = (ui.missing?.[uuid]||[]).includes("entries");
    body = `<div class="stack">${rows.map((r,i)=>`<div class="repeat-row card-lite"><div class="repeat-head"><b>${i+1}.</b>${rows.length>1?`<button type="button" class="linkbtn small" data-act="ex-del" data-w="${uuid}" data-f="entries" data-i="${i}">Retirer</button>`:""}</div>
      ${c.fields.map(f => fieldHTML(uuid, f, r?.[f.k], `entries.${i}.${f.k}`, step)).join("")}</div>`).join("")}
      <button type="button" class="btn btn-soft btn-sm" data-act="ex-add" data-w="${uuid}" data-f="entries" style="align-self:flex-start">${icon("plus")}${esc(c.addLabel||"Ajouter")}</button>
      ${bad?`<span class="err">Ajoutez au moins une situation complète.</span>`:""}</div>`;
  } else {
    const before = (c.fields||[]).filter(f=>!f.after), after = (c.fields||[]).filter(f=>f.after);
    body = `<div class="stack">${before.map(f => fieldHTML(uuid, f, d[f.k], f.k, step)).join("")}
      ${after.length?`<div class="after-block"><span class="eyebrow">Après l’essai</span><p class="small muted">Vous pouvez revenir compléter cette partie plus tard.</p>${after.map(f => fieldHTML(uuid, f, d[f.k], f.k, step)).join("")}</div>`:""}</div>`;
  }
  const done = isComplete(uuid);
  const miss = ui.missing?.[uuid];
  return `${c.intro?`<p class="lede-sm">${esc(c.intro)}</p>`:""}
    ${body}
    ${miss && miss.length ? `<div class="notice" role="alert">${icon("info")}<span>Il reste quelques éléments à compléter, signalés ci-dessus. Votre travail est enregistré : vous pouvez aussi revenir plus tard.</span></div>` : ""}
    ${preview ? "" : `<div class="ex-actions"><div class="row"><button class="btn ${done?"btn-soft":"btn-gold"}" data-act="ex-complete" data-w="${uuid}">${icon("check")}${done?"Mettre à jour":"Enregistrer et terminer"}</button>
      ${done?`<span class="tag">${icon("check")}Terminé</span>`:`<span class="small muted">Votre travail est enregistré automatiquement.</span>`}</div>${saveStateHTML()}</div>`}`;
}

/* ---------- Respiration guidée (sans rétention obligatoire) ---------- */
export function breathHTML(){
  return `<div class="breath"><div class="square" id="sq"><span class="dot-run" id="sqdot"></span><span class="sq-label" id="sqtxt">Prêt·e ?</span></div>
    <button type="button" class="btn btn-primary" data-act="breath" id="breathbtn">Commencer</button>
    <p class="small muted" style="max-width:46ch;text-align:center">Suivez le point si cela vous aide. Il n’est pas obligatoire de retenir votre souffle ni de respecter un compte précis. Si cela vous gêne, revenez simplement à votre respiration habituelle.</p></div>`;
}
let breathTimer = null;
export function stopBreath(){ clearTimeout(breathTimer); breathTimer = null; }
actions["breath"] = (b) => {
  const sq = document.getElementById("sq"), txt = document.getElementById("sqtxt"), dot = document.getElementById("sqdot");
  if (breathTimer) { stopBreath(); txt.textContent = "Prêt·e ?"; b.textContent = "Commencer"; dot.className = "dot-run"; return; }
  b.textContent = "Arrêter"; let i = 0, cycles = 0;
  const phases = [["Inspirez doucement", 4000, "p1"], ["Petite pause, si elle est agréable", 1500, "p2"], ["Expirez sans forcer", 4000, "p3"], ["Pause facultative", 1500, "p4"]];
  const tick = () => {
    if (!document.body.contains(sq)) return stopBreath();
    if (i === 0 && cycles === 4) { txt.textContent = "Remarquez comment vous vous sentez"; b.textContent = "Recommencer"; dot.className = "dot-run"; breathTimer = null; return; }
    const [l, d, cls] = phases[i]; txt.textContent = l; dot.style.transitionDuration = d + "ms"; dot.className = "dot-run " + cls;
    i = (i + 1) % 4; if (i === 0) cycles++; breathTimer = setTimeout(tick, d);
  };
  tick();
};

/* ---------- Événements ---------- */
inputs.push((t) => {
  if (!t.dataset.w || t.type === "checkbox") return false;
  setPath(data(t.dataset.w), t.dataset.f, t.value);
  persist(t.dataset.w);
  return true;
});
changes.push((t) => {
  if (!t.dataset.w || t.type !== "checkbox") return false;
  const d = data(t.dataset.w);
  if (t.dataset.multi) {
    const cur = new Set(getPath(d, t.dataset.f) || []);
    t.checked ? cur.add(t.dataset.multi) : cur.delete(t.dataset.multi);
    setPath(d, t.dataset.f, [...cur]);
  } else setPath(d, t.dataset.f, t.checked);
  persist(t.dataset.w, true);
  return true;
});
actions["ex-set"] = async (b) => {
  const uuid = b.dataset.w, v = /^\d+$/.test(b.dataset.v) && !isNaN(+b.dataset.v) && b.closest(".scale") ? +b.dataset.v : b.dataset.v;
  setPath(data(uuid), b.dataset.f, v);
  if (b.dataset.m) { const w = weekOfStep(uuid); store.ratingSave(w?.n ?? 0, b.dataset.m, v).catch(console.error); }
  persist(uuid, true); rerender();
};
actions["ex-quiz"] = (b) => { const d = data(b.dataset.w); d.answers = d.answers || {}; d.answers[b.dataset.i] = b.dataset.v; persist(b.dataset.w, true); rerender(); };
actions["ex-add"] = (b) => {
  const d = data(b.dataset.w); const list = getPath(d, b.dataset.f) || [{}];
  if (!getPath(d, b.dataset.f)) setPath(d, b.dataset.f, list);
  list.push({}); persist(b.dataset.w); rerender();
};
actions["ex-del"] = (b) => { const list = getPath(data(b.dataset.w), b.dataset.f); list.splice(+b.dataset.i, 1); persist(b.dataset.w, true); rerender(); };

/* Terminer un exercice : validation réelle, puis effets associés (objectif, journal, partage). */
export async function completeStep(uuid){
  const step = stepByUuid(uuid), w = weekOfStep(uuid), d = data(uuid);
  const miss = missingFields(step, d);
  ui.missing = { ...(ui.missing||{}), [uuid]: miss };
  if (miss.length) { rerender(); document.querySelector(".invalid")?.scrollIntoView({ behavior: "smooth", block: "center" }); return false; }
  const c = step.content;
  // Réflexion → entrée de Mon journal
  if (c.component === "journal") {
    const e = await store.journalSave({ id: d._journal_id, week_number: w.n, prompt: c.prompt, body: d.text });
    d._journal_id = e.id;
  }
  for (const f of (c.fields || [])) {
    // Objectif de la semaine suivante → Mes objectifs
    if (f.type === "goal" && String(d[f.k]||"").trim()) {
      const g = await store.goalSave({ id: d._goal_id, scope: "hebdomadaire", week_number: Math.min(6, w.n + 1), title: d[f.k].trim(), actions: [], obstacles: "", reflection: "", status: "actif" });
      d._goal_id = g.id;
    }
    // Partage du bilan (consentement explicite, révocable)
    if (f.type === "share" && store.plan() !== "autonome" && store.supportOpen()) {
      if (d[f.k]) {
        if (!S.enrolment.share_summaries) await store.patchEnrolment({ share_summaries: true });
        await store.summaryShare(w.n, summaryText(step, d));
      } else if (S.summaries[w.n]) await store.summaryUnshare(w.n);
    }
  }
  await store.saveResponse(uuid, d, true);
  await store.setProgress(uuid, "completed");
  ui.missing[uuid] = [];
  return true;
}

/* Texte lisible d'une réponse (journal, export, partage). */
export function summaryText(step, d){
  const c = step.content; if (!d) return "";
  if (c.component === "quiz") return c.items.map((it,i)=>`${it.t} → ${d.answers?.[i] || "—"}`).join("\n");
  if (c.component === "journal") return d.text || "";
  const line = (f, v) => {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return "";
    if (f.type === "share" || f.type === "goal_recall") return "";
    if (f.type === "repeat") return `${f.label} :\n` + v.map((r,i)=>`  ${i+1}. ` + f.fields.map(sf => r?.[sf.k] !== undefined && r?.[sf.k] !== "" ? `${sf.label} : ${r[sf.k]}` : "").filter(Boolean).join(" · ")).join("\n");
    if (Array.isArray(v)) return `${f.label} : ${v.join(", ")}`;
    if (f.type === "scale" || f.type === "rating") return `${f.label} : ${v}/10`;
    return `${f.label} : ${v}`;
  };
  if (c.component === "repeat") return line({ type: "repeat", label: step.title, fields: c.fields }, d.entries || []);
  return (c.fields||[]).map(f => line(f, d[f.k])).filter(Boolean).join("\n");
}
export { stepByUuid };
