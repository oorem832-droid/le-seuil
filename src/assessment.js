// LE SEUIL — pré-évaluation jointe à la demande d'inscription, conçue pour LE SEUIL (questions et textes propres).
// Ce n'est ni un diagnostic, ni une évaluation psychiatrique, ni une psychothérapie, ni un dispositif de surveillance.
// Désactivée par défaut (feature flag « pre_evaluation ») : collecte de données de santé soumise à validation
// juridique (loi ivoirienne n° 2013-450) et professionnelle avant toute mise en service.
// Les sections « Impact » (WSAS) et « Ces deux dernières semaines » (PHQ-9, GAD-7) sont un module distinct,
// désactivé par défaut (feature flag « pre_evaluation_scores ») : vérifier source officielle, version française
// validée et conditions d'utilisation de chaque instrument avant activation. Scores jamais montrés au participant.
import { esc } from "./ui/util.js";

const FREQ = ["Jamais", "Plusieurs jours", "Plus de la moitié du temps", "Presque tous les jours"];
const WSAS_SCALE = ["0","1","2","3","4","5","6","7","8"].map(x => [x, x]);
export const WSAS_LEGEND = ["0 · pas du tout", "2 · légèrement", "4 · nettement", "6 · gravement", "8 · très gravement"];

export const PHQ9 = [
  "Peu d’intérêt ou de plaisir à faire les choses",
  "Être triste, déprimé·e ou désespéré·e",
  "Difficultés à s’endormir ou à rester endormi·e, ou dormir trop",
  "Se sentir fatigué·e ou manquer d’énergie",
  "Avoir peu d’appétit ou manger trop",
  "Avoir une mauvaise opinion de soi-même, ou avoir le sentiment d’être nul·le, ou d’avoir déçu sa famille ou s’être déçu·e soi-même",
  "Avoir du mal à se concentrer, par exemple pour lire ou regarder la télévision",
  "Bouger ou parler si lentement que les autres auraient pu le remarquer, ou au contraire être si agité·e que vous avez eu du mal à tenir en place",
  "Penser qu’il vaudrait mieux mourir ou envisager de vous faire du mal d’une manière ou d’une autre",
];
export const GAD7 = [
  "Un sentiment de nervosité, d’anxiété ou de tension",
  "Être incapable d’arrêter de s’inquiéter ou de contrôler ses inquiétudes",
  "Se faire trop de souci à propos de différentes choses",
  "Avoir du mal à se détendre",
  "Être si agité·e qu’il est difficile de tenir en place",
  "Devenir facilement contrarié·e ou irritable",
  "Avoir peur que quelque chose d’épouvantable puisse arriver",
];
export const WSAS = [
  "En raison de mes difficultés, ma capacité à travailler (ou à étudier) est altérée",
  "En raison de mes difficultés, ma gestion du foyer (ménage, courses, repas, enfants, factures) est altérée",
  "En raison de mes difficultés, mes loisirs avec les autres (sorties, visites, fêtes, activités religieuses ou associatives) sont altérés",
  "En raison de mes difficultés, mes loisirs personnels (lecture, musique, sport, activités seul·e) sont altérés",
  "En raison de mes difficultés, ma capacité à entretenir des relations proches avec les personnes de mon entourage est altérée",
];

/* Sections du formulaire. type : text, email, tel, date, textarea, radio, checks, select, scale.
   showIf : { key, in:[valeurs] } ou { key, notIn:[valeurs] }. */
