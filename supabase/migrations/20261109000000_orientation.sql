-- LE SEUIL — Questionnaire d'orientation « Trouver mon programme » et module de sécurité.
-- Aucune réponse individuelle n'est enregistrée : la suggestion est calculée dans le navigateur.
-- Seuls des compteurs agrégés et anonymes (programme suggéré / choisi, par jour) sont conservés.
-- Le questionnaire public reste désactivé (feature flag « orientation ») jusqu'aux validations
-- clinique et juridique prévues avant lancement.

insert into public.feature_flags (key, enabled, note) values
  ('orientation', false, 'Questionnaire « Trouver mon programme » et parcours de sécurité. Après relecture clinique indépendante, vérification juridique et tests des scénarios.')
on conflict (key) do nothing;

-- Versions du questionnaire (brouillon, publiée, archivées)
create table if not exists public.orientation_versions (
  id uuid primary key default gen_random_uuid(),
  version int not null,
  status text not null check (status in ('draft', 'published', 'archived')),
  config jsonb not null,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create unique index if not exists orientation_one_draft on public.orientation_versions ((status)) where status = 'draft';
create unique index if not exists orientation_one_published on public.orientation_versions ((status)) where status = 'published';

alter table public.orientation_versions enable row level security;
drop policy if exists "orientation published read" on public.orientation_versions;
create policy "orientation published read" on public.orientation_versions for select using (status = 'published' or public.is_staff());
drop policy if exists "orientation admin write" on public.orientation_versions;
create policy "orientation admin write" on public.orientation_versions for all using (public.is_staff()) with check (public.is_staff());

-- Publication : archive la version publiée et publie une copie du brouillon.
create or replace function public.orientation_publish(p_note text default '')
returns int language plpgsql security definer set search_path = public as $$
declare d record; v int;
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  select * into d from public.orientation_versions where status = 'draft';
  if not found then raise exception 'Aucun brouillon'; end if;
  update public.orientation_versions set status = 'archived' where status = 'published';
  select coalesce(max(version), 0) + 1 into v from public.orientation_versions where status <> 'draft';
  insert into public.orientation_versions (version, status, config, note, published_at)
    values (v, 'published', d.config, coalesce(p_note, ''), now());
  perform public.log_access('orientation_publish', null, jsonb_build_object('version', v));
  return v;
end; $$;

-- Statistiques agrégées et anonymes : aucun identifiant, aucune réponse, aucune information de sécurité.
create table if not exists public.orientation_stats (
  day date not null default current_date,
  programme_slug text not null,
  event text not null check (event in ('suggested', 'chosen')),
  count int not null default 0,
  primary key (day, programme_slug, event)
);
alter table public.orientation_stats enable row level security;
drop policy if exists "orientation stats admin" on public.orientation_stats;
create policy "orientation stats admin" on public.orientation_stats for select using (public.is_staff());

create or replace function public.orientation_track(p_slug text, p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('suggested', 'chosen') then return; end if;
  if not exists (select 1 from public.programmes where slug = p_slug) then return; end if;
  if not exists (select 1 from public.feature_flags where key = 'orientation' and enabled) then return; end if;
  insert into public.orientation_stats (day, programme_slug, event, count) values (current_date, p_slug, p_event, 1)
  on conflict (day, programme_slug, event) do update set count = public.orientation_stats.count + 1;
end; $$;
grant execute on function public.orientation_track(text, text) to anon, authenticated;
grant execute on function public.orientation_publish(text) to authenticated;
