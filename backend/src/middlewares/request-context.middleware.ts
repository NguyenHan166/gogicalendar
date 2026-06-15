import { randomUUID } from 'node:crypto';

import type { Request, RequestHandler, Response } from 'express';
import { pinoHttp } from 'pino-http';

import type { Logger } from 'pino';

export function requestContextMiddleware(logger: Logger): RequestHandler {
  return pinoHttp<Request, Response>({
    logger,
    genReqId(request, response) {
      const incomingId = request.headers['x-request-id'];
      const requestId =
        typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : randomUUID();

      response.setHeader('x-request-id', requestId);
      return requestId;
    },
    customProps(request) {
      return { requestId: request.id };
    },
    customLogLevel(_request, response, error) {
      if (error || response.statusCode >= 500) return 'error';
      if (response.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}
