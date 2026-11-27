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

// ---- Function calling ------------------------------------------------------

export interface FunctionTool {
  name: string;
  description: string;
  /** JSON Schema for the function's arguments. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  name: string;
  output: unknown;
  isError?: boolean;
}

export interface ModelTurn {
  /** Pass back as `previousInteractionId` to continue the conversation. */
  interactionId: string;
  text: string;
  toolCalls: ToolCall[];
}

/**
 * One model turn: either a plain-text answer (`toolCalls` empty) or a request to run tools.
 * Answer a tool request by calling this again with the tool results as `input` and the
 * returned `interactionId` as `previousInteractionId`. Gemini keeps the history server-side.
 */
export async function generateTurn(options: {
  systemInstruction: string;
  tools: FunctionTool[];
  input: string | ToolResult[];
  previousInteractionId?: string;
}): Promise<ModelTurn> {
  const { systemInstruction, tools, input, previousInteractionId } = options;

  const interaction = await ai.interactions.create({
    model: MODEL,
    system_instruction: systemInstruction,
    tools: tools.map((tool) => ({ type: "function" as const, ...tool })),
    previous_interaction_id: previousInteractionId,
    input:
      typeof input === "string"
        ? input
        : input.map((result) => ({
            type: "function_result" as const,
            call_id: result.callId,
            name: result.name,
            result: JSON.stringify(result.output),
            is_error: result.isError,
          })),
  });

  const toolCalls = interaction.steps.flatMap((step) =>
    step.type === "function_call" ? [{ id: step.id, name: step.name, args: step.arguments }] : [],
  );

  return { interactionId: interaction.id, text: interaction.output_text ?? "", toolCalls };
}
