import express, { type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { products, type Product } from "./products.js";
import {
  ModelIdsSchema,
  PromptBodySchema,
  PromptResponseSchema,
  SearchBodySchema,
  SearchResponseSchema,
  formatIssues,
} from "./schemas.js";

process.loadEnvFile();

const port = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    fetch: (req, init) => fetch(req, init),
    retryOptions: { attempts: 1 },
  },
});

async function generateWithGemini(prompt: string): Promise<string | undefined> {
  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: prompt,
  });
  return interaction.output_text;
}

app.post("/", async (req: Request, res: Response) => {
  const body = PromptBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body", issues: formatIssues(body.error) });
    return;
  }
  try {
    const result = await generateWithGemini(body.data.prompt);
    res.json(PromptResponseSchema.parse({ result }));
  } catch (err) {
    console.error("Prompt request failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Request failed" });
  }
});

function parseIds(text: string | undefined): number[] {
  const match = text?.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Model did not return a JSON array");
  return ModelIdsSchema.parse(JSON.parse(match[0]));
}

async function searchProducts(query: string): Promise<Product[]> {
  const prompt = [
    "You are a product search engine. Here is the full product catalog as JSON:",
    JSON.stringify(products),
    "",
    "Answer the search query below by choosing products from the catalog.",
    "Reply with ONLY a JSON array of matching product ids, most relevant first, and nothing else.",
    "If the query asks for a single product (cheapest, most expensive, best rated, ...), return only that one id.",
    "If nothing matches, reply with [].",
    "",
    `Search query: ${query}`,
  ].join("\n");

  const ids = parseIds(await generateWithGemini(prompt));
  const byId = new Map(products.map((p) => [p.id, p]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

app.get("/products", (_req: Request, res: Response) => {
  res.json({ products });
});

app.post("/products/search", async (req: Request, res: Response) => {
  const body = SearchBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body", issues: formatIssues(body.error) });
    return;
  }
  const { query } = body.data;
  try {
    const found = await searchProducts(query);
    res.json(SearchResponseSchema.parse({ query, products: found }));
  } catch (err) {
    console.error(
      "Product search failed:",
      err instanceof Error ? err.message : err,
    );
    res.status(500).json({ error: "Search failed" });
  }
});

const server = app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
