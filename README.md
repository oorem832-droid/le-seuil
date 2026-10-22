# LE SEUIL

*S’ouvrir pour mieux vivre.*

LE SEUIL est une plateforme web responsive de bien-être psychologique, pensée d’abord pour le téléphone. Elle s’adresse au public francophone de Côte d’Ivoire et réunit :

- un site public : accueil, Découvrir LE SEUIL, programmes, bibliothèque gratuite, FAQ, contact, aide, pages légales ;
- des programmes interactifs de six semaines inspirés des TCC, à commencer par le Programme 01 « Apprendre à gérer mes inquiétudes » ;
- un espace participant ;
- l’Espace accompagnante de Judie Ore pour les forfaits 2 et 3 ;
- une administration avec éditeur de programmes.

Technique : **Vite** (JavaScript sans framework) · **Supabase** (Postgres, Auth, Storage, sécurité par lignes RLS) · **GitHub Pages** via GitHub Actions.

> ⚠️ **Ceci est une maquette fonctionnelle, pas un service prêt à accueillir de vrais participants.**
> Le contenu du Programme 01 vient du document Word fourni, une rédaction de travail. Il doit être relu sur le plan clinique et pédagogique avant toute mise en ligne.
> Le paiement, l’accompagnement écrit, les appels et les questionnaires PHQ-9 / GAD-7 sont **désactivés** (table `feature_flags`). Ils le resteront tant que le cadre ivoirien, les procédures de confidentialité, d’orientation et de sécurité n’auront pas été validés.

---

## Terminologie

| Interface | Usage |
|---|---|
| **Programme** | le parcours complet de six semaines |
| **Semaine** | chaque étape hebdomadaire |
| **Leçon** | les contenus pédagogiques |
| **Exercice** | les activités interactives |
| **Mon coach** | l’espace d’accompagnement des forfaits 2 et 3 |
| **Espace accompagnante** | l’interface de Judie Ore |

Dans le code et la base, une semaine s’appelle `programme_weeks` (le « module »). Une leçon, une vidéo, un exercice ou un bilan est une `programme_steps`.

## Structure

```
index.html
src/main.js                 Routeur, délégation d’événements, démarrage
src/store.js                État + passerelle données
src/data/supabase.js        Accès Supabase (sécurité appliquée côté base)
src/data/local.js           Mode démonstration (données fictives dans le navigateur)
src/content.js              Sujets, articles, forfaits, FAQ, présentation de l’accompagnante, outils de calme
src/programme01.js          Programme 01, généré depuis le document Word
src/ui/public.js            Pages publiques, connexion
src/ui/member.js            Espace participant
src/ui/exercises.js         Composants d’exercices réutilisables
src/ui/coach.js             Espace accompagnante
src/ui/admin.js             Administration et éditeur de programmes
src/styles.css              Identité visuelle (clair et sombre)
supabase/migrations/        Schéma, règles d’accès, stockage des médias
supabase/seed.sql           Contenus de départ (généré)
supabase/tests/rls_test.sql Tests des règles d’accès
scripts/generate-seed.mjs   Génère seed.sql depuis src/
scripts/source/             Document Word du Programme 01 + script d’import
```

## Lancer en local

```bash
npm install
npm run dev
```

Sans fichier `.env.local`, le site tourne en **mode démonstration**. Cinq comptes de test sont proposés :
- Awa (forfait 2) ;
- Koffi (forfait 3) ;
- Mariam (forfait 1) ;
- Judie Ore (accompagnante) ;
- Administration.

Les données restent dans le navigateur.

Avec Supabase : copier `.env.example` en `.env.local` et renseigner l’URL et la clé `anon` du projet.

## Mettre en place Supabase

### Nouveau projet
1. Créer un projet sur supabase.com.
2. Dans le **SQL Editor**, exécuter dans l’ordre :
   - `supabase/migrations/20261019000000_init.sql`
   - `supabase/migrations/20261019000100_storage.sql`
   - `supabase/migrations/20261021000000_bibliotheque_comptes_admin.sql`
   - `supabase/migrations/20261022000000_acces_paiement_confirme.sql`
   - `supabase/seed.sql` (formules, présentation publique des programmes, 62 articles en « à relire »)
   - le contenu privé des programmes, qui **n’est pas dans ce dépôt** (voir « Contenus privés »).
3. Ne **jamais** exécuter les fichiers de `supabase/tests/` dans Supabase.

### Projet déjà en ligne (mise à jour v3 + Programmes 02 et 03)
1. Exécuter `supabase/migrations/20261021000000_bibliotheque_comptes_admin.sql`, puis `supabase/migrations/20261022000000_acces_paiement_confirme.sql`. Les deux fichiers peuvent être relancés sans risque.
2. Exécuter `supabase/seed.sql`. Il crée les présentations publiques des Programmes 02 et 03, et les articles déjà présents ne sont pas écrasés.
3. Exécuter les fichiers privés, transmis à part et absents du dépôt :
   - `programme-01-mise-a-jour.sql` : ajoute « Mon point de départ » au Programme 01 et le relie aux bilans des semaines 3 et 6 ;
   - `programme-02.sql` ;
   - `programme-03.sql`.
