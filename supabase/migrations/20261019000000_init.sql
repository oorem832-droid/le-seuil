-- =============================================================================
-- LE SEUIL — schéma initial
-- =============================================================================
-- Principes :
--  * Les contenus pédagogiques sont standardisés : tous les participants d'un même
--    programme reçoivent les mêmes leçons.
--  * Les données personnelles (exercices, journal, objectifs, autoévaluations,
--    messages) sont propres à chaque participant. RLS empêche tout mélange.
--  * Le journal personnel n'est JAMAIS accessible à l'accompagnante ni à
--    l'administration. Seuls les bilans que le participant choisit de partager
--    (shared_summaries) et, avec son accord, ses objectifs, sont visibles par
--    l'accompagnante qui lui est attribuée.
--  * L'accompagnante accède aux données des participants par des fonctions
--    (coach_*) qui inscrivent chaque consultation dans access_log.
--  * Paiement, accompagnement écrit, appels et questionnaires (PHQ-9 / GAD-7)
--    sont désactivés (feature_flags) jusqu'à validation du cadre réglementaire,
--    des procédures d'orientation et du dispositif de revue.
--  * Aucun diagnostic, score de risque ou décision clinique n'est calculé.
--  * Terminologie : « module » = semaine dans la structure interne ; l'interface
--    utilise Programme / Semaine / Leçon / Exercice.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('member', 'editor', 'coach', 'admin');
create type public.content_status as enum ('draft', 'demo', 'published', 'archived');
create type public.plan_tier as enum ('autonome', 'ecrit', 'appels');
create type public.enrolment_status as enum ('demo', 'pending_payment', 'active', 'completed', 'cancelled');
create type public.step_kind as enum ('lecon', 'video', 'exercice', 'reflexion', 'bilan');
create type public.progress_status as enum ('started', 'completed');
create type public.goal_scope as enum ('principal', 'hebdomadaire');
create type public.goal_status as enum ('actif', 'atteint', 'ajuste', 'archive');
create type public.message_kind as enum ('suivi', 'question', 'pratique');
create type public.appointment_mode as enum ('telephone', 'video');
create type public.appointment_status as enum ('demande', 'confirme', 'effectue', 'annule', 'manque');
create type public.privacy_request_type as enum ('export', 'erasure', 'rectification', 'withdraw_consent');
create type public.request_status as enum ('open', 'in_progress', 'done');

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  role public.user_role not null default 'member',
  is_adult_confirmed boolean not null default false,
  newsletter_opt_in boolean not null default false,
  analytics_opt_in boolean not null default false,
  reminders_opt_in boolean not null default false,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_staff(roles public.user_role[] default array['admin']::public.user_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.my_role() = any(roles), false) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, is_adult_confirmed)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name', ''),
          coalesce((new.raw_user_meta_data->>'is_adult')::boolean, false));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Présentation publique de l'accompagnante (« Mon coach »)
create table public.coach_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  public_title text not null default 'Accompagnante en bien-être psychologique',
  bio text not null default '',
  verified boolean not null default false,       -- présentation vérifiée par l'administration
  verified_at timestamptz,
  hours text not null default '',
  response_delay text not null default '',
  limits text not null default '',
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Fonctionnalités activables
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  note text
);
insert into public.feature_flags (key, enabled, note) values
  ('payments', false, 'Paiement en ligne. Après validation juridique ivoirienne.'),
  ('written_support', false, 'Forfait 2. Après validation du cadre, des limites et de la procédure d’orientation.'),
  ('support_calls', false, 'Forfait 3. Après validation du cadre, des limites et de la procédure d’orientation.'),
  ('questionnaires', false, 'PHQ-9 / GAD-7, forfaits 2 et 3 uniquement. Après validation de la supervision, de la revue et de la réponse aux risques.'),
  ('public_signup', true, 'Création de comptes gratuits.');

