import fs from 'node:fs';
import mongoose from 'mongoose';
import { importWords } from '../lib/importWords.js';

const file = process.argv[2] ?? new URL('../../../seed/out/words.json', import.meta.url);
const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI is required');

await mongoose.connect(uri, { dbName: process.env.MONGO_DB || 'ukr' });
await mongoose.model('Word').syncIndexes();
const words = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(await importWords(words));
await mongoose.disconnect();
