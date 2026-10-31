import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { placeName } from './geo';
import type { CustomStamp, Friend, FriendSettings, Incoming, Letter, Profile } from './types';

interface Store {
  session: Session | null;
  ready: boolean;
  me: Profile | null;
  friends: Friend[];
  letters: Letter[];
  incoming: Incoming[];
  stamps: CustomStamp[];
  toast: string | null;
  say: (msg: string) => void;
  refresh: () => Promise<void>;
  saveMe: (patch: Partial<Profile>) => Promise<void>;
  saveFriendSettings: (friendId: string, patch: Partial<FriendSettings>) => Promise<void>;
  friend: (id: string) => Friend | undefined;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('Store missing');
  return s;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [stamps, setStamps] = useState<CustomStamp[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;

  const refresh = useCallback(async () => {
    if (!uid) return;
    const [{ data: meRow }, { data: settings }, { data: mail }, { data: inc }, { data: st }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('friend_settings').select('*').or(`owner.eq.${uid},friend.eq.${uid}`),
      supabase.from('letters').select('*').or(`sender.eq.${uid},recipient.eq.${uid}`).order('sent_at', { ascending: false }).limit(500),
      supabase.rpc('incoming_flights'),
      supabase.from('stamps').select('id, image_path').order('created_at')
    ]);
    if (meRow) setMe(meRow as Profile);
    const mine = (settings ?? []).filter((s: FriendSettings) => s.owner === uid);
    const ids = mine.map((s: FriendSettings) => s.friend);
    let people: Profile[] = [];
    if (ids.length) {
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      people = (data ?? []) as Profile[];
    }
    setFriends(
      mine
        .map((m: FriendSettings) => ({
          mine: m,
          theirs: (settings ?? []).find((s: FriendSettings) => s.owner === m.friend && s.friend === uid),
          profile: people.find((p) => p.id === m.friend)!
        }))
        .filter((f: Friend) => f.profile && f.theirs)
    );
    setLetters((mail ?? []) as Letter[]);
    setIncoming((inc ?? []) as Incoming[]);
    setStamps((st ?? []) as CustomStamp[]);
  }, [uid]);

  // Location: read it every time the app opens and keep the last one.
  useEffect(() => {
    if (!uid || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const patch = {
          last_lat: p.coords.latitude, last_lon: p.coords.longitude,
          last_place: placeName(p.coords.latitude, p.coords.longitude),
          last_seen_at: new Date().toISOString(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        await supabase.from('profiles').update(patch).eq('id', uid);
        setMe((m) => (m ? { ...m, ...patch } : m));
      },
      () => undefined,
      { maximumAge: 5 * 60 * 1000, timeout: 15000 }
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    void refresh();
    const t = window.setInterval(() => void refresh(), 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [uid, refresh]);

  const saveMe = useCallback(async (patch: Partial<Profile>) => {
    if (!uid) return;
    setMe((m) => (m ? { ...m, ...patch } : m));
    const { error } = await supabase.from('profiles').update(patch).eq('id', uid);
    if (error) say('That change did not save. Try again.');
  }, [uid, say]);

  const saveFriendSettings = useCallback(async (friendId: string, patch: Partial<FriendSettings>) => {
    if (!uid) return;
    setFriends((fs) => fs.map((f) => (f.profile.id === friendId ? { ...f, mine: { ...f.mine, ...patch } } : f)));
    const { error } = await supabase.from('friend_settings').update(patch).eq('owner', uid).eq('friend', friendId);
    if (error) say('That change did not save. Try again.');
  }, [uid, say]);

  const value = useMemo<Store>(() => ({
    session, ready, me, friends, letters, incoming, stamps, toast, say, refresh, saveMe, saveFriendSettings,
    friend: (id: string) => friends.find((f) => f.profile.id === id)
  }), [session, ready, me, friends, letters, incoming, stamps, toast, say, refresh, saveMe, saveFriendSettings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
