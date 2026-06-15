import type { Logger } from 'pino';

import type { AuthPrincipal } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
      id: string;
      log: Logger;
    }
  }
}

export {};
