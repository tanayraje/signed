// Runs every minute (see supabase/cron.sql).
// 1. Tells the story of each flight: takeoff, halfway (long flights), and landing.
// 2. Rings the 11:11 wish alarm for friends who both turned it on.
// 3. Files new logbook stamps (achievements), seal patina and owl rank changes, and tells people about them.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { makeWhere, type WhereData } from '../_shared/where.ts';
import { PATINA, RANKS, RULES, patinaStage, rankIndex, type Stats } from '../_shared/stamp-rules.ts';

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

// Where an owl is, in words. The map data is served by the app; if it can't be fetched, pushes just skip the place.
const APP_URL = Deno.env.get('APP_URL') ?? 'https://signed-mail.vercel.app';
let mapReady: Promise<ReturnType<typeof makeWhere> | null> | null = null;
function loadMap() {
  mapReady ??= fetch(`${APP_URL}/where-data.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d: WhereData) => makeWhere(d))
    .catch((e) => { console.error('where-data', e); mapReady = null; return null; });
  return mapReady;
}
const loadWhere = () => loadMap().then((m) => m?.whereabouts ?? null);

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
  const whereabouts = await loadWhere();
  for (const l of due as Flight[]) {
    const from = byId.get(l.sender), owl = from?.owl_name || 'The owl';
    const where = whereabouts && l.from_lat != null && l.to_lat != null ? whereabouts((l.from_lat + l.to_lat) / 2, (l.from_lon! + l.to_lon!) / 2) : null;
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
      title: `You've got a letter from ${from?.name || 'a friend'}! ✉️`,
      body: `${from?.owl_name || 'Your owl'} just flew in with it. Come read it!`,
      url: `/#/friend/${l.sender}`,
      tag: `flight-${l.id}`
    });
    await supabase.from('letters').update({ notified: true, told_takeoff: true, told_midway: true }).eq('id', l.id);
  }
  return landed.length;
}

// 4. Sea crossings, for the owl achievement: did the straight path between the two places cross open sea?
function crossesSea(isLand: (lat: number, lon: number) => boolean, a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const [p1, l1, p2, l2] = [a[0] * r, a[1] * r, b[0] * r, b[1] * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d < 1e-6) return false;
  const steps = Math.max(8, Math.ceil((d * 6371) / 25));   // a look every ~25 km
  let run = 0;
  for (let i = 1; i < steps; i++) {
    const f = i / steps, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / r, lon = Math.atan2(y, x) / r;
    run = isLand(lat, lon) ? 0 : run + 1;
    if (run >= 4) return true;                              // ~100 km of water in a row, not just a river or bay
  }
  return false;
}

async function seaCrossings() {
  const { data } = await supabase.from('letters').select('id, from_lat, from_lon, to_lat, to_lon')
    .is('over_sea', null).not('from_lat', 'is', null).not('to_lat', 'is', null).limit(300);
  if (!data?.length) return 0;
  const map = await loadMap();
  if (!map) return 0;
  for (const l of data) {
    const sea = crossesSea(map.isLand, [l.from_lat, l.from_lon], [l.to_lat, l.to_lon]);
    await supabase.from('letters').update({ over_sea: sea }).eq('id', l.id);
  }
  return data.length;
}

// 5. Logbook stamps. Anyone who sent or got a letter lately (or hasn't been filed yet) is checked against the rules.
// The first check files what they already had, quietly, dated from their letters; after that each new stamp,
// patina stage and owl rank gets a notification that opens the logbook, where it is stamped in front of them.
type Sent = { sent_at: string; distance_km: number | null; enchanted: boolean | null; audio_path: string | null; to_place: string | null; over_sea: boolean | null };

