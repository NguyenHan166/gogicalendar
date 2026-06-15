import { logger } from '../src/config/logger.js';
import { ensureApplicationIndexes } from '../src/lib/indexes.js';
import { connectDatabase, disconnectDatabase } from '../src/lib/mongo.js';

async function main(): Promise<void> {
  await connectDatabase();
  const results = await ensureApplicationIndexes();
  logger.info({ results }, 'Index deployment completed');
}

main()
  .catch((error: unknown) => {
    logger.fatal({ err: error }, 'Index deployment failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
