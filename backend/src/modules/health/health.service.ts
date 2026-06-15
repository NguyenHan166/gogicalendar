import { pingDatabase } from '../../lib/mongo.js';

export interface HealthService {
  checkReadiness: () => Promise<void>;
}

export function createHealthService(
  checkReadiness: () => Promise<void> = pingDatabase,
): HealthService {
  return { checkReadiness };
}
