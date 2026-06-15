import mongoose from 'mongoose';

import { env, type AppEnv } from '../config/env.js';
import { logger } from '../config/logger.js';
import '../models/index.js';

export async function connectDatabase(config: AppEnv = env): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return mongoose;

  mongoose.set('strictQuery', true);

  await mongoose.connect(config.MONGODB_URI, {
    autoIndex: false,
    dbName: config.MONGODB_DB_NAME,
    maxPoolSize: config.MONGODB_MAX_POOL_SIZE,
    minPoolSize: config.MONGODB_MIN_POOL_SIZE,
    retryWrites: true,
    serverSelectionTimeoutMS: config.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  });

  logger.info(
    {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
    },
    'MongoDB connected',
  );

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) return;
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export async function pingDatabase(): Promise<void> {
  if (
    mongoose.connection.readyState !== mongoose.ConnectionStates.connected ||
    !mongoose.connection.db
  ) {
    throw new Error('MongoDB is not connected');
  }

  await mongoose.connection.db.admin().ping();
}
