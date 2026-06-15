import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replicaSet: MongoMemoryReplSet | undefined;

export async function startTestReplicaSet(): Promise<string> {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  return replicaSet.getUri('gogi_calendar_test');
}

export async function connectTestDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { autoIndex: false });
}

export async function clearTestDatabase(): Promise<void> {
  if (!mongoose.connection.db) return;
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopTestReplicaSet(): Promise<void> {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
  }

  if (replicaSet) {
    await replicaSet.stop();
    replicaSet = undefined;
  }
}
