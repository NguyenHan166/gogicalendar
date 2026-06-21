import type { mongo } from 'mongoose';

import { logger } from '../config/logger.js';
import {
  AuditLogModel,
  EmployeeModel,
  RefreshTokenModel,
  SchemaMigrationModel,
  ShiftCodeModel,
  UserCredentialModel,
  WeeklyScheduleModel,
} from '../models/index.js';

const models = [
  EmployeeModel,
  UserCredentialModel,
  ShiftCodeModel,
  WeeklyScheduleModel,
  RefreshTokenModel,
  AuditLogModel,
  SchemaMigrationModel,
] as const;

export interface IndexSyncResult {
  model: string;
  createdIndexes: string[];
}

export async function ensureApplicationIndexes(): Promise<IndexSyncResult[]> {
  const results: IndexSyncResult[] = [];

  for (const currentModel of models) {
    await currentModel.createIndexes();
    const createdIndexes = (await currentModel.collection.indexes())
      .map((index) => index.name)
      .filter((name): name is string => name !== undefined);
    results.push({ model: currentModel.modelName, createdIndexes });
    logger.info({ model: currentModel.modelName, createdIndexes }, 'MongoDB indexes ensured');
  }

  return results;
}

export async function listApplicationIndexes(): Promise<
  Array<{ model: string; indexes: mongo.IndexDescriptionInfo[] }>
> {
  return Promise.all(
    models.map(async (currentModel) => ({
      model: currentModel.modelName,
      indexes: await currentModel.collection.indexes(),
    })),
  );
}
