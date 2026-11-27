import { connectDb, disconnectDb } from "../db/connection.js";
import { OrderModel } from "../modules/orders/order.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import type { Product } from "../modules/products/product.schema.js";
import { TOTAL_ORDERS, generateOrders } from "./order-data.js";

// Usage: npm run seed:orders [-- --reset]
//   (default)  upsert 1000 orders by `id`, built from the products currently in the DB
//   --reset    delete every order first, then insert them
// Run `npm run seed` first so there are products to order.
const reset = process.argv.includes("--reset");

try {
  await connectDb();
  await OrderModel.init(); // make sure the unique index on `id` exists

  const products = await ProductModel.find({}, { _id: 0 }).sort({ id: 1 }).lean<Product[]>();
  if (products.length === 0) throw new Error("No products found. Run `npm run seed` first.");

  if (reset) {
    const { deletedCount } = await OrderModel.deleteMany({});
    console.log(`Deleted ${deletedCount} existing orders`);
  }

  const orders = generateOrders(products, TOTAL_ORDERS);
  const result = await OrderModel.bulkWrite(
    orders.map((order) => ({
      updateOne: { filter: { id: order.id }, update: { $set: order }, upsert: true },
    })),
  );
  console.log(
    `Seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ` +
      `${orders.length - result.upsertedCount - result.modifiedCount} unchanged ` +
      `(from ${products.length} products)`,
  );
} catch (err) {
  console.error("Seeding orders failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
