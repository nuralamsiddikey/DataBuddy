import { Router } from "express";
import { analyticsRouter } from "../modules/analytics/analytics.routes.js";
import { productRouter } from "../modules/products/product.routes.js";

export const apiRouter = Router();

apiRouter.use("/products", productRouter);
apiRouter.use("/analytics", analyticsRouter);
