// Static content. TOPICS and EMERGENCY live here; programmes, articles, videos and plans
// are loaded from Supabase, with this file as the offline fallback and the seed source.
export const EMERGENCY = [
  {label:"SAMU (urgence médicale)", num:"185"},
  {label:"Sapeurs-pompiers", num:"180"},
  {label:"Police secours", num:"170 · 110 · 111"}
];

export const PLANS = [
 {id:"autonome", n:1, name:"Forfait 1 — Autonome", short:"Autonome", price:"12 000",
  lines:["Accès aux six semaines","Vidéos et leçons","Exercices interactifs","Journal personnel","Objectifs","Suivi personnel non clinique","Plan final"]},
 {id:"ecrit", n:2, name:"Forfait 2 — Accompagnement écrit", short:"Accompagnement écrit", price:"30 000", featured:true,
  lines:["Tout le forfait Autonome","Un accompagnement écrit chaque semaine*","Messagerie privée sécurisée avec votre accompagnante"]},
 {id:"appels", n:3, name:"Forfait 3 — Accompagnement par appels", short:"Accompagnement par appels", price:"48 000",
  lines:["Tout le forfait Autonome","Six échanges de 15 minutes par téléphone ou vidéo*","Planification des rendez-vous et rappels"]}
];

/* Accompagnante — présentation publique. Texte à faire vérifier avant mise en ligne. */
export const COACH = {
  id: "coach-judie", name: "Judie Ore", title: "Accompagnante en bien-être psychologique", verified: false,
  bio: "Judie Ore est accompagnante en bien-être psychologique et ancienne Psychological Wellbeing Practitioner au Royaume-Uni. Elle accompagne les participants des forfaits 2 et 3 dans le suivi de leur programme. [Présentation à faire vérifier par l’administration avant publication.]",
  hours: "Du lundi au vendredi, 8 h – 18 h · samedi, 8 h – 13 h (heure d’Abidjan)",
  delay: "Réponse aux messages sous 2 jours ouvrés [délai contractuel à confirmer]",
  limits: ["L’accompagnement vous aide à suivre le programme et à appliquer ses outils.","Ce n’est ni une psychothérapie, ni une consultation psychologique ou psychiatrique, ni un suivi clinique continu.","Aucun diagnostic n’est posé et aucun traitement n’est proposé.","Si votre situation dépasse ce cadre, votre accompagnante vous orientera vers un professionnel approprié.","Les messages ne sont pas lus en continu : ce n’est pas un service d’urgence."]
};

/* Questionnaire initial d'adéquation et de sécurité — formulation à valider par l'équipe.
   Seule la date de complétion est enregistrée ; les réponses ne sont pas conservées. */
export const SUITABILITY = [
  {id:"adulte", q:"Avez-vous 18 ans ou plus ?", stopIf:"non", stop:"Ce programme s’adresse aux adultes. Des ressources pour les plus jeunes seront proposées plus tard."},
  {id:"securite", q:"En ce moment, avez-vous des pensées de mettre fin à vos jours ou de vous faire du mal ?", stopIf:"oui", stop:"safety"},
  {id:"suivi", q:"Êtes-vous actuellement accompagné·e par un professionnel de santé mentale ?", infoIf:"oui", info:"Vous pouvez suivre ce programme en parallèle. Parlez-en avec votre professionnel·le pour qu’il ou elle puisse en tenir compte."}
];

export const FAQ = [
 {q:"LE SEUIL est-il un service de psychothérapie ?", a:"Non. LE SEUIL propose des ressources de psychoéducation et des programmes d’auto-assistance inspirés des thérapies cognitives et comportementales (TCC). Nous ne posons pas de diagnostic et ne proposons pas de traitement."},
 {q:"Comment se déroule un programme ?", a:"Chaque programme dure six semaines. Chaque semaine comprend des leçons courtes, des vidéos, des exercices et un bilan. Vous avancez à votre rythme et vous pouvez reprendre là où vous vous étiez arrêté·e."},
 {q:"Quelle est la différence entre les trois forfaits ?", a:"Les trois donnent accès au même programme complet. Le forfait 2 ajoute un accompagnement écrit chaque semaine. Le forfait 3 ajoute six échanges de 15 minutes par téléphone ou vidéo."},
 {q:"Qui lit mon journal ?", a:"Personne d’autre que vous. Votre journal est privé. Avec les forfaits 2 et 3, vous choisissez vous-même ce que vous partagez avec votre accompagnante, par exemple vos bilans de semaine."},
 {q:"Comment rejoindre un programme ?", a:"Choisissez un programme et une formule, puis envoyez une demande. Après vérification de votre demande, de l’adéquation du programme et du paiement, l’équipe LE SEUIL crée votre accès et vous envoie un e-mail pour choisir votre mot de passe."},
 {q:"Le paiement est-il un abonnement ?", a:"Non. Chaque forfait correspond à un paiement unique pour un programme complet de six semaines, sans renouvellement automatique."},
 {q:"Que faire si je me sens en danger ?", a:"LE SEUIL n’est pas un service d’urgence. Appelez le SAMU au 185, les sapeurs-pompiers au 180 ou la police au 170, ou rendez-vous aux urgences les plus proches."},
 {q:"Puis-je supprimer mes données ?", a:"Oui. Depuis Mon compte, vous pouvez effacer vos données de programme, demander une copie de vos données ou la suppression de votre compte."}
];

