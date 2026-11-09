// « Nos programmes » : présentation publique uniquement. Aucune leçon, aucun script vidéo, aucun exercice
// détaillé ni questionnaire n'est affiché ici. Le visiteur envoie une demande ; il ne crée pas de compte.
import { esc, icon, cover, pageHead, fcfa, toast, $ } from "./util.js";
import { ui, actions, forms, changes, rerender, go } from "./state.js";
import { C, DEMO, api } from "../store.js";
import * as store from "../store.js";
import { gateOn, screened } from "./orientation.js";
import { CATALOGUE_SIZE, EVALUATION_QUESTIONS, EVALUATION_NOTICE, EMERGENCY } from "../content.js";
import { SECTIONS, WSAS_LEGEND, fieldVisible, scores, attention, ageFrom } from "../assessment.js";
import { publishedArticles, articleCard, catSlug } from "./library.js";

const visible = () => C.programmes.filter(p => ["demo", "published"].includes(p.status)).sort((a, b) => (a.sort || 0) - (b.sort || 0));
const progCard = (p, i) => `<article class="card prog-card"><div class="cover">${cover(p.hue || "sage", i + 4)}</div><div class="body">
   <div class="meta"><span class="tag">${esc(p.category || "Programme")}</span><span class="tag mute">6 semaines</span></div>
   <h3><a href="#programme-${esc(p.slug)}" data-go="programme-${esc(p.slug)}">${esc(p.title)}</a></h3>
   <p class="muted">${esc(p.public_intro || p.summary)}</p>
   <div class="row" style="margin-top:auto"><button class="btn btn-primary btn-sm" data-go="programme-${esc(p.slug)}">Découvrir le programme ${icon("arrow")}</button></div>
  </div></article>`;
export const programmeCard = progCard;

export function pProgrammes(){
  const list = visible();
  const cats = [...new Set(list.map(p => p.category || "Programmes"))];
  const missing = CATALOGUE_SIZE - list.length;
  return pageHead("Nos programmes", "Des programmes de six semaines, à votre rythme", "Chaque programme propose des leçons interactives, de courtes vidéos, des exercices et des outils pratiques inspirés des thérapies cognitives et comportementales. Ils ne remplacent pas un suivi médical ou psychologique.") + `
  <section class="section" style="padding-top:36px"><div class="wrap stack-lg">
   ${C.flags.orientation || store.isStaff() ? `<div class="card find-cta"><div class="stack" style="gap:4px"><b>${gateOn() ? "Pour rejoindre un programme, commencez ici" : "Vous ne savez pas par où commencer ?"}</b><span class="muted small">Quelques questions, sans compte et sans enregistrement, pour vous suggérer un ou deux programmes adaptés à votre situation.</span></div><button class="btn btn-primary btn-sm" data-go="trouver-mon-programme">Trouver mon programme ${icon("arrow")}</button></div>` : ""}
   ${cats.length > 1 ? `<nav class="chips" aria-label="Catégories de programmes">${cats.map(c => `<a class="chip" href="#cat-${catSlug(c)}">${esc(c)}</a>`).join("")}</nav>` : ""}
   ${cats.map(c => `<section class="stack" id="cat-${catSlug(c)}" aria-labelledby="h-${catSlug(c)}"><h2 class="h-sub" id="h-${catSlug(c)}">${esc(c)}</h2>
     <div class="grid prog-grid">${list.filter(p => (p.category || "Programmes") === c).map(progCard).join("")}</div></section>`).join("")}
   ${missing > 0 ? `<div class="card-flat stack soon-card"><span class="tag warn" style="align-self:flex-start">En préparation</span><h3>${missing} autres programmes arrivent</h3><p class="muted">Le catalogue LE SEUIL accueillera progressivement onze programmes, tous construits sur le même modèle de six semaines.</p></div>` : ""}
   ${howToJoin()}
  </div></section>`;
}

const howToJoin = () => `<section class="card stack" aria-labelledby="join"><h2 id="join" class="h-sub">Comment rejoindre un programme ?</h2>
   <ol class="join-steps"><li><b>Choisissez un programme et une formule</b>, puis envoyez votre demande. Aucun compte n’est créé à ce stade.</li>
    <li><b>L’équipe LE SEUIL vérifie</b> votre demande, l’adéquation du programme à votre situation et le paiement.</li>
    <li><b>Vous recevez un e-mail</b> pour choisir votre mot de passe et accéder à votre espace.</li></ol></section>`;

