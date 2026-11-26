import type { Request, Response } from "express";
import { HttpError } from "../../utils/errors.js";
import { SearchResponseSchema, type SearchBody } from "./product.schema.js";
import { searchProducts } from "./product.service.js";

type SearchRequest = Request<Record<string, string>, unknown, SearchBody>;

export async function searchProductsHandler(req: SearchRequest, res: Response): Promise<void> {
  const { query } = req.body;
  try {
    const products = await searchProducts(query);
    res.json(SearchResponseSchema.parse({ query, products }));
  } catch (err) {
    throw new HttpError(500, "Search failed", { cause: err });
  }
}