export const SECTIONS = [
  { id: "coord", title: "Vos coordonnées", intro: "Ces informations nous permettent de vous recontacter et de vérifier que le programme vous convient.", fields: [
    { k: "first_name", label: "Prénom", type: "text", req: 1, ac: "given-name", half: 1 },
    { k: "last_name", label: "Nom", type: "text", req: 1, ac: "family-name", half: 1 },
    { k: "date_naissance", label: "Date de naissance", type: "date", req: 1, half: 1 },
    { k: "genre", label: "Genre", type: "select", half: 1, options: ["Femme", "Homme", "Je préfère me décrire autrement", "Je préfère ne pas répondre"] },
    { k: "pays", label: "Pays de résidence", type: "select", req: 1, half: 1, options: ["Côte d’Ivoire", "Autre pays"] },
    { k: "ville", label: "Ville", type: "text", req: 1, half: 1, ac: "address-level2", ph: "Ex. Abidjan, Bouaké, Yamoussoukro" },
    { k: "commune", label: "Commune / quartier", type: "text", req: 1, ph: "Ex. Cocody Angré, Yopougon Niangon, Marcory" },
    { k: "email", label: "E-mail", type: "email", req: 1, ac: "email", half: 1 },
    { k: "phone", label: "Téléphone", type: "tel", req: 1, ac: "tel", half: 1, ph: "+225 …" },
    { k: "whatsapp", label: "Pouvons-nous vous contacter sur WhatsApp à ce numéro ?", type: "radio", options: ["Oui", "Non"] },
    { k: "contact_pref", label: "Comment préférez-vous être contacté·e ?", type: "radio", options: ["Appel", "WhatsApp", "E-mail"] },
    { k: "contact_moments", label: "À quels moments êtes-vous joignable ?", type: "text", ph: "Ex. en semaine après 17 h" },
    { k: "langue", label: "Langue préférée", type: "radio", options: ["Français", "English", "Autre"] },
    { k: "situation_pro", label: "Situation actuelle", type: "select", options: ["En emploi", "Indépendant·e / entrepreneur·e", "Étudiant·e", "En recherche d’emploi", "Au foyer", "Retraité·e", "Autre"] },
    { k: "situation_fam", label: "Situation familiale", type: "select", options: ["Célibataire", "En couple / marié·e", "Séparé·e / divorcé·e", "Veuf / veuve", "Je préfère ne pas répondre"] },
    { k: "urgence_nom", label: "Personne à contacter en cas d’urgence (nom et lien)", type: "text", half: 1, ph: "Ex. Aya, ma sœur" },
    { k: "urgence_tel", label: "Son téléphone", type: "tel", half: 1 },
    { k: "medecin", label: "Avez-vous un médecin traitant ou un centre de santé habituel ? Si oui, lequel ?", type: "text" },
  ]},
  { id: "difficulte", title: "Ce qui vous amène", intro: "Décrivez avec vos mots ce que vous vivez. Il n’y a pas de bonne ou de mauvaise réponse.", fields: [
    { k: "motif", label: "Qu’est-ce qui vous amène à LE SEUIL aujourd’hui ?", type: "textarea", req: 1 },
    { k: "manifestations", label: "Qu’est-ce qui vous concerne en ce moment ? (plusieurs choix possibles)", type: "checks", options: ["Inquiétudes difficiles à contrôler", "Peurs ou évitement de certaines situations", "Crises d’angoisse ou de panique", "Moral bas, tristesse", "Perte d’intérêt ou de plaisir", "Fatigue, manque d’énergie", "Troubles du sommeil", "Irritabilité", "Difficultés de concentration", "Stress lié au travail ou aux études", "Deuil ou perte", "Difficultés relationnelles ou familiales", "Autre"] },
    { k: "debut", label: "Depuis quand ces difficultés sont-elles présentes ?", type: "radio", req: 1, options: ["Moins d’un mois", "1 à 6 mois", "6 à 12 mois", "1 à 2 ans", "Plus de 2 ans", "Je ne sais pas"] },
    { k: "declencheur", label: "Un événement a-t-il déclenché ou aggravé ces difficultés ?", type: "textarea" },
    { k: "pensees", label: "Dans ces moments-là, quelles pensées vous viennent ?", type: "textarea", ph: "Ex. « Je n’y arriverai pas », « Il va se passer quelque chose de grave »" },
    { k: "sensations", label: "Que ressentez-vous dans votre corps ?", type: "textarea", ph: "Ex. cœur qui bat vite, tensions, boule au ventre, fatigue" },
    { k: "comportements", label: "Que faites-vous, ou qu’évitez-vous, à cause de ces difficultés ?", type: "textarea", ph: "Ex. je reste à la maison, je reporte, je demande à être rassuré·e" },
    { k: "objectifs", label: "Qu’aimeriez-vous être capable de faire à la fin des six semaines ?", type: "textarea", req: 1 },
  ]},
  { id: "impact", flag: "pre_evaluation_scores", title: "Impact sur votre quotidien", intro: "Pour chaque phrase, indiquez de 0 (pas du tout) à 8 (très gravement) à quel point vos difficultés vous gênent.", fields: [
    ...WSAS.map((t, i) => ({ k: "wsas_" + (i + 1), label: t, type: "scale", req: 1, options: WSAS_SCALE, ...(i === 0 ? { extra: ["na", "Je ne travaille pas pour une raison sans lien avec mes difficultés"] } : {}) })),
  ]},
  { id: "questionnaires", flag: "pre_evaluation_scores", title: "Ces deux dernières semaines", intro: "Au cours des deux dernières semaines, à quelle fréquence avez-vous été gêné·e par les problèmes suivants ?", fields: [
    { k: "_h_phq", type: "heading", label: "Humeur" },
    ...PHQ9.map((t, i) => ({ k: "phq_" + (i + 1), label: t, type: "radio", req: 1, options: FREQ, scored: 1 })),
    { k: "_h_gad", type: "heading", label: "Anxiété" },
    ...GAD7.map((t, i) => ({ k: "gad_" + (i + 1), label: t, type: "radio", req: 1, options: FREQ, scored: 1 })),
  ]},
  { id: "sante", title: "Santé et accompagnement", fields: [
    { k: "suivi_actuel", label: "Êtes-vous actuellement accompagné·e pour votre santé mentale (psychologue, psychiatre, médecin, conseiller, guide spirituel…) ?", type: "radio", req: 1, options: ["Oui", "Non"] },
    { k: "suivi_actuel_detail", label: "Par qui, et depuis quand ?", type: "text", showIf: { key: "suivi_actuel", in: ["Oui"] } },
    { k: "suivi_passe", label: "Avez-vous déjà été accompagné·e par le passé ?", type: "radio", options: ["Oui", "Non"] },
    { k: "suivi_passe_detail", label: "Qu’est-ce qui vous a aidé, ou pas ?", type: "textarea", showIf: { key: "suivi_passe", in: ["Oui"] } },
    { k: "traitement", label: "Prenez-vous un traitement (médicaments) pour votre humeur, votre anxiété ou votre sommeil ?", type: "radio", options: ["Oui", "Non", "Je préfère ne pas répondre"] },
    { k: "traitement_detail", label: "Lequel, si vous le souhaitez", type: "text", showIf: { key: "traitement", in: ["Oui"] } },
    { k: "sante_physique", label: "Avez-vous des problèmes de santé physique, une grossesse ou un handicap dont nous devrions tenir compte ?", type: "textarea" },
    { k: "alcool", label: "À quelle fréquence buvez-vous de l’alcool ?", type: "radio", options: ["Jamais", "Occasionnellement", "Plusieurs fois par semaine", "Tous les jours", "Je préfère ne pas répondre"] },
    { k: "substances", label: "Consommez-vous d’autres substances (cannabis, autres drogues, médicaments non prescrits) ?", type: "radio", options: ["Non", "Oui", "Je préfère ne pas répondre"] },
    { k: "soutien", label: "Qui ou qu’est-ce qui vous soutient (famille, amis, foi, activités…) ?", type: "textarea" },
    { k: "adaptation", label: "Y a-t-il quelque chose à prendre en compte pour adapter votre parcours (lecture, accessibilité, horaires, langue) ?", type: "text" },
  ]},
  { id: "securite", title: "Votre sécurité", intro: "Nous posons ces questions à toutes les personnes qui s’inscrivent, pour vous orienter vers l’aide la plus adaptée. LE SEUIL propose des programmes de bien-être psychologique et d’aide personnelle structurée. Notre plateforme n’est pas un service d’urgence et les réponses aux questionnaires ne font pas l’objet d’une surveillance permanente.", fields: [
    { k: "r_pensees", label: "Ces dernières semaines, avez-vous eu des pensées de mettre fin à vos jours ?", type: "radio", req: 1, options: ["Non", "Parfois", "Souvent", "Je préfère ne pas répondre"] },
    { k: "r_intention", label: "En ce moment, avez-vous l’intention d’agir sur ces pensées, ou avez-vous fait des projets pour le faire ?", type: "radio", req: 1, options: ["Non", "Oui", "J’ai peur de passer à l’acte", "Je ne sais pas"], showIf: { key: "r_pensees", notIn: ["Non", ""] } },
    { k: "r_automutilation", label: "Vous est-il arrivé de vous faire du mal volontairement (par exemple vous couper, vous brûler) ?", type: "radio", req: 1, options: ["Jamais", "Dans le passé", "Ces dernières semaines", "Je préfère ne pas répondre"] },
    { k: "r_soins", label: "Vous êtes-vous fait du mal récemment au point d’avoir besoin de soins ?", type: "radio", req: 1, options: ["Non", "Oui"], showIf: { key: "r_automutilation", in: ["Ces dernières semaines"] } },
    { k: "r_tentative", label: "Avez-vous déjà fait une tentative de suicide ?", type: "radio", req: 1, options: ["Non", "Oui, il y a plus d’un an", "Oui, au cours de la dernière année", "Je préfère ne pas répondre"] },
    { k: "r_autrui", label: "Avez-vous en ce moment des pensées de faire du mal à quelqu’un d’autre ?", type: "radio", req: 1, options: ["Non", "Oui", "Je préfère ne pas répondre"] },
    { k: "r_domicile", label: "Vous sentez-vous en sécurité là où vous vivez ?", type: "radio", req: 1, options: ["Oui", "Non", "Je préfère ne pas répondre"] },
    { k: "r_protection", label: "Qu’est-ce qui vous aide à tenir dans les moments difficiles ?", type: "textarea" },
  ]},
  { id: "envoi", title: "Formule et envoi", fields: [] },
];

