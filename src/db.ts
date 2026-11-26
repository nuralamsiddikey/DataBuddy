import mongoose from "mongoose";
import { ProductModel } from "./models.js";
import { products } from "./products.js";

/** Connects to MongoDB and seeds the product catalog if it is empty. Call once at startup. */
export async function connectDb(): Promise<void> {
  // Read here rather than at import time, so process.loadEnvFile() in index.ts has already run.
  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
  const dbName = process.env.MONGO_DB_NAME ?? "databuddy";

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5_000 });
  await ProductModel.init(); // wait for the unique index on `id` to be built

  if ((await ProductModel.estimatedDocumentCount()) === 0) {
    await ProductModel.insertMany(products);
    console.log(`Seeded ${products.length} products into "${dbName}.products"`);
  }
  console.log(`Connected to MongoDB database "${dbName}"`);
}

export async function closeDb(): Promise<void> {
  await mongoose.disconnect();
}
