-- ⚠️ NE PAS EXÉCUTER DANS SUPABASE. Fichier de test pour développeurs, via psql sur une base locale jetable.
-- Il crée de faux comptes et modifie les données. Pour installer la base, utilisez uniquement
-- migrations/*.sql puis seed.sql.
-- Tests des règles d'accès (RLS).
-- Local : psql -f local_stub.sql -f ../migrations/20261019000000_init.sql -f ../seed.sql -f rls_test.sql
-- Chaque ligne affiche PASS ou FAIL.
\set QUIET on
create or replace function public.t_ok(label text, cond boolean) returns void language plpgsql as $$
begin raise notice '% %', case when cond then 'PASS' else 'FAIL' end, label; end $$;
create or replace function public.t_err(label text, stmt text) returns void language plpgsql as $$
begin execute stmt; raise notice 'FAIL % (no error)', label;
exception when others then raise notice 'PASS % (%)', label, left(sqlerrm, 60); end $$;
create or replace function public.t_rows(label text, stmt text, expected int) returns void language plpgsql as $$
declare n int; begin execute 'select count(*) from (' || stmt || ') x' into n;
raise notice '% % (got %, want %)', case when n = expected then 'PASS' else 'FAIL' end, label, n, expected; end $$;
grant execute on function t_ok(text,boolean), t_err(text,text), t_rows(text,text,int) to authenticated, anon;

insert into auth.users values
 ('00000000-0000-0000-0000-0000000000a1','awa@x','{"first_name":"Awa","is_adult":true}'),
 ('00000000-0000-0000-0000-0000000000b1','koffi@x','{"first_name":"Koffi"}'),
 ('00000000-0000-0000-0000-0000000000c1','mariam@x','{"first_name":"Mariam"}'),
 ('00000000-0000-0000-0000-0000000000d1','judie@x','{"first_name":"Judie"}'),
 ('00000000-0000-0000-0000-0000000000e1','other@x','{"first_name":"Autre"}'),
 ('00000000-0000-0000-0000-0000000000f1','admin@x','{"first_name":"Admin"}');
update profiles set role='coach' where id in ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000e1');
update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000f1';
update feature_flags set enabled = true where key in ('written_support','support_calls');
insert into coach_profiles(user_id, display_name, verified) values ('00000000-0000-0000-0000-0000000000d1','Judie Ore', true);

set role authenticated;
-- Each participant enrols (demo autonome)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
reset role; insert into enrolments(user_id, programme_id, status, admission_status) select current_setting('request.jwt.claim.sub')::uuid, id, 'active', 'admis' from programmes where slug='inquietudes'; set role authenticated;
select t_err('member cannot self-enrol in paid plan', $$insert into enrolments(user_id, programme_id, plan) select auth.uid(), id from programmes limit 1$$);
select t_err('member cannot change own plan', $$update enrolments set plan='ecrit'$$);
select t_err('member cannot change own role', $$update profiles set role='admin' where id=auth.uid()$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
reset role; insert into enrolments(user_id, programme_id, status, admission_status) select current_setting('request.jwt.claim.sub')::uuid, id, 'active', 'admis' from programmes where slug='inquietudes'; set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
reset role; insert into enrolments(user_id, programme_id, status, admission_status) select current_setting('request.jwt.claim.sub')::uuid, id, 'active', 'admis' from programmes where slug='inquietudes'; set role authenticated;

-- Admin sets plans and coach
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select admin_update_enrolment((select enrolment_id from admin_enrolments() where first_name='Awa'), 'ecrit', '00000000-0000-0000-0000-0000000000d1', true);
select admin_update_enrolment((select enrolment_id from admin_enrolments() where first_name='Koffi'), 'appels', '00000000-0000-0000-0000-0000000000d1', false);
select t_rows('admin sees 3 enrolments', 'select * from admin_enrolments()', 3);

-- Awa (forfait 2) writes private data and messages
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
insert into journal_entries(user_id, enrolment_id, week_number, body) select auth.uid(), id, 1, 'journal secret Awa' from enrolments;
insert into exercise_responses(enrolment_id, step_id, user_id, data) select e.id, s.id, auth.uid(), '{"a":"x"}' from enrolments e, programme_steps s limit 1;
insert into goals(user_id, enrolment_id, scope, title) select auth.uid(), id, 'principal', 'Mieux dormir' from enrolments;
insert into messages(enrolment_id, sender_id, kind, body) select id, auth.uid(), 'question', 'Bonjour Judie' from enrolments;
insert into shared_summaries(enrolment_id, user_id, week_number, body) select id, auth.uid(), 1, 'Bilan partagé S1' from enrolments;
select t_err('questionnaire blocked when flag off', $$insert into questionnaire_responses(enrolment_id,user_id,instrument,week_number,answers,total) select id, auth.uid(), 'GAD7', 1, '{0,0,0,0,0,0,0}', 0 from enrolments$$);
select t_err('Awa cannot book calls (forfait 2)', $$insert into appointments(enrolment_id, session_number, starts_at) select id, 1, now() + interval '2 days' from enrolments$$);

-- Koffi (forfait 3): only practical messages; can book calls
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_err('Koffi cannot send weekly support message', $$insert into messages(enrolment_id, sender_id, kind, body) select id, auth.uid(), 'suivi', 'x' from enrolments$$);
insert into messages(enrolment_id, sender_id, kind, body) select id, auth.uid(), 'pratique', 'Je ne serai pas dispo jeudi' from enrolments;
insert into appointments(enrolment_id, session_number, starts_at, mode) select id, 1, now() + interval '3 days', 'video' from enrolments;
select t_err('Koffi cannot self-confirm appointment', $$update appointments set status='confirme'$$);
select t_rows('Koffi cannot see Awa messages', 'select * from messages', 1);
select t_rows('Koffi cannot see Awa journal', 'select * from journal_entries', 0);

-- Mariam (autonome): no messaging
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select t_err('Mariam cannot message', $$insert into messages(enrolment_id, sender_id, kind, body) select id, auth.uid(), 'pratique', 'x' from enrolments$$);
select t_rows('Mariam sees no coach profile restriction issue', 'select * from coach_profiles', 1);

-- Coach Judie
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t_rows('Judie sees 2 participants', 'select * from coach_participants()', 2);
select t_rows('Judie direct journal access = 0', 'select * from journal_entries', 0);
select t_rows('Judie direct exercise access = 0', 'select * from exercise_responses', 0);
select t_rows('Judie direct goals access = 0', 'select * from goals', 0);
select t_rows('Judie direct messages select = 0 (must use RPC)', 'select * from messages', 0);
select t_ok('summaries hidden without consent', (select jsonb_array_length(coach_participant((select enrolment_id from coach_participants() where first_name='Awa'))->'summaries') = 0));
select t_ok('questionnaires null when disabled', (select coach_participant((select enrolment_id from coach_participants() where first_name='Awa'))->'questionnaires' = 'null'::jsonb));
insert into messages(enrolment_id, sender_id, kind, body) select enrolment_id, auth.uid(), 'suivi', 'Bonjour Awa, voici mon retour' from coach_participants() where first_name='Awa';
select t_err('Judie cannot send suivi to Koffi (forfait 3)', $$insert into messages(enrolment_id, sender_id, kind, body) select enrolment_id, auth.uid(), 'suivi', 'x' from coach_participants() where first_name='Koffi'$$);
insert into coach_notes(enrolment_id, coach_id, body) select enrolment_id, auth.uid(), 'Note pro' from coach_participants() where first_name='Awa';
insert into referrals(enrolment_id, coach_id, category, description) select enrolment_id, auth.uid(), 'besoin_evaluation', 'Orientation médecin' from coach_participants() where first_name='Awa';
insert into resource_suggestions(enrolment_id, coach_id, kind, ref, title, adequacy_reviewed) select enrolment_id, auth.uid(), 'article', 'dormir-tete', 'Dormir', true from coach_participants() where first_name='Awa';
select coach_update_appointment((select id from coach_calendar() limit 1), 'confirme');
select t_rows('Judie calendar', 'select * from coach_calendar() where status = ''confirme''', 1);
select t_err('Judie cannot enrol herself as admin', $$select admin_overview()$$);

-- Other coach K: no access
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',false);
select t_rows('Other coach sees 0 participants', 'select * from coach_participants()', 0);
select t_err('Other coach cannot open Awa', $$select coach_participant((select id from enrolments limit 1))$$);
select t_rows('Other coach sees no notes', 'select * from coach_notes', 0);
select t_err('Other coach cannot message Awa', $$insert into messages(enrolment_id, sender_id, kind, body) values ((select e.id from enrolments e limit 1), auth.uid(), 'pratique', 'x')$$);

-- Awa consents to share summaries, sees coach reply & suggestions, not notes/referrals
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
update enrolments set share_summaries = true;
select t_rows('Awa sees 2 messages', 'select * from messages', 2);
select t_rows('Awa sees suggestion', 'select * from resource_suggestions', 1);
select t_rows('Awa cannot see coach notes', 'select * from coach_notes', 0);
select t_rows('Awa cannot see referrals', 'select * from referrals', 0);
select t_ok('export works', (select (export_my_data()->'journal'->0->>'body') = 'journal secret Awa'));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t_ok('summaries visible after consent', (select jsonb_array_length(coach_participant((select enrolment_id from coach_participants() where first_name='Awa'))->'summaries') = 1));

-- Admin: no private content; sees log
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select t_rows('Admin journal access = 0', 'select * from journal_entries', 0);
select t_rows('Admin exercise access = 0', 'select * from exercise_responses', 0);
select t_rows('Admin messages access = 0', 'select * from messages', 0);
select t_rows('Admin sees referral', 'select * from referrals', 1);
select t_ok('Access log has coach views', (select count(*) >= 3 from access_log where action like 'coach_%'));
select t_ok('Access log has notes/messages trigger', (select count(*) >= 2 from access_log where action in ('coach_notes_insert','messages_insert')));
select admin_set_flag('questionnaires', true);
-- questionnaires now: Awa enabled (plan ecrit, enrolment flag true) but programme flag false -> still blocked
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t_err('questionnaire blocked when programme flag off', $$insert into questionnaire_responses(enrolment_id,user_id,instrument,week_number,answers,total) select id, auth.uid(), 'PHQ9', 1, '{0,0,0,0,0,0,0,0,1}', 0 from enrolments$$);
reset role;
update programmes set questionnaires_enabled = true;
set role authenticated;
insert into questionnaire_responses(enrolment_id,user_id,instrument,week_number,answers,total) select id, auth.uid(), 'PHQ9', 1, '{0,0,0,0,0,0,0,0,1}', 0 from enrolments;
select t_ok('PHQ9 item 9 flagged for review', (select needs_attention and total = 1 from questionnaire_responses));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_err('Koffi (no participant activation) blocked', $$insert into questionnaire_responses(enrolment_id,user_id,instrument,week_number,answers,total) select id, auth.uid(), 'GAD7', 1, '{0,0,0,0,0,0,0}', 0 from enrolments$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t_ok('Coach sees needs_attention', (select needs_attention = 1 from coach_participants() where first_name='Awa'));
select coach_review_questionnaire((select (coach_participant(enrolment_id)->'questionnaires'->0->>'id')::uuid from coach_participants() where first_name='Awa'), 'Appel réalisé, orientation médecin');
select t_ok('Reviewed', (select needs_attention = 0 from coach_participants() where first_name='Awa'));
-- Anonymous
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select t_rows('anon sees no weeks (lessons private)', 'select * from programme_weeks', 0);
select t_rows('anon sees 0 step content', 'select * from programme_steps', 0);
select t_rows('anon sees coach profile', 'select * from coach_profiles', 1);
insert into contact_messages(name,email,subject,message,consent) values ('n','e@x','s','m',true);
select t_err('anon cannot read contact', $$select 1/0 from contact_messages having count(*) > 0$$);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select t_err('member cannot self-enrol', $$insert into enrolments(user_id, programme_id, plan) select auth.uid(), id, 'appels' from programmes limit 1$$);
select t_err('member cannot self-assign coach', $$insert into enrolments(user_id, programme_id, coach_id) select auth.uid(), id, '00000000-0000-0000-0000-0000000000d1' from programmes limit 1$$);
select t_rows('member cannot read contact', 'select * from contact_messages', 0);
select t_rows('member cannot read access log', 'select * from access_log', 0);
select t_err('member cannot call log_access', $$select log_access('fake', null)$$);
select t_err('member cannot set flag', $$select admin_set_flag('payments', true)$$);
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select t_rows('anon cannot read contact', 'select * from contact_messages', 0);
select t_rows('anon cannot read profiles', 'select * from profiles', 0);
