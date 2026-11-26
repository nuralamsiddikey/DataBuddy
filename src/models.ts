import { Schema, model } from "mongoose";
import type { Product } from "./products.js";

const productSchema = new Schema<Product>(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, required: true, min: 0, max: 5 },
    inStock: { type: Boolean, required: true },
  },
  { versionKey: false },
);

// Mongoose pluralizes the model name, so this maps to the "products" collection.
export const ProductModel = model<Product>("Product", productSchema);
