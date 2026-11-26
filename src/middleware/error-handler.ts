import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../utils/errors.js";

function describe(err: unknown): string {
  if (err instanceof Error) {
    return err.cause ? `${err.message} (cause: ${describe(err.cause)})` : err.message;
  }
  return String(err);
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) console.error(`${err.message}:`, describe(err));
    res.status(err.status).json({ error: err.message });
    return;
  }

  // body-parser failures (malformed JSON, payload too large) carry a 4xx `status`.
  const status: unknown = err?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: "Invalid request body" });
    return;
  }

  console.error("Unhandled error:", describe(err));
  res.status(500).json({ error: "Internal server error" });
};