-- ---------------------------------------------------------------------------
-- Contenus : programmes, semaines (modules), étapes (leçons, exercices…)
-- ---------------------------------------------------------------------------
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  code text,                                   -- '01' … '11'
  title text not null,
  summary text not null default '',
  intro text not null default '',
  objectives text[] not null default '{}',
  status public.content_status not null default 'draft',
  cover_hue text not null default 'sage',
  duration_weeks int not null default 6,
  locale text not null default 'fr',
  sort_order int not null default 0,
  questionnaires_enabled boolean not null default false,
  measures jsonb not null default '[]'::jsonb, -- autoévaluations simples 0–10 : [{key,label,min_label,max_label}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programme_weeks (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  week_number int not null check (week_number between 1 and 52),
  title text not null,
  intro text not null default '',
  unique (programme_id, week_number)
);

create table public.programme_steps (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.programme_weeks(id) on delete cascade,
  step_key text not null,
  position int not null,
  kind public.step_kind not null,
  title text not null,
  required boolean not null default true,
  content jsonb not null default '{}'::jsonb,  -- leçon: {paragraphs[]} ; vidéo: {url, captions_url, transcript, duration} ; exercice: {component, instructions, fields…}
  unique (week_id, step_key)
);

create table public.plans (
  tier public.plan_tier primary key,
  name text not null,
  short_name text not null,
  price_fcfa int not null check (price_fcfa >= 0),
  features text[] not null default '{}',
  requires_flag text references public.feature_flags(key),
  sort_order int not null default 0
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  excerpt text not null default '',
  body text[] not null default '{}',
  read_minutes int not null default 5,
  cover_hue text not null default 'sage',
  topic_slug text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker text not null default '',
  credentials text not null default '',
  description text not null default '',
  duration_label text not null default '',
  video_url text,
  captions_url text,
  transcript text,
  status public.content_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create trigger programmes_touch before update on public.programmes for each row execute function public.touch_updated_at();
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Inscriptions et données du participant
-- ---------------------------------------------------------------------------
create table public.enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  programme_id uuid not null references public.programmes(id) on delete restrict,
  plan public.plan_tier not null default 'autonome',
  status public.enrolment_status not null default 'demo',
  coach_id uuid references public.profiles(id) on delete set null,
  suitability_completed_at timestamptz,        -- questionnaire d'adéquation : seule la date est conservée
  consent_version text,
  consented_at timestamptz,
  share_summaries boolean not null default false,  -- consentement : bilans partagés avec l'accompagnante
  share_goals boolean not null default false,      -- consentement : objectifs visibles par l'accompagnante
  questionnaires_enabled boolean not null default false, -- activation par participant (admin)
  last_step_id uuid references public.programme_steps(id) on delete set null,
  unlock_all boolean not null default false,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, programme_id)
);

create table public.step_progress (
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  step_id uuid not null references public.programme_steps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.progress_status not null default 'started',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (enrolment_id, step_id)
);

create table public.week_completions (
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  week_number int not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (enrolment_id, week_number)
);

create table public.exercise_responses (
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  step_id uuid not null references public.programme_steps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (enrolment_id, step_id)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolment_id uuid references public.enrolments(id) on delete cascade,
  week_number int,
  prompt text,
  body text not null check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger journal_touch before update on public.journal_entries for each row execute function public.touch_updated_at();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  scope public.goal_scope not null,
  week_number int,
  title text not null check (char_length(title) <= 500),
  actions jsonb not null default '[]'::jsonb,   -- [{text, done}]
  obstacles text not null default '',
  reflection text not null default '',
  status public.goal_status not null default 'actif',
  previous_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger goals_touch before update on public.goals for each row execute function public.touch_updated_at();

create table public.self_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  week_number int not null,
  measure_key text not null,
  value smallint not null check (value between 0 and 10),
  created_at timestamptz not null default now(),
  unique (enrolment_id, week_number, measure_key)
);

create table public.shared_summaries (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_number int not null,
  body text not null,                           -- copie de ce que le participant a choisi de partager
  shared_at timestamptz not null default now(),
  unique (enrolment_id, week_number)
);

create table public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('article', 'worksheet', 'video')),
  ref text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

-- Questionnaires standardisés (PHQ-9, GAD-7) — désactivés par défaut.
create table public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  instrument text not null check (instrument in ('PHQ9', 'GAD7')),
  week_number int not null,
  answers smallint[] not null,
  total smallint not null,
  needs_attention boolean not null default false, -- ex. PHQ-9 item 9 > 0 : revue prioritaire, jamais de décision automatique
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Accompagnement (forfaits 2 et 3)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind public.message_kind not null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_enrolment_idx on public.messages (enrolment_id, created_at);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  session_number int not null check (session_number between 1 and 6),
  starts_at timestamptz not null,
  duration_minutes int not null default 15,
  mode public.appointment_mode not null default 'telephone',
  status public.appointment_status not null default 'demande',
  participant_note text check (char_length(participant_note) <= 500),
  confirmed_at timestamptz,
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  unique (enrolment_id, session_number)
);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger coach_notes_touch before update on public.coach_notes for each row execute function public.touch_updated_at();