export const CATALOGUE_SIZE = 11;

/* Catalogue public des programmes : présentation uniquement (aucun contenu de leçon).
   Programme 01 : textes repris du document du Programme 01. Les 10 autres programmes et les
   6 catégories officielles restent à fournir par LE SEUIL. */
export const PROGRAMME_CATALOGUE = [
 {slug:"inquietudes", code:"01", order:1, status:"demo", open:true, hue:"sage",
  title:"Apprendre à gérer mes inquiétudes", category:"Anxiété et peurs",
  summary:"Comprendre comment fonctionnent les inquiétudes et expérimenter des outils pratiques inspirés des TCC.",
  intro:"« Et si je perdais mon emploi ? Et si quelque chose arrivait à un proche ? » Lorsque ces questions reviennent sans cesse, les inquiétudes peuvent prendre beaucoup de place et nous épuiser.",
  goal:"Pendant six semaines, vous allez découvrir comment fonctionnent les inquiétudes et expérimenter des outils pratiques inspirés des thérapies cognitivo-comportementales. Vous avancez à votre rythme, notez vos réflexions et revenez aux exercices qui vous aident.",
  benefits:["Mieux comprendre ce qui se passe lorsque vous vous inquiétez","Distinguer les problèmes concrets des inquiétudes hypothétiques","Aborder un problème concret étape par étape","Examiner vos pensées avec plus de nuance et faire de la place à l’incertitude"],
  library:["Anxiété et peurs","Bien-être au quotidien"]},
 {slug:"peurs", code:"02", order:2, status:"demo", open:true, hue:"forest",
  title:"Faire face à mes peurs, pas à pas", category:"Anxiété et peurs",
  summary:"Comprendre la peur, l’évitement et les réactions du corps, puis essayer de petits changements adaptés.",
  intro:"Certaines peurs finissent par décider à notre place : on se tait en réunion, on reporte une démarche, on évite des situations pourtant sûres. Sur le moment, éviter soulage ; avec le temps, la peur prend plus de place.",
  goal:"Ce programme de psychoéducation et d’auto-assistance, inspiré de la TCC de faible intensité, aide à comprendre la peur, l’évitement et les réactions corporelles, puis à essayer de petits changements adaptés dans des situations suffisamment sûres. Les exercices ne concernent jamais des situations réellement dangereuses.",
  benefits:["Comprendre la peur et les réactions d’alarme de votre corps","Repérer vos habitudes d’évitement et ce qu’elles vous coûtent","Préparer puis essayer de petits pas progressifs, à votre rythme","Reconnaître vos progrès et préparer la suite"],
  library:["Anxiété et peurs","Bien-être au quotidien"]},
 {slug:"elan", code:"03", order:3, status:"demo", open:true, hue:"gold",
  title:"Retrouver progressivement mon élan", category:"Moral et motivation",
  summary:"Comprendre les liens entre moral et activités, et retrouver progressivement des moments importants.",
  intro:"Quand le moral baisse, des choses qui semblaient simples deviennent difficiles : on voit moins ses proches, on abandonne ce qu’on aimait, on attend une motivation qui ne vient pas.",
  goal:"Six semaines pour comprendre les liens entre moral et activités, retrouver progressivement des moments importants et construire des habitudes adaptées à votre réalité. Un programme structuré de psychoéducation et d’auto-accompagnement informé par l’activation comportementale, sans promesse de guérison.",
  benefits:["Comprendre les liens entre votre moral et vos activités","Observer votre quotidien avec curiosité, sans vous juger","Retrouver pas à pas des activités qui comptent pour vous, selon vos ressources","Construire un plan personnel pour préserver votre élan"],
  library:["Dépression et humeur","Bien-être au quotidien"]}
];

