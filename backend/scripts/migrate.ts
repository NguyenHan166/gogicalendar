import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { logger } from '../src/config/logger.js';
import { connectDatabase, disconnectDatabase } from '../src/lib/mongo.js';
import { SchemaMigrationModel } from '../src/models/index.js';
import * as ensureIndexes from './migrations/001-ensure-application-indexes.js';

interface MigrationDefinition {
  migrationId: string;
  checksum: string;
  up: () => Promise<void>;
}

const migrations: MigrationDefinition[] = [ensureIndexes];

function computedChecksum(migration: MigrationDefinition): string {
  return createHash('sha256')
    .update(`${migration.migrationId}:${migration.checksum}`)
    .digest('hex');
}

async function ensureMigrationCollection(): Promise<void> {
  await SchemaMigrationModel.createCollection();
  await SchemaMigrationModel.collection.createIndex(
    { migrationId: 1 },
    { unique: true, name: 'uq_schema_migration_id' },
  );
}

async function applyMigration(migration: MigrationDefinition): Promise<void> {
  const checksum = computedChecksum(migration);
  const existing = await SchemaMigrationModel.findOne({
    migrationId: migration.migrationId,
  }).lean();
  if (existing) {
    if (existing.checksum !== checksum) {
      throw new Error(`Migration checksum changed after apply: ${migration.migrationId}`);
    }
    logger.info({ migrationId: migration.migrationId }, 'Schema migration already applied');
    return;
  }

  try {
    await migration.up();
    await SchemaMigrationModel.create({
      migrationId: migration.migrationId,
      checksum,
      appliedAt: new Date(),
    });
    logger.info({ migrationId: migration.migrationId }, 'Schema migration applied');
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      logger.info({ migrationId: migration.migrationId }, 'Schema migration applied concurrently');
      return;
    }
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationCollection();
  for (const migration of migrations) {
    await applyMigration(migration);
  }
}

async function main(): Promise<void> {
  await connectDatabase();
  await runMigrations();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error: unknown) => {
      logger.fatal({ err: error }, 'Schema migration failed');
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectDatabase();
    });
}
