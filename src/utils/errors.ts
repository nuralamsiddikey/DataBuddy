/** An error that maps to a specific HTTP response. `cause` is logged, never sent to clients. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "HttpError";
    this.status = status;
  }
}
