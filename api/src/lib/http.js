export function httpError(status, code, detail) {
  const err = new Error(detail ?? code);
  err.status = status;
  err.code = code;
  return err;
}

export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
  if (err.status && err.code) return res.status(err.status).json({ error: err.code, detail: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal' });
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isObjectId = (s) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
