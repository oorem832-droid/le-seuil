// Pages publiques : accueil, découverte, programmes, bibliothèque gratuite, FAQ, contact, aide, pages légales, connexion.
import { TOPICS, EMERGENCY, FAQ, COACH, CATALOGUE_SIZE } from "../content.js";
import { esc, icon, cover, HERO_ART, LOGO, MARK, pageHead, fmtDate, fcfa, toast, $ } from "./util.js";
import { ui, actions, forms, inputs, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";

export const NAV = [["accueil","Accueil"],["decouvrir","Découvrir LE SEUIL"],["programmes","Nos programmes"],["bibliotheque","Bibliothèque gratuite"],["faq","Questions fréquentes"],["contact","Contact"]];
const navActive = (r) => r.startsWith("sujet-") || r.startsWith("article-") ? "bibliotheque" : r.startsWith("programme-") ? "programmes" : r;
export const homeRoute = () => !S.user ? "connexion" : store.isCoach() ? "accompagnante" : store.isStaff() ? "admin" : "espace";

export function header(){
  const a = navActive(ui.route);
  const who = S.user ? (store.isCoach() ? "Espace accompagnante" : store.isStaff() ? "Administration" : "Mon espace") : "Se connecter";
  return `<div class="sos" role="note"><div class="wrap">${icon("phone")}<span><b>LE SEUIL n’est pas un service d’urgence.</b> En danger immédiat : SAMU <b>185</b> · Pompiers <b>180</b> · Police <b>170</b></span><a href="#aide" data-go="aide">Trouver de l’aide</a></div></div>
  ${DEMO ? `<div class="demo-bar"><div class="wrap">${icon("info")}<span>Maquette de démonstration · données fictives · ne pas utiliser avec de vrais participants</span></div></div>` : ""}
  <header class="site"><div class="wrap" style="position:relative">
   <button class="brand" data-go="accueil" aria-label="LE SEUIL, accueil"><img src="${MARK}" alt=""><span>LE SEUIL</span></button>
   <nav class="main" id="mainnav" aria-label="Navigation principale">${NAV.map(([k,l])=>`<button data-go="${k}" ${a===k?'aria-current="page"':""}>${l}</button>`).join("")}</nav>
   <div class="head-cta">
    <button class="btn btn-ghost btn-sm" data-go="programmes">Découvrir les programmes</button>
    <button class="btn btn-primary btn-sm" data-go="${homeRoute()}">${icon("user")}${who}</button>
   </div>
   <button class="btn btn-soft btn-sm burger" data-act="burger" aria-controls="mainnav" aria-expanded="false" aria-label="Menu">${icon("menu")}</button>
  </div></header>`;
}

export function footer(){
  return `<footer class="site"><div class="wrap">
   <div class="cols">
    <div class="stack" style="gap:12px"><span class="brand"><span style="color:var(--on-forest)">LE SEUIL</span></span>
     <p class="script">S’ouvrir pour mieux vivre</p>
     <p class="small" style="opacity:.85">Psychoéducation et programmes d’auto-assistance inspirés des TCC. Abidjan, Côte d’Ivoire.</p></div>
    <div><h4>Explorer</h4><div class="stack" style="gap:2px">${NAV.slice(1).map(([k,l])=>`<button class="f" data-go="${k}">${l}</button>`).join("")}</div></div>
    <div><h4>Informations</h4><div class="stack" style="gap:2px">
     <button class="f" data-go="limites">Ce que LE SEUIL propose et ne propose pas</button><button class="f" data-go="aide">Trouver une aide appropriée</button>
     <button class="f" data-go="confidentialite">Confidentialité</button><button class="f" data-go="conditions">Conditions d’utilisation</button>
     <button class="f" data-go="accessibilite">Accessibilité</button><button class="f" data-go="protection">Protection et orientation</button></div></div>
    <div><h4>Contact</h4><div class="stack small" style="gap:6px;opacity:.9">
     <span>contact@leseuil.ci <em>(adresse à confirmer)</em></span><span>Lun–ven 8 h–18 h · sam 8 h–13 h</span>
     <span>Facebook · Instagram · LinkedIn · YouTube <em>(comptes à créer)</em></span></div></div>
   </div>
   <div class="disclaimer"><b>LE SEUIL n’est pas un service d’urgence.</b> Nous proposons de l’information et des programmes d’auto-assistance, ni diagnostic, ni psychothérapie, ni prise en charge psychiatrique. Si vous ou un proche êtes en danger : SAMU 185, sapeurs-pompiers 180, police 170, 110 ou 111, ou rendez-vous aux urgences de l’hôpital le plus proche.</div>
   <div class="base"><span>© 2026 LE SEUIL${DEMO?" · Maquette de démonstration":""}</span><span>Franchir le seuil, et soudain, vous n’êtes plus seul.</span></div>
  </div></footer>`;
}

/* ---------- Blocs ---------- */
const published = () => C.articles.filter(a => a.status === "published");
export const artCard = (a,i) => `<button class="card art-card" data-go="article-${a.id}"><div class="cover">${cover(a.hue,i+1)}</div><div class="body"><div class="row" style="gap:8px"><span class="tag">${esc(a.cat)}</span><span class="small muted">${a.read} min de lecture</span></div><h3>${esc(a.title)}</h3><p class="muted small">${esc(a.excerpt)}</p></div></button>`;
const minPrice = () => Math.min(...C.plans.map(p => p.price));

function progCard(p, i){
  return `<article class="card prog-card"><div class="cover">${cover(p.hue||"sage",i+4)}</div><div class="body">
   <div class="meta"><span class="tag">Programme ${esc(p.code||"")}</span><span class="tag">6 semaines</span>${p.status==="published"?"":`<span class="tag gold">Maquette</span>`}</div>
   <h3>${esc(p.title)}</h3><p class="muted">${esc(p.summary)}</p>
   <p class="small muted">À partir de <b class="num" style="color:var(--forest)">${fcfa(minPrice())}</b> · paiement unique</p>
   <div class="row" style="margin-top:auto"><button class="btn btn-primary btn-sm" data-go="programme-${p.slug}">Voir le programme ${icon("arrow")}</button></div>
  </div></article>`;
}
const soonCard = () => `<article class="card-flat stack soon-card"><span class="tag warn">En préparation</span><h3>${CATALOGUE_SIZE - C.programmes.length} autres programmes</h3><p class="muted">Le catalogue LE SEUIL accueillera progressivement onze programmes, chacun construit sur le même modèle de six semaines.</p></article>`;

export function pricing(){
  const yes = '<span class="yes">Inclus</span>', no = '<span class="no">—</span>';
  const plans = C.plans;
  return `<div class="stack-lg">
   <div class="grid g3">${plans.map(p=>`<article class="card plan-card ${p.featured?"featured":""}">
     <div class="stack" style="gap:4px"><span class="eyebrow">Forfait ${plans.indexOf(p)+1}</span><h3 style="margin:0">${esc(p.short)}</h3></div>
     <div class="price">${fcfa(p.price).replace(" FCFA","")} <small>FCFA · paiement unique</small></div>
     <ul class="ticks">${p.lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
     <button class="btn ${p.featured?"btn-primary":"btn-ghost"}" ${C.flags.payments?"":"disabled"} title="Les inscriptions payantes ne sont pas encore ouvertes">${C.flags.payments?"Choisir ce forfait":"Inscriptions bientôt ouvertes"}</button>
   </article>`).join("")}</div>
   <div class="table-wrap"><table><caption class="sr">Comparaison des trois forfaits</caption>
    <thead><tr><th scope="col">Ce qui est inclus</th>${plans.map(p=>`<th class="c" scope="col">${esc(p.short)}</th>`).join("")}</tr></thead>
    <tbody>
     <tr><th scope="row">Les six semaines : leçons et vidéos</th><td class="c">${yes}</td><td class="c">${yes}</td><td class="c">${yes}</td></tr>
     <tr><th scope="row">Exercices interactifs</th><td class="c">${yes}</td><td class="c">${yes}</td><td class="c">${yes}</td></tr>
     <tr><th scope="row">Journal personnel et objectifs</th><td class="c">${yes}</td><td class="c">${yes}</td><td class="c">${yes}</td></tr>
     <tr><th scope="row">Suivi personnel non clinique et plan final</th><td class="c">${yes}</td><td class="c">${yes}</td><td class="c">${yes}</td></tr>
     <tr><th scope="row">Accompagnement écrit chaque semaine*</th><td class="c">${no}</td><td class="c">${yes}</td><td class="c">${no}</td></tr>
     <tr><th scope="row">Messagerie privée sécurisée</th><td class="c">${no}</td><td class="c">${yes}</td><td class="c small">Pratique uniquement</td></tr>
     <tr><th scope="row">Six échanges de 15 minutes, téléphone ou vidéo*</th><td class="c">${no}</td><td class="c">${no}</td><td class="c">${yes}</td></tr>
     <tr><th scope="row">Prix (paiement unique)</th>${plans.map(p=>`<td class="c num"><b>${fcfa(p.price)}</b></td>`).join("")}</tr>
    </tbody></table></div>
   <p class="small muted">Chaque forfait correspond à un programme complet de six semaines, sans abonnement automatique. * Selon les conditions du service. Les échanges ne sont ni des consultations psychologiques ni des séances de psychothérapie.</p>
   ${C.flags.payments?"":`<div class="notice">${icon("info")}<span>Les inscriptions payantes et l’accompagnement ouvriront une fois le cadre réglementaire ivoirien vérifié et les procédures de confidentialité, d’orientation et de sécurité validées.</span></div>`}
  </div>`;
}

/* ---------- Accueil ---------- */
export function pHome(){
  const arts = published().slice(0,3);
  return `
  <section class="hero"><div class="wrap">
   <div class="stack-lg fade-in">
    <span class="eyebrow">Soutien · Compréhension · Équilibre</span>
    <h1>Un premier pas vers votre <em>bien-être</em>.</h1>
    <p class="lede">Bienvenue chez LE SEUIL, un espace pour comprendre ses émotions, découvrir des ressources fiables et avancer à son rythme grâce à des programmes interactifs de bien-être psychologique.</p>
    <div class="row"><button class="btn btn-primary" data-go="programmes">Explorer les programmes ${icon("arrow")}</button><button class="btn btn-ghost" data-go="bibliotheque">Découvrir nos ressources gratuites</button></div>
    <p class="signature">Franchir le seuil, et soudain, vous n’êtes plus seul.</p>
   </div>
   ${HERO_ART}
  </div></section>

  <section class="section"><div class="wrap">
   <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:48px;align-items:start">
    <div class="stack"><span class="eyebrow">Qu’est-ce que LE SEUIL ?</span><h2>Un passage entre le silence et la parole.</h2>
     <p class="lede">LE SEUIL propose des ressources de psychoéducation et des programmes interactifs d’auto-assistance inspirés des thérapies cognitives et comportementales (TCC). Nous orientons vers des professionnels qualifiés lorsque c’est nécessaire.</p>
     <button class="linkbtn" data-go="decouvrir" style="align-self:flex-start">Découvrir notre mission et notre approche</button></div>
    <div class="grid" style="gap:14px">
     ${[["Soutien","Ne plus traverser seul les moments difficiles, avec des outils et des repères fiables."],["Compréhension","Mettre des mots simples sur ce que l’on vit, sans jugement et sans jargon."],["Équilibre","Avancer à son rythme vers un quotidien plus serein, pas à pas."]].map(([t,d])=>`<div class="card-flat"><h3>${t}</h3><p class="muted">${d}</p></div>`).join("")}
    </div>
   </div>
  </div></section>

  <section class="section band"><div class="wrap">
   <div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Comment ça marche</span><h2>Trois pas pour franchir le seuil</h2></div></div>
   <ol class="grid g3 steps3">
    ${[["Découvrir","Explorez nos articles et ressources gratuites pour mieux comprendre votre bien-être émotionnel."],["Choisir","Trouvez un programme structuré d’auto-assistance adapté à vos besoins."],["Avancer","Suivez les leçons et exercices à votre rythme, avec un accompagnement facultatif selon le forfait."]].map(([t,d],i)=>`<li class="card stack" style="gap:10px"><span class="step-num">${i+1}</span><h3>${t}</h3><p class="muted">${d}</p></li>`).join("")}
   </ol>
  </div></section>

  <section class="section"><div class="wrap">
   <div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Programmes de six semaines</span><h2>Nos programmes</h2></div><button class="btn btn-soft" data-go="programmes">Forfaits et tarifs ${icon("arrow")}</button></div>
   <div class="grid g3">${C.programmes.filter(p=>p.status!=="draft").map(progCard).join("")}${soonCard()}</div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
   <div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Le Journal du Seuil</span><h2>Derniers articles</h2></div><button class="btn btn-soft" data-go="bibliotheque">Toute la bibliothèque ${icon("arrow")}</button></div>
   <div class="grid g3">${arts.map(artCard).join("")}</div>
  </div></section>

  <section class="section band"><div class="wrap founder">
   <div class="portrait" aria-hidden="true">${icon("user","icon")}</div>
   <div class="stack"><span class="eyebrow">La fondatrice</span><h2>Une expérience d’accompagnement au service d’un projet de cœur</h2>
    <p class="lede">La fondatrice de LE SEUIL est <b>Psychological Wellbeing Practitioner</b> qualifiée au Royaume-Uni, avec une expérience des interventions de faible intensité, de la psychoéducation et des approches structurées inspirées des TCC.</p>
    <p class="muted">Elle a voulu rendre ces outils accessibles en français, dans un cadre adapté au contexte ivoirien, et contribuer à ce que demander de l’aide devienne un geste ordinaire. Elle n’est ni psychologue clinicienne ni psychiatre : lorsque votre situation le nécessite, LE SEUIL vous oriente vers des professionnels habilités.</p>
    <p class="small muted"><em>Nom, photo et parcours détaillé à compléter.</em></p></div>
  </div></section>

  <section class="section"><div class="wrap">${limitsCards()}</div></section>`;
}
const limitsCards = () => `<div class="grid g2">
    <div class="card stack"><h3>Ce que LE SEUIL propose</h3><ul class="ticks"><li>Des informations fiables et accessibles sur le bien-être psychologique</li><li>Des programmes d’auto-assistance inspirés des TCC</li><li>Un accompagnement facultatif, écrit ou par courts échanges, selon le forfait</li><li>Des repères pour savoir quand et vers qui se tourner</li></ul></div>
    <div class="card stack"><h3>Ce que LE SEUIL ne propose pas</h3><ul class="ticks no-ticks"><li>De diagnostic, ni de score de risque automatique</li><li>De psychothérapie, de consultation psychologique ou de prise en charge psychiatrique</li><li>De suivi clinique continu ou de surveillance permanente des réponses</li><li>De réponse aux urgences : en cas de danger, appelez le 185</li></ul></div>
   </div>`;

/* ---------- Découvrir ---------- */
export function pDiscover(){
  return pageHead("Découvrir LE SEUIL","Le nom évoque un passage","Celui entre le silence et la parole, entre l’hésitation et le premier pas, entre le sentiment d’être seul et la possibilité de recevoir du soutien.") + `
  <section class="section"><div class="wrap two-col">
   <div class="prose">
    <h2>Notre mission</h2>
    <p>Rendre les ressources de bien-être psychologique plus accessibles, compréhensibles et moins intimidantes, en commençant par la Côte d’Ivoire puis en s’ouvrant au public francophone.</p>
    <ul><li>Déstigmatiser les difficultés psychologiques et la demande d’aide.</li><li>Proposer des informations fiables et accessibles.</li><li>Développer des programmes structurés d’auto-assistance, inspirés des TCC.</li><li>Orienter vers des professionnels qualifiés lorsque c’est nécessaire.</li><li>Encourager la prévention, la connaissance de soi et le bien-être émotionnel.</li></ul>
    <h2>Notre approche</h2>
    <p>Chaque programme dure six semaines. Les leçons sont standardisées : tous les participants d’un même programme reçoivent les mêmes contenus. Vos réponses, votre journal et vos objectifs, eux, n’appartiennent qu’à vous.</p>
    <p>LE SEUIL ne se présente pas comme un service de diagnostic, de psychothérapie ou de prise en charge psychiatrique.</p>
    <h2>L’accompagnement</h2>
    <p>Avec les forfaits 2 et 3, ${esc(COACH.name)}, ${esc(COACH.title.toLowerCase())}, vous aide à suivre le programme : par écrit chaque semaine, ou par six échanges de 15 minutes. Cet accompagnement n’est ni une consultation psychologique ni une séance de psychothérapie.</p>
    <h2>À qui nous nous adressons</h2>
    <p>Aux adultes : parents, étudiants, enseignants, salariés. Des ressources pour les adolescents et les établissements scolaires pourront être développées plus tard, avec des dispositions spécifiques sur le consentement, la confidentialité et la protection des mineurs.</p>
    <h2>Une inspiration</h2>
    <p>Le projet est né d’une conviction personnelle, nourrie par Matthieu 7:7 et l’image d’une porte à laquelle on frappe. LE SEUIL est ouvert à toutes et à tous, quelles que soient leurs convictions.</p>
   </div>
   <aside class="aside"><div class="card" style="padding:18px"><img src="${LOGO}" alt="Logo LE SEUIL : une arche ouverte sur un chemin et un soleil levant" style="border-radius:14px"></div>
    <div class="card-flat stack" style="gap:10px"><h4>En une phrase</h4><p class="muted">LE SEUIL est née de la conviction qu’oser demander de l’aide peut être le premier pas vers une vie plus sereine.</p></div></aside>
  </div></section>`;
}

/* ---------- Programmes ---------- */
export function pProgrammes(){
  return pageHead("Nos programmes","Des programmes de six semaines, à votre rythme","Chaque programme suit la même progression : des leçons courtes, des vidéos, des exercices interactifs et un bilan chaque semaine.") + `
  <section class="section" style="padding-top:40px"><div class="wrap"><div class="grid g3">${C.programmes.filter(p=>p.status!=="draft").map(progCard).join("")}${soonCard()}</div></div></section>
  <section class="section band"><div class="wrap">
   <div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Forfaits et tarifs de lancement</span><h2>Trois façons de suivre un programme</h2></div></div>
   ${pricing()}
  </div></section>`;
}
export function pProgramme(slug){
  const p = C.programmes.find(x => x.slug === slug) || C.programme; if (!p) return pProgrammes();
  const intro = Array.isArray(p.intro) ? p.intro : String(p.intro||"").split(/\n\n/);
  return pageHead(`Programme ${esc(p.code||"")} · 6 semaines`, esc(p.title), esc(p.summary), `<button class="linkbtn" data-go="programmes">Nos programmes</button> / ${esc(p.title)}`) + `
  <section class="section"><div class="wrap two-col">
   <div class="stack-lg">
    <div class="prose">${intro.filter(Boolean).map(x=>`<p>${esc(x)}</p>`).join("")}</div>
    ${p.objectives?.length?`<div class="card-flat stack"><h3>Ce que vous allez apprendre</h3><ul class="ticks">${p.objectives.map(o=>`<li>${esc(o)}</li>`).join("")}</ul></div>`:""}
    <h2>Le programme, semaine après semaine</h2>
    <ol class="timeline">${C.weeks.map(w=>`<li><span class="dot">${w.n}</span><div class="tl-body"><span class="eyebrow">Semaine ${w.n}</span><h4>${esc(w.title)}</h4>${w.intro?`<p class="small muted">${esc(String(w.intro).split("\n\n")[0])}</p>`:""}</div></li>`).join("")}</ol>
   </div>
   <aside class="aside"><div class="card stack"><h3>Chaque semaine</h3><ul class="ticks small"><li>Un message d’accueil et des leçons courtes</li><li>Des exemples fictifs ancrés dans le quotidien</li><li>De courtes vidéos, sous-titrées et transcrites</li><li>Un exercice principal et des exercices facultatifs</li><li>Un journal personnel et un bilan</li><li>Des outils pour retrouver votre calme</li></ul>
    <button class="btn btn-primary" data-act="start-programme">${S.user?"Accéder à mon programme":"Créer un compte gratuit"} ${icon("arrow")}</button>
    <p class="small muted">${DEMO?"Maquette : accès avec des comptes de test.":"Accès de démonstration gratuit, sans paiement."}</p></div></aside>
  </div></section>
  <section class="section band"><div class="wrap"><div class="section-head"><h2>Forfaits</h2></div>${pricing()}</div></section>`;
}
actions["start-programme"] = () => { if (S.user) go(homeRoute()); else { ui.loginMode = DEMO ? "login" : "signup"; go("connexion"); } };

/* ---------- Bibliothèque gratuite ---------- */
export function pLibrary(){
  const tabs = [["sujets","Comprendre"],["articles","Le Journal du Seuil"],["videos","Vidéos et entretiens"]];
  let body = "";
  if (ui.libTab === "sujets") {
    const q = ui.libQuery.trim().toLowerCase();
    const list = TOPICS.filter(t => !q || (t.title+" "+t.intro).toLowerCase().includes(q));
    body = `<label class="search">${icon("search")}<span class="sr">Rechercher un sujet</span><input id="libsearch" type="text" placeholder="Rechercher : sommeil, anxiété, parentalité…" value="${esc(ui.libQuery)}"></label>
     <div class="grid g3">${list.map(t=>`<button class="topic-btn" data-go="sujet-${t.slug}"><strong>${t.title}</strong><span class="small muted">${esc(t.intro.split(". ")[0])}.</span></button>`).join("") || `<p class="muted">Aucun sujet ne correspond à « ${esc(ui.libQuery)} ».</p>`}</div>`;
  } else if (ui.libTab === "articles") {
    const cats = ["Tous","Comprendre ses émotions","Le quotidien et le bien-être","Parentalité","Vie professionnelle","Déconstruire les idées reçues","Paroles de professionnels"];
    const q = ui.query.trim().toLowerCase();
    const list = published().filter(a => (ui.filterCat==="Tous"||a.cat===ui.filterCat) && (!q || (a.title+" "+a.excerpt+" "+a.body.join(" ")).toLowerCase().includes(q)));
    body = `<label class="search">${icon("search")}<span class="sr">Rechercher un article</span><input id="jsearch" type="text" placeholder="Rechercher un article" value="${esc(ui.query)}"></label>
     <div class="chips" role="group" aria-label="Filtrer par rubrique">${cats.map(c=>`<button class="chip" data-act="cat" data-v="${c}" aria-pressed="${c===ui.filterCat}">${c}</button>`).join("")}</div>
     <div class="grid g3">${list.map(artCard).join("") || `<p class="muted">Aucun article ne correspond à votre recherche.</p>`}</div>`;
  } else {
    body = `<div class="grid g2">${C.videos.map(v=>`<article class="card stack" style="gap:12px">
     <div class="video"><div><div class="play">${icon("play")}</div><span class="small">${v.url?"":"Vidéo en préparation · "}${esc(v.len)}</span></div></div>
     <h3>${esc(v.title)}</h3><p class="small" style="color:var(--gold);font-weight:600">${esc(v.who)}</p><p class="muted">${esc(v.desc)}</p>
     <p class="small muted">Sous-titres en français et transcription prévus.</p></article>`).join("")}</div>`;
  }
  return pageHead("Bibliothèque gratuite","Comprendre, lire, regarder","Des ressources gratuites pour mieux comprendre le bien-être psychologique. Elles ne remplacent pas l’avis d’un professionnel.") + `
  <section class="section" style="padding-top:28px"><div class="wrap stack-lg">
   <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" data-act="libtab" data-v="${k}" aria-selected="${ui.libTab===k}">${l}</button>`).join("")}</div>
   ${body}
   <div class="notice calm">${icon("info")}<span>Ces contenus sont informatifs. Aucun questionnaire présent sur LE SEUIL n’a valeur de diagnostic.</span></div>
  </div></section>`;
}
actions["libtab"] = (b) => { ui.libTab = b.dataset.v; rerender(); };
actions["cat"] = (b) => { ui.filterCat = b.dataset.v; rerender(); };
inputs.push(t => { if (t.id==="libsearch"){ ui.libQuery=t.value; rerender(); return true; } if (t.id==="jsearch"){ ui.query=t.value; rerender(); return true; } return false; });

export function pTopic(slug){
  const t = TOPICS.find(x=>x.slug===slug); if(!t) return pLibrary();
  const rel = published().filter(a=>a.topic===slug);
  const isWorry = slug === "stress-anxiete";
  return pageHead("Bibliothèque gratuite · Comprendre", t.title, t.intro, `<button class="linkbtn" data-go="bibliotheque">Bibliothèque</button> / ${t.title}`) + `
  <section class="section"><div class="wrap two-col">
   <div class="prose">
    <h2>Ce que l’on peut vivre</h2><ul>${t.vecu.map(x=>`<li>${x}</li>`).join("")}</ul>
    <h2>Ce qui peut aider au quotidien</h2><ul>${t.pistes.map(x=>`<li>${x}</li>`).join("")}</ul>
    <h2>Quand consulter un professionnel</h2><p>${t.consulter}</p>
    <div class="notice">${icon("phone")}<span>Si vous pensez à vous faire du mal ou êtes en danger, appelez le SAMU au 185 ou rendez-vous aux urgences.</span></div>
   </div>
   <aside class="aside">
    ${isWorry && C.programme?`<div class="card stack" style="gap:10px"><span class="tag gold">Programme ${esc(C.programme.code)}</span><h4>${esc(C.programme.title)}</h4><p class="small muted">${esc(C.programme.summary)}</p><button class="btn btn-primary btn-sm" data-go="programme-${C.programme.slug}">Découvrir</button></div>`:""}
    <div class="card-flat stack" style="gap:10px"><h4>À lire aussi</h4>${(rel.length?rel:published().slice(0,2)).map(a=>`<button class="linkbtn" style="text-align:left" data-go="article-${a.id}">${esc(a.title)}</button>`).join("")}</div>
   </aside>
  </div></section>`;
}

export function pArticle(id){
  const arts = published(), a = arts.find(x=>x.id===id); if(!a) return pLibrary();
  const rel = arts.filter(x=>x.id!==id && (x.cat===a.cat || x.topic===a.topic)).concat(arts.filter(x=>x.id!==id)).filter((v,i,s)=>s.indexOf(v)===i).slice(0,3);
  const saved = S.saved.article.has(id);
  return `<section class="page-head"><div class="wrap narrow" style="margin:0 auto">
   <div class="crumb"><button class="linkbtn" data-act="libtab-go" data-v="articles">Le Journal du Seuil</button> / ${esc(a.cat)}</div>
   <span class="eyebrow">${esc(a.cat)}</span><h1 style="font-size:clamp(1.9rem,4.4vw,3rem)">${esc(a.title)}</h1>
   <p class="muted small">${esc(fmtDate(a.date))} · ${a.read} min de lecture</p></div></section>
  <section class="section" style="padding-top:36px"><div class="wrap narrow stack-lg" style="margin:0 auto">
   <div class="cover" style="border-radius:var(--r-lg);overflow:hidden;aspect-ratio:16/7;max-width:100%">${cover(a.hue,3)}</div>
   <div class="prose"><p class="lede">${esc(a.excerpt)}</p>${a.body.map(p=>`<p>${esc(p)}</p>`).join("")}</div>
   <div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:18px">
    <div class="row small"><span class="muted">Partager :</span><button class="btn btn-soft btn-sm" data-act="copylink" data-id="${a.id}">Copier le lien</button>
     <a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(a.title+" — "+location.origin+location.pathname+"#article-"+a.id)}">WhatsApp</a>
     <a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.origin+location.pathname+"#article-"+a.id)}">Facebook</a></div>
    ${S.user?`<button class="btn ${saved?"btn-primary":"btn-ghost"} btn-sm" data-act="savearticle" data-id="${a.id}">${icon("bookmark")}${saved?"Enregistré":"Enregistrer"}</button>`:""}
   </div>
   <div class="notice calm">${icon("info")}<span>Article d’information générale. Pour une situation personnelle, parlez-en à un professionnel de santé.</span></div>
   <h3>À lire ensuite</h3><div class="grid g3">${rel.map(artCard).join("")}</div>
  </div></section>`;
}
actions["libtab-go"] = (b) => { ui.libTab = b.dataset.v; go("bibliotheque"); };
actions["copylink"] = (b) => { const url = location.origin + location.pathname + "#article-" + b.dataset.id; try { navigator.clipboard.writeText(url).then(()=>toast("Lien copié"), ()=>toast("Copie impossible ici")); } catch(e) { toast("Copie impossible ici"); } };
actions["savearticle"] = async (b) => { const on = await store.toggleSaved("article", b.dataset.id); toast(on ? "Article enregistré dans Mon journal" : "Article retiré"); rerender(); };

/* ---------- FAQ, contact, aide ---------- */
export function pFAQ(){
  return pageHead("Questions fréquentes","Vos questions, nos réponses","") + `<section class="section" style="padding-top:28px"><div class="wrap narrow stack" style="margin:0 auto">
   ${FAQ.map((f,i)=>`<details class="faq" ${i===0?"open":""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
   <div class="card-flat row" style="justify-content:space-between"><span>Vous ne trouvez pas votre réponse ?</span><button class="btn btn-primary btn-sm" data-go="contact">Nous écrire</button></div>
  </div></section>`;
}

export function pContact(){
  return pageHead("Contact","Écrivez-nous","Une question sur les programmes, un partenariat avec une école ou une entreprise, une proposition d’entretien : nous vous répondons du lundi au samedi.") + `
  <section class="section"><div class="wrap two-col">
   <form class="card stack" id="contactform" novalidate>
    <div class="grid g2" style="gap:16px"><div class="field"><label for="c-name">Nom</label><input id="c-name" type="text" autocomplete="name" required></div>
    <div class="field"><label for="c-mail">E-mail</label><input id="c-mail" type="email" autocomplete="email" required></div></div>
    <div class="field"><label for="c-subj">Sujet</label><select id="c-subj"><option>Question sur un programme</option><option>Partenariat école ou entreprise</option><option>Professionnel·le souhaitant collaborer</option><option>Presse et médias</option><option>Autre</option></select></div>
    <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" required></textarea><span class="hint">Merci de ne pas partager d’informations détaillées sur votre santé dans ce formulaire.</span></div>
    <label class="check"><input id="c-ok" type="checkbox" required><span>J’accepte que mes coordonnées soient utilisées uniquement pour répondre à ma demande.</span></label>
    <button class="btn btn-primary" type="submit" style="align-self:flex-start">Envoyer le message</button>
    <p id="c-out" class="small" role="status"></p>
   </form>
   <aside class="aside">
    <div class="notice">${icon("phone")}<span><b>Ce formulaire n’est pas suivi en temps réel.</b> En cas d’urgence, appelez le SAMU au 185.</span></div>
    <div class="card-flat stack" style="gap:8px"><h4>Coordonnées</h4><p class="small">contact@leseuil.ci <em class="muted">(à confirmer)</em></p><p class="small">Abidjan, Côte d’Ivoire</p><p class="small muted">Lundi au vendredi 8 h–18 h<br>Samedi 8 h–13 h</p></div>
   </aside>
  </div></section>`;
}
const out = (id, msg, ok) => { const el = $("#"+id); if (el) { el.textContent = msg; el.style.color = ok ? "var(--ok)" : "var(--warn-fg)"; } };
const validEmail = v => /^\S+@\S+\.\S+$/.test(v);
forms["contactform"] = async (f) => {
  const m = { name:$("#c-name").value.trim(), email:$("#c-mail").value.trim(), subject:$("#c-subj").value, message:$("#c-msg").value.trim(), consent:$("#c-ok").checked };
  if (!m.name || !validEmail(m.email) || !m.message || !m.consent) return out("c-out","Merci de renseigner votre nom, un e-mail valide, votre message, et de cocher la case de consentement.");
  try { await api.submitContact(m); f.reset(); out("c-out", DEMO ? "Maquette : le message est enregistré dans ce navigateur uniquement." : "Merci, votre message a bien été envoyé.", true); }
  catch(e) { out("c-out","L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez."); }
};

/* Page d'orientation vers une aide appropriée */
export function pHelp(){
  return pageHead("Trouver une aide appropriée","Vous n’avez pas à tout porter seul","LE SEUIL n’est pas un service d’urgence ni de crise. Voici vers qui vous tourner, selon la situation.") + `
  <section class="section" style="padding-top:28px"><div class="wrap stack-lg">
   <div class="card urgent stack"><h2>${icon("phone")} En cas de danger immédiat</h2>
    <p>Si vous pensez à mettre fin à vos jours ou à vous faire du mal et sentez que vous pourriez passer à l’acte, si une personne est en danger, blessée ou a pris une substance en quantité dangereuse, ou si vous êtes victime ou témoin de violences :</p>
    <div class="grid g3">${EMERGENCY.map(e=>`<div class="emerg"><span class="small">${e.label}</span><span class="price">${e.num}</span></div>`).join("")}</div>
    <p>Vous pouvez aussi vous rendre directement aux urgences de l’hôpital ou du CHU le plus proche, et rester avec une personne de confiance.</p></div>
   <div class="grid g3">
    <div class="card stack" style="gap:8px"><h3>Si ce n’est pas une urgence</h3><p class="muted">Parlez-en rapidement à votre médecin ou à un professionnel de santé mentale. Il pourra évaluer votre situation et vous orienter.</p></div>
    <div class="card stack" style="gap:8px"><h3>Services de santé mentale</h3><p class="muted">Les CHU et centres hospitaliers disposent de services de psychiatrie et de psychologie. <em>Annuaire vérifié à venir.</em></p></div>
    <div class="card stack" style="gap:8px"><h3>Lignes d’écoute</h3><p class="muted"><em>Liste des lignes d’écoute ivoiriennes en cours de vérification avant la mise en ligne.</em></p></div>
   </div>
   <div class="card-flat stack"><h3>Quand un programme d’auto-assistance ne suffit pas</h3><ul class="ticks"><li>Les difficultés durent depuis longtemps ou s’aggravent.</li><li>Elles vous empêchent de travailler, de dormir ou de prendre soin de vous ou de vos proches.</li><li>Vous avez des pensées de vous faire du mal.</li></ul><p class="muted">Dans ces situations, un professionnel qualifié pourra vous aider à déterminer une suite adaptée. Demander de l’aide est une démarche de soin, pas un échec.</p></div>
  </div></section>`;
}

const LEGAL = {
 limites:["Ce que LE SEUIL propose et ne propose pas","Les limites du service", () => `${limitsCards()}
   <h2>L’accompagnement des forfaits 2 et 3</h2><p>L’accompagnement aide à suivre le programme et à en appliquer les outils. ${esc(COACH.name)} est ${esc(COACH.title.toLowerCase())} ; elle n’intervient pas comme psychologue clinicienne ou psychiatre. Les échanges ne sont pas des consultations psychologiques ni des séances de psychothérapie, et ne constituent pas un suivi clinique continu.</p>
   <h2>Confidentialité et orientation</h2><p>Votre journal reste privé. Si votre situation dépasse le cadre de l’auto-assistance, nous vous orientons vers une aide appropriée. Les procédures de confidentialité, d’orientation et de sécurité seront définies et validées avant la mise en ligne.</p>`],
 confidentialite:["Politique de confidentialité","Vos données, avec le plus grand soin", () => `<p>Le bien-être psychologique touche à l’intime. LE SEUIL applique un principe simple : ne collecter que le strict nécessaire, le protéger, et vous laisser la main.</p>
  <h2>Ce que nous collectons</h2><ul><li>Compte : prénom, e-mail, mot de passe chiffré.</li><li>Progression : leçons et exercices terminés.</li><li>Votre travail personnel : exercices, journal, objectifs, autoévaluations.</li><li>Forfaits 2 et 3 : messages, rendez-vous, et les bilans que vous choisissez de partager.</li></ul>
  <h2>Qui voit quoi</h2><ul><li>Votre journal personnel n’est jamais consulté, quel que soit le forfait.</li><li>Votre accompagnante voit uniquement vos messages, vos rendez-vous et ce que vous choisissez de partager. Chaque consultation est enregistrée.</li><li>L’administration voit des statistiques agrégées, jamais vos réflexions.</li></ul>
  <h2>Ce que nous ne faisons pas</h2><ul><li>Pas de profil public.</li><li>Pas de diagnostic, de score de risque ni de recommandation de traitement automatisés.</li><li>Pas de vente ni de partage de vos données à des fins publicitaires.</li></ul>
  <h2>Conservation et vos droits</h2><p>Accès, copie, rectification, effacement et retrait du consentement, depuis Mon compte. Durées de conservation et cadre légal ivoirien (protection des données à caractère personnel, autorité de contrôle) à préciser après vérification juridique.</p>
  ${DEMO?`<div class="notice">${icon("info")}<span>Maquette : les données saisies restent dans votre navigateur et ne sont envoyées à aucun serveur.</span></div>`:""}`],
 conditions:["Conditions d’utilisation","Le cadre de nos services", () => `<p>LE SEUIL propose des contenus d’information et des programmes d’auto-assistance inspirés des TCC, destinés aux adultes de 18 ans et plus.</p>
  <ul><li>Les contenus ne constituent ni un diagnostic, ni un traitement, ni une psychothérapie.</li><li>Chaque forfait correspond à un paiement unique pour un programme de six semaines, sans abonnement automatique.</li><li>L’accompagnement des forfaits 2 et 3 s’exerce selon les conditions du service et les délais annoncés.</li><li>Les inscriptions payantes ne sont pas encore ouvertes.</li></ul>
  <p class="small muted">Texte provisoire, à faire relire par un juriste avant le lancement.</p>`],
 accessibilite:["Accessibilité","Un site pour tout le monde", () => `<p>Nous voulons que LE SEUIL soit utilisable par toutes et tous.</p>
  <ul><li>Contrastes suffisants, en mode clair comme en mode sombre.</li><li>Navigation complète au clavier, avec repère de focus visible.</li><li>Texte agrandissable, mise en page pensée d’abord pour le téléphone.</li><li>Animations réduites si votre appareil le demande.</li><li>Sous-titres et transcription pour chaque vidéo, et une alternative écrite.</li></ul>
  <p>Une difficulté d’accès ? Écrivez-nous via la page Contact.</p>`],
 protection:["Protection et orientation","Comment nous veillons à votre sécurité", () => `<ul><li>Un questionnaire initial d’adéquation et de sécurité précède chaque programme. Seule sa date est enregistrée.</li><li>Un consentement éclairé est demandé avant de commencer.</li><li>Les programmes s’adressent aux adultes. Tout futur service destiné aux mineurs fera l’objet de règles spécifiques.</li><li>Les questionnaires standardisés (PHQ-9, GAD-7) ne sont jamais utilisés dans le forfait Autonome, et seulement dans les forfaits accompagnés une fois la supervision, la revue et la réponse aux risques validées.</li><li>Une procédure d’orientation en cas de difficulté préoccupante sera validée avant l’ouverture de l’accompagnement.</li></ul>`]
};
export const isLegal = (r) => !!LEGAL[r];
export function pLegal(k){ const [t,l,html] = LEGAL[k]; return pageHead("Informations", t, l) + `<section class="section"><div class="wrap"><div class="prose">${html()}</div></div></section>`; }

/* ---------- Connexion ---------- */
export function pLogin(){
  if (DEMO) return pageHead("Mon espace","Explorer la maquette","Choisissez un compte de test. Chaque compte montre un forfait ou un rôle différent.") + `
   <section class="section"><div class="wrap grid g2" style="align-items:start">
    <div class="card stack"><h3>Comptes de test</h3><div class="stack" style="gap:8px">${api.personas.map(p=>`<button class="persona" data-act="demo-login" data-id="${p.id}">${icon(p.role==="coach"?"chat":p.role==="admin"?"shield":"user")}<span>${esc(p.label)}</span>${icon("arrow")}</button>`).join("")}</div>
     <button class="linkbtn small" data-act="demo-reset" style="align-self:flex-start">Réinitialiser les données de démonstration</button></div>
    <div class="stack-lg"><div class="notice">${icon("info")}<span>Ceci est une maquette : les données sont fictives et restent dans ce navigateur. Ne saisissez pas d’informations personnelles réelles.</span></div>
     <div class="card-flat stack" style="gap:10px"><h4>Vos données sont protégées</h4><ul class="ticks small"><li>Votre journal n’est visible que par vous.</li><li>Votre accompagnante ne voit que ce que vous choisissez de partager.</li><li>Vous pouvez tout effacer depuis Mon compte.</li></ul></div></div>
   </div></section>`;
  const tabs = `<div class="tabs" role="tablist">${[["login","Se connecter"],["signup","Créer un compte"]].map(([k,l])=>`<button role="tab" data-act="loginmode" data-m="${k}" aria-selected="${ui.loginMode===k}">${l}</button>`).join("")}</div>`;
  let form;
  if (ui.loginMode==="signup") form = `<form class="card stack" id="signupform" novalidate>
    <div class="field"><label for="s-name">Prénom</label><input id="s-name" type="text" autocomplete="given-name" required></div>
    <div class="field"><label for="s-mail">E-mail</label><input id="s-mail" type="email" autocomplete="email" required></div>
    <div class="field"><label for="s-pw">Mot de passe</label><input id="s-pw" type="password" autocomplete="new-password" minlength="8" required><span class="hint">Au moins 8 caractères.</span></div>
    <label class="check"><input id="s-age" type="checkbox" required><span>J’ai 18 ans ou plus.</span></label>
    <label class="check"><input id="s-cgu" type="checkbox" required><span>J’ai lu la <button type="button" class="linkbtn" data-go="confidentialite">politique de confidentialité</button>, les <button type="button" class="linkbtn" data-go="conditions">conditions d’utilisation</button> et les <button type="button" class="linkbtn" data-go="limites">limites du service</button>.</span></label>
    <button class="btn btn-gold" type="submit" style="align-self:flex-start">Créer mon compte</button>
    <p id="s-out" class="small" role="status"></p></form>`;
  else if (ui.loginMode==="forgot") form = `<form class="card stack" id="forgotform" novalidate>
    <h3>Mot de passe oublié</h3><p class="muted small">Nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>
    <div class="field"><label for="f-mail">E-mail</label><input id="f-mail" type="email" autocomplete="email" required></div>
    <div class="row"><button class="btn btn-primary" type="submit">Envoyer le lien</button><button class="btn btn-soft" type="button" data-act="loginmode" data-m="login">Retour</button></div>
    <p id="f-out" class="small" role="status"></p></form>`;
  else form = `<form class="card stack" id="loginform" novalidate>
    <div class="field"><label for="l-mail">E-mail</label><input id="l-mail" type="email" autocomplete="username" required></div>
    <div class="field"><label for="l-pw">Mot de passe</label><input id="l-pw" type="password" autocomplete="current-password" required></div>
    <div class="row" style="justify-content:space-between"><button class="btn btn-primary" type="submit">Se connecter</button><button type="button" class="linkbtn small" data-act="loginmode" data-m="forgot">Mot de passe oublié ?</button></div>
    <p id="l-out" class="small" role="status"></p></form>`;
  return pageHead("Mon espace","Connexion et inscription","Accédez à votre programme, votre journal et vos objectifs.") + `
  <section class="section"><div class="wrap grid g2" style="align-items:start">
   <div class="stack-lg">${tabs}${form}</div>
   <div class="card-flat stack" style="gap:10px"><h4>Vos données sont protégées</h4><ul class="ticks small"><li>Votre journal n’est visible que par vous.</li><li>Votre accompagnante ne voit que ce que vous choisissez de partager.</li><li>Vous pouvez tout effacer depuis Mon compte.</li></ul></div>
  </div></section>`;
}
export function pNewPassword(){
  return pageHead("Mon espace","Choisir un nouveau mot de passe","") + `<section class="section"><div class="wrap narrow">
   <form class="card stack" id="newpwform" novalidate><div class="field"><label for="n-pw">Nouveau mot de passe</label><input id="n-pw" type="password" autocomplete="new-password" minlength="8" required><span class="hint">Au moins 8 caractères.</span></div>
   <button class="btn btn-primary" type="submit" style="align-self:flex-start">Enregistrer</button><p id="n-out" class="small" role="status"></p></form></div></section>`;
}
actions["loginmode"] = (b) => { ui.loginMode = b.dataset.m; rerender(); };
actions["demo-login"] = async (b) => { await store.demoLogin(b.dataset.id); toast("Connecté·e avec un compte de test"); go(homeRoute()); };
actions["demo-reset"] = async () => { await store.resetDemo(); toast("Données de démonstration réinitialisées"); rerender(); };
function authError(e){
  const m = String(e?.message||"").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("not confirmed")) return "Confirmez d’abord votre adresse e-mail grâce au lien reçu.";
  if (m.includes("already registered")) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
  if (m.includes("password")) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}
