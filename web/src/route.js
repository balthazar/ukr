import { useEffect, useState } from 'react';

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return undefined;
  }
};

// '#/words/abc?q=easy' -> { section: 'words', param: 'abc', query: URLSearchParams }
export function parseHash(hash) {
  const raw = hash.startsWith('#/') ? hash.slice(2) : '';
  const [path, search = ''] = raw.split('?');
  const [section, param] = path.split('/');
  return { section: section || 'today', param: param ? safeDecode(param) : undefined, query: new URLSearchParams(search) };
}

export function useRoute() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => {
      setHash(location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parseHash(hash);
}
