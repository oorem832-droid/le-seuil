-- ⚠️ NE PAS EXÉCUTER DANS SUPABASE. Tests pour base locale jetable : psql -f local_stub.sql -f ../migrations/*.sql -f ../seed.sql -f ../private/programme-01.sql -f helpers.sql -f rls_test_v3.sql
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','awa@x','{}'),('00000000-0000-0000-0000-0000000000b1','bob@x','{}'),
 ('00000000-0000-0000-0000-0000000000d1','judie@x','{}'),('00000000-0000-0000-0000-0000000000f1','admin@x','{}');
update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000f1';
update profiles set role='coach' where id='00000000-0000-0000-0000-0000000000d1';
insert into programmes(slug,title,status) values ('autre','Autre programme','demo');
insert into programme_weeks(programme_id,week_number,title) select id,1,'S1 autre' from programmes where slug='autre';
insert into programme_steps(week_id,step_key,position,kind,title) select w.id,'l1',0,'lecon','Leçon autre' from programme_weeks w join programmes p on p.id=w.programme_id where p.slug='autre';
-- anonymous
set role anon; select set_config('request.jwt.claim.sub','',false);
select t_rows('anon sees programme presentations', 'select * from programmes', 2);
select t_rows('anon sees 0 weeks', 'select * from programme_weeks', 0);
select t_rows('anon sees 0 steps', 'select * from programme_steps', 0);
select t_rows('anon sees 0 articles (all a_relire)', 'select * from articles', 0);
insert into enrolment_requests(programme_slug,plan,first_name,last_name,email,is_adult,consent) values ('inquietudes','ecrit','Awa','K','awa@x',true,true);
select t_err('anon cannot pre-accept request', $$insert into enrolment_requests(programme_slug,plan,first_name,last_name,email,is_adult,consent,status) values ('inquietudes','ecrit','A','K','a@x',true,true,'acceptee')$$);
select t_rows('anon cannot read requests', 'select * from enrolment_requests', 0);
reset role; set role authenticated;
-- member without enrolment
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t_rows('member w/o enrolment: 0 steps', 'select * from programme_steps', 0);
select t_err('member cannot self-enrol', $$insert into enrolments(user_id,programme_id) select auth.uid(), id from programmes where slug='inquietudes'$$);
-- admin creates enrolment (pending admission)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select admin_add_enrolment('00000000-0000-0000-0000-0000000000a1', (select id from programmes where slug='inquietudes'), 'ecrit', 'paye', 'en_attente', null, null, '00000000-0000-0000-0000-0000000000d1');
select t_rows('admin sees requests', 'select * from enrolment_requests', 1);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t_rows('admission pending: 0 steps', 'select * from programme_steps', 0);
select t_err('member cannot self-admit', $$update enrolments set admission_status='admis'$$);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select admin_save_enrolment((select enrolment_id from admin_enrolments() where first_name='' and programme='Apprendre à gérer mes inquiétudes' limit 1), 'ecrit', '00000000-0000-0000-0000-0000000000d1', false, 'active', 'paye', 'admis', null, now() + interval '60 days', false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select t_rows('admitted: sees P01 steps', 'select s.* from programme_steps s join programme_weeks w on w.id=s.week_id join programmes p on p.id=w.programme_id where p.slug=''inquietudes''', 94);
select t_rows('admitted: no access to other programme', 'select s.* from programme_steps s join programme_weeks w on w.id=s.week_id join programmes p on p.id=w.programme_id where p.slug=''autre''', 0);
insert into step_progress(enrolment_id, step_id, user_id) select e.id, s.id, auth.uid() from enrolments e, programme_steps s join programme_weeks w on w.id=s.week_id join programmes p on p.id=w.programme_id where p.slug='inquietudes' limit 1;
select mark_password_set();
-- expiry
reset role; create table public.tmp_ids as select id as step_id from programme_steps limit 1; grant select on public.tmp_ids to authenticated; update enrolments set access_expires_at = now() - interval '1 day'; set role authenticated;
select t_rows('expired: 0 steps', 'select * from programme_steps', 0);
select t_err('expired: cannot write progress', $$insert into exercise_responses(enrolment_id, step_id, user_id) select (select id from enrolments limit 1), (select step_id from tmp_ids), auth.uid()$$);
reset role; update enrolments set access_expires_at = null, suspended = true; set role authenticated;
select t_rows('suspended enrolment: 0 steps', 'select * from programme_steps', 0);
reset role; update enrolments set suspended = false; update profiles set account_status='suspended' where id='00000000-0000-0000-0000-0000000000a1'; set role authenticated;
select t_rows('suspended account: 0 steps', 'select * from programme_steps', 0);
reset role; update profiles set account_status='active' where id='00000000-0000-0000-0000-0000000000a1'; set role authenticated;
select t_rows('reactivated: steps again', 'select s.* from programme_steps s join programme_weeks w on w.id=s.week_id join programmes p on p.id=w.programme_id where p.slug=''inquietudes''', 94);
-- other member sees nothing of Awa
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select t_rows('Bob sees no enrolment', 'select * from enrolments', 0);
select t_rows('Bob sees no progress', 'select * from step_progress', 0);
select t_err('Bob cannot call admin_enrolments', $$select * from admin_enrolments()$$);
-- coach
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',false);
select t_ok('coach sees steps', (select count(*) > 0 from programme_steps));
-- articles editorial
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000f1',false);
select t_rows('admin sees 62 articles', 'select * from articles', 62);
update articles set etat='publie' where slug like 'la-sante-mentale-c-est%';
select t_err('cannot publish review-required without review', $$update articles set etat='publie' where id = (select id from articles where professional_review_required limit 1)$$);
select t_err('cannot publish post-partum psychosis without review', $$update articles set etat='publie' where title like 'Psychose%'$$);
update articles set professional_review_done=true, etat='publie' where title like 'Psychose%';
select t_rows('versions recorded', 'select * from article_versions', 2);
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
select t_rows('anon sees 2 published articles', 'select * from articles', 2);
