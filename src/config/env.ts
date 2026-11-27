import { existsSync } from "node:fs";
import { z } from "zod";

// Real environment variables win; .env is only a convenience for local development.
if (existsSync(".env")) process.loadEnvFile();

const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  GEMINI_API_KEY: z.string().min(1, "is required"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017"),
  MONGO_DB_NAME: z.string().min(1).default("databuddy"),
  // Business time zone: decides where "today" / "this month" begin and end in analytics answers.
  TIMEZONE: z
    .string()
    .default(systemTimeZone)
    .refine(isValidTimeZone, "must be an IANA time zone, e.g. Asia/Dhaka or America/New_York"),
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
