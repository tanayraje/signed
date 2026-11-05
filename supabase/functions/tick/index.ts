// Runs every minute (see supabase/cron.sql).
// 1. Tells the story of each flight: takeoff, halfway (long flights), and landing.
// 2. Sends pockets on post day for friends with auto-post on.
// 3. Rings the 11:11 wish alarm for friends who both turned it on.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function secret(key: string): Promise<string | null> {
  const { data } = await supabase.rpc('get_app_secret', { k: key });
  return (data as string | null) ?? null;
}

// Push keys live in the database. The first run makes a pair, so nobody has to copy keys around.
let pushReady: Promise<void> | null = null;
function setupPush() {
  pushReady ??= (async () => {
    let pub = Deno.env.get('VAPID_PUBLIC_KEY') ?? (await secret('vapid_public'));
    let priv = Deno.env.get('VAPID_PRIVATE_KEY') ?? (await secret('vapid_private'));
    if (!pub || !priv) {
      const keys = webpush.generateVAPIDKeys();
      pub = keys.publicKey; priv = keys.privateKey;
      await supabase.rpc('set_app_secret', { k: 'vapid_public', v: pub });
      await supabase.rpc('set_app_secret', { k: 'vapid_private', v: priv });
    }
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@signed.app', pub, priv);
  })();
  return pushReady;
}

type Profile = { id: string; name: string; owl_name: string; tz: string };

async function push(userId: string, payload: Record<string, unknown>) {
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id);
    }
  }
}

function localParts(tz: string, d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, hour: Number(p.hour), minute: Number(p.minute), date: `${p.year}-${p.month}-${p.day}` };
}

