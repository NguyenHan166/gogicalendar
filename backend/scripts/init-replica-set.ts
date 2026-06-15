import 'dotenv/config';

import { MongoClient } from 'mongodb';
import { z } from 'zod';

import { logger } from '../src/config/logger.js';

const localMongoEnv = z
  .object({
    LOCAL_MONGODB_INIT_URI: z
      .string()
      .default('mongodb://localhost:27017/admin?directConnection=true'),
    LOCAL_MONGODB_REPLICA_SET: z.string().default('rs0'),
    LOCAL_MONGODB_REPLICA_SET_HOST: z.string().default('localhost:27017'),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  })
  .parse(process.env);

async function initializeReplicaSet(): Promise<void> {
  if (process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
    throw new Error(
      'mongo:init is local-only. MongoDB Atlas already manages its replica set and must not be initialized by the application.',
    );
  }

  const client = new MongoClient(localMongoEnv.LOCAL_MONGODB_INIT_URI, {
    serverSelectionTimeoutMS: localMongoEnv.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  });

  try {
    await client.connect();
    const admin = client.db('admin').admin();

    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      if (status.ok === 1) {
        logger.info(
          { replicaSet: localMongoEnv.LOCAL_MONGODB_REPLICA_SET },
          'Replica set already initialized',
        );
        return;
      }
    } catch (error: unknown) {
      const mongoError = error as { codeName?: string; code?: number };
      const isNotInitialized =
        mongoError.codeName === 'NotYetInitialized' ||
        mongoError.codeName === 'NoReplicationEnabled' ||
        mongoError.code === 94;

      if (!isNotInitialized) throw error;
    }

    await admin.command({
      replSetInitiate: {
        _id: localMongoEnv.LOCAL_MONGODB_REPLICA_SET,
        members: [{ _id: 0, host: localMongoEnv.LOCAL_MONGODB_REPLICA_SET_HOST }],
      },
    });

    logger.info(
      { replicaSet: localMongoEnv.LOCAL_MONGODB_REPLICA_SET },
      'Replica set initialization started',
    );
  } finally {
    await client.close();
  }
}

initializeReplicaSet().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to initialize MongoDB replica set');
  process.exitCode = 1;
});
