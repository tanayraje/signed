# Testing features to remove before launch

- **Juniper, the test friend** (Mumbai). She opens your letters when they land and writes back a minute later with a cut stamp.
  - Remove: `select cron.unschedule('signed-test-friend'); drop function public.test_friend_tick(); delete from auth.users where id = '00000000-0000-4000-8000-00000000a11e'; alter table public.profiles drop column is_test;`
  - Delete `public/assets/test/`, the `/assets/test/` line in `src/lib/media.ts`, and `supabase/migrations/20261102000100_TEST_test_friend.sql`.
- **Quick flights** toggle in Profile (letters land in one minute).