4. Les leçons ne s'ouvrent que si l'inscription est à la fois « Admis » et « Payé » ou « Offert ». Vérifiez ces deux statuts pour les inscriptions existantes dans Administration → Participants.

### Comptes : aucune inscription publique
1. **Authentication → Sign In / Providers** : désactiver **Allow new users to sign up**. Seule l’administration crée les comptes.
2. **Authentication → URL Configuration** : *Site URL* = `https://oorem832-droid.github.io/le-seuil/`. Ajouter la même adresse dans *Redirect URLs*.
3. **Edge Functions → Deploy a new function** : nom `admin-participants`, coller le contenu de `supabase/functions/admin-participants/index.ts`, puis déployer.
4. **Edge Functions → Secrets** : ajouter `SITE_URL` = `https://oorem832-droid.github.io/le-seuil/`. `ALLOWED_ORIGIN` = `https://oorem832-droid.github.io` est conseillé. Les autres variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) sont fournies automatiquement. La clé de service reste côté serveur et n’apparaît jamais dans le site.
5. **Authentication → Emails** : traduire les modèles en français.
   - *Invite user* :
     > Objet : Votre accès à LE SEUIL
     > Bonjour {{ .Data.first_name }}, votre accès au programme « {{ .Data.programme }} » est prêt. Choisissez votre mot de passe en suivant ce lien : {{ .ConfirmationURL }}. Ce lien est personnel et expire rapidement. LE SEUIL n’est pas un service d’urgence.
   - *Reset password* : même ton, avec le lien {{ .ConfirmationURL }}.
6. **Authentication → Providers → Email** : durée de validité courte du lien (par exemple 1 h). Un SMTP personnalisé (domaine LE SEUIL) est recommandé : l’expéditeur par défaut de Supabase est très limité en volume.

### Premier administrateur
Comme les inscriptions sont fermées, il faut créer le compte dans **Authentication → Users → Add user → Create new user**, avec l’e-mail et un mot de passe, en cochant *Auto Confirm User*. Ensuite, exécuter :
```sql
insert into public.profiles (id, first_name, role)
select id, 'Prénom', 'admin' from auth.users where email = 'vous@exemple.com'
on conflict (id) do update set role = 'admin';
```

### Créer un participant
1. **Administration → Demandes** : ouvrir la demande, puis cliquer sur « Créer le participant » (le formulaire est prérempli).
2. Ou bien **Administration → Participants → Nouveau participant** : choisir le programme, la formule, l’accompagnante, les statuts de paiement et d’admission, la date d’accès, et confirmer le consentement.
3. Le compte peut être créé sans être activé. « Envoyer l’accès » envoie l’e-mail d’invitation. Au premier accès, le participant choisit son mot de passe (10 caractères minimum). Aucun mot de passe n’est envoyé par e-mail ni stocké en clair.
4. Depuis la fiche, vous pouvez :
   - renvoyer l’accès ;
   - suspendre ou réactiver ;
   - prolonger l’accès ;
   - ajouter un deuxième programme ;
   - changer de formule ;
   - ajouter des notes internes (administration uniquement).

   Chaque action est inscrite dans le journal de traçabilité.

### Contenus privés
Les leçons ne sont lisibles qu’avec une inscription valide : programme attribué, paiement confirmé, admission acceptée, compte actif et période d’accès en cours. Cette vérification est faite **par la base de données**. Un visiteur non connecté, ou un participant d’un autre programme, ne reçoit rien.

Le texte des leçons ne doit pas être placé dans ce dépôt. Les dossiers `private/` et `supabase/private/` sont exclus de Git. Le site publié ne contient aucun contenu de démonstration.

## Déployer sur GitHub Pages

1. Dans **Settings → Pages**, choisir *Source : GitHub Actions*.
2. Dans **Settings → Secrets and variables → Actions**, ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Pousser sur `main` : le site se construit et se publie.

La clé `anon` peut être publique : la protection repose sur les règles RLS. **Ne jamais** placer la clé `service_role` dans le site.

## Qui voit quoi

| Donnée | Participant | Accompagnante attribuée | Administration |
|---|---|---|---|
| Leçons, vidéos, exercices (contenus) | ✔ (connecté) | ✔ | ✔ |
| Journal personnel, réponses aux exercices, autoévaluations | ✔ | ✘ jamais | ✘ jamais |
| Bilans de semaine | ✔ | seulement ceux que le participant partage | ✘ |
| Objectifs | ✔ | seulement si le participant les partage | ✘ |
| Messages, rendez-vous | ✔ | ✔ (via fonctions tracées) | ✘ |
| Notes professionnelles | ✘ | ses propres notes uniquement | ✘ |
| Orientations | ✘ | ✔ | ✔ (nombre et statut) |
| Questionnaires PHQ-9 / GAD-7 | ✔ si activés | ✔ si activés | ✘ |
| Liste des inscriptions | — | ses participants | prénom, forfait, semaines terminées |
| Journal de traçabilité | — | son propre historique par dossier | ✔ |

