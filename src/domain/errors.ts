export type DomainErrorCode = 'MAX_DEPTH' | 'CYCLE' | 'NOT_FOUND' | 'INVALID_SCHEDULE';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
