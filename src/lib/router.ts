import { useEffect, useState } from 'react';

export function useRoute(): string[] {
  const read = () => (window.location.hash.replace(/^#\/?/, '') || 'wall').split('/').filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => { setParts(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export function go(path: string) {
  window.location.hash = `/${path}`;
}
