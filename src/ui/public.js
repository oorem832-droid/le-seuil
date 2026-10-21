// Pages publiques : accueil, découverte, programmes, bibliothèque gratuite, FAQ, contact, aide, pages légales, connexion.
import { EMERGENCY, FAQ, COACH } from "../content.js";
import { featuredArticles, articleCard } from "./library.js";
import { programmeCard } from "./programmes.js";
import { esc, icon, cover, HERO_ART, LOGO, MARK, pageHead, fmtDate, fcfa, toast, $ } from "./util.js";
import { ui, actions, forms, inputs, rerender, go } from "./state.js";
import * as store from "../store.js";
import { C, S, DEMO, api } from "../store.js";

export const NAV = [["accueil","Accueil"],["apropos","À propos"],["bibliotheque","Bibliothèque"],["programmes","Nos programmes"],["contact","Contact"]];
const navActive = (r) => r.startsWith("article-") || r.startsWith("bibliotheque") ? "bibliotheque" : r.startsWith("programme-") ? "programmes" : r === "decouvrir" ? "apropos" : r;
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
     <button class="f" data-go="faq">Questions fréquentes</button><button class="f" data-go="limites">Ce que LE SEUIL propose et ne propose pas</button><button class="f" data-go="aide">Trouver une aide appropriée</button>
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

