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

// ---- Request body (input) --------------------------------------------------

export const SearchBodySchema = z.object({
  query: z.string().trim().min(1, "`query` must not be empty").max(500),
});
export type SearchBody = z.infer<typeof SearchBodySchema>;

// ---- Model output (untrusted) ----------------------------------------------

// The model is asked for a bare JSON array of product ids.
export const ModelIdsSchema = z.array(z.number().int());

// ---- Response body (output) ------------------------------------------------

export const SearchResponseSchema = z.object({
  query: z.string(),
  products: z.array(ProductSchema),
});