-- Demandes nécessitant une orientation ou une intervention appropriée
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('hors_cadre', 'besoin_evaluation', 'securite', 'autre')),
  description text not null default '',
  action_taken text not null default '',
  status text not null default 'ouverte' check (status in ('ouverte', 'cloturee')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.resource_suggestions (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('article', 'programme', 'externe')),
  ref text not null,
  title text not null,
  note text not null default '',
  adequacy_reviewed boolean not null check (adequacy_reviewed),  -- proposée après revue de son adéquation
  created_at timestamptz not null default now()
);

-- Traçabilité des accès et des actions
create table public.access_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  action text not null,
  enrolment_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index access_log_created_idx on public.access_log (created_at desc);

create or replace function public.log_access(p_action text, p_enrolment uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.access_log (actor_id, actor_role, action, enrolment_id, details)
  values (auth.uid(), public.my_role(), p_action, p_enrolment, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Contact, confidentialité, paiements
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 200),
  email text not null check (char_length(email) <= 320),
  subject text not null check (char_length(subject) <= 200),
  message text not null check (char_length(message) <= 5000),
  consent boolean not null check (consent),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  type public.privacy_request_type not null,
  details text,
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Écrit uniquement côté serveur (Edge Function du prestataire de paiement).
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.enrolments(id) on delete restrict,
  provider text not null,
  provider_ref text,
  amount_fcfa int not null,
  status text not null default 'initiated' check (status in ('initiated', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions d'aide aux règles d'accès
-- ---------------------------------------------------------------------------
create or replace function public.owns_enrolment(eid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.enrolments where id = eid and user_id = auth.uid()) $$;

create or replace function public.is_coach_of(eid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.enrolments e where e.id = eid and e.coach_id = auth.uid())
          and public.my_role() in ('coach', 'admin') $$;

create or replace function public.flag(k text)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select enabled from public.feature_flags where key = k), false) $$;

-- L'accompagnement est-il ouvert pour cette inscription ?
create or replace function public.support_open(eid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.enrolments e where e.id = eid and e.status in ('demo', 'active')
          and ((e.plan = 'ecrit' and public.flag('written_support')) or (e.plan = 'appels' and public.flag('support_calls')))) $$;

-- Types de messages autorisés : forfait 2 → suivi, question, pratique ; forfait 3 → pratique uniquement.
create or replace function public.message_kind_allowed(eid uuid, k public.message_kind)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.enrolments e where e.id = eid
          and (k = 'pratique' or e.plan = 'ecrit')) $$;