// Places an owl can be "over" on the way. Coarse on purpose; far from all of them, it's over the sea.
const PLACES: [string, number, number][] = [
  ['Bengaluru', 12.97, 77.59], ['Mumbai', 19.08, 72.88], ['Delhi', 28.61, 77.21], ['Kolkata', 22.57, 88.36], ['Chennai', 13.08, 80.27],
  ['Hyderabad', 17.39, 78.49], ['Pune', 18.52, 73.86], ['Ahmedabad', 23.02, 72.57], ['Jaipur', 26.91, 75.79], ['Kochi', 9.93, 76.27],
  ['Goa', 15.5, 73.83], ['Lucknow', 26.85, 80.95], ['Guwahati', 26.14, 91.74], ['Bhopal', 23.26, 77.41], ['Nashik', 20.0, 73.79],
  ['Indore', 22.72, 75.86], ['Nagpur', 21.15, 79.09], ['Hubballi', 15.36, 75.12], ['Mysuru', 12.3, 76.64], ['Coimbatore', 11.02, 76.96],
  ['Visakhapatnam', 17.69, 83.22], ['Bhubaneswar', 20.3, 85.82], ['Patna', 25.59, 85.14], ['Varanasi', 25.32, 82.97], ['Raipur', 21.25, 81.63],
  ['Udaipur', 24.58, 73.71], ['Amritsar', 31.63, 74.87], ['Kathmandu', 27.72, 85.32], ['Colombo', 6.93, 79.86], ['Dhaka', 23.81, 90.41],
  ['Karachi', 24.86, 67.0], ['Muscat', 23.59, 58.41], ['Dubai', 25.2, 55.27], ['Riyadh', 24.71, 46.68], ['Tehran', 35.69, 51.39],
  ['Baghdad', 33.31, 44.36], ['Istanbul', 41.01, 28.98], ['Cairo', 30.04, 31.24], ['Athens', 37.98, 23.73], ['Rome', 41.9, 12.5],
  ['Vienna', 48.21, 16.37], ['Berlin', 52.52, 13.4], ['Paris', 48.86, 2.35], ['London', 51.51, -0.13], ['Madrid', 40.42, -3.7],
  ['Moscow', 55.76, 37.62], ['Almaty', 43.24, 76.95], ['Kabul', 34.56, 69.21], ['Bangkok', 13.76, 100.5], ['Singapore', 1.35, 103.82],
  ['Hong Kong', 22.32, 114.17], ['Beijing', 39.9, 116.4], ['Tokyo', 35.68, 139.69], ['Sydney', -33.87, 151.21], ['Nairobi', -1.29, 36.82],
  ['Reykjavik', 64.15, -21.94], ['New York', 40.71, -74.0], ['Toronto', 43.65, -79.38], ['Chicago', 41.88, -87.63], ['San Francisco', 37.77, -122.42]
];
const km = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180, h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
function overPlace(from: [number, number], to: [number, number]): string | null {
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  let best = PLACES[0], bd = Infinity;
  for (const p of PLACES) { const d = km(mid, [p[1], p[2]]); if (d < bd) { bd = d; best = p; } }
  return bd < 350 ? best[0] : null;
}
function inWords(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

type Flight = { id: string; sender: string; recipient: string; kind: string; sent_at: string; arrive_at: string;
  from_lat: number | null; from_lon: number | null; to_lat: number | null; to_lon: number | null; from_place: string | null };

async function people(ids: string[]) {
  const { data } = await supabase.from('profiles').select('id, name, owl_name, tz').in('id', [...new Set(ids)]);
  return new Map((data ?? []).map((p: Profile) => [p.id, p]));
}
const what = (kind: string) => (kind === 'bundle' ? 'a bundle of scraps' : 'a letter');

// 1. Takeoff: the owl has just left
async function takeoffs() {
  const { data } = await supabase.from('letters')
    .select('id, sender, recipient, kind, sent_at, arrive_at, from_lat, from_lon, to_lat, to_lon, from_place')
    .eq('told_takeoff', false).gt('arrive_at', new Date().toISOString()).limit(200);
  if (!data?.length) return 0;
  const byId = await people(data.flatMap((l: Flight) => [l.sender, l.recipient]));
  for (const l of data as Flight[]) {
    const from = byId.get(l.sender);
    await push(l.recipient, {
      title: 'An owl is on its way',
      body: `${from?.owl_name || 'An owl'} just left${l.from_place ? ` ${l.from_place}` : ''} with ${what(l.kind)} from ${from?.name || 'a friend'}. Lands in about ${inWords(new Date(l.arrive_at).getTime() - Date.now())}.`,
      url: `/#/map/${l.sender}`,
      tag: `flight-${l.id}`
    });
    await supabase.from('letters').update({ told_takeoff: true }).eq('id', l.id);
  }
  return data.length;
}

// 2. Halfway, on long flights: where the owl is now
async function midways() {
  const now = Date.now();
  const { data } = await supabase.from('letters')
    .select('id, sender, recipient, kind, sent_at, arrive_at, from_lat, from_lon, to_lat, to_lon, from_place')
    .eq('told_takeoff', true).eq('told_midway', false).gt('arrive_at', new Date(now).toISOString()).limit(200);
  const due = (data ?? [] as Flight[]).filter((l: Flight) => {
    const a = new Date(l.sent_at).getTime(), b = new Date(l.arrive_at).getTime();
    return b - a >= 90 * 60000 && now >= a + (b - a) / 2;
  });
  if (!due.length) return 0;
  const byId = await people(due.flatMap((l: Flight) => [l.sender, l.recipient]));
  for (const l of due as Flight[]) {
    const from = byId.get(l.sender), owl = from?.owl_name || 'The owl';
    const over = l.from_lat != null && l.to_lat != null ? overPlace([l.from_lat, l.from_lon!], [l.to_lat, l.to_lon!]) : null;
    await push(l.recipient, {
      title: over ? `${owl} is over ${over}` : `${owl} is somewhere over the sea`,
      body: `Halfway there with ${what(l.kind)} from ${from?.name || 'a friend'}. About ${inWords(new Date(l.arrive_at).getTime() - now)} to go.`,
      url: `/#/map/${l.sender}`,
      tag: `flight-${l.id}`
    });
    await supabase.from('letters').update({ told_midway: true }).eq('id', l.id);
  }
  return due.length;
}

// 3. Landing: the letter is waiting
async function deliver() {
  const { data: landed } = await supabase
    .from('letters').select('id, sender, recipient, kind')
    .eq('notified', false).lte('arrive_at', new Date().toISOString()).limit(200);
  if (!landed?.length) return 0;
  const byId = await people(landed.flatMap((l) => [l.sender, l.recipient]));
  for (const l of landed) {
    const from = byId.get(l.sender);
    const { count } = await supabase.from('letters').select('id', { count: 'exact', head: true })
      .eq('recipient', l.recipient).is('opened_at', null).lte('arrive_at', new Date().toISOString());
    await push(l.recipient, {
      badge: count ?? 1,
      title: `${from?.owl_name || 'An owl'} has landed`,
      body: `${l.kind === 'bundle' ? 'A bundle of scraps' : 'A letter'} from ${from?.name || 'a friend'} is waiting on your windowsill. Hold the seal to open it.`,
      url: `/#/friend/${l.sender}`,
      tag: `flight-${l.id}`
    });
    await supabase.from('letters').update({ notified: true, told_takeoff: true, told_midway: true }).eq('id', l.id);
  }
  return landed.length;
}

async function postDay() {
  const { data: rows } = await supabase
    .from('friend_settings').select('owner, friend, post_day, last_auto_post, profiles!friend_settings_owner_fkey(tz)')
    .eq('auto_post', true);
  let sent = 0;
  for (const r of rows ?? []) {
    const tz = (r as unknown as { profiles: { tz: string } }).profiles?.tz ?? 'Asia/Kolkata';
    const now = localParts(tz);
    if (now.day !== r.post_day || now.hour < 18 || r.last_auto_post === now.date) continue;
    const { data: scraps } = await supabase.from('scraps').select('type, text, media_path, created_at').eq('owner', r.owner).eq('friend', r.friend).order('created_at');
    await supabase.from('friend_settings').update({ last_auto_post: now.date }).eq('owner', r.owner).eq('friend', r.friend);
    if (!scraps?.length) continue;
    // Insert as the service role: fill in what the trigger would normally take from auth.uid().
    const { error } = await supabase.rpc('send_pocket_for', { owner_id: r.owner, friend_id: r.friend });
    if (!error) sent++;
  }
  return sent;
}

async function wishAlarm() {
  const { data: rows } = await supabase.from('friend_settings').select('owner, friend').eq('wish_1111', true);
  if (!rows?.length) return 0;
  const mutual = rows.filter((r) => rows.some((o) => o.owner === r.friend && o.friend === r.owner));
  const ids = [...new Set(mutual.flatMap((r) => [r.owner, r.friend]))];
  const { data: people } = await supabase.from('profiles').select('id, name, owl_name, tz').in('id', ids);
  const byId = new Map((people ?? []).map((p: Profile) => [p.id, p]));
  const ringing = new Map<string, string[]>();
  for (const r of mutual) {
    const me = byId.get(r.owner);
    if (!me) continue;
    const t = localParts(me.tz);
    if (t.minute !== 11 || (t.hour !== 11 && t.hour !== 23)) continue;
    ringing.set(r.owner, [...(ringing.get(r.owner) ?? []), byId.get(r.friend)?.name ?? 'a friend']);
  }
  for (const [userId, names] of ringing) {
    await push(userId, { title: "It's 11:11", body: `Make a wish together with ${names.join(' and ')}.`, url: '/#/wish', tag: 'wish-1111' });
  }
  return ringing.size;
}

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const tick = Deno.env.get('TICK_SECRET') ?? (await secret('tick'));
  if (!tick || auth !== `Bearer ${tick}`) return new Response('Not allowed', { status: 401 });
  await setupPush();
  const [took, mid, delivered, posted, wished] = await Promise.all([takeoffs(), midways(), deliver(), postDay(), wishAlarm()]);
  return Response.json({ took, mid, delivered, posted, wished });
});
