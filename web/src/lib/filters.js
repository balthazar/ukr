// Mirrors the API's status filters, so the list can drop a word the moment it stops matching.
export function matchesFilter(status, filter) {
  const s = status ?? 'new';
  if (!filter) return true;
  if (filter === 'tolearn') return s !== 'known';
  return s === filter;
}
