import { generateText } from "../../lib/gemini.js";
import { ProductModel } from "./product.model.js";
import { ModelIdsSchema, type Product } from "./product.schema.js";

function parseIds(text: string | undefined): number[] {
  const match = text?.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Model did not return a JSON array");
  return ModelIdsSchema.parse(JSON.parse(match[0]));
}

function buildSearchPrompt(catalog: Product[], query: string): string {
  return [
    "You are a product search engine. Here is the full product catalog as JSON:",
    JSON.stringify(catalog),
    "",
    "Answer the search query below by choosing products from the catalog.",
    "Reply with ONLY a JSON array of matching product ids, most relevant first, and nothing else.",
    "If the query asks for a single product (cheapest, most expensive, best rated, ...), return only that one id.",
    "If nothing matches, reply with [].",
    "",
    `Search query: ${query}`,
  ].join("\n");
}

export async function searchProducts(query: string): Promise<Product[]> {
  const catalog = await ProductModel.find({}, { _id: 0 }).sort({ id: 1 }).lean<Product[]>();

  const ids = parseIds(await generateText(buildSearchPrompt(catalog, query)));

  const byId = new Map(catalog.map((p) => [p.id, p]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
