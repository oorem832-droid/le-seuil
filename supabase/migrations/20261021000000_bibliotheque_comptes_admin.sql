-- =============================================================================
-- LE SEUIL — v3 : Bibliothèque éditoriale, comptes créés par l'administration,
-- demandes d'inscription, accès aux programmes strictement contrôlé.
-- À exécuter APRÈS 20261019000000_init.sql et 20261019000100_storage.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bibliothèque : statut éditorial, contenu structuré, révision, versions
-- ---------------------------------------------------------------------------
alter table public.articles
  add column if not exists etat text not null default 'a_relire' check (etat in ('brouillon', 'a_relire', 'publie')),
  add column if not exists sections jsonb not null default '[]'::jsonb,       -- [{h, p:[…]}]
  add column if not exists retenir text not null default '',
  add column if not exists references_list text[] not null default '{}',
  add column if not exists related text[] not null default '{}',               -- slugs
  add column if not exists featured boolean not null default false,
  add column if not exists featured_order int,
  add column if not exists sort_order int not null default 0,
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists sensitive boolean not null default false,
  add column if not exists professional_review_required boolean not null default false,
  add column if not exists professional_review_done boolean not null default false,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- Les anciens articles de démonstration sont remplacés par les 62 articles de la Bibliothèque.
delete from public.articles where slug in ('stress-pas-ennemi','dormir-tete','epuisement-parental','dire-non-travail','psy-pour-fous','qui-fait-quoi');

-- Publication impossible sans revue professionnelle pour les articles qui l'exigent.
create or replace function public.trg_article_publish_guard()
returns trigger language plpgsql as $$
begin
  if new.etat = 'publie' and new.professional_review_required and not new.professional_review_done then
    raise exception 'Cet article doit être relu par un professionnel qualifié avant publication.';
  end if;
  new.status := case when new.etat = 'publie' then 'published'::public.content_status else 'draft'::public.content_status end;
  if new.etat = 'publie' and new.published_at is null then new.published_at := now(); end if;
  return new;
end; $$;
drop trigger if exists article_publish_guard on public.articles;
create trigger article_publish_guard before insert or update on public.articles
  for each row execute function public.trg_article_publish_guard();

-- Suivi des versions
create table if not exists public.article_versions (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  snapshot jsonb not null,
  edited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.article_versions enable row level security;
drop policy if exists "versions staff read" on public.article_versions;
create policy "versions staff read" on public.article_versions for select using (public.is_staff(array['admin','editor']::public.user_role[]));

create or replace function public.trg_article_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.article_versions (article_id, snapshot, edited_by)
  values (old.id, to_jsonb(old) - 'id', auth.uid());
  return new;
end; $$;
drop trigger if exists article_version on public.articles;
create trigger article_version after update on public.articles
  for each row when (old.* is distinct from new.*) execute function public.trg_article_version();

drop policy if exists "articles read" on public.articles;
create policy "articles read" on public.articles for select
  using (etat = 'publie' or public.is_staff(array['admin','editor']::public.user_role[]));

-- ---------------------------------------------------------------------------
-- 2. Présentation publique des programmes (catalogue de 11 programmes)
-- ---------------------------------------------------------------------------
alter table public.programmes
  add column if not exists category text not null default '',
  add column if not exists public_intro text not null default '',     -- permet au visiteur de reconnaître ses difficultés
  add column if not exists public_goal text not null default '',      -- objectif général
  add column if not exists benefits text[] not null default '{}',     -- 3 ou 4 bénéfices, sans promesse de guérison
  add column if not exists format text not null default 'Leçons interactives, courtes vidéos, exercices et outils pratiques, à votre rythme.',
  add column if not exists library_categories text[] not null default '{}',
  add column if not exists open_for_requests boolean not null default true;

-- ---------------------------------------------------------------------------
-- 3. Comptes participants créés par l'administration
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_name text not null default '',
  add column if not exists must_set_password boolean not null default false,
  add column if not exists account_status text not null default 'active' check (account_status in ('active', 'suspended'));

alter table public.enrolments
  add column if not exists payment_status text not null default 'non_paye' check (payment_status in ('non_paye', 'en_attente', 'paye', 'offert')),
  add column if not exists admission_status text not null default 'en_attente' check (admission_status in ('en_attente', 'admis', 'refuse')),
  add column if not exists access_starts_at timestamptz,
  add column if not exists suspended boolean not null default false,
  add column if not exists data_consent_recorded_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- Notes administratives protégées : administration uniquement (jamais visibles par le participant).
create table if not exists public.participant_admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 5000),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.participant_admin_notes enable row level security;
drop policy if exists "admin notes" on public.participant_admin_notes;
create policy "admin notes" on public.participant_admin_notes for all using (public.is_staff()) with check (public.is_staff());

