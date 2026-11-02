// Runs every minute (see supabase/cron.sql).
// 1. Tells people when an owl has landed.
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

async function deliver() {
  const { data: landed } = await supabase
    .from('letters').select('id, sender, recipient, kind')
    .eq('notified', false).lte('arrive_at', new Date().toISOString()).limit(200);
  if (!landed?.length) return 0;
  const ids = [...new Set(landed.flatMap((l) => [l.sender, l.recipient]))];
  const { data: people } = await supabase.from('profiles').select('id, name, owl_name, tz').in('id', ids);
  const byId = new Map((people ?? []).map((p: Profile) => [p.id, p]));
  for (const l of landed) {
    const from = byId.get(l.sender);
    const { count } = await supabase.from('letters').select('id', { count: 'exact', head: true })
      .eq('recipient', l.recipient).is('opened_at', null).lte('arrive_at', new Date().toISOString());
    await push(l.recipient, {
      badge: count ?? 1,
      title: `${from?.name || 'A friend'} wrote to you`,
      body: `${from?.owl_name || 'Their owl'} just landed${l.kind === 'bundle' ? ' with a bundle of scraps' : ''}. It's waiting on your desk.`,
      url: `/#/friend/${l.sender}`,
      tag: `letter-${l.id}`
    });
    await supabase.from('letters').update({ notified: true }).eq('id', l.id);
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
  const [delivered, posted, wished] = await Promise.all([deliver(), postDay(), wishAlarm()]);
  return Response.json({ delivered, posted, wished });
});
