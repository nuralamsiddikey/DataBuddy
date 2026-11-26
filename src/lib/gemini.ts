import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

const MODEL = "gemini-3.5-flash-lite";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: {
    fetch: (req, init) => fetch(req, init),
    retryOptions: { attempts: 1 },
  },
});

export async function generateText(prompt: string): Promise<string | undefined> {
  const interaction = await ai.interactions.create({ model: MODEL, input: prompt });
  return interaction.output_text;
}
