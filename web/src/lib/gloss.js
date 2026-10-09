const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The gloss to show in a list: the one the search matched (same word-start rule as the API).
export function displayGloss(glosses, q) {
  const list = glosses ?? [];
  const query = (q ?? '').trim();
  if (query) {
    const rx = new RegExp(`\\b${escape(query)}`, 'i');
    const hit = list.find((g) => rx.test(g));
    if (hit) return hit;
  }
  return list[0] ?? '';
}