create or replace function public.can_use_questionnaires(eid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.flag('questionnaires') and exists (
          select 1 from public.enrolments e join public.programmes p on p.id = e.programme_id
          where e.id = eid and e.plan in ('ecrit', 'appels') and e.questionnaires_enabled and p.questionnaires_enabled) $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['profiles','coach_profiles','feature_flags','programmes','programme_weeks','programme_steps','plans',
    'articles','videos','enrolments','step_progress','week_completions','exercise_responses','journal_entries','goals',
    'self_ratings','shared_summaries','saved_items','questionnaire_responses','messages','appointments','coach_notes',
    'referrals','resource_suggestions','access_log','contact_messages','privacy_requests','payments'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

-- Profils
create policy "profiles read" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (first_name, newsletter_opt_in, analytics_opt_in, reminders_opt_in, locale) on public.profiles to authenticated;

-- Présentation de l'accompagnante : lecture publique (profils actifs), écriture admin.
create policy "coach profiles read" on public.coach_profiles for select using (active or public.is_staff());
create policy "coach profiles admin" on public.coach_profiles for all using (public.is_staff()) with check (public.is_staff());

-- Fonctionnalités, forfaits
create policy "flags read" on public.feature_flags for select using (true);
create policy "flags admin" on public.feature_flags for update using (public.is_staff()) with check (public.is_staff());
create policy "plans read" on public.plans for select using (true);
create policy "plans admin" on public.plans for all using (public.is_staff()) with check (public.is_staff());

-- Contenus
create policy "programmes read" on public.programmes for select
  using (status in ('demo', 'published') or public.is_staff(array['admin','editor']::public.user_role[]));
create policy "programmes write" on public.programmes for all
  using (public.is_staff(array['admin','editor']::public.user_role[])) with check (public.is_staff(array['admin','editor']::public.user_role[]));
create policy "weeks read" on public.programme_weeks for select using (exists (select 1 from public.programmes p where p.id = programme_id
  and (p.status in ('demo','published') or public.is_staff(array['admin','editor']::public.user_role[]))));
create policy "weeks write" on public.programme_weeks for all
  using (public.is_staff(array['admin','editor']::public.user_role[])) with check (public.is_staff(array['admin','editor']::public.user_role[]));
-- Le plan des semaines est public ; le contenu des étapes est réservé aux personnes connectées.
create policy "steps read" on public.programme_steps for select using (auth.uid() is not null and exists (
  select 1 from public.programme_weeks w join public.programmes p on p.id = w.programme_id
  where w.id = week_id and (p.status in ('demo','published') or public.is_staff(array['admin','editor','coach']::public.user_role[]))));
create policy "steps write" on public.programme_steps for all
  using (public.is_staff(array['admin','editor']::public.user_role[])) with check (public.is_staff(array['admin','editor']::public.user_role[]));
create policy "articles read" on public.articles for select
  using (status = 'published' or public.is_staff(array['admin','editor']::public.user_role[]));
create policy "articles write" on public.articles for all
  using (public.is_staff(array['admin','editor']::public.user_role[])) with check (public.is_staff(array['admin','editor']::public.user_role[]));
create policy "videos read" on public.videos for select
  using (status in ('demo','published') or public.is_staff(array['admin','editor']::public.user_role[]));
create policy "videos write" on public.videos for all
  using (public.is_staff(array['admin','editor']::public.user_role[])) with check (public.is_staff(array['admin','editor']::public.user_role[]));

-- Inscriptions : le participant voit la sienne et ne peut créer qu'une inscription de démonstration autonome.
-- Forfait, accompagnante et questionnaires se règlent par admin_update_enrolment().
create policy "enrolments own read" on public.enrolments for select using (user_id = auth.uid());
create policy "enrolments own demo insert" on public.enrolments for insert
  with check (user_id = auth.uid() and status = 'demo' and plan = 'autonome' and coach_id is null and not questionnaires_enabled);
create policy "enrolments own update" on public.enrolments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.enrolments from authenticated, anon;
grant update (suitability_completed_at, consent_version, consented_at, share_summaries, share_goals, last_step_id, unlock_all)
  on public.enrolments to authenticated;

-- Données privées du participant : propriétaire uniquement. Aucune règle pour l'accompagnante ni l'administration.
create policy "progress own" on public.step_progress for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id));
create policy "completions own" on public.week_completions for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id));
create policy "responses own" on public.exercise_responses for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id));
create policy "journal own" on public.journal_entries for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and (enrolment_id is null or public.owns_enrolment(enrolment_id)));
create policy "goals own" on public.goals for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id));
create policy "ratings own" on public.self_ratings for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id));
create policy "saved own" on public.saved_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Bilans partagés : le participant les crée et peut les retirer ; l'accompagnante les lit via coach_participant().
create policy "summaries own" on public.shared_summaries for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id));

-- Questionnaires : uniquement si activés à tous les niveaux (fonctionnalité, programme, participant, forfait 2/3).
create policy "questionnaires own read" on public.questionnaire_responses for select using (user_id = auth.uid());
create policy "questionnaires own insert" on public.questionnaire_responses for insert
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id) and public.can_use_questionnaires(enrolment_id)
              and reviewed_by is null and reviewed_at is null);

-- Messagerie : participant (son inscription) et accompagnante attribuée, si le forfait le prévoit.
create policy "messages participant read" on public.messages for select using (public.owns_enrolment(enrolment_id));
create policy "messages participant send" on public.messages for insert with check (
  sender_id = auth.uid() and public.owns_enrolment(enrolment_id) and public.support_open(enrolment_id)
  and public.message_kind_allowed(enrolment_id, kind) and read_at is null);
create policy "messages coach send" on public.messages for insert with check (
  sender_id = auth.uid() and public.is_coach_of(enrolment_id) and public.support_open(enrolment_id)
  and public.message_kind_allowed(enrolment_id, kind) and read_at is null);
create policy "messages participant mark read" on public.messages for update
  using (public.owns_enrolment(enrolment_id) and sender_id <> auth.uid()) with check (public.owns_enrolment(enrolment_id));
revoke update on public.messages from authenticated, anon;
grant update (read_at) on public.messages to authenticated;

