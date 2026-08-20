export class FplApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "FplApiError";
    this.status = status;
    this.path = path;
  }
}

export function isFplApiError(error: unknown): error is FplApiError {
  return error instanceof FplApiError;
}