const busy = (f, on) => { const b = f.querySelector('button[type="submit"]'); if (b) b.disabled = on; };
forms["loginform"] = async (f) => {
  busy(f,true);
  try { await api.signIn($("#l-mail").value.trim(), $("#l-pw").value); await store.loadContent(); await store.loadUser(); toast("Bienvenue"); go(homeRoute()); }
  catch(e) { out("l-out", authError(e)); } finally { busy(f,false); }
};
forms["signupform"] = async (f) => {
  const n=$("#s-name").value.trim(), m=$("#s-mail").value.trim(), pw=$("#s-pw").value;
  if(!n || !validEmail(m) || pw.length<8 || !$("#s-age").checked || !$("#s-cgu").checked) return out("s-out","Merci de compléter le prénom, un e-mail valide, un mot de passe d’au moins 8 caractères, et de cocher les deux cases.");
  busy(f,true);
  try { const r = await api.signUp(n, m, pw);
    if (r.needsConfirmation) out("s-out", "Presque terminé : ouvrez le lien envoyé à "+m+" pour confirmer votre adresse.", true);
    else { await store.loadContent(); await store.loadUser(); toast("Compte créé"); go("espace"); } }
  catch(e) { out("s-out", authError(e)); } finally { busy(f,false); }
};
forms["forgotform"] = async (f) => {
  const m=$("#f-mail").value.trim(); if(!validEmail(m)) return out("f-out","Saisissez une adresse e-mail valide.");
  busy(f,true); try { await api.resetPassword(m); out("f-out","Si un compte existe pour cette adresse, un lien vient d’être envoyé.", true); } catch(e) { out("f-out", authError(e)); } finally { busy(f,false); }
};
forms["newpwform"] = async (f) => {
  const pw=$("#n-pw").value; if(pw.length<8) return out("n-out","Au moins 8 caractères.");
  busy(f,true); try { await api.updatePassword(pw); toast("Mot de passe mis à jour"); go("espace"); } catch(e) { out("n-out", authError(e)); } finally { busy(f,false); }
};
