import type { RequestHandler } from "express";
import type { z } from "zod";

/** Compact, client-safe view of a ZodError: `[{ path: "query", message }]`. */
function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/** Validates `req.body` against a zod schema and replaces it with the parsed (typed) value. */
export function validateBody<T extends z.ZodType>(
  schema: T,
): RequestHandler<Record<string, string>, unknown, z.infer<T>> {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request body", issues: formatIssues(result.error) });
      return;
    }
    req.body = result.data;
    next();
  };
}