export function pHome(){
  const arts = featuredArticles();
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
     <button class="linkbtn" data-go="apropos" style="align-self:flex-start">Découvrir notre mission et notre approche</button></div>
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
   <div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">Programmes de six semaines</span><h2>Nos programmes</h2></div><button class="btn btn-soft" data-go="programmes">Voir tous les programmes ${icon("arrow")}</button></div>
   <div class="grid g3">${C.programmes.filter(p=>["demo","published"].includes(p.status)).slice(0,3).map(programmeCard).join("")}</div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
   <div class="section-head"><div class="stack" style="gap:8px"><span class="eyebrow">La Bibliothèque · en accès libre</span><h2>À lire dans notre Bibliothèque</h2></div><button class="btn btn-soft" data-go="bibliotheque">Explorer la Bibliothèque ${icon("arrow")}</button></div>
   ${arts.length ? `<div class="grid g3">${arts.map(articleCard).join("")}</div>` : `<p class="muted">Les articles sont en cours de relecture et seront publiés prochainement.</p>`}
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

/* ---------- À propos ---------- */
export function pAbout(){
  return pageHead("À propos","Le nom évoque un passage","Celui entre le silence et la parole, entre l’hésitation et le premier pas, entre le sentiment d’être seul et la possibilité de recevoir du soutien.") + `
  <section class="section"><div class="wrap two-col">
   <div class="prose">
    <h2>Notre mission</h2>
    <p>Rendre les ressources de bien-être psychologique plus accessibles, compréhensibles et moins intimidantes, en commençant par la Côte d’Ivoire puis en s’ouvrant au public francophone.</p>
    <ul><li>Déstigmatiser les difficultés psychologiques et la demande d’aide.</li><li>Proposer des informations fiables et accessibles.</li><li>Développer des programmes structurés d’auto-assistance, inspirés des TCC.</li><li>Orienter vers des professionnels qualifiés lorsque c’est nécessaire.</li><li>Encourager la prévention, la connaissance de soi et le bien-être émotionnel.</li></ul>
    <h2>Notre approche</h2>
    <p>Chaque programme dure six semaines. Les leçons sont standardisées : tous les participants d’un même programme reçoivent les mêmes contenus. Vos réponses, votre journal et vos objectifs, eux, n’appartiennent qu’à vous.</p>
    <p>LE SEUIL ne se présente pas comme un service de diagnostic, de psychothérapie ou de prise en charge psychiatrique.</p>
    <h2>L’accompagnement</h2>
    <p>Avec les formules 2 et 3, ${esc(COACH.name)}, accompagnante en bien-être psychologique et ancienne Psychological Wellbeing Practitioner (Royaume-Uni), vous aide à suivre le programme : par écrit chaque semaine, ou par six échanges de 15 minutes. Cet accompagnement n’est ni une consultation psychologique ni une séance de psychothérapie.</p>
    <h2>À qui nous nous adressons</h2>
    <p>Aux adultes : parents, étudiants, enseignants, salariés. Des ressources pour les adolescents et les établissements scolaires pourront être développées plus tard, avec des dispositions spécifiques sur le consentement, la confidentialité et la protection des mineurs.</p>
    <h2>Une inspiration</h2>
    <p>Le projet est né d’une conviction personnelle, nourrie par Matthieu 7:7 et l’image d’une porte à laquelle on frappe. LE SEUIL est ouvert à toutes et à tous, quelles que soient leurs convictions.</p>
   </div>
   <aside class="aside"><div class="card" style="padding:18px"><img src="${LOGO}" alt="Logo LE SEUIL : une arche ouverte sur un chemin et un soleil levant" style="border-radius:14px"></div>
    <div class="card-flat stack" style="gap:10px"><h4>En une phrase</h4><p class="muted">LE SEUIL est née de la conviction qu’oser demander de l’aide peut être le premier pas vers une vie plus sereine.</p></div></aside>
  </div></section>`;
}

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
  if (DEMO) return pageHead("Mon espace","Accéder à mon programme","Maquette : choisissez un compte de test. Chaque compte montre un forfait ou un rôle différent.") + `
   <section class="section"><div class="wrap grid g2" style="align-items:start">
    <div class="card stack"><h3>Comptes de test</h3><div class="stack" style="gap:8px">${api.personas.map(p=>`<button class="persona" data-act="demo-login" data-id="${p.id}">${icon(p.role==="coach"?"chat":p.role==="admin"?"shield":"user")}<span>${esc(p.label)}</span>${icon("arrow")}</button>`).join("")}</div>
     <button class="linkbtn small" data-act="demo-reset" style="align-self:flex-start">Réinitialiser les données de démonstration</button></div>
    <div class="stack-lg"><div class="notice">${icon("info")}<span>Ceci est une maquette : les données sont fictives et restent dans ce navigateur. Ne saisissez pas d’informations personnelles réelles.</span></div>
     <div class="card-flat stack" style="gap:10px"><h4>Vos données sont protégées</h4><ul class="ticks small"><li>Votre journal n’est visible que par vous.</li><li>Votre accompagnante ne voit que ce que vous choisissez de partager.</li><li>Vous pouvez tout effacer depuis Mon compte.</li></ul></div></div>
   </div></section>`;
  const forgot = ui.loginMode === "forgot";
  const form = forgot ? `<form class="card stack" id="forgotform" novalidate>
    <h2 class="h-sub" style="margin:0">Mot de passe oublié</h2><p class="muted small">Indiquez l’e-mail de votre accès LE SEUIL. Si un compte existe, vous recevrez un lien à usage unique pour choisir un nouveau mot de passe.</p>
    <div class="field"><label class="flabel" for="f-mail">E-mail</label><input id="f-mail" type="email" autocomplete="email" required></div>
    <div class="row"><button class="btn btn-primary" type="submit">Envoyer le lien</button><button class="btn btn-soft" type="button" data-act="loginmode" data-m="login">Retour</button></div>
    <p id="f-out" class="small" role="status"></p></form>`
   : `<form class="card stack" id="loginform" novalidate>
    <div class="field"><label class="flabel" for="l-mail">E-mail</label><input id="l-mail" type="email" autocomplete="username" required></div>
    <div class="field"><label class="flabel" for="l-pw">Mot de passe</label><input id="l-pw" type="password" autocomplete="current-password" required></div>
    <div class="row" style="justify-content:space-between"><button class="btn btn-primary" type="submit">Se connecter</button><button type="button" class="linkbtn small" data-act="loginmode" data-m="forgot">Mot de passe oublié ?</button></div>
    <p id="l-out" class="small" role="status"></p></form>`;
  return pageHead("Se connecter", "Accéder à mon programme", "Réservé aux participants dont l’accès a été créé par l’équipe LE SEUIL.") + `
  <section class="section"><div class="wrap grid g2" style="align-items:start">
   <div class="stack-lg">${form}</div>
   <div class="stack-lg">
    <div class="card-flat stack" style="gap:10px"><h2 class="h-card" style="margin:0">Vous n’avez pas encore d’accès ?</h2><p class="small">Les accès aux programmes sont créés par l’équipe LE SEUIL, après votre demande et sa validation. Il n’y a pas d’inscription directe.</p>
     <button class="btn btn-soft btn-sm" data-go="programmes" style="align-self:flex-start">Découvrir les programmes</button>
     <p class="small muted">Les articles de la <a href="#bibliotheque" data-go="bibliotheque">Bibliothèque</a> sont en accès libre, sans connexion.</p></div>
    <div class="card-flat stack" style="gap:10px"><h2 class="h-card" style="margin:0">Vos données sont protégées</h2><ul class="ticks small"><li>Votre journal n’est visible que par vous.</li><li>Votre accompagnante ne voit que ce que vous choisissez de partager.</li><li>Vous pouvez demander l’effacement de vos données.</li></ul></div>
   </div>
  </div></section>`;
}
/* Premier accès (lien reçu par e-mail) ou réinitialisation : choix obligatoire du mot de passe personnel. */
export function pFirstAccess(){
  if (!S.user) return pageHead("Premier accès", "Ce lien n’est plus valide", "") + `<section class="section"><div class="wrap narrow"><div class="card stack">
    <p>Le lien utilisé a expiré ou a déjà servi. Pour des raisons de sécurité, chaque lien n’est valable qu’une fois et pour une durée limitée.</p>
    <p>Demandez un nouveau lien depuis <button class="linkbtn" data-act="goto-forgot">Mot de passe oublié</button>, ou contactez l’équipe LE SEUIL.</p></div></div></section>`;
  return pageHead("Premier accès", `Bienvenue${S.user.name ? ", " + esc(S.user.name) : ""}`, "Choisissez votre mot de passe personnel pour accéder à votre espace. Il n’est connu que de vous.") + `<section class="section"><div class="wrap narrow">
   <form class="card stack" id="newpwform" novalidate>
    <div class="field"><label class="flabel" for="n-pw">Nouveau mot de passe</label><input id="n-pw" type="password" autocomplete="new-password" minlength="10" required><span class="hint">Au moins 10 caractères. Évitez un mot de passe utilisé ailleurs.</span></div>
    <div class="field"><label class="flabel" for="n-pw2">Confirmer le mot de passe</label><input id="n-pw2" type="password" autocomplete="new-password" minlength="10" required></div>
    <button class="btn btn-primary" type="submit" style="align-self:flex-start">Enregistrer et accéder à mon espace</button><p id="n-out" class="small" role="status"></p></form></div></section>`;
}
export const pNewPassword = pFirstAccess;
actions["goto-forgot"] = () => { ui.loginMode = "forgot"; go("connexion"); };
actions["loginmode"] = (b) => { ui.loginMode = b.dataset.m; rerender(); };
actions["demo-login"] = async (b) => { await store.demoLogin(b.dataset.id); toast("Connecté·e avec un compte de test"); go(homeRoute()); };
actions["demo-reset"] = async () => { await store.resetDemo(); toast("Données de démonstration réinitialisées"); rerender(); };
function authError(e){
  const m = String(e?.message||"").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("not confirmed")) return "Confirmez d’abord votre adresse e-mail grâce au lien reçu.";
  if (m.includes("already registered")) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
  if (m.includes("same password") || m.includes("different from the old")) return "Choisissez un mot de passe différent de l’ancien.";
  if (m.includes("weak") || m.includes("password should")) return "Ce mot de passe est trop faible. Choisissez-en un plus long.";
  if (m.includes("banned")) return "Ce compte est suspendu. Contactez l’équipe LE SEUIL.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}
