import { ensureApplicationIndexes } from '../../src/lib/indexes.js';

export const migrationId = '001-ensure-application-indexes';
export const checksum = 'sha256:manual-index-deployment-v1';

export async function up(): Promise<void> {
  await ensureApplicationIndexes();
}