function datesFromLetters(sent: Sent[]): Record<string, string> {
  const at = (i: number) => sent[i]?.sent_at;
  const nth = (pred: (l: Sent) => boolean, n: number) => { let c = 0; for (const l of sent) { if (pred(l) && ++c === n) return l.sent_at; } return undefined; };
  const kmAt = (target: number) => { let t = 0; for (const l of sent) { t += l.distance_km ?? 0; if (t >= target) return l.sent_at; } return undefined; };
  const cityAt = (n: number) => { const seen = new Set<string>(); for (const l of sent) { const c = l.to_place?.toLowerCase(); if (c) { seen.add(c); if (seen.size === n) return l.sent_at; } } return undefined; };
  const out: Record<string, string | undefined> = {
    first: at(0), busy_beak: at(14), full_bag: at(39), rain_shine: at(79), old_hand: at(149),
    long_haul: kmAt(20000), first_1000: kmAt(2500), cross_country: kmAt(25000), jet_stream: kmAt(50000), wayfarer: kmAt(80000), true_north: kmAt(120000),
    enchanted: nth((l) => !!l.enchanted || !!l.audio_path, 1), explorer: cityAt(5),
    sea: nth((l) => !!l.over_sea, 3), far_flight: nth((l) => (l.distance_km ?? 0) > 5000, 3),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as Record<string, string>;
}

async function stampCheck() {
  const since = new Date(Date.now() - 30 * 60000).toISOString();
  const [{ data: recent }, { data: states }, { data: everyone }] = await Promise.all([
    supabase.from('letters').select('sender, recipient').gt('sent_at', since).limit(500),
    supabase.from('stamp_state').select('user_id, ready, patina_told, rank_told'),
    supabase.from('profiles').select('id').eq('onboarded', true).limit(1000),
  ]);
  const stateOf = new Map((states ?? []).map((s) => [s.user_id as string, s]));
  const due = new Set<string>((recent ?? []).flatMap((l) => [l.sender as string, l.recipient as string]));
  for (const p of everyone ?? []) if (!stateOf.get(p.id)?.ready && due.size < 60) due.add(p.id);
  if (!due.size) return 0;
  const byId = await people([...due]);
  let told = 0;
  for (const uid of due) {
    const { data: stats } = await supabase.rpc('seal_stats_raw', { target: uid });
    if (!stats) continue;
    const s = stats as Stats;
    const st = stateOf.get(uid);
    const first = !st?.ready;
    const { data: rows } = await supabase.from('stamps').select('achievement').eq('user_id', uid);
    const have = new Set((rows ?? []).map((r) => r.achievement as string));
    const fresh = RULES.filter((r) => r.done(s) && !have.has(r.id));
    const patina = patinaStage(s.sealed, s.seal_since), rank = rankIndex(Math.round(s.km ?? 0));

    if (first) {
      let dated: Record<string, string> = {};
      if (fresh.length) {
        const { data: sent } = await supabase.from('letters').select('sent_at, distance_km, enchanted, audio_path, to_place, over_sea')
          .eq('sender', uid).order('sent_at', { ascending: true }).limit(5000);
        dated = datesFromLetters((sent ?? []) as Sent[]);
        const last = (sent ?? []).at(-1)?.sent_at as string | undefined;
        const now = new Date().toISOString();
        await supabase.from('stamps').upsert(fresh.map((r) => ({ user_id: uid, achievement: r.id, earned_at: dated[r.id] ?? last ?? now, seen_at: now, notified: true })), { onConflict: 'user_id,achievement', ignoreDuplicates: true });
      }
      await supabase.from('stamp_state').upsert({ user_id: uid, ready: true, patina_told: patina, rank_told: rank });
      continue;
    }

    const owl = byId.get(uid)?.owl_name || 'Your owl';
    if (fresh.length) {
      await supabase.from('stamps').upsert(fresh.map((r) => ({ user_id: uid, achievement: r.id, notified: true })), { onConflict: 'user_id,achievement', ignoreDuplicates: true });
      const why = (r: (typeof fresh)[number]) => r.why.replace('{owl}', owl);
      await push(uid, fresh.length === 1
        ? { title: 'Ka-chunk! A new stamp for your log', body: `${fresh[0].title}: ${why(fresh[0])}. Come and watch it get stamped.`, url: '/#/logbook', tag: 'stamp' }
        : { title: `Ka-chunk! ${fresh.length} new stamps for your log`, body: `${fresh.map((r) => r.title).join(', ')}. Come and watch them get stamped.`, url: '/#/logbook', tag: 'stamp' });
      told++;
    }
    const upd: Record<string, number> = {};
    if (patina > (st?.patina_told ?? patina)) {
      await push(uid, { title: `Your seal just turned ${PATINA[patina].name}`, body: `${s.sealed} letters in. ${PATINA[patina].note} Take a look.`, url: '/#/logbook', tag: 'patina' });
      told++;
    }
    if (rank > (st?.rank_told ?? rank)) {
      await push(uid, { title: `${owl} is now a ${RANKS[rank].name}`, body: `${owl} stands on ${RANKS[rank].perch} now, and your letters fly ${RANKS[rank].speed}% faster.`, url: '/#/logbook', tag: 'rank' });
      told++;
    }
    if (patina !== st?.patina_told) upd.patina_told = patina;
    if (rank !== st?.rank_told) upd.rank_told = rank;
    if (Object.keys(upd).length) await supabase.from('stamp_state').update(upd).eq('user_id', uid);
  }
  return told;
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
  const [took, mid, delivered, wished, seas] = await Promise.all([takeoffs(), midways(), deliver(), wishAlarm(), seaCrossings()]);
  const stamped = await stampCheck().catch((e) => { console.error('stamps', e); return -1; });
  return Response.json({ took, mid, delivered, wished, seas, stamped });
});
