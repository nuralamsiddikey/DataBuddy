import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { searchProductsHandler } from "./product.controller.js";
import { SearchBodySchema } from "./product.schema.js";

export const productRouter = Router();

productRouter.post("/search", validateBody(SearchBodySchema), searchProductsHandler);
