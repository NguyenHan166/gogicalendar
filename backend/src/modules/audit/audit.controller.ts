import type { Request, Response } from 'express';

import { auditLogListSchema } from './audit.schemas.js';
import { AuditService } from './audit.service.js';

export class AuditController {
  public constructor(private readonly service = new AuditService()) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const input = auditLogListSchema.parse(request.query);
    const result = await this.service.list(input);
    response.status(200).json({ success: true, ...result });
  };
}
