import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;
let createLock = Promise.resolve();

async function withCreateLock(fn) {
  let release;
  const previous = createLock;
  createLock = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function connectTestDB() {
  await withCreateLock(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongod) {
      await mongod.stop();
      mongod = undefined;
    }

    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
}

export async function clearCollections(...names) {
  for (const name of names) {
    const col = mongoose.connection.collections[name];
    if (col) await col.deleteMany({});
  }
}

export async function clearAllCollections() {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
}
