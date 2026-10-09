import mongoose from 'mongoose';

const { Schema } = mongoose;

const wordSchema = new Schema({
  rank: { type: Number, required: true, index: true },
  lemma: { type: String, required: true, unique: true },
  stressed: String,
  respelling: String,
  ipa: String,
  pos: String,
  glosses: [String],
  forms: [String],
  audio: [{ _id: false, url: String, source: String }],
  freq: Number,
});

const progressSchema = new Schema({
  wordId: { type: Schema.Types.ObjectId, ref: 'Word', required: true, unique: true },
  status: { type: String, enum: ['learning', 'known'], required: true },
  ease: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 },
  reps: { type: Number, default: 0 },
  lapses: { type: Number, default: 0 },
  due: { type: Date, index: true },
  lastReviewed: Date,
  introducedAt: { type: Date, index: true },
  micPass: { type: Number, default: 0 },
  micTotal: { type: Number, default: 0 },
});

const videoSchema = new Schema({
  videoId: { type: String, required: true, unique: true },
  title: String,
  channelId: String,
  channelTitle: String,
  thumbnail: String,
  duration: { type: Number, default: 0 },
  position: { type: Number, default: 0 },
  watched: { type: Boolean, default: false },
  lastWatchedAt: { type: Date, index: true },
});

const channelSchema = new Schema({
  channelId: { type: String, required: true, unique: true },
  title: String,
  thumbnail: String,
  uploadsPlaylistId: { type: String, required: true },
});

const ytCacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  data: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

export const Word = mongoose.model('Word', wordSchema);
export const Progress = mongoose.model('Progress', progressSchema);
export const Video = mongoose.model('Video', videoSchema);
export const Channel = mongoose.model('Channel', channelSchema);
export const YtCache = mongoose.model('YtCache', ytCacheSchema, 'ytcache');
