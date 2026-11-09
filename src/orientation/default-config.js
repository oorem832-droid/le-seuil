// LE SEUIL — configuration initiale du questionnaire « Trouver mon programme ».
// BROUILLON À FAIRE VALIDER : textes, questions de sécurité, règles et ressources doivent être relus
// par un professionnel de santé mentale qualifié (et le juridique) avant toute activation.
// L'administratrice modifie tout ceci depuis Administration → Questionnaire d'orientation.
import { EMERGENCY } from "../content.js";

export const DEFAULT_CONFIG = {
  intro: {
    title: "Trouver mon programme",
    text: "Quelques questions pour vous suggérer un ou deux programmes adaptés. Pas de compte, pas de nom ni d’e-mail : vos réponses ne sont pas enregistrées.",
  },

  /* Questions servant à suggérer un programme (moteur de recommandation). */
  questions: [
    { id: "q-poids", text: "Qu’est-ce qui vous pèse le plus en ce moment ?", options: [
      { id: "inquietudes", label: "Je m’inquiète beaucoup, souvent pour des choses qui pourraient arriver" },
      { id: "peurs", label: "Certaines peurs me font éviter des situations ou des activités" },
      { id: "moral", label: "Je manque d’énergie, d’envie ou de motivation" },
      { id: "stress", label: "Je me sens stressé·e ou débordé·e" },
      { id: "autre", label: "Autre chose, ou je ne sais pas" } ] },
    { id: "q-phrase", text: "Laquelle de ces phrases vous ressemble le plus ?", options: [
      { id: "pire", label: "Mon esprit imagine souvent le pire" },
      { id: "evite", label: "J’évite certaines situations parce qu’elles me font peur" },
      { id: "abandon", label: "J’ai laissé de côté des activités que j’aimais" },
      { id: "aucune", label: "Aucune de ces phrases" } ] },
    { id: "q-envie", text: "Qu’aimeriez-vous changer en priorité ?", options: [
      { id: "ruminer", label: "Passer moins de temps à ruminer ou à m’inquiéter" },
      { id: "oser", label: "Oser faire ce que j’évite, petit à petit" },
      { id: "elan", label: "Retrouver de l’énergie et des activités qui comptent" },
      { id: "comprendre", label: "D’abord mieux comprendre ce que je vis" } ] },
  ],

  /* Correspondance réponses → programmes : chaque réponse ajoute des points à un programme. */
  rules: [
    { option: "q-poids:inquietudes", programme: "inquietudes", points: 3 },
    { option: "q-poids:stress", programme: "inquietudes", points: 1 },
    { option: "q-poids:peurs", programme: "peurs", points: 3 },
    { option: "q-poids:moral", programme: "elan", points: 3 },
    { option: "q-phrase:pire", programme: "inquietudes", points: 2 },
    { option: "q-phrase:evite", programme: "peurs", points: 2 },
    { option: "q-phrase:abandon", programme: "elan", points: 2 },
    { option: "q-envie:ruminer", programme: "inquietudes", points: 2 },
    { option: "q-envie:oser", programme: "peurs", points: 2 },
    { option: "q-envie:elan", programme: "elan", points: 2 },
  ],
  maxSuggestions: 2,

  /* Questions de sécurité : moteur distinct, traité avant toute suggestion. */
  safetyQuestions: [
    { id: "s-suivi", role: "suivi", text: "Êtes-vous actuellement accompagné·e par un professionnel de santé mentale (psychologue, psychiatre, médecin) ?", options: [
      { id: "oui", label: "Oui", flag: "D" }, { id: "non", label: "Non" }, { id: "nr", label: "Je préfère ne pas répondre" } ] },
    { id: "s-quotidien", role: "quotidien", text: "En ce moment, vos difficultés vous empêchent-elles de faire face au quotidien (travail, sommeil, vous occuper de vous ou de vos proches) ?", options: [
      { id: "non", label: "Pas vraiment" }, { id: "parfois", label: "Parfois" }, { id: "souvent", label: "Oui, presque tous les jours", flag: "C" } ] },
    { id: "s-pensees", role: "pensees", text: "Ces dernières semaines, avez-vous eu des pensées de mettre fin à vos jours ou de vous faire du mal ?", options: [
      { id: "non", label: "Non" }, { id: "oui", label: "Oui", flag: "B" }, { id: "nr", label: "Je préfère ne pas répondre", flag: "B" } ] },
    { id: "s-danger", role: "danger", showIf: "s-pensees:oui|s-pensees:nr",
      text: "En ce moment, avez-vous l’intention de vous faire du mal, craignez-vous de passer à l’acte, ou vous êtes-vous fait du mal récemment au point d’avoir besoin de soins ?", options: [
      { id: "oui", label: "Oui", flag: "A" }, { id: "non", label: "Non" } ] },
  ],

  /* Messages des situations de sécurité (aucun niveau de risque n'est jamais affiché). */
  safety: {
    A: { title: "Vous méritez de l’aide tout de suite",
         text: "Ce que vous vivez est important. Dans cette situation, un programme en ligne ne suffit pas : contactez dès maintenant les services d’urgence, rendez-vous aux urgences les plus proches, et si possible demandez à une personne de confiance de rester avec vous. Un message envoyé à LE SEUIL ne déclenche pas d’intervention d’urgence." },
    B: { title: "Merci de nous l’avoir dit",
         text: "Ces pensées peuvent être très lourdes à porter, et vous n’avez pas à les porter seul·e. Nous vous encourageons à en parler rapidement à un professionnel qualifié (médecin, psychologue, psychiatre) ou à une personne de confiance. Un programme LE SEUIL ne remplace pas ce soutien.",
         offerProgramme: false,
         programmeText: "Si vous le souhaitez, un programme peut être utilisé en complément d’un soutien professionnel, jamais à sa place." },
    C: { title: "Un avis professionnel peut vous aider",
         text: "Vos difficultés semblent peser fortement sur votre quotidien. Une consultation avec un professionnel de santé peut vous aider à explorer vos besoins. Un programme de six semaines ne sera pas forcément suffisant à lui seul.",
         offerProgramme: true },
    D: { text: "LE SEUIL peut compléter, sans le remplacer, l’accompagnement que vous avez déjà. En cas de doute sur l’adéquation d’un programme, parlez-en à votre professionnel référent." },
    E: { text: "Voici les programmes qui semblent correspondre le mieux à ce que vous avez décrit. Ce n’est pas un diagnostic : vous restez libre de votre choix." },
    always: "LE SEUIL n’est pas un service d’urgence. Les questionnaires et messages ne sont pas surveillés en continu.",
  },

  /* Page « Besoin d'aide maintenant ? » */
  help: {
    title: "Besoin d’aide maintenant ?",
    text: "Si vous traversez une période particulièrement difficile, vous n’avez pas besoin d’attendre de commencer un programme pour demander de l’aide.\n\nSi vous pensez être en danger immédiat ou craignez de passer à l’acte, contactez les services d’urgence de votre pays ou rendez-vous aux urgences les plus proches. Si possible, demandez à une personne de confiance de rester avec vous.\n\nLE SEUIL n’est pas un service d’urgence et les questionnaires et messages ne sont pas surveillés en continu.",
    general: "Où que vous soyez : appelez le numéro d’urgence de votre pays, rendez-vous aux urgences de l’hôpital le plus proche, et ne restez pas seul·e si vous vous sentez en danger. Votre médecin ou un professionnel de santé mentale peut aussi vous orienter.",
  },

  /* Ressources d'aide par pays : seules les ressources marquées « vérifiée » sont publiées. Ne jamais inventer de numéro. */
  resources: [
    { country: "CI", name: "Côte d’Ivoire", verified: true, items: EMERGENCY.map(e => ({ label: e.label, value: e.num, verified: true })) },
  ],
};
