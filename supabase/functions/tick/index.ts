// Runs every minute (see supabase/cron.sql).
// 1. Tells the story of each flight: takeoff, halfway (long flights), and landing.
// 2. Rings the 11:11 wish alarm for friends who both turned it on.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { whereabouts } from '../_shared/where.ts';

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
  const out: { status: number; body?: string }[] = [];
  for (const s of subs ?? []) {
    try {
      const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400, urgency: 'high' });
      out.push({ status: r.statusCode });
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      const code = err.statusCode ?? 0;
      console.error('push failed', code, err.body ?? err.message);
      out.push({ status: code, body: String(err.body ?? err.message ?? '') });
      if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id);
    }
  }
  return out;
}

function localParts(tz: string, d = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, hour: Number(p.hour), minute: Number(p.minute), date: `${p.year}-${p.month}-${p.day}` };
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
    const where = l.from_lat != null && l.to_lat != null ? whereabouts((l.from_lat + l.to_lat) / 2, (l.from_lon! + l.to_lon!) / 2) : null;
    await push(l.recipient, {
      title: `${owl} is halfway there`,
      body: `${where ? `Now ${where}, with` : 'Flying with'} ${what(l.kind)} from ${from?.name || 'a friend'}. About ${inWords(new Date(l.arrive_at).getTime() - now)} to go.`,
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
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  if (body?.test) return Response.json(await push(body.test, { title: 'Signed', body: 'Testing your notifications.', url: '/#/wall', tag: 'test' }));
  const [took, mid, delivered, wished] = await Promise.all([takeoffs(), midways(), deliver(), wishAlarm()]);
  return Response.json({ took, mid, delivered, wished });
});
