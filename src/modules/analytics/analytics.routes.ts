import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { chatHandler } from "./analytics.controller.js";
import { ChatBodySchema } from "./analytics.schema.js";

export const analyticsRouter = Router();

analyticsRouter.post("/chat", validateBody(ChatBodySchema), chatHandler);