-- Plus aucune inscription automatique par le participant.
drop policy if exists "enrolments own demo insert" on public.enrolments;

-- Un participant n'accède à un programme que si son inscription est valide.
create or replace function public.enrolment_valid(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrolments e join public.profiles p on p.id = e.user_id
    where e.id = eid and e.status in ('demo', 'active', 'completed') and not e.suspended and e.admission_status = 'admis'
      and p.account_status = 'active'
      and (e.access_starts_at is null or e.access_starts_at <= now())
      and (e.access_expires_at is null or e.access_expires_at > now()))
$$;
create or replace function public.has_programme_access(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(array['admin','editor']::public.user_role[])
      or (public.my_role() = 'coach')
      or exists (select 1 from public.enrolments e where e.programme_id = pid and e.user_id = auth.uid() and public.enrolment_valid(e.id))
$$;

-- Semaines et étapes : réservées aux participants autorisés (et à l'équipe). Rien n'est public.
drop policy if exists "weeks read" on public.programme_weeks;
create policy "weeks read" on public.programme_weeks for select using (auth.uid() is not null and public.has_programme_access(programme_id));
drop policy if exists "steps read" on public.programme_steps;
create policy "steps read" on public.programme_steps for select using (auth.uid() is not null and exists (
  select 1 from public.programme_weeks w where w.id = week_id and public.has_programme_access(w.programme_id)));

-- Écritures du participant : uniquement sur une inscription valide.
drop policy if exists "progress own" on public.step_progress;
create policy "progress own" on public.step_progress for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id) and public.enrolment_valid(enrolment_id));
drop policy if exists "responses own" on public.exercise_responses;
create policy "responses own" on public.exercise_responses for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.owns_enrolment(enrolment_id) and public.enrolment_valid(enrolment_id));

