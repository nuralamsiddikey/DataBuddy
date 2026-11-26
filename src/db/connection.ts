import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGO_DB_NAME,
    serverSelectionTimeoutMS: 5_000,
  });
  console.log(`Connected to MongoDB database "${env.MONGO_DB_NAME}"`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
