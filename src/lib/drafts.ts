import { supabase } from './supabase';
import type { WordTiming } from './types';

/** A half-written letter to one friend, kept on this phone until it is sent or thrown away. */
export interface Draft {
  body: string;
  caption?: string;
  question?: string | null;
  questions?: string[];
  stamp: string;
  answers?: Record<string, string>;
  enchanted?: boolean;
  photos?: { path: string; caption: string }[];
  audio?: { path: string; words: WordTiming[] } | null;
  video?: { path: string } | null;
  saved_at?: number;
}

const key = (id: string) => `signed.draft.${id}`;
export const EMPTY_DRAFT: Draft = { body: '', questions: [], stamp: 'signed' };

/** Is there anything in it worth keeping? Picking a stamp alone is not a draft. */
export function hasContent(d: Draft | null | undefined): boolean {
  if (!d) return false;
  return Boolean(
    d.body?.trim() || d.photos?.length || d.audio || d.video ||
    (d.questions ?? []).some((q) => q.trim()) ||
    Object.values(d.answers ?? {}).some((a) => a.trim())
  );
}

export function readDraft(id: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return { ...EMPTY_DRAFT, ...d, questions: d.questions ?? (d.question ? [d.question] : []) };
  } catch { return null; }
}

export function writeDraft(id: string, d: Draft) {
  try {
    if (hasContent(d)) localStorage.setItem(key(id), JSON.stringify({ ...d, saved_at: Date.now() }));
    else localStorage.removeItem(key(id));
  } catch { /* storage full or blocked */ }
}

/** Forget the draft. When `media` is set, the photos and recordings it uploaded are deleted too. */
export function clearDraft(id: string, media = false) {
  const d = media ? readDraft(id) : null;
  try { localStorage.removeItem(key(id)); } catch { /* fine */ }
  if (d) {
    const paths = [...(d.photos ?? []).map((p) => p.path), d.audio?.path, d.video?.path].filter(Boolean) as string[];
    if (paths.length) void supabase.storage.from('mail').remove(paths);
  }
}

export function hasDraft(id: string): boolean { return hasContent(readDraft(id)); }
