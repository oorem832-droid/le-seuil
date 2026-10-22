// « Nos programmes » : présentation publique uniquement. Aucune leçon, aucun script vidéo, aucun exercice
// détaillé ni questionnaire n'est affiché ici. Le visiteur envoie une demande ; il ne crée pas de compte.
import { esc, icon, cover, pageHead, fcfa, toast, $ } from "./util.js";
import { ui, actions, forms, rerender, go } from "./state.js";
import { C, DEMO, api } from "../store.js";
import { CATALOGUE_SIZE } from "../content.js";
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
  return `<div class="grid g3">${C.plans.map((pl, i) => `<article class="card plan-card ${pl.featured ? "featured" : ""}">
     <div class="stack" style="gap:4px"><span class="eyebrow">Formule ${i + 1}</span><h3 style="margin:0">${esc(pl.short)}</h3></div>
     <div class="price">${fcfa(pl.price).replace(" FCFA", "")} <small>FCFA · paiement unique</small></div>
     <ul class="ticks">${pl.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
     ${p.open ? `<button class="btn ${pl.featured ? "btn-primary" : "btn-ghost"}" data-act="choose-plan" data-plan="${pl.id}">Choisir cette formule</button>` : ""}
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
     ${p.open ? `<button class="btn btn-primary" data-act="choose-plan" data-plan="">Demander à rejoindre ce programme</button>` : `<p class="small muted">Les demandes pour ce programme ne sont pas encore ouvertes.</p>`}
     <p class="small muted">${icon("phone")} LE SEUIL n’est pas un service d’urgence. En cas de danger, appelez le SAMU au 185.</p></div></aside>
  </div></section>
  <section class="section band" id="formules"><div class="wrap stack-lg"><div class="stack" style="gap:6px"><span class="eyebrow">Les trois formules</span><h2>Choisir ma formule</h2></div>${plansHTML(p)}</div></section>
  ${p.open ? `<section class="section" id="demande"><div class="wrap narrow" style="margin:0 auto">${requestForm(p, sel)}</div></section>` : ""}
  ${reads.length ? `<section class="section band lib-band"><div class="wrap stack-lg"><div class="stack" style="gap:6px"><span class="eyebrow">Lectures gratuites · La Bibliothèque</span><h2 class="h-sub">Pour aller plus loin, en accès libre</h2>
     <p class="small muted">Ces articles sont publics et indépendants du programme.</p></div><div class="grid g3">${reads.map(articleCard).join("")}</div>
     <a class="btn btn-ghost" href="#bibliotheque-${catSlug((p.library_categories || [])[0] || "")}" data-go="${(p.library_categories || []).length ? "bibliotheque-" + catSlug(p.library_categories[0]) : "bibliotheque"}" style="align-self:flex-start">Explorer la Bibliothèque</a></div></section>` : ""}`;
}

function requestForm(p, sel){
  if (ui.reqSent === p.slug) return `<div class="card stack" role="status"><h2 class="h-sub">${icon("check")} Votre demande a bien été transmise</h2>
    <p>Merci. L’équipe LE SEUIL va examiner votre demande et l’adéquation du programme à votre situation. Nous vous recontacterons par e-mail pour la suite, notamment le paiement.</p>
    <p class="small muted">Aucun compte n’a été créé. Votre accès vous sera envoyé par e-mail une fois votre demande validée.</p>
    <button class="btn btn-soft btn-sm" data-act="req-again" style="align-self:flex-start">Faire une autre demande</button></div>`;
  return `<form class="card stack" id="requestform" novalidate aria-labelledby="req-h">
   <h2 class="h-sub" id="req-h">Demande d’inscription</h2>
   <p class="small muted">Cette demande ne crée pas de compte. Après vérification, l’équipe LE SEUIL vous recontacte par e-mail.</p>
   <input type="hidden" id="rq-prog" value="${esc(p.slug)}">
   <fieldset class="field"><legend class="flabel">Formule souhaitée</legend><div class="plan-pick">${C.plans.map((pl, i) => `<label class="pick"><input type="radio" name="rq-plan" value="${pl.id}" ${sel === pl.id ? "checked" : ""}><span><b>${esc(pl.short)}</b><span class="small muted">${fcfa(pl.price)}</span></span></label>`).join("")}</div></fieldset>
   <div class="grid g2" style="gap:14px"><div class="field"><label class="flabel" for="rq-first">Prénom</label><input id="rq-first" type="text" autocomplete="given-name" maxlength="100" required></div>
    <div class="field"><label class="flabel" for="rq-last">Nom</label><input id="rq-last" type="text" autocomplete="family-name" maxlength="100" required></div></div>
   <div class="grid g2" style="gap:14px"><div class="field"><label class="flabel" for="rq-mail">E-mail</label><input id="rq-mail" type="email" autocomplete="email" maxlength="320" required></div>
    <div class="field"><label class="flabel" for="rq-phone">Téléphone (facultatif)</label><input id="rq-phone" type="tel" autocomplete="tel" maxlength="40"></div></div>
   <div class="field"><label class="flabel" for="rq-msg">Message (facultatif)</label><textarea id="rq-msg" rows="3" maxlength="2000"></textarea><span class="hint">Merci de ne pas partager ici d’informations détaillées sur votre santé.</span></div>
   <label class="check"><input id="rq-adult" type="checkbox"><span>J’ai 18 ans ou plus.</span></label>
   <label class="check"><input id="rq-ok" type="checkbox"><span>J’accepte que ces informations soient utilisées uniquement pour traiter ma demande (voir la <a href="#confidentialite" data-go="confidentialite">politique de confidentialité</a>).</span></label>
   <button class="btn btn-gold" type="submit" style="align-self:flex-start">Envoyer ma demande</button><p id="rq-out" class="small" role="status"></p>
  </form>`;
}
actions["choose-plan"] = (b) => { if (b.dataset.plan) ui.reqPlan = b.dataset.plan; rerender(); setTimeout(() => { document.getElementById("demande")?.scrollIntoView({ behavior: "smooth" }); document.getElementById("rq-first")?.focus({ preventScroll: true }); }, 50); };
actions["req-again"] = () => { ui.reqSent = null; rerender(); };
forms["requestform"] = async (f) => {
  const out = (m) => { const el = $("#rq-out"); el.textContent = m; el.style.color = "var(--warn-fg)"; };
  const plan = f.querySelector('input[name="rq-plan"]:checked')?.value;
  const r = { programme_slug: $("#rq-prog").value, plan, first_name: $("#rq-first").value.trim(), last_name: $("#rq-last").value.trim(), email: $("#rq-mail").value.trim(),
    phone: $("#rq-phone").value.trim() || null, message: $("#rq-msg").value.trim() || null, is_adult: $("#rq-adult").checked, consent: $("#rq-ok").checked };
  if (!plan) return out("Choisissez une formule.");
  if (!r.first_name || !r.last_name || !/^\S+@\S+\.\S+$/.test(r.email)) return out("Merci d’indiquer votre prénom, votre nom et un e-mail valide.");
  if (!r.is_adult) return out("Les programmes s’adressent aux adultes de 18 ans et plus.");
  if (!r.consent) return out("Merci d’accepter l’utilisation de vos informations pour traiter votre demande.");
  const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
  try { await api.submitRequest(r); ui.reqSent = r.programme_slug; ui.reqPlan = ""; rerender(); toast(DEMO ? "Maquette : demande enregistrée dans ce navigateur" : "Demande envoyée"); }
  catch (e) { console.error(e); out("L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez."); btn.disabled = false; }
};