-- Rendez-vous (forfait 3) : le participant demande et peut annuler ; l'accompagnante confirme via coach_update_appointment().
create policy "appointments participant read" on public.appointments for select using (public.owns_enrolment(enrolment_id));
create policy "appointments participant request" on public.appointments for insert with check (
  public.owns_enrolment(enrolment_id) and status = 'demande' and confirmed_at is null
  and exists (select 1 from public.enrolments e where e.id = enrolment_id and e.plan = 'appels')
  and public.support_open(enrolment_id) and starts_at > now());
create policy "appointments participant cancel" on public.appointments for update
  using (public.owns_enrolment(enrolment_id) and status in ('demande', 'confirme'))
  with check (public.owns_enrolment(enrolment_id) and status = 'annule');
revoke update on public.appointments from authenticated, anon;
grant update (status) on public.appointments to authenticated;

-- Notes professionnelles : visibles uniquement par leur autrice, pour ses participants.
create policy "coach notes own" on public.coach_notes for all
  using (coach_id = auth.uid() and public.is_coach_of(enrolment_id))
  with check (coach_id = auth.uid() and public.is_coach_of(enrolment_id));

-- Orientation : accompagnante attribuée et administration.
create policy "referrals coach" on public.referrals for all
  using (coach_id = auth.uid() and public.is_coach_of(enrolment_id))
  with check (coach_id = auth.uid() and public.is_coach_of(enrolment_id));
create policy "referrals admin read" on public.referrals for select using (public.is_staff());

-- Ressources proposées : l'accompagnante les crée, le participant les voit.
create policy "suggestions coach" on public.resource_suggestions for all
  using (coach_id = auth.uid() and public.is_coach_of(enrolment_id))
  with check (coach_id = auth.uid() and public.is_coach_of(enrolment_id));
create policy "suggestions participant read" on public.resource_suggestions for select using (public.owns_enrolment(enrolment_id));

-- Traçabilité : lecture administration uniquement ; écriture par fonctions et déclencheurs.
create policy "access log admin read" on public.access_log for select using (public.is_staff());

-- Contact
create policy "contact insert" on public.contact_messages for insert with check (not handled);
create policy "contact admin read" on public.contact_messages for select using (public.is_staff());
create policy "contact admin update" on public.contact_messages for update using (public.is_staff()) with check (public.is_staff());
revoke update on public.contact_messages from authenticated, anon;
grant update (handled) on public.contact_messages to authenticated;

-- Confidentialité
create policy "privacy own insert" on public.privacy_requests for insert with check (user_id = auth.uid() and status = 'open');
create policy "privacy read" on public.privacy_requests for select using (user_id = auth.uid() or public.is_staff());
create policy "privacy admin update" on public.privacy_requests for update using (public.is_staff()) with check (public.is_staff());

-- Paiements : lecture par le participant concerné ; écriture côté serveur uniquement (service_role).
create policy "payments own read" on public.payments for select using (public.owns_enrolment(enrolment_id) or public.is_staff());

-- ---------------------------------------------------------------------------
-- Traçabilité automatique des actions de l'accompagnante
-- ---------------------------------------------------------------------------
create or replace function public.trg_log_coach_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() in ('coach', 'admin') then
    perform public.log_access(tg_table_name || '_' || lower(tg_op), new.enrolment_id, jsonb_build_object('id', new.id));
  end if;
  return new;
end; $$;
create trigger messages_log after insert on public.messages for each row execute function public.trg_log_coach_action();
create trigger coach_notes_log after insert or update on public.coach_notes for each row execute function public.trg_log_coach_action();
create trigger referrals_log after insert or update on public.referrals for each row execute function public.trg_log_coach_action();
create trigger suggestions_log after insert on public.resource_suggestions for each row execute function public.trg_log_coach_action();

-- PHQ-9 item 9 > 0 : marqué pour revue prioritaire. Aucune décision automatique.
create or replace function public.trg_questionnaire_attention()
returns trigger language plpgsql as $$
begin
  new.needs_attention := (new.instrument = 'PHQ9' and array_length(new.answers, 1) >= 9 and new.answers[9] > 0);
  new.total := (select coalesce(sum(a), 0) from unnest(new.answers) a);
  return new;
end; $$;
create trigger questionnaire_attention before insert on public.questionnaire_responses
  for each row execute function public.trg_questionnaire_attention();

-- ---------------------------------------------------------------------------
-- Espace accompagnante (chaque appel est tracé)
-- ---------------------------------------------------------------------------
create or replace function public.require_coach() returns void language plpgsql stable security definer set search_path = public as $$
begin if public.my_role() not in ('coach', 'admin') then raise exception 'not authorised'; end if; end; $$;

