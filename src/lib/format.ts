export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const s = Math.ceil(ms / 1000);
  if (s < 90) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function ago(iso: string | null): string {
  if (!iso) return 'a while ago';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

export const QUESTIONS = [
  'What song is stuck in your head?', 'Best thing you ate this week?', 'What made you laugh today?',
  'Describe your view right now.', 'What are you looking forward to?', 'Something small that went right?',
  'What would you do with a free Sunday?', 'A smell that reminds you of home?', 'What are you reading or watching?',
  'What should we do next time we meet?'
];
export const randomQuestion = () => QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
