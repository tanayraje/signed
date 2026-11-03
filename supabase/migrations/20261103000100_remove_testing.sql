-- Testing is over. Fresh start: remove the test friend Juniper and every letter, scrap,
-- stamp, pin, wish and invite made while testing. Accounts, seals, owls and notification
-- sign-ups stay.
select cron.unschedule('signed-test-friend') where exists (select 1 from cron.job where jobname = 'signed-test-friend');
delete from public.wall_pins;
delete from public.stamps;
delete from public.scraps;
delete from public.wishes;
delete from public.invites;
delete from public.letters;
delete from auth.users where id = '00000000-0000-4000-8000-00000000a11e';
drop function if exists public.test_friend_tick();
alter table public.profiles drop column if exists is_test;
update public.profiles set quick_flights = false where quick_flights;
