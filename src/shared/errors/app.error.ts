export enum ErrorCode {
  // Errores de canal
  CHANNEL_UNAVAILABLE    = 'CHANNEL_UNAVAILABLE',
  INVALID_RECIPIENT      = 'INVALID_RECIPIENT',
  PROVIDER_ERROR         = 'PROVIDER_ERROR',

  // Errores de broker
  REDIS_CONNECTION_ERROR = 'REDIS_CONNECTION_ERROR',
  QUEUE_FULL             = 'QUEUE_FULL',
  MESSAGE_MALFORMED      = 'MESSAGE_MALFORMED',

  // Errores de worker
  WORKER_TIMEOUT         = 'WORKER_TIMEOUT',
  WORKER_CRASHED         = 'WORKER_CRASHED',

  // Errores de negocio
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  MAX_RETRIES_EXCEEDED   = 'MAX_RETRIES_EXCEEDED',
}

export class AppError extends Error {
  public readonly isAppError: boolean = true

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable: boolean = false,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';

    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      context: this.context,
    };
  }
}

//type guard
export function isAppError(error: unknown): error is AppError {
  return(
    typeof error === 'object' &&
    error !== null &&
    'isAppError' in error &&
    (error as AppError).isAppError === true
  )
}

export class ChannelError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    retryable: boolean,
    public readonly channel: string,
    context?: Record<string, unknown>,
  ) {
    super(code, message, retryable, { ...context, channel });
    this.name = 'ChannelError';
  }
}

export class BrokerError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    retryable: boolean = true,
    context?: Record<string, unknown>,
  ) {
    super(code, message, retryable, context);
    this.name = 'BrokerError';
  }
}