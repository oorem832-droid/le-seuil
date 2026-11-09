-- LE SEUIL — Parcours complet : demande → validation manuelle → paiement → activation.
-- À exécuter une fois dans Supabase (SQL Editor). Ré-exécutable sans risque.
-- Aucune donnée de santé n'est copiée dans les e-mails, les notifications ou les journaux.

-- ---------------------------------------------------------------------------
-- 1. Demandes : statuts, référence unique, suivi
-- ---------------------------------------------------------------------------
-- Statuts :
--   nouvelle        = « En attente de validation » (statut initial)
--   en_cours        = en cours d'examen
--   infos_demandees = informations complémentaires demandées
--   acceptee        = approuvée, paiement en attente
--   refusee         = non retenue
--   annulee         = annulée
--   orientation     = orientation proposée vers une autre aide
--   compte_cree     = compte créé manuellement par l'administration
--   active          = « Inscription active » (paiement confirmé, accès ouvert)
do $$ declare c record; begin
  for c in select conname from pg_constraint
    where conrelid = 'public.enrolment_requests'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~* '\mstatus\M'
      and pg_get_constraintdef(oid) !~* 'payment_status'
  loop execute format('alter table public.enrolment_requests drop constraint %I', c.conname); end loop;
end $$;
alter table public.enrolment_requests add constraint enrolment_requests_status_check
  check (status in ('nouvelle','en_cours','infos_demandees','acceptee','refusee','annulee','orientation','compte_cree','active'));

create sequence if not exists public.enrolment_request_ref_seq;
alter table public.enrolment_requests
  add column if not exists reference text,
  add column if not exists seen_at timestamptz,
  add column if not exists review_result text,
  add column if not exists decision_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists enrolment_id uuid,
  add column if not exists info_request text,
  add column if not exists price_fcfa int,
  add column if not exists payment_status text not null default 'non_requis',
  add column if not exists approved_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists confirmation_email_at timestamptz,
  add column if not exists user_id uuid;
alter table public.enrolment_requests drop constraint if exists enrolment_requests_payment_status_check;
alter table public.enrolment_requests add constraint enrolment_requests_payment_status_check
  check (payment_status in ('non_requis','en_attente','en_cours','paye','echoue','annule'));
update public.enrolment_requests set reference = 'LS-' || to_char(created_at, 'YYMM') || '-' || lpad(nextval('public.enrolment_request_ref_seq')::text, 4, '0')
  where reference is null;
alter table public.enrolment_requests alter column reference set default
  'LS-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.enrolment_request_ref_seq')::text, 4, '0');
create unique index if not exists enrolment_requests_reference_key on public.enrolment_requests (reference);

-- Tarifs (FCFA) : la seule source de vérité pour le montant à payer.
create table if not exists public.plan_prices (plan public.plan_tier primary key, label text not null, price_fcfa int not null check (price_fcfa > 0));
insert into public.plan_prices (plan, label, price_fcfa) values
  ('autonome', 'Formule 1 — Autonome', 12000),
  ('ecrit', 'Formule 2 — Accompagnement écrit', 30000),
  ('appels', 'Formule 3 — Accompagnement par appels', 48000)
on conflict (plan) do update set label = excluded.label, price_fcfa = excluded.price_fcfa;
alter table public.plan_prices enable row level security;
drop policy if exists "prices public read" on public.plan_prices;
create policy "prices public read" on public.plan_prices for select using (true);

