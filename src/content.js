// Static content. TOPICS and EMERGENCY live here; programmes, articles, videos and plans
// are loaded from Supabase, with this file as the offline fallback and the seed source.
export const EMERGENCY = [
  {label:"SAMU (urgence médicale)", num:"185"},
  {label:"Sapeurs-pompiers", num:"180"},
  {label:"Police secours", num:"170 · 110 · 111"}
];

export const TOPICS = [
 {slug:"stress-anxiete", title:"Stress et anxiété", hue:"sage",
  intro:"Le stress est une réaction normale face à une exigence ou une menace. Il devient pesant lorsqu’il dure, s’accumule ou semble ne plus jamais redescendre. L’anxiété, elle, se tourne souvent vers l’avenir, avec des inquiétudes difficiles à mettre de côté.",
  vecu:["Tension dans la nuque, les épaules ou la mâchoire, maux de ventre","Pensées qui tournent en boucle, surtout le soir","Irritabilité, difficulté à se concentrer, envie d’éviter certaines situations"],
  pistes:["Repérer ses propres signaux d’alerte, avant qu’ils ne débordent","Ralentir la respiration quelques minutes par jour","Découper les problèmes en petites étapes concrètes"],
  consulter:"Si l’anxiété vous empêche de dormir, de travailler ou de sortir depuis plusieurs semaines, ou si vous vivez des crises de panique, parlez-en à un médecin ou à un psychologue."},
 {slug:"humeur-depression", title:"Humeur et dépression", hue:"forest",
  intro:"Tout le monde traverse des jours sans énergie. La dépression est différente : une tristesse ou une perte d’intérêt qui s’installe pendant au moins deux semaines et qui touche le sommeil, l’appétit, la concentration et l’estime de soi.",
  vecu:["Perte de plaisir pour des activités autrefois appréciées","Fatigue persistante, même après le repos","Sentiment d’inutilité ou de culpabilité excessive"],
  pistes:["Planifier de petites activités agréables ou utiles, même sans envie","Garder un rythme de lever et de coucher régulier","Rester en lien avec au moins une personne de confiance"],
  consulter:"Une dépression se soigne. Consultez un médecin ou un professionnel de santé mentale si ces signes durent plus de deux semaines. Si vous avez des pensées de mort ou de vous faire du mal, demandez de l’aide immédiatement."},
 {slug:"epuisement", title:"Épuisement professionnel et parental", hue:"gold",
  intro:"L’épuisement survient quand les exigences dépassent durablement les ressources. Il peut venir du travail, du rôle de parent, ou des deux à la fois.",
  vecu:["Fatigue émotionnelle profonde, sentiment d’être « vidé »","Distance ou irritation envers son travail ou ses enfants","Impression de ne plus être efficace, malgré les efforts"],
  pistes:["Identifier ce qui peut être délégué, reporté ou allégé","Protéger des temps de récupération, même courts","Oser en parler à son entourage ou à son employeur"],
  consulter:"Si l’épuisement s’accompagne de troubles du sommeil importants, de symptômes physiques ou d’idées noires, consultez un médecin."},
 {slug:"sommeil", title:"Sommeil et bien-être", hue:"forest",
  intro:"Le sommeil et l’humeur s’influencent mutuellement. Quelques nuits difficiles sont courantes ; une insomnie qui dure mérite de l’attention.",
  vecu:["Difficulté à s’endormir à cause des pensées","Réveils nocturnes ou trop matinaux","Somnolence et irritabilité pendant la journée"],
  pistes:["Se lever à heure fixe, même après une mauvaise nuit","Réserver le lit au sommeil et limiter les écrans le soir","Noter ses soucis sur papier avant de se coucher"],
  consulter:"Parlez-en à un médecin si les difficultés durent plus d’un mois, ou si vous ronflez fortement avec des pauses respiratoires."},
 {slug:"estime-de-soi", title:"Confiance et estime de soi", hue:"gold",
  intro:"L’estime de soi désigne le regard que l’on porte sur sa propre valeur. Elle se construit au fil des expériences et peut se renforcer avec le temps.",
  vecu:["Autocritique sévère, comparaison constante aux autres","Peur de décevoir ou d’être jugé","Difficulté à accepter les compliments"],
  pistes:["Noter chaque jour une chose faite, même petite","Se parler comme on parlerait à un ami","Remarquer les règles rigides que l’on s’impose"],
  consulter:"Si une faible estime de soi s’accompagne de tristesse durable, d’isolement ou de comportements à risque, un accompagnement professionnel peut aider."},
 {slug:"pensees-emotions", title:"Pensées et émotions", hue:"sage",
  intro:"Nos pensées, nos émotions, nos sensations physiques et nos comportements forment un cycle. Comprendre ce cycle est au cœur des approches inspirées de la TCC.",
  vecu:["Une pensée négative qui entraîne une émotion forte","Des réactions physiques que l’on ne relie pas à ses pensées","Des comportements d’évitement qui soulagent à court terme"],
  pistes:["Nommer l’émotion ressentie, avec des mots précis","Distinguer les faits des interprétations","Chercher une autre manière de voir la situation"],
  consulter:"Si vos émotions deviennent difficiles à gérer au quotidien, un professionnel peut vous aider à mieux les comprendre."},
 {slug:"relations", title:"Relations et communication", hue:"forest",
  intro:"Nos relations nous soutiennent, mais elles peuvent aussi être source de tensions. Apprendre à exprimer ses besoins clairement aide à préserver le lien.",
  vecu:["Conflits répétés sur les mêmes sujets","Difficulté à dire non ou à exprimer un désaccord","Sentiment de solitude, même entouré"],
  pistes:["Parler en « je » plutôt qu’en « tu »","Choisir le bon moment pour aborder un sujet sensible","Écouter pour comprendre, avant de répondre"],
  consulter:"Si une relation vous fait peur, vous blesse ou vous contrôle, contactez un professionnel, une association d’aide ou, en danger immédiat, la police au 170."},
 {slug:"parentalite", title:"Parentalité et santé émotionnelle", hue:"gold",
  intro:"Devenir et être parent bouleverse l’équilibre émotionnel. La fatigue, les doutes et la pression sociale sont fréquents, et ils ne font pas de vous un mauvais parent.",
  vecu:["Sentiment de ne jamais en faire assez","Tristesse ou anxiété après une naissance","Difficulté à trouver du temps pour soi"],
  pistes:["Accepter l’aide proposée par l’entourage","Partager les tâches de manière explicite","S’accorder de courts moments de pause sans culpabilité"],
  consulter:"Après une naissance, une tristesse qui dure plus de deux semaines ou des pensées inquiétantes doivent être signalées sans attendre à une sage-femme ou à un médecin."},
 {slug:"tdah", title:"TDAH et neurodiversité", hue:"sage",
  intro:"Le trouble du déficit de l’attention avec ou sans hyperactivité (TDAH) concerne enfants et adultes. Il touche l’attention, l’organisation et parfois l’impulsivité.",
  vecu:["Oublis fréquents, difficulté à terminer les tâches","Agitation intérieure ou besoin de bouger","Retards, procrastination, impression d’être « dépassé »"],
  pistes:["Utiliser des aides visuelles : listes, minuteurs, rappels","Découper le travail en blocs courts","Mettre en avant ses forces : créativité, énergie"],
  consulter:"Seul un professionnel qualifié peut évaluer un TDAH. Aucun questionnaire en ligne ne permet de poser ce diagnostic."},
 {slug:"toc", title:"TOC et pensées intrusives", hue:"forest",
  intro:"Les pensées intrusives sont des pensées soudaines et dérangeantes que presque tout le monde connaît. Dans le trouble obsessionnel-compulsif (TOC), elles deviennent envahissantes et s’accompagnent de rituels pour calmer l’angoisse.",
  vecu:["Pensées non désirées qui reviennent avec insistance","Vérifications, lavages ou rituels répétés","Beaucoup de temps perdu et de détresse"],
  pistes:["Se rappeler qu’une pensée n’est pas un acte ni une intention","Éviter de chercher à tout prix à la chasser","Parler de ses rituels sans honte à un professionnel"],
  consulter:"Le TOC se traite bien avec un accompagnement spécialisé. Consultez si les rituels prennent plus d’une heure par jour ou perturbent votre vie."},
 {slug:"autisme", title:"Autisme et compréhension des différences", hue:"gold",
  intro:"L’autisme est une manière différente de percevoir le monde, de communiquer et d’interagir. Chaque personne autiste est unique.",
  vecu:["Sensibilité particulière aux bruits, lumières ou textures","Besoin de routines et de prévisibilité","Façons différentes de communiquer et de créer du lien"],
  pistes:["Adapter l’environnement plutôt que forcer l’adaptation","Valoriser les centres d’intérêt et les compétences","S’informer auprès de personnes concernées"],
  consulter:"Un diagnostic d’autisme ne peut être posé que par une équipe spécialisée. Si vous vous posez la question pour vous ou votre enfant, parlez-en à un médecin."}
];

