import { connectDb, disconnectDb } from "../db/connection.js";
import { ProductModel } from "../modules/products/product.model.js";
import { productSeedData } from "./product-data.js";

// Usage: npm run seed [-- --reset]
//   (default)  upsert the 1000-product catalog by `id`; products with other ids are left alone
//   --reset    delete every product first, then insert the catalog
const reset = process.argv.includes("--reset");

try {
  await connectDb();
  await ProductModel.init(); // make sure the unique index on `id` exists

  if (reset) {
    const { deletedCount } = await ProductModel.deleteMany({});
    console.log(`Deleted ${deletedCount} existing products`);
  }

  const result = await ProductModel.bulkWrite(
    productSeedData.map((product) => ({
      updateOne: { filter: { id: product.id }, update: { $set: product }, upsert: true },
    })),
  );
  console.log(
    `Seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ` +
      `${productSeedData.length - result.upsertedCount - result.modifiedCount} unchanged`,
  );
} catch (err) {
  console.error("Seeding failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
