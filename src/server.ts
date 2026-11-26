import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./db/connection.js";
import { seedProductsIfEmpty } from "./modules/products/product.seed.js";

async function main(): Promise<void> {
  await connectDb();
  await seedProductsIfEmpty();

  const server = createApp().listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.close(async () => {
        await disconnectDb();
        process.exit(0);
      });
    });
  }
}

main().catch((err: unknown) => {
  console.error("Failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
