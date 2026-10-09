import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = { APP_PASSWORD: 'p', SESSION_SECRET: 's', MONGO_URI: 'mongodb://x' };

describe('loadConfig', () => {
  it('throws listing every missing required var', () => {
    expect(() => loadConfig({})).toThrow('APP_PASSWORD, SESSION_SECRET, MONGO_URI');
  });
  it('applies defaults', () => {
    const c = loadConfig(base);
    expect(c).toMatchObject({ mongoDb: 'ukr', port: 8080, newPerDay: 10, youtubeApiKey: '', secureCookies: false, webDist: '' });
  });
  it('reads overrides', () => {
    const c = loadConfig({ ...base, MONGO_DB: 'd', PORT: '9', NEW_PER_DAY: '4', YOUTUBE_API_KEY: 'k', NODE_ENV: 'production', WEB_DIST: '/w' });
    expect(c).toMatchObject({ mongoDb: 'd', port: 9, newPerDay: 4, youtubeApiKey: 'k', secureCookies: true, webDist: '/w' });
  });
});
