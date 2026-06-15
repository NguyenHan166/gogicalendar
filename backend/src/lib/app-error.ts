export interface ErrorDetail {
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[];
  public readonly expose: boolean;

  public constructor(
    statusCode: number,
    code: string,
    message: string,
    options: {
      details?: ErrorDetail[];
      expose?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details ?? [];
    this.expose = options.expose ?? statusCode < 500;
  }
}
