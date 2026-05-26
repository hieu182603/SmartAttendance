import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Pre-download MongoDB binary before Jest workers start.
 * Avoids UnableToUnlockLockfileError when multiple workers race on the cache lock in CI.
 */
export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  await mongod.stop();
}