create or replace function public.coach_participants()
returns table (enrolment_id uuid, first_name text, programme_id uuid, programme text, plan public.plan_tier, status public.enrolment_status,
               current_week int, unread int, next_appointment timestamptz, open_referrals int, needs_attention int,
               share_summaries boolean, share_goals boolean, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coach();
  perform public.log_access('coach_list_participants', null);
  return query
  select e.id, pr.first_name, p.id, p.title, e.plan, e.status,
         least(p.duration_weeks, (select count(*)::int from public.week_completions c where c.enrolment_id = e.id) + 1),
         (select count(*)::int from public.messages m where m.enrolment_id = e.id and m.sender_id = e.user_id and m.read_at is null),
         (select min(a.starts_at) from public.appointments a where a.enrolment_id = e.id and a.status in ('demande','confirme') and a.starts_at > now()),
         (select count(*)::int from public.referrals r where r.enrolment_id = e.id and r.status = 'ouverte'),
         (select count(*)::int from public.questionnaire_responses q where q.enrolment_id = e.id and q.needs_attention and q.reviewed_at is null
            and public.can_use_questionnaires(e.id)),
         e.share_summaries, e.share_goals, e.created_at
  from public.enrolments e join public.profiles pr on pr.id = e.user_id join public.programmes p on p.id = e.programme_id
  where e.coach_id = auth.uid() and e.plan in ('ecrit', 'appels')
  order by pr.first_name;
end; $$;

create or replace function public.coach_participant(eid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e record; result jsonb;
begin
  perform public.require_coach();
  select * into e from public.enrolments where id = eid and coach_id = auth.uid();
  if not found then raise exception 'not authorised'; end if;
  perform public.log_access('coach_view_participant', eid);
  -- Ouvrir le fil marque les messages du participant comme lus.
  update public.messages set read_at = now() where enrolment_id = eid and sender_id = e.user_id and read_at is null;
  select jsonb_build_object(
    'enrolment', jsonb_build_object('id', e.id, 'plan', e.plan, 'status', e.status, 'created_at', e.created_at,
        'share_summaries', e.share_summaries, 'share_goals', e.share_goals,
        'first_name', (select first_name from public.profiles where id = e.user_id),
        'programme', (select title from public.programmes where id = e.programme_id),
        'weeks_completed', (select coalesce(jsonb_agg(week_number order by week_number), '[]') from public.week_completions where enrolment_id = eid)),
    'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'body', m.body, 'created_at', m.created_at,
        'from_participant', m.sender_id = e.user_id, 'read_at', m.read_at) order by m.created_at), '[]') from public.messages m where m.enrolment_id = eid),
    'appointments', (select coalesce(jsonb_agg(to_jsonb(a) order by a.session_number), '[]') from public.appointments a where a.enrolment_id = eid),
    'summaries', case when e.share_summaries then (select coalesce(jsonb_agg(jsonb_build_object('week_number', s.week_number, 'body', s.body, 'shared_at', s.shared_at)
        order by s.week_number), '[]') from public.shared_summaries s where s.enrolment_id = eid) else '[]'::jsonb end,
    'goals', case when e.share_goals then (select coalesce(jsonb_agg(jsonb_build_object('scope', g.scope, 'week_number', g.week_number, 'title', g.title,
        'actions', g.actions, 'status', g.status, 'obstacles', g.obstacles) order by g.created_at), '[]') from public.goals g where g.enrolment_id = eid
        and g.status <> 'archive') else '[]'::jsonb end,
    'questionnaires', case when public.can_use_questionnaires(eid) then (select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'instrument', q.instrument,
        'week_number', q.week_number, 'total', q.total, 'needs_attention', q.needs_attention, 'reviewed_at', q.reviewed_at, 'created_at', q.created_at)
        order by q.created_at), '[]') from public.questionnaire_responses q where q.enrolment_id = eid) else null end,
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'created_at', n.created_at) order by n.created_at desc), '[]')
        from public.coach_notes n where n.enrolment_id = eid and n.coach_id = auth.uid()),
    'referrals', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]') from public.referrals r where r.enrolment_id = eid),
    'suggestions', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]') from public.resource_suggestions s where s.enrolment_id = eid),
    'history', (select coalesce(jsonb_agg(jsonb_build_object('action', l.action, 'created_at', l.created_at) order by l.created_at desc), '[]')
        from (select * from public.access_log where enrolment_id = eid and actor_id = auth.uid() order by created_at desc limit 50) l)
  ) into result;
  return result;
