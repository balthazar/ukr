export function loadConfig(env = process.env) {
  const missing = ['APP_PASSWORD', 'SESSION_SECRET', 'MONGO_URI'].filter((k) => !env[k]);
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
  return {
    appPassword: env.APP_PASSWORD,
    sessionSecret: env.SESSION_SECRET,
    mongoUri: env.MONGO_URI,
    mongoDb: env.MONGO_DB || 'ukr',
    port: Number(env.PORT || 8080),
    newPerDay: Number(env.NEW_PER_DAY || 10),
    youtubeApiKey: env.YOUTUBE_API_KEY || '',
    secureCookies: env.NODE_ENV === 'production',
    webDist: env.WEB_DIST || '',
  };
}
