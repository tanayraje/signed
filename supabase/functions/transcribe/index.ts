// Turns a talking letter's recording into words with timings,
// so the page can write each word in ink as the voice says it.
// Needs OPENAI_API_KEY set as a function secret.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return Response.json({ error: 'Transcription is not set up on the server.' }, { status: 501, headers: cors });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return Response.json({ error: 'Sign in first.' }, { status: 401, headers: cors });

  const { path } = await req.json();
  if (typeof path !== 'string' || !path.startsWith(`${user.user.id}/`)) {
    return Response.json({ error: 'You can only transcribe your own recordings.' }, { status: 403, headers: cors });
  }
  const { data: file, error } = await supabase.storage.from('mail').download(path);
  if (error || !file) return Response.json({ error: 'Recording not found.' }, { status: 404, headers: cors });

  const form = new FormData();
  form.append('file', file, path.split('/').pop() ?? 'audio.webm');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form
  });
  if (!res.ok) return Response.json({ error: 'Transcription failed. Try again.' }, { status: 502, headers: cors });
  const out = await res.json();
  return Response.json({ text: out.text, words: out.words ?? [] }, { headers: cors });
});