export const ARTICLES = [
 {id:"stress-pas-ennemi", title:"Pourquoi le stress n’est pas toujours l’ennemi", cat:"Comprendre ses émotions", read:5, date:"14 octobre 2026", hue:"sage", topic:"stress-anxiete",
  excerpt:"Le stress nous aide à réagir face à un danger. Le comprendre permet de mieux l’apprivoiser.",
  body:["Le stress est souvent présenté comme un problème à éliminer. Pourtant, il s’agit d’abord d’un mécanisme de protection : face à une exigence, le corps libère de l’énergie pour nous permettre d’agir.","La difficulté apparaît lorsque cette réaction reste activée trop longtemps. Le corps ne redescend plus, et la fatigue s’installe. On parle alors de stress chronique.","Une image utile est celle du seau : chaque source de stress le remplit un peu. Les activités qui nous ressourcent ouvrent un petit robinet. L’objectif n’est pas un seau vide, mais un seau qui ne déborde pas.","Repérer ce qui remplit votre seau, et ce qui l’allège, est souvent un premier pas utile."]},
 {id:"dormir-tete", title:"Dormir quand la tête ne s’arrête pas", cat:"Le quotidien et le bien-être", read:6, date:"9 octobre 2026", hue:"forest", topic:"sommeil",
  excerpt:"Quelques repères simples pour calmer les pensées du soir et retrouver un rythme.",
  body:["Le soir, quand l’agitation de la journée retombe, les pensées prennent souvent toute la place. On rejoue une conversation, on prépare le lendemain, on s’inquiète.","Une astuce consiste à prévoir un « temps des soucis » en début de soirée : dix minutes pour noter ce qui vous préoccupe et, si possible, une prochaine petite étape. Au coucher, vous pouvez vous rappeler que ces soucis sont déjà notés.","Se lever à la même heure chaque jour aide aussi le corps à retrouver son rythme, même après une mauvaise nuit.","Si les difficultés durent plus d’un mois, parlez-en à un médecin."]},
 {id:"epuisement-parental", title:"Reconnaître l’épuisement parental", cat:"Parentalité", read:7, date:"2 octobre 2026", hue:"gold", topic:"epuisement",
  excerpt:"Être parent, travailler, tenir la maison : quand la charge devient trop lourde, des signes apparaissent.",
  body:["Beaucoup de parents vivent avec une fatigue de fond qu’ils jugent normale. Mais l’épuisement parental va plus loin : on se sent vidé, distant de ses enfants, et l’on n’a plus de plaisir dans son rôle.","Ce n’est pas un échec personnel. C’est le signe d’un déséquilibre entre les exigences et les ressources disponibles.","Parler de ce que l’on vit, partager les tâches de façon explicite et accepter l’aide sont des premiers pas importants.","Si vous avez des pensées inquiétantes envers vous-même ou vos enfants, demandez de l’aide sans attendre à un professionnel de santé."]},
 {id:"dire-non-travail", title:"Dire non au travail sans culpabiliser", cat:"Vie professionnelle", read:5, date:"25 septembre 2026", hue:"sage", topic:"relations",
  excerpt:"Poser une limite n’est pas un manque d’engagement. Voici comment le faire avec clarté et respect.",
  body:["Accepter chaque demande peut sembler la meilleure façon d’être apprécié. À long terme, cela mène souvent à la surcharge.","Une limite claire peut être formulée simplement : reconnaître la demande, exprimer sa contrainte, proposer une alternative. Par exemple : « Je comprends que c’est important. Cette semaine, je ne peux pas le prendre en plus. Je peux m’en occuper lundi. »","La culpabilité ressentie au début est normale. Elle diminue avec la pratique."]},
 {id:"psy-pour-fous", title:"« Consulter, c’est pour les fous » : une idée reçue", cat:"Déconstruire les idées reçues", read:4, date:"18 septembre 2026", hue:"forest", topic:"humeur-depression",
  excerpt:"Demander de l’aide pour sa santé mentale est un acte de soin, comme consulter pour une douleur physique.",
  body:["Dans beaucoup de familles, parler de ses difficultés psychologiques reste tabou. On craint le regard des autres, ou l’on pense devoir s’en sortir seul.","Pourtant, consulter un professionnel n’a rien à voir avec la « folie ». On consulte pour mieux comprendre ce que l’on vit, traverser une période difficile ou prévenir une aggravation.","Oser demander de l’aide est souvent le premier pas vers une vie plus sereine. C’est précisément ce passage que LE SEUIL souhaite rendre plus facile."]},
 {id:"qui-fait-quoi", title:"Psychologue, psychiatre, praticien : qui fait quoi ?", cat:"Paroles de professionnels", read:6, date:"11 septembre 2026", hue:"gold", topic:"pensees-emotions",
  excerpt:"Un repère simple pour savoir vers qui se tourner selon sa situation.",
  body:["Le psychiatre est un médecin : il peut poser un diagnostic, prescrire des médicaments et suivre les troubles plus sévères.","Le psychologue est formé à l’évaluation et à l’accompagnement psychologique, notamment par la psychothérapie. Il ne prescrit pas de médicaments.","D’autres praticiens, comme les Psychological Wellbeing Practitioners au Royaume-Uni, proposent des interventions de faible intensité, structurées et inspirées de la TCC, pour des difficultés légères à modérées.","Votre médecin généraliste reste un bon premier interlocuteur pour être orienté. Des entretiens avec des professionnels ivoiriens viendront compléter cette rubrique."]}
];