end; $$;

create or replace function public.coach_calendar()
returns table (id uuid, enrolment_id uuid, first_name text, session_number int, starts_at timestamptz, mode public.appointment_mode,
               status public.appointment_status, participant_note text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_coach();
  perform public.log_access('coach_view_calendar', null);
  return query select a.id, a.enrolment_id, pr.first_name, a.session_number, a.starts_at, a.mode, a.status, a.participant_note
    from public.appointments a join public.enrolments e on e.id = a.enrolment_id join public.profiles pr on pr.id = e.user_id
    where e.coach_id = auth.uid() and a.starts_at > now() - interval '30 days' order by a.starts_at;
end; $$;

create or replace function public.coach_update_appointment(aid uuid, new_status public.appointment_status, new_start timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  perform public.require_coach();
  select a.enrolment_id into eid from public.appointments a join public.enrolments e on e.id = a.enrolment_id
    where a.id = aid and e.coach_id = auth.uid();
  if eid is null then raise exception 'not authorised'; end if;
  update public.appointments set status = new_status, starts_at = coalesce(new_start, starts_at),
    confirmed_at = case when new_status = 'confirme' then now() else confirmed_at end,
    reminder_at = case when new_status = 'confirme' then coalesce(new_start, starts_at) - interval '24 hours' else reminder_at end
  where id = aid;
  perform public.log_access('coach_appointment_' || new_status, eid, jsonb_build_object('appointment', aid));
end; $$;

create or replace function public.coach_review_questionnaire(qid uuid, note text)
returns void language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  perform public.require_coach();
  select q.enrolment_id into eid from public.questionnaire_responses q join public.enrolments e on e.id = q.enrolment_id
    where q.id = qid and e.coach_id = auth.uid();
  if eid is null or not public.can_use_questionnaires(eid) then raise exception 'not authorised'; end if;
  update public.questionnaire_responses set reviewed_by = auth.uid(), reviewed_at = now(), review_note = note where id = qid;
  perform public.log_access('coach_review_questionnaire', eid, jsonb_build_object('questionnaire', qid));
end; $$;

-- ---------------------------------------------------------------------------
-- Administration (agrégats, sans contenu privé)
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns table (members int, coaches int, enrolments int, published_articles int, open_privacy_requests int, unread_contact int, open_referrals int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return query select
    (select count(*)::int from public.profiles where role = 'member'),
    (select count(*)::int from public.profiles where role = 'coach'),
    (select count(*)::int from public.enrolments),
    (select count(*)::int from public.articles where status = 'published'),
    (select count(*)::int from public.privacy_requests where status <> 'done'),
    (select count(*)::int from public.contact_messages where not handled),
    (select count(*)::int from public.referrals where status = 'ouverte');
end; $$;

-- Statistiques agrégées ; masquées sous 5 inscriptions pour éviter toute réidentification.
create or replace function public.admin_programme_stats(p_slug text)
returns table (week_number int, completed int, enrolled int)
language plpgsql stable security definer set search_path = public as $$
declare total int;
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  select count(*) into total from public.enrolments e join public.programmes p on p.id = e.programme_id where p.slug = p_slug;
  return query
    select w.week_number,
           case when total < 5 then null else (select count(*)::int from public.week_completions c
             join public.enrolments e on e.id = c.enrolment_id
             where e.programme_id = w.programme_id and c.week_number = w.week_number) end,
           total
    from public.programme_weeks w join public.programmes p on p.id = w.programme_id
    where p.slug = p_slug order by w.week_number;
end; $$;

create or replace function public.admin_enrolments()
returns table (enrolment_id uuid, first_name text, programme text, plan public.plan_tier, status public.enrolment_status,
               coach_id uuid, coach_name text, questionnaires_enabled boolean, weeks_completed int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return query
    select e.id, pr.first_name, p.title, e.plan, e.status, e.coach_id, cp.display_name, e.questionnaires_enabled,
           (select count(*)::int from public.week_completions c where c.enrolment_id = e.id), e.created_at
    from public.enrolments e join public.profiles pr on pr.id = e.user_id join public.programmes p on p.id = e.programme_id
    left join public.coach_profiles cp on cp.user_id = e.coach_id
    order by e.created_at desc;
end; $$;

create or replace function public.admin_update_enrolment(eid uuid, new_plan public.plan_tier, new_coach uuid, new_questionnaires boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  if new_coach is not null and not exists (select 1 from public.profiles where id = new_coach and role in ('coach','admin')) then
    raise exception 'coach invalide'; end if;
  update public.enrolments set plan = new_plan,
    coach_id = case when new_plan = 'autonome' then null else new_coach end,
    questionnaires_enabled = case when new_plan = 'autonome' then false else new_questionnaires end
  where id = eid;
  perform public.log_access('admin_update_enrolment', eid,
    jsonb_build_object('plan', new_plan, 'coach', new_coach, 'questionnaires', new_questionnaires));
end; $$;

create or replace function public.admin_team()
returns table (id uuid, first_name text, email text, role public.user_role, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return query select p.id, p.first_name, u.email::text, p.role, p.created_at
    from public.profiles p join auth.users u on u.id = p.id where p.role <> 'member' order by p.role, p.first_name;
end; $$;

create or replace function public.set_user_role(target_email text, new_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  select id into uid from auth.users where lower(email) = lower(target_email);
  if uid is null then raise exception 'Aucun compte avec cet e-mail'; end if;
  update public.profiles set role = new_role where id = uid;
  perform public.log_access('admin_set_role', null, jsonb_build_object('user', uid, 'role', new_role));
end; $$;

create or replace function public.admin_set_flag(k text, v boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  update public.feature_flags set enabled = v where key = k;
  perform public.log_access('admin_set_flag', null, jsonb_build_object('flag', k, 'enabled', v));
end; $$;

-- ---------------------------------------------------------------------------
-- Droits du participant
-- ---------------------------------------------------------------------------
create or replace function public.erase_my_programme_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.exercise_responses where user_id = auth.uid();
  delete from public.step_progress where user_id = auth.uid();
  delete from public.week_completions where user_id = auth.uid();
  delete from public.journal_entries where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.self_ratings where user_id = auth.uid();
  delete from public.shared_summaries where user_id = auth.uid();
  delete from public.saved_items where user_id = auth.uid();
  update public.enrolments set unlock_all = false, last_step_id = null, share_summaries = false, share_goals = false
    where user_id = auth.uid();
end; $$;

create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profil', (select to_jsonb(p) - 'role' from public.profiles p where id = auth.uid()),
    'inscriptions', (select coalesce(jsonb_agg(to_jsonb(e) - 'coach_id'), '[]') from public.enrolments e where user_id = auth.uid()),
    'journal', (select coalesce(jsonb_agg(to_jsonb(j)), '[]') from public.journal_entries j where user_id = auth.uid()),
    'exercices', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.exercise_responses r where user_id = auth.uid()),
    'objectifs', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.goals g where user_id = auth.uid()),
    'autoevaluations', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.self_ratings s where user_id = auth.uid()),
    'bilans_partages', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.shared_summaries s where user_id = auth.uid()),
    'messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.messages m where public.owns_enrolment(m.enrolment_id)),
    'rendez_vous', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.appointments a where public.owns_enrolment(a.enrolment_id)),
    'exporte_le', now());
$$;

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
revoke all on function public.coach_participants(), public.coach_participant(uuid), public.coach_calendar(),
  public.coach_update_appointment(uuid, public.appointment_status, timestamptz), public.coach_review_questionnaire(uuid, text),
  public.admin_overview(), public.admin_programme_stats(text), public.admin_enrolments(),
  public.admin_update_enrolment(uuid, public.plan_tier, uuid, boolean), public.admin_team(), public.set_user_role(text, public.user_role),
  public.admin_set_flag(text, boolean), public.erase_my_programme_data(), public.export_my_data(),
  public.log_access(text, uuid, jsonb), public.require_coach() from public, anon;
grant execute on function public.coach_participants(), public.coach_participant(uuid), public.coach_calendar(),
  public.coach_update_appointment(uuid, public.appointment_status, timestamptz), public.coach_review_questionnaire(uuid, text),
  public.admin_overview(), public.admin_programme_stats(text), public.admin_enrolments(),
  public.admin_update_enrolment(uuid, public.plan_tier, uuid, boolean), public.admin_team(), public.set_user_role(text, public.user_role),
  public.admin_set_flag(text, boolean), public.erase_my_programme_data(), public.export_my_data() to authenticated;
-- log_access n'est appelable qu'à l'intérieur des fonctions ci-dessus.
revoke all on function public.log_access(text, uuid, jsonb) from authenticated;