Autres règles :
- **Forfait 2** : accompagnement écrit hebdomadaire, questions sur le programme et informations pratiques.
- **Forfait 3** : six échanges de 15 minutes. La messagerie y est uniquement pratique et administrative, imposé par la base (`message_kind_allowed`).
- **Questionnaires** : ils exigent quatre activations, à savoir la fonctionnalité générale, le programme, le participant et un forfait 2 ou 3. Ils ne sont jamais proposés au forfait Autonome. Une réponse > 0 à l’item 9 du PHQ-9 est marquée « revue prioritaire » pour une revue humaine, sans aucune décision automatique. Le texte validé des questionnaires n’est pas inclus et doit être ajouté après validation.
- **Questionnaire initial d’adéquation et de sécurité** : seule la date est conservée, jamais les réponses. Une réponse indiquant un danger affiche immédiatement l’orientation vers les urgences.
- **Progression réelle** : ouvrir une page ne termine rien. Une leçon se termine par « J’ai terminé cette leçon ». Un exercice se termine seulement quand ses champs obligatoires sont remplis.
- Le participant peut exporter ses données, effacer ses données de programme ou demander la suppression de son compte.

Tests : `supabase/tests/rls_test.sql` (55), `rls_test_v3.sql` (27) et `rls_test_programmes.sql` (13, isolement entre programmes) passent tous sur une base Postgres locale. Ne pas les exécuter dans Supabase.

## Ajouter ou modifier un programme

- **Sans code** : dans **Administration → Programmes**, vous pouvez :
  - créer un programme ;
  - modifier ses semaines ;
  - ajouter des leçons, vidéos (téléversement, sous-titres .vtt, transcription), exercices et bilans ;
  - réordonner les étapes ;
  - prévisualiser, puis publier ou dépublier.
- **Composants d’exercices disponibles** :
  - formulaire, avec texte, échelle 0–10, choix, cases, liste répétable, objectif et partage ;
  - fiche répétable ;
  - quiz ;
  - question de réflexion (enregistrée dans Mon journal) ;
  - respiration guidée.
- **Présentation publique** : la page « Nos programmes » ne montre que les éléments suivants : titre, catégorie, introduction, objectif, bénéfices, durée, format et les trois formules. Ces champs se modifient dans Administration → Programmes, ou dans `PROGRAMME_CATALOGUE` (`src/content.js`) avant d’exécuter `node scripts/generate-seed.mjs`.
- **Depuis un document Word** : les scripts d’import se trouvent dans `private/source/`, hors dépôt.
  - `import-programme-01.sh` traite le format du Programme 01.
  - `parse_manuscrit.py` traite le format des Programmes 02 et 03 (« SEMAINE n », « Leçon », « VIDÉO », « EXERCICE », questions en □ ou •). Exemple : `python3 private/source/parse_manuscrit.py manuscrit.docx 04 slug "Titre"`, puis `node scripts/generate-seed.mjs`.
  - Le SQL généré, `supabase/private/programme-XX.sql`, s’exécute directement dans Supabase.
- **Mon point de départ** : au début de la semaine 1, avec une note personnelle 0–10 non diagnostique. La première version complète est conservée et datée ; elle n’est jamais écrasée par les modifications. Elle est relue dans les bilans des semaines 3 et 6.

## Bibliothèque

- Les 62 articles proviennent de `scripts/library/LE_SEUIL_Bibliotheque_Articles_FR.docx`. Pour les régénérer : `python3 scripts/library/import_library.py`, puis `node scripts/generate-seed.mjs`.
- Les articles sont importés au statut **« à relire »** et restent invisibles jusqu’à leur publication dans Administration → Bibliothèque. On y trouve :
  - un aperçu ;
  - publier ou dépublier ;
  - l’historique des versions, avec restauration.
- Les sujets post-partum, idées suicidaires, trauma et mineurs exigent la case « Relu par un professionnel qualifié ». La base de données refuse la publication sans elle.
- Aucune date n’est affichée.

## Avant la mise en ligne

- [ ] Relecture clinique et pédagogique indépendante du Programme 01 (indications, contre-indications, sécurité, orientations)
- [ ] Validation du questionnaire d’adéquation et de sécurité
- [ ] Vérification juridique ivoirienne : protection des données, déclaration à l’ARTCI, conditions, confidentialité
- [ ] Procédure d’orientation et protocole de sécurité avant d’activer l’accompagnement
- [ ] Délais de réponse contractuels et présentation vérifiée de Judie Ore
- [ ] Liste vérifiée des lignes d’écoute et services de santé mentale ivoiriens
- [ ] Paiement mobile money via une Edge Function côté serveur, jamais depuis le navigateur
- [ ] Rappels de rendez-vous (e-mail ou SMS) via une tâche planifiée côté serveur
- [ ] Politique de conservation : tâche de suppression automatique, sauvegardes, procédure d’incident
- [ ] Tournage des vidéos, sous-titres et transcriptions
- [ ] Tests utilisateurs, accessibilité, nom de domaine et expéditeur d’e-mails
