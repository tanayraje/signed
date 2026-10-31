import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { go } from '../lib/router';

export default function Invite({ code }: { code: string }) {
  const { refresh } = useStore();
  const [msg, setMsg] = useState('Opening your invite…');
  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc('accept_invite', { invite_code: code });
      if (error) { setMsg(error.message || 'That invite did not work.'); return; }
      await refresh();
      go(`friend/${data as string}`);
    })();
  }, [code, refresh]);
  return (
    <main className="app" style={{ justifyContent: 'center' }}>
      <div className="stone stack center" style={{ padding: 24 }}>
        <p>{msg}</p>
        <button className="btn" onClick={() => go('friends')}>Go to your friends</button>
      </div>
    </main>
  );
}
