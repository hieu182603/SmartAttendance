import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

export async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
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