-- L'accompagnement n'est ouvert que sur une inscription valide.
create or replace function public.support_open(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.enrolment_valid(eid) and exists (select 1 from public.enrolments e where e.id = eid
          and ((e.plan = 'ecrit' and public.flag('written_support')) or (e.plan = 'appels' and public.flag('support_calls')))) $$;

-- Premier accès : le participant doit choisir son mot de passe.
create or replace function public.mark_password_set()
returns void language sql security definer set search_path = public as $$
  update public.profiles set must_set_password = false where id = auth.uid();
$$;
revoke all on function public.mark_password_set() from public, anon;
grant execute on function public.mark_password_set() to authenticated;

update public.feature_flags set enabled = false, note = 'Désactivé : les comptes sont créés uniquement par l’administration.' where key = 'public_signup';

-- ---------------------------------------------------------------------------
-- 4. Demandes d'inscription (formulaire public — ne crée aucun compte)
-- ---------------------------------------------------------------------------
create table if not exists public.enrolment_requests (
  id uuid primary key default gen_random_uuid(),
  programme_slug text not null,
  plan public.plan_tier not null,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 320),
  phone text check (char_length(phone) <= 40),
  message text check (char_length(message) <= 2000),
  is_adult boolean not null check (is_adult),
  consent boolean not null check (consent),
  status text not null default 'nouvelle' check (status in ('nouvelle', 'en_cours', 'acceptee', 'refusee')),
  admin_note text,
  handled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.enrolment_requests enable row level security;
drop policy if exists "requests public insert" on public.enrolment_requests;
create policy "requests public insert" on public.enrolment_requests for insert
  with check (status = 'nouvelle' and admin_note is null and handled_by is null);
drop policy if exists "requests admin read" on public.enrolment_requests;
create policy "requests admin read" on public.enrolment_requests for select using (public.is_staff());
drop policy if exists "requests admin update" on public.enrolment_requests;
create policy "requests admin update" on public.enrolment_requests for update using (public.is_staff()) with check (public.is_staff());
drop trigger if exists requests_touch on public.enrolment_requests;
create trigger requests_touch before update on public.enrolment_requests for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Fonctions d'administration (tracées)
-- ---------------------------------------------------------------------------
drop function if exists public.admin_enrolments();
create or replace function public.admin_enrolments()
returns table (enrolment_id uuid, user_id uuid, first_name text, last_name text, email text, programme_id uuid, programme text, plan public.plan_tier,
               status public.enrolment_status, payment_status text, admission_status text, access_starts_at timestamptz, access_expires_at timestamptz,
               suspended boolean, account_status text, must_set_password boolean, last_sign_in_at timestamptz,
               coach_id uuid, coach_name text, questionnaires_enabled boolean, weeks_completed int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return query
    select e.id, e.user_id, pr.first_name, pr.last_name, u.email::text, p.id, p.title, e.plan, e.status, e.payment_status, e.admission_status,
           e.access_starts_at, e.access_expires_at, e.suspended, pr.account_status, pr.must_set_password, u.last_sign_in_at,
           e.coach_id, cp.display_name, e.questionnaires_enabled,
           (select count(*)::int from public.week_completions c where c.enrolment_id = e.id), e.created_at
    from public.enrolments e join public.profiles pr on pr.id = e.user_id join auth.users u on u.id = e.user_id
    join public.programmes p on p.id = e.programme_id left join public.coach_profiles cp on cp.user_id = e.coach_id
    order by e.created_at desc;
end; $$;

create or replace function public.admin_save_enrolment(
  eid uuid, new_plan public.plan_tier, new_coach uuid, new_questionnaires boolean, new_status public.enrolment_status,
  new_payment text, new_admission text, new_starts timestamptz, new_expires timestamptz, new_suspended boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  if new_coach is not null and not exists (select 1 from public.profiles where id = new_coach and role in ('coach','admin')) then
    raise exception 'Accompagnante invalide'; end if;
  update public.enrolments set plan = new_plan,
    coach_id = case when new_plan = 'autonome' then null else new_coach end,
    questionnaires_enabled = case when new_plan = 'autonome' then false else coalesce(new_questionnaires, false) end,
    status = new_status, payment_status = new_payment, admission_status = new_admission,
    access_starts_at = new_starts, access_expires_at = new_expires, suspended = coalesce(new_suspended, false)
  where id = eid;
  perform public.log_access('admin_save_enrolment', eid, jsonb_build_object('plan', new_plan, 'status', new_status, 'payment', new_payment,
    'admission', new_admission, 'suspended', new_suspended, 'expires', new_expires));
end; $$;

create or replace function public.admin_set_account_status(target uuid, new_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  update public.profiles set account_status = new_status where id = target;
  perform public.log_access('admin_account_' || new_status, null, jsonb_build_object('user', target));
end; $$;

create or replace function public.admin_add_enrolment(target uuid, prog uuid, new_plan public.plan_tier, new_payment text, new_admission text,
  new_starts timestamptz, new_expires timestamptz, new_coach uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  insert into public.enrolments (user_id, programme_id, plan, status, payment_status, admission_status, access_starts_at, access_expires_at, coach_id, created_by, data_consent_recorded_at)
  values (target, prog, new_plan, 'active', new_payment, new_admission, new_starts, new_expires, case when new_plan = 'autonome' then null else new_coach end, auth.uid(), now())
  returning id into eid;
  perform public.log_access('admin_add_enrolment', eid, jsonb_build_object('user', target, 'programme', prog, 'plan', new_plan));
  return eid;
end; $$;

create or replace function public.admin_log(action text, target uuid, details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  perform public.log_access(action, null, coalesce(details, '{}'::jsonb) || jsonb_build_object('user', target));
end; $$;

-- Coach : ne voit que les participants dont l'inscription est valide.
-- (coach_participants existant filtre déjà sur coach_id ; les inscriptions suspendues y restent visibles pour l'historique.)

revoke all on function public.admin_enrolments(), public.admin_save_enrolment(uuid, public.plan_tier, uuid, boolean, public.enrolment_status, text, text, timestamptz, timestamptz, boolean),
  public.admin_set_account_status(uuid, text), public.admin_add_enrolment(uuid, uuid, public.plan_tier, text, text, timestamptz, timestamptz, uuid),
  public.admin_log(text, uuid, jsonb) from public, anon;
grant execute on function public.admin_enrolments(), public.admin_save_enrolment(uuid, public.plan_tier, uuid, boolean, public.enrolment_status, text, text, timestamptz, timestamptz, boolean),
  public.admin_set_account_status(uuid, text), public.admin_add_enrolment(uuid, uuid, public.plan_tier, text, text, timestamptz, timestamptz, uuid),
  public.admin_log(text, uuid, jsonb), public.enrolment_valid(uuid), public.has_programme_access(uuid) to authenticated;

-- Utilisées par les règles d'accès : exécutables par tous (elles ne renvoient qu'un booléen).
grant execute on function public.enrolment_valid(uuid), public.has_programme_access(uuid) to anon, authenticated;
