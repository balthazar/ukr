import mongoose from 'mongoose';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { createYouTube } from './lib/youtube.js';

const config = loadConfig();
await mongoose.connect(config.mongoUri, { dbName: config.mongoDb });
const app = createApp({ config, yt: createYouTube({ apiKey: config.youtubeApiKey }) });
app.listen(config.port, () => console.log(`ukr listening on :${config.port}`));
