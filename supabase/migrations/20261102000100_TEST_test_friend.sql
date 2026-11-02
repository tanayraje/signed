-- TESTING ONLY. Remove before launch (see the "Remove testing" steps in the repo notes).
-- Juniper is a pretend friend in Mumbai. When your letter reaches her, she opens it
-- (keeping your stamp) and writes back with a stamp she "cut", landing a minute later.

alter table public.profiles add column if not exists is_test boolean not null default false;

do $$
declare bot uuid := '00000000-0000-4000-8000-00000000a11e';
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (bot, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'juniper@test.signed.invalid',
          '{"provider":"email","providers":["email"]}', '{"name":"Juniper"}', now(), now())
  on conflict (id) do nothing;
  update public.profiles set name = 'Juniper', monogram = 'J', wax = 'plum', mixins = '{petals}', edge = 'uneven', mark = 'sprig',
    plume = 'white', eye = 'gold', owl_name = 'Moth', quick_flights = true, onboarded = true, is_test = true,
    last_lat = 19.076, last_lon = 72.8777, last_place = 'Mumbai', last_seen_at = now()
  where id = bot;
  -- friends with everyone who has an account
  insert into public.friend_settings (owner, friend, post_day)
    select p.id, bot, 5 from public.profiles p where p.id <> bot on conflict do nothing;
  insert into public.friend_settings (owner, friend, post_day)
    select bot, p.id, 5 from public.profiles p where p.id <> bot on conflict do nothing;
end $$;

create or replace function public.test_friend_tick() returns void
language plpgsql security definer set search_path = public as $$
declare
  bot uuid := '00000000-0000-4000-8000-00000000a11e';
  l record; n int; st uuid;
  lines text[] := array[
    'Your owl found me on the balcony, shaking rain off its wings. I read your letter twice with chai going cold beside me. Tell me what the sky looked like when you sent it.',
    'Moth is getting proud of these long flights. Mumbai is loud today, honking and hawkers and the sea doing its thing. Your letter was the quiet part.',
    'I cut you a stamp from something I saw on the way home. Keep it somewhere safe, it is the only one there is.',
    'This is a test letter, but I meant every word. Write back when the light is nice.'];
  caps text[] := array['Night post', 'Bombay coast', 'Sealed with care', 'In flight'];
begin
  for l in select * from letters where recipient = bot and arrive_at <= now() and opened_at is null loop
    update letters set opened_at = now(), place = 'trunk' where id = l.id;
    update stamps set status = 'collected', collected_at = now() where letter_id = l.id and owner = bot and status = 'flying';
    select count(*) into n from letters where sender = bot;
    insert into stamps (owner, made_by, image_path, cutter, caption)
      values (bot, bot, '/assets/test/stamp-' || (n % 4 + 1) || '.png', 'classic', caps[n % 4 + 1]) returning id into st;
    insert into letters (sender, recipient, kind, body, question, stamp)
      values (bot, l.sender, 'letter', lines[n % 4 + 1],
              case when n % 2 = 0 then 'What is one small thing that made you smile this week?' end, 'custom:' || st);
  end loop;
end $$;
revoke execute on function public.test_friend_tick() from public, anon, authenticated;

select cron.schedule('signed-test-friend', '* * * * *', 'select public.test_friend_tick()');

-- (Later revision, also applied live as TEST_test_friend_answers: Juniper answers the questions you ask.
--  The live function body includes an answers jsonb built from your letter's question and question scraps.)