const busy = (f, on) => { const b = f.querySelector('button[type="submit"]'); if (b) b.disabled = on; };
forms["loginform"] = async (f) => {
  busy(f,true);
  try { await api.signIn($("#l-mail").value.trim(), $("#l-pw").value); await store.loadContent(); await store.loadUser(); toast("Bienvenue"); go(homeRoute()); }
  catch(e) { out("l-out", authError(e)); } finally { busy(f,false); }
};
forms["forgotform"] = async (f) => {
  const m=$("#f-mail").value.trim(); if(!validEmail(m)) return out("f-out","Saisissez une adresse e-mail valide.");
  busy(f,true); try { await api.resetPassword(m); out("f-out","Si un compte existe pour cette adresse, un lien vient d’être envoyé.", true); } catch(e) { out("f-out", authError(e)); } finally { busy(f,false); }
};
forms["newpwform"] = async (f) => {
  const pw=$("#n-pw").value; if(pw.length<10) return out("n-out","Au moins 10 caractères.");
  if (pw !== $("#n-pw2").value) return out("n-out","Les deux mots de passe ne correspondent pas.");
  busy(f,true); try { await api.updatePassword(pw); if (S.profile) S.profile.must_set_password = false; toast("Mot de passe enregistré"); go(homeRoute()); } catch(e) { out("n-out", authError(e)); } finally { busy(f,false); }
};
