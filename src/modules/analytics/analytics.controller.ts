import type { Request, Response } from "express";
import { HttpError } from "../../utils/errors.js";
import { InvalidConversationError, chat } from "./analytics.chat.js";
import { ChatResponseSchema, type ChatBody } from "./analytics.schema.js";

type ChatRequest = Request<Record<string, string>, unknown, ChatBody>;

export async function chatHandler(req: ChatRequest, res: Response): Promise<void> {
  const { message, conversationId } = req.body;
  try {
    res.json(ChatResponseSchema.parse(await chat(message, conversationId)));
  } catch (err) {
    if (err instanceof InvalidConversationError) {
      throw new HttpError(400, "Unknown or expired conversationId. Omit it to start a new conversation.", { cause: err });
    }
    throw new HttpError(500, "Analytics chat failed", { cause: err });
  }
}