-- ---------------------------------------------------------------------------
-- 2. Journal des décisions (ajout seulement, lisible par l'administration)
-- ---------------------------------------------------------------------------
create table if not exists public.request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.enrolment_requests(id) on delete cascade,
  actor_id uuid,
  actor text not null default 'systeme',   -- admin, candidat, systeme, prestataire
  event text not null,                     -- creee, statut, email, paiement, activation…
  from_status text, to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists request_events_req_idx on public.request_events (request_id, created_at);
alter table public.request_events enable row level security;
drop policy if exists "events admin read" on public.request_events;
create policy "events admin read" on public.request_events for select using (public.is_staff());
-- Aucune politique d'écriture : seules les fonctions serveur (security definer / service role) écrivent.

create or replace function public.request_log_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.request_events (request_id, actor_id, actor, event, to_status) values (new.id, auth.uid(), 'candidat', 'creee', new.status);
    insert into public.admin_notifications (kind, request_id, title) values ('nouvelle_demande', new.id, 'Nouvelle demande d’inscription ' || new.reference);
  elsif new.status is distinct from old.status or new.payment_status is distinct from old.payment_status then
    insert into public.request_events (request_id, actor_id, actor, event, from_status, to_status, details)
    values (new.id, auth.uid(), case when public.is_staff() then 'admin' else 'systeme' end,
            case when new.status is distinct from old.status then 'statut' else 'paiement' end,
            case when new.status is distinct from old.status then old.status else old.payment_status end,
            case when new.status is distinct from old.status then new.status else new.payment_status end, '{}'::jsonb);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Notifications du tableau de bord administrateur (sans donnée de santé)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id bigint generated always as identity primary key,
  kind text not null,
  request_id uuid references public.enrolment_requests(id) on delete cascade,
  title text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.admin_notifications enable row level security;
drop policy if exists "notif admin read" on public.admin_notifications;
create policy "notif admin read" on public.admin_notifications for select using (public.is_staff());
drop policy if exists "notif admin update" on public.admin_notifications;
create policy "notif admin update" on public.admin_notifications for update using (public.is_staff()) with check (public.is_staff());

drop trigger if exists requests_log on public.enrolment_requests;
create trigger requests_log after insert or update on public.enrolment_requests for each row execute function public.request_log_change();

-- Réglage : e-mail d'information à l'administratrice pour chaque nouvelle demande.
insert into public.feature_flags (key, enabled, note) values
  ('admin_email_notifications', true, 'E-mail d’information à leseuil@orejeen.com à chaque nouvelle demande (sans donnée de santé).')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Journal technique des e-mails (statut d'envoi, erreurs) — sans contenu
-- ---------------------------------------------------------------------------
create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  request_id uuid references public.enrolment_requests(id) on delete set null,
  kind text not null,          -- confirmation, admin_nouvelle, approuvee, infos, refusee, bienvenue
  recipient_domain text,       -- domaine seulement (ex. gmail.com)
  status text not null,        -- envoye, echec, non_configure
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
alter table public.email_log enable row level security;
drop policy if exists "email log admin read" on public.email_log;
create policy "email log admin read" on public.email_log for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 5. Paiements liés aux demandes (traités par le prestataire, jamais de carte ici)
-- ---------------------------------------------------------------------------
create table if not exists public.request_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.enrolment_requests(id) on delete restrict,
  transaction_id text not null unique,     -- notre identifiant envoyé au prestataire
  provider text not null,                  -- cinetpay, test
  amount_fcfa int not null,
  status text not null default 'initie' check (status in ('initie','en_attente','reussi','echoue','annule')),
  provider_status text,
  payment_method text,
  operator_ref text,
  paid_at timestamptz,
  receipt_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists request_payments_req_idx on public.request_payments (request_id);
alter table public.request_payments enable row level security;
drop policy if exists "payments admin read" on public.request_payments;
create policy "payments admin read" on public.request_payments for select using (public.is_staff());

-- Lien de paiement sécurisé : jeton aléatoire, seul son empreinte est stockée ; durée limitée.
create table if not exists public.payment_links (
  token_hash text primary key,
  request_id uuid not null references public.enrolment_requests(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.payment_links enable row level security; -- aucune politique : serveur uniquement

-- ---------------------------------------------------------------------------
-- 6. Envoi d'une demande : enregistrement vérifié, renvoie l'identifiant et la référence
-- ---------------------------------------------------------------------------
create or replace function public.submit_enrolment_request(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.enrolment_requests; v_plan public.plan_tier; v_email text := lower(trim(p->>'email'));
begin
  if coalesce(p->>'plan','') not in ('autonome','ecrit','appels') then raise exception 'Formule invalide'; end if;
  v_plan := (p->>'plan')::public.plan_tier;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail invalide'; end if;
  if coalesce((p->>'is_adult')::boolean, false) is not true or coalesce((p->>'consent')::boolean, false) is not true then raise exception 'Consentement et majorité requis'; end if;
  if not exists (select 1 from public.programmes where slug = p->>'programme_slug') then raise exception 'Programme inconnu'; end if;
  -- Limite anti-abus : 5 demandes par e-mail et par jour.
  if (select count(*) from public.enrolment_requests where lower(email) = v_email and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Trop de demandes pour cette adresse aujourd’hui';
  end if;
  insert into public.enrolment_requests (programme_slug, plan, first_name, last_name, email, phone, message, is_adult, consent, evaluation, price_fcfa)
  values (p->>'programme_slug', v_plan, left(trim(p->>'first_name'),100), left(trim(p->>'last_name'),100), v_email,
          nullif(left(trim(coalesce(p->>'phone','')),40),''), nullif(left(coalesce(p->>'message',''),2000),''), true, true,
          case when jsonb_typeof(p->'evaluation') = 'object' then p->'evaluation' else '{}'::jsonb end,
          (select price_fcfa from public.plan_prices where plan = v_plan))
  returning * into r;
  return jsonb_build_object('id', r.id, 'reference', r.reference, 'status', r.status);
end $$;
revoke all on function public.submit_enrolment_request(jsonb) from public;
grant execute on function public.submit_enrolment_request(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Décision de l'administratrice (journalisée ; jamais automatique)
-- ---------------------------------------------------------------------------
create or replace function public.decide_enrolment_request(p_id uuid, p_decision text, p_message text default null,
  p_review_result text default null, p_safety_reviewed boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.enrolment_requests; v_status text;
begin
  if not public.is_staff() then raise exception 'Accès réservé à l’administration'; end if;
  select * into r from public.enrolment_requests where id = p_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if r.status in ('active','compte_cree') then raise exception 'Cette inscription est déjà active'; end if;
  v_status := case p_decision when 'approuver' then 'acceptee' when 'infos' then 'infos_demandees'
                when 'refuser' then 'refusee' when 'annuler' then 'annulee' when 'examen' then 'en_cours' else null end;
  if v_status is null then raise exception 'Décision invalide'; end if;
  -- Une demande signalée (réponses de sécurité) ne peut être approuvée qu'après lecture explicite et note d'examen.
  if v_status = 'acceptee' and coalesce(r.priority_review, false)
     and (p_safety_reviewed is not true or coalesce(trim(p_review_result), '') = '') then
    raise exception 'Demande signalée : confirmez la lecture des réponses de sécurité et renseignez le résultat de l’examen avant d’approuver.';
  end if;
  if v_status = 'infos_demandees' and coalesce(trim(p_message), '') = '' then raise exception 'Précisez les informations demandées'; end if;
  update public.enrolment_requests set
    status = v_status,
    review_result = coalesce(nullif(trim(p_review_result), ''), review_result),
    info_request = case when v_status = 'infos_demandees' then left(trim(p_message), 2000) else info_request end,
    decision_note = case when v_status in ('refusee','annulee') then nullif(left(trim(coalesce(p_message,'')), 2000), '') else decision_note end,
    reviewed_at = now(), handled_by = auth.uid(),
    approved_at = case when v_status = 'acceptee' then now() else approved_at end,
    price_fcfa = coalesce(price_fcfa, (select price_fcfa from public.plan_prices where plan = r.plan)),
    payment_status = case when v_status = 'acceptee' then 'en_attente' when v_status in ('refusee','annulee') then 'annule' else payment_status end
  where id = p_id returning * into r;
  insert into public.request_events (request_id, actor_id, actor, event, to_status, details)
  values (p_id, auth.uid(), 'admin', 'decision', v_status, jsonb_build_object('decision', p_decision, 'safety_reviewed', p_safety_reviewed));
  return jsonb_build_object('id', r.id, 'status', r.status, 'reference', r.reference);
end $$;
revoke all on function public.decide_enrolment_request(uuid, text, text, text, boolean) from public;
grant execute on function public.decide_enrolment_request(uuid, text, text, text, boolean) to authenticated;

-- Marquer une demande comme vue / les notifications comme lues.
create or replace function public.mark_request_seen(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Accès réservé'; end if;
  update public.enrolment_requests set seen_at = coalesce(seen_at, now()) where id = p_id;
  update public.admin_notifications set read_at = coalesce(read_at, now()) where request_id = p_id;
end $$;
grant execute on function public.mark_request_seen(uuid) to authenticated;

-- Recherche d'un compte existant par e-mail (fonction serveur uniquement).
create or replace function public.user_id_by_email(p_email text) returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1 $$;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
