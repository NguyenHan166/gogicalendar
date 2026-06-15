import { logger } from '../src/config/logger.js';
import { connectDatabase, disconnectDatabase } from '../src/lib/mongo.js';
import { seedDatabase } from '../src/lib/seed.js';

async function main(): Promise<void> {
  await connectDatabase();
  const result = await seedDatabase();
  logger.info({ result }, 'Seed command completed');
}

main()
  .catch((error: unknown) => {
    logger.fatal({ err: error }, 'Seed command failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