function plansHTML(p){
  const canJoin = p.open && screened(p.slug);
  return `<div class="grid g3">${C.plans.map((pl, i) => `<article class="card plan-card ${pl.featured ? "featured" : ""}">
     <div class="stack" style="gap:4px"><span class="eyebrow">Formule ${i + 1}</span><h3 style="margin:0">${esc(pl.short)}</h3></div>
     <div class="price">${fcfa(pl.price).replace(" FCFA", "")} <small>FCFA · paiement unique</small></div>
     <ul class="ticks">${pl.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
     ${canJoin ? `<button class="btn ${pl.featured ? "btn-primary" : "btn-ghost"}" data-act="choose-plan" data-plan="${pl.id}">Choisir cette formule</button>` : ""}
   </article>`).join("")}</div>
   <p class="small muted">Paiement unique pour le programme complet de six semaines, sans abonnement. * Selon les conditions du service. Les échanges ne sont ni des consultations psychologiques ni des séances de psychothérapie.</p>`;
}

export function pProgramme(slug){
  const p = visible().find(x => x.slug === slug);
  if (!p) return pProgrammes();
  const reads = publishedArticles().filter(a => (p.library_categories || []).includes(a.cat)).slice(0, 3);
  const sel = ui.reqPlan || "";
  return pageHead(esc(p.category || "Programme"), esc(p.title), esc(p.public_intro || p.summary), `<a href="#programmes" data-go="programmes">Nos programmes</a> / ${esc(p.title)}`) + `
  <section class="section"><div class="wrap two-col">
   <div class="stack-lg">
    ${p.public_goal ? `<div class="prose"><h2>L’objectif du programme</h2><p>${esc(p.public_goal)}</p></div>` : ""}
    ${p.benefits?.length ? `<div class="card-flat stack"><h2 class="h-sub">Ce que vous pourrez apprendre</h2><ul class="ticks">${p.benefits.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
      <p class="small muted">Chaque personne avance à son rythme : ce programme ne promet pas de guérison et ne remplace pas un avis professionnel.</p></div>` : ""}
    <div class="grid g2">
     <div class="card stack" style="gap:6px"><span class="eyebrow">Durée</span><p><b>Six semaines</b>, à votre rythme.</p></div>
     <div class="card stack" style="gap:6px"><span class="eyebrow">Format</span><p>${esc(p.format || "Leçons interactives, courtes vidéos, exercices et outils pratiques.")}</p></div>
    </div>
   </div>
   <aside class="aside"><div class="card stack"><h3>Rejoindre ce programme</h3><p class="small muted">Trois formules, de ${fcfa(Math.min(...C.plans.map(x => x.price)))} à ${fcfa(Math.max(...C.plans.map(x => x.price)))}.</p>
     ${!p.open ? `<p class="small muted">Les demandes pour ce programme ne sont pas encore ouvertes.</p>`
       : !screened(p.slug) ? `<p class="small">Pour vérifier que ce programme vous convient, commencez par le questionnaire « Trouver mon programme ». Il vous suggérera un ou deux programmes adaptés.</p><button class="btn btn-primary" data-go="trouver-mon-programme">Trouver mon programme ${icon("arrow")}</button>`
       : `${gateOn() ? `<p class="small find-ok">${icon("check")} Ce programme fait partie des suggestions de votre questionnaire.</p>` : ""}<button class="btn btn-primary" data-act="choose-plan" data-plan="">Demander à rejoindre ce programme</button>`}
     <p class="small muted">${icon("phone")} LE SEUIL n’est pas un service d’urgence. En cas de danger, appelez le SAMU au 185.</p></div></aside>
  </div></section>
  <section class="section band" id="formules"><div class="wrap stack-lg"><div class="stack" style="gap:6px"><span class="eyebrow">Les trois formules</span><h2>Choisir ma formule</h2></div>${plansHTML(p)}</div></section>
  ${p.open && screened(p.slug) ? `<section class="section" id="demande"><div class="wrap narrow" style="margin:0 auto">${requestForm(p, sel)}</div></section>` : ""}
  ${reads.length ? `<section class="section band lib-band"><div class="wrap stack-lg"><div class="stack" style="gap:6px"><span class="eyebrow">Lectures gratuites · La Bibliothèque</span><h2 class="h-sub">Pour aller plus loin, en accès libre</h2>
     <p class="small muted">Ces articles sont publics et indépendants du programme.</p></div><div class="grid g3">${reads.map(articleCard).join("")}</div>
     <a class="btn btn-ghost" href="#bibliotheque-${catSlug((p.library_categories || [])[0] || "")}" data-go="${(p.library_categories || []).length ? "bibliotheque-" + catSlug(p.library_categories[0]) : "bibliotheque"}" style="align-self:flex-start">Explorer la Bibliothèque</a></div></section>` : ""}`;
}

/* Pré-évaluation détaillée : désactivée tant que les validations juridiques et professionnelles ne sont pas faites
   (feature flag « pre_evaluation »). Sinon, le formulaire simple existant est utilisé. */
const asmOn = () => !!C.flags?.pre_evaluation;
const secs = () => SECTIONS.filter(s => !s.flag || C.flags?.[s.flag]);
const activeFields = () => secs().flatMap(s => s.fields);
function sentHTML(p){
  return `<div class="card stack" role="status"><h2 class="h-sub">${icon("check")} Votre demande est enregistrée</h2>
    <p>Merci. Votre demande d’inscription au programme <b>${esc(p.title)}</b> est enregistrée sous la référence <b data-noi18n>${esc(ui.reqRef || "")}</b>. Elle est en attente de validation par l’équipe LE SEUIL.</p>
    <p>${ui.reqEmail === false || ui.reqEmail === null ? "Notez votre référence : l’e-mail de confirmation n’a pas pu être envoyé pour le moment. L’équipe vous écrira à l’adresse indiquée." : "Un e-mail de confirmation vient de vous être envoyé. Pensez à vérifier vos courriers indésirables."}</p>
    <p><b>Aucun paiement n’est nécessaire à cette étape.</b> Si votre demande est approuvée, vous recevrez un e-mail avec un lien sécurisé pour finaliser votre inscription.</p>
    ${ui.reqCare ? careHTML(ui.reqCare === "urgent") : ""}
    <p class="small muted">${icon("phone")} ${esc(EVALUATION_NOTICE)}</p>
    <button class="btn btn-soft btn-sm" data-act="req-again" style="align-self:flex-start">Faire une autre demande</button></div>`;
}
function requestForm(p, sel){
  if (!asmOn() && ui.reqSent !== p.slug) return requestFormSimple(p, sel);
  if (ui.reqSent === p.slug) return sentHTML(p);
  const S_ = secs(), d = ui.asm || (ui.asm = {}), step = Math.min(ui.asmStep || 0, S_.length - 1), n = S_.length;
  return `<form class="card stack asm" id="requestform" novalidate aria-labelledby="req-h">
   <div class="stack" style="gap:6px"><h2 class="h-sub" id="req-h">Demande d’inscription · pré-évaluation</h2>
   <p class="small muted">Environ 10 à 15 minutes. Vos réponses sont confidentielles et lues uniquement par l’équipe LE SEUIL pour vérifier que le programme vous convient et préparer votre accompagnement. Ce n’est pas un diagnostic. Vous restez libre de votre programme, de votre formule et du moment de votre inscription. Les questions marquées * sont obligatoires.</p></div>
   <input type="hidden" id="rq-prog" value="${esc(p.slug)}">
   <ol class="asm-steps" aria-label="Étapes">${S_.map((s, i) => `<li class="${i === step ? "on" : i < step ? "done" : ""}"${i === step ? ' aria-current="step"' : ""}><span>${i + 1}</span><em>${esc(s.title)}</em></li>`).join("")}</ol>
   <p class="small muted asm-count">Étape ${step + 1} sur ${n}</p>
   ${S_.map((s, i) => `<fieldset class="stack asm-sec" data-sec="${i}"${i === step ? "" : " hidden"}><legend class="h-card">${esc(s.title)}</legend>
     ${s.intro ? `<p class="small muted">${esc(s.intro)}</p>` : ""}
     ${s.id === "securite" ? `<div class="notice" role="note">${icon("phone")}<span>Si vous êtes en danger immédiat, n’attendez pas : appelez le SAMU au 185 ou rendez-vous aux urgences les plus proches.</span></div>` : ""}
     <div class="asm-grid">${s.fields.map(f => fieldHTML(f, d)).join("")}</div>
     ${s.id === "securite" ? `<div id="asm-care" aria-live="polite">${attention(d).care ? careHTML(attention(d).urgent) : ""}</div>` : ""}
     ${s.id === "envoi" ? envoiHTML(p, sel, d) : ""}
   </fieldset>`).join("")}
   <p id="rq-out" class="small" role="status"></p>
   <div class="row asm-nav"${attention(d).urgent ? " hidden" : ""}>${step > 0 ? `<button type="button" class="btn btn-soft" data-act="asm-prev">Précédent</button>` : ""}
    ${step < n - 1 ? `<button type="button" class="btn btn-primary" data-act="asm-next">Suivant ${icon("arrow")}</button>` : `<button class="btn btn-gold" type="submit">Envoyer ma demande</button>`}</div>
  </form>`;
}
function careHTML(urgent){
  return `<div class="notice asm-care-box" role="note">${icon("shield")}<div class="stack" style="gap:6px">
    <b>${urgent ? "Vous méritez de l’aide tout de suite" : "Merci de nous l’avoir dit"}</b>
    <span>${urgent ? "Dans cette situation, un programme en ligne ne suffit pas. Contactez dès maintenant les services d’urgence ou rendez-vous aux urgences les plus proches et, si possible, demandez à une personne de confiance de rester avec vous. Ce formulaire n’est pas lu en temps réel : l’envoyer ne déclenche aucune intervention. Votre demande d’inscription pourra être faite plus tard."
      : "Ces pensées peuvent être très lourdes à porter. Nous vous encourageons à en parler rapidement à un professionnel qualifié (médecin, psychologue, psychiatre) ou à une personne de confiance : un programme LE SEUIL ne remplace pas ce soutien. Vous pouvez envoyer votre demande ; elle sera lue dans les délais habituels, sans surveillance en temps réel. Si la situation s’aggrave, contactez les services d’urgence."}</span>
    <span class="small">Côte d’Ivoire : ${EMERGENCY.map(e => `${esc(e.label)} : <b>${esc(e.num)}</b>`).join(" · ")} · <a href="#besoin-aide" data-go="besoin-aide">Besoin d’aide maintenant ?</a></span></div></div>`;
}
function envoiHTML(p, sel, d){
  const plan = d.plan || sel || "";
  return `<fieldset class="field"><legend class="flabel">Formule souhaitée *</legend><div class="plan-pick">${C.plans.map(pl => `<label class="pick"><input type="radio" name="a-plan" value="${pl.id}" ${plan === pl.id ? "checked" : ""}><span><b>${esc(pl.short)}</b><span class="small muted">${fcfa(pl.price)}</span></span></label>`).join("")}</div></fieldset>
   <div class="field"><label class="flabel" for="a-message">Autre chose à nous dire ? (facultatif)</label><textarea id="a-message" name="a-message" rows="3" maxlength="2000">${esc(d.message || "")}</textarea></div>
   <label class="check"><input name="a-is_adult" type="checkbox" ${d.is_adult ? "checked" : ""}><span>J’ai 18 ans ou plus. *</span></label>
   <label class="check"><input name="a-consent" type="checkbox" ${d.consent ? "checked" : ""}><span>J’accepte que ces informations, y compris celles sur ma santé, soient utilisées par l’équipe LE SEUIL uniquement pour évaluer ma demande et m’accompagner (voir la <a href="#confidentialite" data-go="confidentialite">politique de confidentialité</a>). *</span></label>
   <label class="check"><input name="a-contact_ok" type="checkbox" ${d.contact_ok ? "checked" : ""}><span>J’accepte d’être recontacté·e par téléphone ou WhatsApp au sujet de ma demande.</span></label>`;
}
function fieldHTML(f, d){
  const id = "a-" + f.k, v = d[f.k], req = f.req ? " *" : "", hid = fieldVisible(f, d) ? "" : " hidden";
  const wrap = (inner, cls = "") => `<div class="field asm-f${f.half ? " half" : ""}${cls}" data-k="${f.k}"${hid}>${inner}</div>`;
  if (f.type === "heading") return `<h3 class="h-sub asm-h">${esc(f.label)}</h3>`;
  if (f.type === "radio" || f.type === "scale") {
    const opts = f.type === "scale" ? f.options : f.options.map(o => [o, o]);
    const all = f.extra ? [...opts, f.extra] : opts;
    return `<fieldset class="field asm-f${f.type === "scale" ? " asm-scale" : ""}" data-k="${f.k}"${hid}><legend class="flabel">${esc(f.label)}${req}</legend>
      <div class="asm-opts">${all.map(([val, lab]) => `<label class="asm-opt${val === "na" ? " wide" : ""}"><input type="radio" name="${id}" value="${esc(val)}" ${v === val ? "checked" : ""}><span>${esc(lab)}</span></label>`).join("")}</div>${f.type === "scale" ? `<p class="asm-legend small muted">${WSAS_LEGEND.map(esc).join(" · ")}</p>` : ""}</fieldset>`;
  }
  if (f.type === "checks") return `<fieldset class="field asm-f" data-k="${f.k}"${hid}><legend class="flabel">${esc(f.label)}${req}</legend>
      <div class="asm-opts">${f.options.map(o => `<label class="asm-opt"><input type="checkbox" name="${id}" value="${esc(o)}" ${(v || []).includes(o) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div></fieldset>`;
  const lab = `<label class="flabel" for="${id}">${esc(f.label)}${req}</label>`;
  if (f.type === "select") return wrap(`${lab}<select id="${id}" name="${id}"><option value="">Choisir…</option>${f.options.map(o => `<option ${v === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`);
  if (f.type === "textarea") return wrap(`${lab}<textarea id="${id}" name="${id}" rows="3" maxlength="2000"${f.ph ? ` placeholder="${esc(f.ph)}"` : ""}>${esc(v || "")}</textarea>`);
  const max = f.type === "date" ? ` max="${new Date().toISOString().slice(0, 10)}" min="1900-01-01"` : ` maxlength="${f.type === "email" ? 320 : 200}"`;
  return wrap(`${lab}<input id="${id}" name="${id}" type="${f.type}"${f.ac ? ` autocomplete="${f.ac}"` : ""}${max}${f.ph ? ` placeholder="${esc(f.ph)}"` : ""} value="${esc(v || "")}">`);
}
/* Lit le formulaire dans ui.asm (gardé en mémoire uniquement, jamais dans le navigateur). */
function readAsm(){
  const f = document.getElementById("requestform"); if (!f) return ui.asm || {};
  const d = ui.asm || (ui.asm = {});
  for (const x of activeFields()) {
    if (x.type === "heading") continue;
    const nm = "a-" + x.k;
    if (x.type === "radio" || x.type === "scale") { const c = f.querySelector(`input[name="${nm}"]:checked`); if (c) d[x.k] = c.value; else delete d[x.k]; }
    else if (x.type === "checks") d[x.k] = [...f.querySelectorAll(`input[name="${nm}"]:checked`)].map(c => c.value);
    else { const el = f.elements[nm]; if (el) d[x.k] = el.value.trim(); }
  }
  const pl = f.querySelector('input[name="a-plan"]:checked'); if (pl) d.plan = pl.value;
  if (f.elements["a-message"]) d.message = f.elements["a-message"].value.trim();
  for (const k of ["is_adult", "consent", "contact_ok"]) { const el = f.elements["a-" + k]; if (el) d[k] = el.checked; }
  return d;
}
function stepError(i, d){
  const s = secs()[i];
  const miss = s.fields.find(f => f.req && f.type !== "heading" && fieldVisible(f, d) && (Array.isArray(d[f.k]) ? !d[f.k].length : !d[f.k]));
  if (miss) return { msg: `Merci de répondre à : « ${miss.label} »`, k: miss.k };
  if (s.id === "coord") {
    if (!/^\S+@\S+\.\S+$/.test(d.email || "")) return { msg: "Merci d’indiquer un e-mail valide.", k: "email" };
    const age = ageFrom(d.date_naissance);
    if (age == null || age > 110) return { msg: "Merci de vérifier votre date de naissance.", k: "date_naissance" };
    if (age < 18) return { msg: "Les programmes LE SEUIL s’adressent aux adultes de 18 ans et plus. Si vous avez besoin d’aide, parlez-en à un adulte de confiance ou à un professionnel de santé.", k: "date_naissance" };
  }
  if (s.id === "securite" && attention(d).urgent) return { msg: "Dans cette situation, un programme en ligne ne suffit pas. Contactez dès maintenant les services d’urgence (numéros ci-dessus)." };
  if (s.id === "envoi") {
    if (!d.plan) return { msg: "Choisissez une formule." };
    if (!d.is_adult) return { msg: "Les programmes s’adressent aux adultes de 18 ans et plus." };
    if (!d.consent) return { msg: "Merci d’accepter l’utilisation de vos informations pour traiter votre demande." };
  }
  return null;
}
function showErr(e){
  const el = $("#rq-out"); el.textContent = e.msg; el.style.color = "var(--warn-fg)";
  const t = e.k && document.querySelector(`#requestform [data-k="${e.k}"]`);
  if (t) { t.classList.add("asm-miss"); t.scrollIntoView({ behavior: "smooth", block: "center" }); t.querySelector("input,select,textarea")?.focus({ preventScroll: true }); }
}
function goStep(i){
  ui.asmStep = i; rerender();
  setTimeout(() => { const f = document.getElementById("requestform"); f?.scrollIntoView({ behavior: "smooth", block: "start" }); f?.querySelector(`[data-sec="${i}"] input, [data-sec="${i}"] textarea, [data-sec="${i}"] select`)?.focus({ preventScroll: true }); }, 40);
}
actions["asm-next"] = () => { const d = readAsm(), i = ui.asmStep || 0, e = stepError(i, d); if (e) return showErr(e); goStep(i + 1); };
actions["asm-prev"] = () => { readAsm(); goStep(Math.max(0, (ui.asmStep || 0) - 1)); };
changes.push((t) => {
  const f = t.closest?.("#requestform"); if (!f) return false;
  const d = readAsm();
  f.querySelectorAll(".asm-f[data-k]").forEach(el => { const x = activeFields().find(y => y.k === el.dataset.k); if (x) el.hidden = !fieldVisible(x, d); });
  t.closest(".asm-miss")?.classList.remove("asm-miss");
  const care = document.getElementById("asm-care");
  if (care) { const a = attention(d); const was = care.dataset.state || ""; const now = a.urgent ? "urgent" : a.care ? "care" : "";
    if (was !== now) { care.dataset.state = now; care.innerHTML = now ? careHTML(now === "urgent") : ""; }
    const nav = f.querySelector(".asm-nav"); if (nav) nav.hidden = a.urgent; }
  return true;
});

actions["choose-plan"] = (b) => { const slug = document.getElementById("rq-prog")?.value; if (slug && !screened(slug)) { go("trouver-mon-programme"); return; } if (b.dataset.plan) { ui.reqPlan = b.dataset.plan; (ui.asm || (ui.asm = {})).plan = b.dataset.plan; } rerender(); setTimeout(() => { document.getElementById("demande")?.scrollIntoView({ behavior: "smooth" }); document.querySelector("#requestform input")?.focus({ preventScroll: true }); }, 50); };
actions["req-again"] = () => { ui.reqSent = null; ui.reqCare = null; rerender(); };
forms["requestform"] = async (f) => {
  if (!f.classList.contains("asm")) return submitSimple(f);
  const d = readAsm();
  for (let i = 0; i < secs().length; i++) { const e = stepError(i, d); if (e) { if (i !== (ui.asmStep || 0)) { goStep(i); setTimeout(() => showErr(e), 80); } else showErr(e); return; } }
  const answers = {}; for (const x of activeFields()) if (x.type !== "heading" && fieldVisible(x, d) && d[x.k] !== undefined && d[x.k] !== "" && !(Array.isArray(d[x.k]) && !d[x.k].length)) answers[x.k] = d[x.k];
  const sc = scores(answers), at = attention(answers);
  const r = { programme_slug: $("#rq-prog").value, plan: d.plan, first_name: d.first_name, last_name: d.last_name, email: d.email,
    phone: d.phone || null, message: d.message || null, is_adult: !!d.is_adult, consent: !!d.consent,
    evaluation: { _v: 2, form_version: "2026-11-09-brouillon", answers, scores: sc, attention: at, contact_ok: !!d.contact_ok, submitted_at: new Date().toISOString() } };
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try { const res = await api.submitRequest(r); if (!res?.reference) throw new Error("non confirmé"); ui.reqRef = res.reference; ui.reqEmail = res.email; ui.reqSent = r.programme_slug; ui.reqCare = at.urgent ? "urgent" : at.care ? "care" : null; ui.reqPlan = ""; ui.asm = {}; ui.asmStep = 0; rerender(); toast(DEMO ? "Maquette : demande enregistrée dans ce navigateur" : "Demande enregistrée"); }
  catch (e) { console.error(e); const el = $("#rq-out"); el.textContent = "L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez. Vos réponses sont conservées sur cette page."; el.style.color = "var(--warn-fg)"; btn.disabled = false; }
};

/* ---------- Formulaire simple (en service tant que « pre_evaluation » est désactivé) ---------- */
function requestFormSimple(p, sel){
  if (ui.reqSent === p.slug) return sentHTML(p);
  return `<form class="card stack" id="requestform" novalidate aria-labelledby="req-h">
   <h2 class="h-sub" id="req-h">Demande d’inscription</h2>
   <p class="small muted">Cette demande ne crée pas de compte. Après vérification, l’équipe LE SEUIL vous recontacte par e-mail.</p>
   <input type="hidden" id="rq-prog" value="${esc(p.slug)}">
   <fieldset class="field"><legend class="flabel">Formule souhaitée</legend><div class="plan-pick">${C.plans.map((pl, i) => `<label class="pick"><input type="radio" name="rq-plan" value="${pl.id}" ${sel === pl.id ? "checked" : ""}><span><b>${esc(pl.short)}</b><span class="small muted">${fcfa(pl.price)}</span></span></label>`).join("")}</div></fieldset>
   <div class="grid g2" style="gap:14px"><div class="field"><label class="flabel" for="rq-first">Prénom</label><input id="rq-first" type="text" autocomplete="given-name" maxlength="100" required></div>
    <div class="field"><label class="flabel" for="rq-last">Nom</label><input id="rq-last" type="text" autocomplete="family-name" maxlength="100" required></div></div>
   <div class="grid g2" style="gap:14px"><div class="field"><label class="flabel" for="rq-mail">E-mail</label><input id="rq-mail" type="email" autocomplete="email" maxlength="320" required></div>
    <div class="field"><label class="flabel" for="rq-phone">Téléphone (facultatif)</label><input id="rq-phone" type="tel" autocomplete="tel" maxlength="40"></div></div>
   <fieldset class="stack eval-fs"><legend class="h-card">Mon évaluation initiale</legend>
    <p class="small muted">Ces questions confidentielles aident l’équipe à vérifier que le programme vous convient. Ce n’est pas un diagnostic.</p>
    <div class="notice" role="note">${icon("phone")}<span>${esc(EVALUATION_NOTICE)}</span></div>
    ${EVALUATION_QUESTIONS.map(q => { const id = "ev-" + q.k, lab = `<label class="flabel" for="${id}">${esc(q.label)}${q.required ? " *" : ""}</label>`, hint = q.hint ? `<span class="hint">${esc(q.hint)}</span>` : "";
      const attr = q.plan ? ` data-plan-only="${q.plan}"` : "";
      if (q.type === "choice") return `<fieldset class="field"${attr}><legend class="flabel">${esc(q.label)}</legend><div class="row">${q.options.map((o, i) => `<label class="check small"><input type="radio" name="${id}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>${hint}</fieldset>`;
      if (q.type === "textarea") return `<div class="field"${attr}>${lab}<textarea id="${id}" rows="3" maxlength="1500"></textarea>${hint}</div>`;
      return `<div class="field"${attr}>${lab}<input id="${id}" type="text" maxlength="300">${hint}</div>`; }).join("")}
   </fieldset>
   <div class="field"><label class="flabel" for="rq-msg">Message (facultatif)</label><textarea id="rq-msg" rows="3" maxlength="2000"></textarea><span class="hint">Merci de ne pas partager ici d’informations détaillées sur votre santé.</span></div>
   <label class="check"><input id="rq-adult" type="checkbox"><span>J’ai 18 ans ou plus.</span></label>
   <label class="check"><input id="rq-ok" type="checkbox"><span>J’accepte que ces informations soient utilisées uniquement pour traiter ma demande (voir la <a href="#confidentialite" data-go="confidentialite">politique de confidentialité</a>).</span></label>
   <button class="btn btn-gold" type="submit" style="align-self:flex-start">Envoyer ma demande</button><p id="rq-out" class="small" role="status"></p>
  </form>`;
}
async function submitSimple(f){
  const out = (m) => { const el = $("#rq-out"); el.textContent = m; el.style.color = "var(--warn-fg)"; };
  const plan = f.querySelector('input[name="rq-plan"]:checked')?.value;
  const r = { programme_slug: $("#rq-prog").value, plan, first_name: $("#rq-first").value.trim(), last_name: $("#rq-last").value.trim(), email: $("#rq-mail").value.trim(),
    phone: $("#rq-phone").value.trim() || null, message: $("#rq-msg").value.trim() || null, is_adult: $("#rq-adult").checked, consent: $("#rq-ok").checked };
  r.evaluation = Object.fromEntries(EVALUATION_QUESTIONS.filter(q => !q.plan || q.plan === plan).map(q => [q.k,
    q.type === "choice" ? (f.querySelector(`input[name="ev-${q.k}"]:checked`)?.value || "") : ($("#ev-" + q.k)?.value.trim() || "")]).filter(([, v]) => v));
  if (!plan) return out("Choisissez une formule.");
  if (!r.first_name || !r.last_name || !/^\S+@\S+\.\S+$/.test(r.email)) return out("Merci d’indiquer votre prénom, votre nom et un e-mail valide.");
  if (!r.is_adult) return out("Les programmes s’adressent aux adultes de 18 ans et plus.");
  if (!r.consent) return out("Merci d’accepter l’utilisation de vos informations pour traiter votre demande.");
  if (EVALUATION_QUESTIONS.some(q => q.required && !r.evaluation[q.k])) return out("Merci de répondre à la première question de votre évaluation initiale.");
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try { const res = await api.submitRequest(r); if (!res?.reference) throw new Error("non confirmé"); ui.reqRef = res.reference; ui.reqEmail = res.email; ui.reqCare = null; ui.reqSent = r.programme_slug; ui.reqPlan = ""; rerender(); toast(DEMO ? "Maquette : demande enregistrée dans ce navigateur" : "Demande enregistrée"); }
  catch (e) { console.error(e); out("Votre demande n’a pas été enregistrée. " + (/Trop de demandes|invalide|requis|inconnu/i.test(e?.message || "") ? e.message + "." : "Vérifiez votre connexion et réessayez.")); btn.disabled = false; }
}


/* ---------- « Finaliser mon inscription » (lien sécurisé reçu après approbation) ---------- */
const fmtF = (n) => n ? new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ") + " FCFA" : "—";
const PAYST = { non_requis: "Aucun paiement demandé", en_attente: "En attente de paiement", en_cours: "Paiement en cours de confirmation", paye: "Payé", echoue: "Paiement échoué : vous pouvez réessayer", annule: "Aucun paiement demandé" };
export function pFinalise(token){
  const head = `<section class="page-head"><div class="wrap narrow stack" style="gap:8px;margin:0 auto"><span class="eyebrow">Inscription</span><h1 class="h-page">Finaliser mon inscription</h1></div></section>`;
  if (!token) return head + `<section class="section"><div class="wrap narrow" style="margin:0 auto"><div class="card stack"><p>Ce lien n’est pas valide. Ouvrez le lien reçu par e-mail après l’approbation de votre demande, ou écrivez-nous à <a href="mailto:leseuil@orejeen.com">leseuil@orejeen.com</a>.</p></div></div></section>`;
  if (ui.payFor !== token) { ui.payFor = token; ui.pay = undefined; ui.payErr = null; ui.payTx = null; }
  if (ui.pay === undefined && !ui.payLoading) {
    ui.payLoading = true;
    api.checkout("checkout_refresh", token).then(d => { ui.pay = d; }).catch(e => { ui.pay = null; ui.payErr = e.message; }).finally(() => { ui.payLoading = false; rerender(); });
  }
  const d = ui.pay;
  let body;
  if (d === undefined) body = `<p class="muted">Chargement…</p>`;
  else if (!d) body = `<p>${esc(ui.payErr || "Ce lien n’est pas valide.")}</p><p class="small muted">Besoin d’aide ? <a href="mailto:leseuil@orejeen.com">leseuil@orejeen.com</a></p>`;
  else {
    const active = d.status === "active", canPay = d.status === "acceptee" && !d.expired && d.payment_status !== "paye";
    const pay = d.payment;
    body = `<p>Bonjour ${esc(d.first_name)},</p>
     <dl class="facts facts-wide fin-facts">
      <div><dt>Programme approuvé</dt><dd>${esc(d.programme)}</dd></div>
      <div><dt>Formule choisie</dt><dd>${esc(d.plan_label)}</dd></div>
      <div><dt>Prix total</dt><dd><b>${fmtF(d.price_fcfa)}</b></dd></div>
      <div><dt>Statut du paiement</dt><dd>${active ? "Payé" : esc(PAYST[d.payment_status] || d.payment_status)}</dd></div>
      <div><dt>Référence de la demande</dt><dd data-noi18n>${esc(d.reference)}</dd></div></dl>
     ${active ? `<div class="notice fin-ok" role="status">${icon("check")}<span><b>Votre inscription est active.</b> Vous avez reçu un e-mail pour accéder à votre espace (et, s’il s’agit de votre premier accès, choisir votre mot de passe).</span></div>
        ${pay?.receipt_number ? `<div class="card-flat stack fin-receipt" style="gap:6px"><h2 class="h-card">Reçu n° <span data-noi18n>${esc(pay.receipt_number)}</span></h2>
          <dl class="facts"><div><dt>Programme</dt><dd>${esc(d.programme)}</dd></div><div><dt>Formule</dt><dd>${esc(d.plan_label)}</dd></div><div><dt>Montant</dt><dd>${fmtF(pay.amount_fcfa)}</dd></div>
          <div><dt>Date</dt><dd>${pay.paid_at ? new Date(pay.paid_at).toLocaleDateString("fr-FR") : ""}</dd></div><div><dt>Référence de transaction</dt><dd data-noi18n>${esc(pay.transaction_id)}</dd></div></dl>
          <button class="btn btn-soft btn-sm" data-act="fin-print" style="align-self:flex-start">Imprimer le reçu</button></div>` : ""}
        <button class="btn btn-primary" data-go="connexion" style="align-self:flex-start">Accéder à mon espace</button>`
     : d.status === "acceptee" ? `
        ${d.expired ? `<div class="notice">${icon("info")}<span>Ce lien a expiré. Écrivez-nous à <a href="mailto:leseuil@orejeen.com">leseuil@orejeen.com</a> pour en recevoir un nouveau.</span></div>` : ""}
        ${d.payment_status === "en_cours" ? `<div class="notice">${icon("info")}<span>Un paiement est en cours de confirmation par le prestataire. Votre accès s’ouvrira dès sa confirmation ; aucun accès n’est donné avant.</span></div>` : ""}
        ${canPay ? `<p class="small muted">Le paiement est traité sur la page sécurisée de notre prestataire : LE SEUIL ne reçoit et ne conserve jamais vos coordonnées bancaires ni vos codes de paiement mobile. Les moyens disponibles s’affichent sur cette page.</p>
          <div class="row"><button class="btn btn-gold" data-act="fin-pay">Procéder au paiement</button>${d.payment_status === "en_cours" ? `<button class="btn btn-soft" data-act="fin-refresh">Vérifier mon paiement</button>` : ""}</div>` : ""}
        ${ui.payTx && d.mode === "test" ? `<div class="card-flat stack fin-test" style="gap:8px"><b>Mode test — aucun argent réel</b><span class="small">Transaction <span data-noi18n>${esc(ui.payTx)}</span>. Simulation réservée à l’administratrice connectée.</span>
          <div class="row"><button class="btn btn-soft btn-sm" data-act="fin-test" data-o="reussi">Simuler un paiement réussi</button><button class="btn btn-soft btn-sm" data-act="fin-test" data-o="en_attente">Simuler un paiement en attente</button><button class="btn btn-soft btn-sm" data-act="fin-test" data-o="echoue">Simuler un paiement échoué</button></div></div>` : ""}`
     : `<div class="notice">${icon("info")}<span>${d.status === "refusee" || d.status === "orientation" ? "Cette demande n’a pas été approuvée : aucun paiement n’est possible." : d.status === "annulee" ? "Cette demande a été annulée : aucun paiement n’est possible." : "Votre demande n’est pas encore approuvée : le paiement n’est pas encore possible."}</span></div>`}
     <p class="small muted" id="fin-out" role="status">${ui.payErr && d ? esc(ui.payErr) : ""}</p>`;
  }
  return head + `<section class="section"><div class="wrap narrow" style="margin:0 auto"><div class="card stack fin-card">${body}
    <p class="small muted">${icon("phone")} LE SEUIL n’est pas un service d’urgence. En cas de danger immédiat, appelez le SAMU au 185.</p></div></div></section>`;
}
const finToken = () => ui.payFor;
actions["fin-pay"] = async (b) => {
  b.disabled = true; ui.payErr = null;
  try {
    const r = await api.checkout("checkout_start", finToken());
    if (r.payment_url && /^https:\/\/[a-z0-9.-]*cinetpay\.com\//i.test(r.payment_url)) { location.href = r.payment_url; return; }
    ui.payTx = r.transaction_id; ui.pay = await api.checkout("checkout_info", finToken()); rerender();
  } catch (e) { ui.payErr = e.message; b.disabled = false; rerender(); }
};
actions["fin-refresh"] = async () => { try { ui.pay = await api.checkout("checkout_refresh", finToken()); } catch (e) { ui.payErr = e.message; } rerender(); };
actions["fin-test"] = async (b) => {
  try { await api.checkout("test_complete", finToken(), { transaction_id: ui.payTx, outcome: b.dataset.o }); ui.pay = await api.checkout("checkout_info", finToken()); if (b.dataset.o !== "en_attente") ui.payTx = b.dataset.o === "echoue" ? null : ui.payTx; }
  catch (e) { ui.payErr = e.message; }
  rerender();
};
actions["fin-print"] = () => window.print();