export const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);
export const fieldVisible = (f, d) => !f.showIf || (f.showIf.in ? f.showIf.in.includes(d[f.showIf.key] || "") : !f.showIf.notIn.includes(d[f.showIf.key] || ""));

const score = (d, pre, n) => { let s = 0; for (let i = 1; i <= n; i++) { const v = FREQ.indexOf(d[pre + i]); if (v < 0) return null; s += v; } return s; };
export function scores(d){
  const phq9 = score(d, "phq_", 9), gad7 = score(d, "gad_", 7);
  let wsas = 0, ok = true; for (let i = 1; i <= 5; i++) { const v = d["wsas_" + i]; if (v === "na") continue; if (v === undefined || v === "") { ok = false; break; } wsas += +v; }
  return { phq9, gad7, wsas: ok ? wsas : null, phq9_item9: FREQ.indexOf(d.phq_9) };
}

/** Réponses nécessitant une attention de l'équipe (jamais un « niveau de risque »). urgent = afficher l'aide urgente tout de suite. */
export function attention(d){
  const r = [];
  if (d.r_intention === "Oui") r.push("Intention ou projet d’agir sur des pensées suicidaires");
  if (d.r_intention === "J’ai peur de passer à l’acte") r.push("Crainte de passer à l’acte");
  if (d.r_soins === "Oui") r.push("Geste récent ayant pu nécessiter des soins");
  if (d.r_intention === "Je ne sais pas") r.push("Incertitude sur l’intention d’agir sur des pensées suicidaires");
  if (["Parfois", "Souvent", "Je préfère ne pas répondre"].includes(d.r_pensees)) r.push(`Pensées de mettre fin à ses jours : ${d.r_pensees}`);
  if (FREQ.indexOf(d.phq_9) > 0) r.push(`PHQ-9 question 9 : ${d.phq_9}`);
  if (d.r_automutilation === "Ces dernières semaines") r.push("Automutilation récente");
  if (d.r_tentative === "Oui, au cours de la dernière année") r.push("Tentative de suicide au cours de la dernière année");
  if (d.r_autrui === "Oui") r.push("Pensées de faire du mal à autrui");
  if (d.r_domicile === "Non") r.push("Ne se sent pas en sécurité à son domicile");
  const urgent = ["Oui", "J’ai peur de passer à l’acte"].includes(d.r_intention) || d.r_soins === "Oui" || d.r_autrui === "Oui";
  const care = urgent || r.length > 0;
  return { reasons: r, urgent, care };
}

