import { existsSync } from "node:fs";
import { z } from "zod";

// Real environment variables win; .env is only a convenience for local development.
if (existsSync(".env")) process.loadEnvFile();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  GEMINI_API_KEY: z.string().min(1, "is required"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017"),
  MONGO_DB_NAME: z.string().min(1).default("databuddy"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
