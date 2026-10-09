// The last word-list URL (search, filter, page), so "← Words" and the tab return to it.
const KEY = 'ukr:wordsUrl';

export function rememberWordsUrl(url) {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {}
}

export function wordsUrl() {
  try {
    return sessionStorage.getItem(KEY) || '#/words';
  } catch {
    return '#/words';
  }
}