/* « Mes outils pour retrouver mon calme » — textes repris du document du Programme 01. */
export const CALM_TOOLS = [
 {id:"sens", title:"5-4-3-2-1 : utiliser mes cinq sens", week:1,
  quand:"Lorsque vos inquiétudes s’enchaînent, ou s’accompagnent de tensions, d’agitation ou d’une difficulté à vous concentrer.",
  comment:["Regardez autour de vous et nommez doucement : 5 choses que vous voyez ;","4 choses que vous pouvez sentir au toucher (par exemple vos pieds sur le sol ou le tissu de votre vêtement) ;","3 sons que vous entendez ;","2 odeurs que vous remarquez ou connaissez ;","1 goût que vous percevez, ou une sensation agréable dans votre bouche."],
  sinon:"Si un sens est difficile à mobiliser, adaptez l’exercice : vous pouvez simplement décrire davantage ce que vous voyez ou entendez. Vous n’avez rien à réussir.",
  ensuite:"Le but n’est pas d’effacer vos pensées, mais de ramener doucement votre attention vers le moment présent. Ensuite, demandez-vous : quelle petite chose utile puis-je faire maintenant ?"},
 {id:"respiration", title:"Une respiration qui me convient", week:2, breath:true,
  quand:"Lorsque vous vous sentez tendu(e), une respiration lente et confortable peut parfois vous aider à faire une pause.",
  comment:["Posez les pieds au sol si cela vous convient.","Inspirez doucement, par exemple pendant 3 ou 4 secondes.","Faites une très courte pause uniquement si elle est agréable.","Expirez doucement pendant 3 ou 4 secondes.","Faites une pause facultative, puis recommencez deux ou trois fois. Vous pouvez aussi simplement inspirer et expirer lentement, sans compter."],
  sinon:"Il n’est pas nécessaire de retenir son souffle. Si vous avez des difficultés respiratoires, des vertiges, ou si l’exercice augmente votre anxiété, arrêtez et choisissez plutôt l’ancrage par les sens ou une autre approche adaptée.",
  ensuite:"Vous n’avez pas besoin d’attendre d’être parfaitement calme pour reprendre votre activité. Remarquez comment vous vous sentez, puis revenez à ce qui compte pour vous maintenant."},
 {id:"muscles", title:"Détendre progressivement mes muscles", week:5,
  quand:"Les inquiétudes peuvent s’accompagner de tensions dans les épaules, la mâchoire, les mains ou les jambes.",
  comment:["Asseyez-vous dans une position confortable.","Si cela ne provoque aucune douleur, serrez très légèrement les poings pendant environ trois secondes, puis relâchez et remarquez la différence.","Haussez doucement les épaules, puis relâchez.","Contractez très légèrement les jambes si cela vous convient, puis relâchez.","Entre chaque étape, respirez naturellement."],
  sinon:"Ne forcez jamais et évitez toute zone douloureuse, blessée ou sensible. Vous pouvez simplement observer et relâcher vos muscles sans les contracter.",
  ensuite:"La relaxation ne doit pas devenir une condition obligatoire pour affronter une incertitude. Vous pouvez aussi choisir de laisser l’inconfort présent tout en continuant une action raisonnable."}
];
export const CALM_NOTE = "Ces outils ne remplacent ni la résolution de problème ni une aide professionnelle si nécessaire.";

/* « Mon évaluation initiale » : évaluation des besoins et de l'adéquation, jamais un diagnostic.
   Aucune question sur le risque suicidaire : sans capacité de réponse en temps réel, ces informations ne doivent pas être collectées ici.
   Formulations à faire valider par LE SEUIL avant la mise en ligne. */
export const EVALUATION_QUESTIONS = [
 {k:"motif", label:"Qu’est-ce qui vous amène à LE SEUIL aujourd’hui ?", type:"textarea", required:true, hint:"Quelques phrases suffisent. Inutile de donner des détails médicaux."},
 {k:"duree", label:"Depuis combien de temps cette difficulté est-elle présente ?", type:"choice", options:["Moins d’un mois","1 à 6 mois","Plus de 6 mois","Je ne sais pas"]},
 {k:"attentes", label:"Qu’aimeriez-vous que ce programme vous apporte ?", type:"textarea"},
 {k:"suivi", label:"Êtes-vous actuellement accompagné(e) par un professionnel de santé pour cette difficulté ?", type:"choice", options:["Oui","Non","Je préfère en parler plus tard"],
  hint:"Cette information sert uniquement à vérifier que le programme vous convient. Elle ne remplace pas un suivi."},
 {k:"adaptation", label:"Y a-t-il quelque chose à prendre en compte pour adapter votre parcours ?", type:"text", hint:"Par exemple : accessibilité, lecture, horaires, langue."},
 {k:"disponibilites", label:"Formule 3 : quels moments vous conviennent pour les appels ?", type:"text", plan:"appels"},
];
export const EVALUATION_NOTICE = "Ce formulaire n’est pas lu en temps réel. Si vous êtes en danger ou pensez à vous faire du mal, n’attendez pas de réponse : appelez le SAMU (185) ou rendez-vous aux urgences de l’hôpital le plus proche.";
