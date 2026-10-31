# Signed

Letters between friends, carried by owls. A phone-first web app (PWA): design your wax seal and your owl, write letters that fly the real straight-line distance between where you and your friend are, lift the seal to open them, pin favourites to your wall, and wish together at 11:11.

## What's in it

- **Seal and owl.** Your wax seal is your identity: wax colour, pressed letters and mix-ins. Your owl (eight plumages, three eye colours, a name) carries everything you send. Change both later from Profile.
- **Friends by invite.** Share an invite link; once your friend opens it and signs in, you're connected.
- **Location.** Each time someone opens Signed, it reads their location and keeps the last one. Letters fly from the sender's latest location to the recipient's latest location.
- **Flight time.** Set by the server from the straight-line distance: owls cruise about 300 km/h, never less than 20 minutes or more than 6 hours. The map path wanders a little; the distance does not. Turn on Quick flights in Profile for one-minute test flights.
- **Letters.** Text, a Polaroid, a question card, a stamp (four built in, or make your own from a photo), and your signature.
- **Enchanted mode.** Only while writing: flip the switch, speak, and your words write themselves. The recipient hears your voice while each word appears in ink. You can also attach a moving picture (a short video).
- **Pocket and post day.** Drop scraps through the week, then send now or save them for post day. With auto-post on, the pocket leaves on its own on post day evening.
- **Opening.** Press and hold the seal to lift it off; it's kept for the seal calendar, the flap folds back and the letter rises.
- **Wall, trunk and seals.** Pin letters to your wall, fold the rest into the trunk, and see every shared day as a seal on the calendar.
- **11:11.** Turn it on per friend. When you have both turned it on, an alarm notification rings at 11:11 morning and night; hold to make your wish together.

## Stack

React + Vite + TypeScript, `vite-plugin-pwa` (custom service worker for push), Supabase (auth, Postgres with row-level security, storage, edge functions, cron). Deploys to Vercel.

## Set up

1. **Supabase project.** Create one, then link and push the schema:
   ```sh
   npx supabase link --project-ref YOUR-PROJECT
   npx supabase db push
   ```
2. **Auth.** In Authentication > URL configuration, add your site URL (for example `https://signed.vercel.app`) and `http://localhost:5173` to the redirect URLs. Email sign-in uses magic links.
3. **Push keys.** `npx web-push generate-vapid-keys`. Put the public key in `VITE_VAPID_PUBLIC_KEY`.
4. **Edge functions.**
   ```sh
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com TICK_SECRET=some-long-random-string
   npx supabase secrets set OPENAI_API_KEY=...   # optional, for talking-letter word timings
   npx supabase functions deploy tick --no-verify-jwt
   npx supabase functions deploy transcribe
   ```
5. **Cron.** Open `supabase/cron.sql`, fill in your project ref and `TICK_SECRET`, and run it in the SQL editor. This delivers landing notifications, auto-posts pockets and rings 11:11 every minute.
6. **App.** Copy `.env.example` to `.env`, fill it in, then `npm install` and `npm run dev`. Add the same variables in Vercel and deploy.

On iPhone, open the site in Safari, use Share > Add to Home Screen, then turn on notifications from Profile. iOS only allows web push for apps added to the Home Screen.

## Known limits

- The flight map currently covers India. Flights outside it show distance and progress without the map.
- A web app can only read location while it's open, so "current location" means where each person last opened Signed.
- Web push can't play a custom alarm sound or use the Dynamic Island. Both need a native iOS wrapper later.
- Seal mix-ins other than gold flecks are saved but not yet drawn.
