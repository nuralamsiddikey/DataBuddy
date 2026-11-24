import { z } from "zod";

// ---- Domain ----------------------------------------------------------------

export const ProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  inStock: z.boolean(),
});
export type Product = z.infer<typeof ProductSchema>;

// ---- Request bodies (input) ------------------------------------------------

export const PromptBodySchema = z.object({
  prompt: z.string().trim().min(1, "`prompt` must not be empty").max(10_000),
});

export const SearchBodySchema = z.object({
  query: z.string().trim().min(1, "`query` must not be empty").max(500),
});

// ---- Model output (untrusted) ----------------------------------------------

// The model is asked for a bare JSON array of product ids.
export const ModelIdsSchema = z.array(z.number().int());

// ---- Response bodies (output) ----------------------------------------------

export const PromptResponseSchema = z.object({
  result: z.string(),
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  products: z.array(ProductSchema),
});

// ---- Helpers ---------------------------------------------------------------

/** Compact, client-safe view of a ZodError: `[{ path: "query", message }]`. */
export function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
