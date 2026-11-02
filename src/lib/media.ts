import { supabase } from './supabase';

/** Shrinks a photo on the phone before upload. */
export async function shrinkImage(file: File, max = 1280, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('That photo could not be read.'));
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function upload(userId: string, blob: Blob, ext: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('mail').upload(path, blob, { contentType: blob.type || undefined });
  if (error) throw new Error('Upload failed. Check your connection and try again.');
  return path;
}

const cache = new Map<string, { url: string; until: number }>();
export async function signedUrl(path: string): Promise<string | null> {
  if (path.startsWith('/assets/test/')) return path; // TESTING ONLY: the test friend's stamps ship with the app
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data } = await supabase.storage.from('mail').createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function extFor(type: string): string {
  if (type.includes('jpeg')) return 'jpg';
  if (type.includes('png')) return 'png';
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('webm')) return 'webm';
  if (type.includes('quicktime')) return 'mov';
  if (type.includes('mpeg')) return 'mp3';
  if (type.includes('ogg')) return 'ogg';
  return 'bin';
}
