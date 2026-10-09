import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let mongod;

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'test' });
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearDb() {
  const cols = await mongoose.connection.db.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
}

export const testConfig = {
  appPassword: 'test-password',
  sessionSecret: 'test-secret',
  mongoDb: 'test',
  newPerDay: 3,
  youtubeApiKey: 'test-key',
  secureCookies: false,
  webDist: '',
};

// Returns a supertest agent that carries the session cookie.
export async function login(app) {
  const agent = request.agent(app);
  await agent.post('/api/login').send({ password: testConfig.appPassword }).expect(200);
  return agent;
}
