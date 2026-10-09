import { useEffect, useState } from 'react';

const current = () => (location.hash.startsWith('#/') ? location.hash.slice(2) : 'today');

export function useRoute() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => {
      setPath(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [section, param] = path.split('/');
  return [section || 'today', param ? decodeURIComponent(param) : undefined];
}