export const VIDEOS = [
 {title:"Bienvenue dans le programme", who:"Judie Ore · Programme 01", len:"1 min", desc:"Vidéo d’accueil du programme « Apprendre à gérer mes inquiétudes ». En cours de production."},
 {title:"Quand consulter un professionnel ?", who:"Entretien avec un·e psychologue clinicien·ne (intervenant·e à confirmer)", len:"12 min", desc:"Les signes qui indiquent qu’un accompagnement spécialisé peut être utile."},
 {title:"Idées reçues sur la santé mentale", who:"Conversation avec un·e psychiatre (intervenant·e à confirmer)", len:"15 min", desc:"Médicaments, hospitalisation, « folie » : démêler le vrai du faux."},
 {title:"Parentalité et émotions", who:"LE SEUIL · psychoéducation", len:"8 min", desc:"Reconnaître sa fatigue de parent et prendre soin de son équilibre."}
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
  bio: "Judie Ore accompagne les participants des forfaits 2 et 3 tout au long de leur programme. [Présentation professionnelle à compléter et à faire vérifier par l’administration avant publication.]",
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
 {q:"Le paiement est-il un abonnement ?", a:"Non. Chaque forfait correspond à un paiement unique pour un programme complet de six semaines, sans renouvellement automatique."},
 {q:"Que faire si je me sens en danger ?", a:"LE SEUIL n’est pas un service d’urgence. Appelez le SAMU au 185, les sapeurs-pompiers au 180 ou la police au 170, ou rendez-vous aux urgences les plus proches."},
 {q:"Puis-je supprimer mes données ?", a:"Oui. Depuis Mon compte, vous pouvez effacer vos données de programme, demander une copie de vos données ou la suppression de votre compte."}
];

export const CATALOGUE_SIZE = 11;

export { PROGRAMME_01 } from './programme01.js';
import { PROGRAMME_01 as P01 } from './programme01.js';
export const MEASURES = P01.measures;

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
