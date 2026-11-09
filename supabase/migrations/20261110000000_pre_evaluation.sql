-- LE SEUIL — pré-évaluation détaillée jointe à la demande d'inscription.
-- Les réponses (coordonnées, difficultés, PHQ-9, GAD-7, WSAS, santé, sécurité) sont stockées en JSON,
-- lisibles uniquement par l'équipe (politique « requests admin read » existante : is_staff()).
alter table public.enrolment_requests add column if not exists evaluation jsonb;
alter table public.enrolment_requests drop constraint if exists enrolment_requests_evaluation_size;
alter table public.enrolment_requests add constraint enrolment_requests_evaluation_size
  check (evaluation is null or (jsonb_typeof(evaluation) = 'object' and pg_column_size(evaluation) < 60000));
-- Demandes à examiner en priorité (réponses de sécurité nécessitant une attention), calculé côté serveur.
alter table public.enrolment_requests add column if not exists priority_review boolean
  generated always as (coalesce((evaluation -> 'attention' ->> 'care')::boolean, false)) stored;
create index if not exists enrolment_requests_priority_idx on public.enrolment_requests (priority_review, created_at desc);

-- Désactivées par défaut : activer seulement après les validations juridiques et professionnelles.
insert into public.feature_flags (key, enabled, note) values
  ('pre_evaluation', false, 'Pré-évaluation détaillée dans la demande d’inscription. Après vérification juridique (loi n° 2013-450) et relecture professionnelle.'),
  ('pre_evaluation_scores', false, 'Module PHQ-9, GAD-7, WSAS de la pré-évaluation. Après vérification des droits, versions françaises validées et finalité.')
on conflict (key) do nothing;