export function ageFrom(dob){
  const d = new Date(dob); if (isNaN(d)) return null;
  const n = new Date(); let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

/* ---------- Affichage pour l'équipe ---------- */
const band = (v, cuts) => cuts.find(([max]) => v <= max)?.[1] || "";
export function assessmentHTML(ev){
  if (!ev || ev._v !== 2) return "";
  const d = ev.answers || {}, sc = ev.scores || scores(d), at = ev.attention || attention(d);
  const val = (f) => { const v = d[f.k]; if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return ""; if (f.type === "scale") return v === "na" ? "Non concerné·e" : v + " / 8"; return Array.isArray(v) ? v.join(", ") : v; };
  const age = ageFrom(d.date_naissance);
  return `<div class="asm-view stack">
   ${at.reasons?.length ? `<div class="notice asm-attention" role="note"><b>Réponses de sécurité à lire avant toute décision :</b><ul>${at.reasons.map(x => `<li>${esc(x)}</li>`).join("")}</ul><span class="small">Suivre la procédure interne validée. Aucun niveau ni score de risque n’est calculé.</span></div>` : ""}
   ${sc.phq9 != null || sc.gad7 != null || sc.wsas != null ? `<div class="asm-scores">
    <div><span>PHQ-9</span><b>${sc.phq9 ?? "—"}<small> / 27</small></b></div>
    <div><span>GAD-7</span><b>${sc.gad7 ?? "—"}<small> / 21</small></b></div>
    <div><span>WSAS</span><b>${sc.wsas ?? "—"}<small> / 40</small></b></div>
   </div>` : ""}
   <p class="small muted">Totaux bruts, jamais montrés au participant. Un score de questionnaire ne constitue pas un diagnostic et ne décide pas à lui seul de l’admission.</p>
   ${age != null ? `<p class="small"><b>Âge :</b> ${age} ans</p>` : ""}
   ${SECTIONS.filter(s => s.fields.length).map(s => { const rows = s.fields.filter(f => f.type !== "heading" && f.type !== "radio-hidden" && val(f));
     if (!rows.length) return "";
     const compact = s.id === "questionnaires";
     return `<details ${s.id === "securite" || s.id === "difficulte" ? "open" : ""}><summary class="flabel">${esc(s.title)}</summary>
      <dl class="facts facts-wide${compact ? " asm-compact" : ""}">${rows.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(val(f))}${f.scored ? ` <span class="muted">(${FREQ.indexOf(d[f.k])})</span>` : ""}</dd></div>`).join("")}</dl></details>`; }).join("")}
  </div>`;
}
