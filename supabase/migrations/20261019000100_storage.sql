-- Médias pédagogiques (vidéos, sous-titres .vtt, fiches PDF).
-- Contenu standardisé, sans donnée personnelle : lecture publique, écriture réservée à l'équipe éditoriale.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('programme-media', 'programme-media', true, 524288000,
        array['video/mp4', 'video/webm', 'text/vtt', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select using (bucket_id = 'programme-media');
create policy "media editors insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'programme-media' and public.is_staff(array['admin','editor']::public.user_role[]));
create policy "media editors update" on storage.objects for update to authenticated
  using (bucket_id = 'programme-media' and public.is_staff(array['admin','editor']::public.user_role[]));
create policy "media editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'programme-media' and public.is_staff(array['admin','editor']::public.user_role[]));
