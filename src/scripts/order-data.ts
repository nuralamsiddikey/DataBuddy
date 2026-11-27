import { z } from "zod";
import { OrderSchema, ORDER_STATUSES, type Order, type OrderItem } from "../modules/orders/order.schema.js";
import type { Product } from "../modules/products/product.schema.js";
import { createRandom } from "./random.js";

export const TOTAL_ORDERS = 1000;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// Orders run up to "now" (rounded down to the hour) so analytics questions like "sales today" have data.
// Everything except the dates is deterministic, and re-running within the same hour is a no-op.
const ANCHOR_DATE = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
const HISTORY_DAYS = 365;
const CUSTOMER_POOL_SIZE = 150; // < TOTAL_ORDERS, so some customers order more than once

const FIRST_NAMES = [
  "Amina", "Liam", "Sofia", "Noah", "Priya", "Ethan", "Mei", "Lucas", "Fatima", "Oliver",
  "Aisha", "Mateo", "Hana", "Jack", "Zara", "Daniel", "Yuki", "Omar", "Chloe", "Rafael",
  "Nadia", "Henry", "Lena", "Arjun", "Ivy", "Samuel", "Rina", "Diego", "Emma", "Karim",
];
const LAST_NAMES = [
  "Rahman", "Smith", "Garcia", "Chen", "Patel", "Johnson", "Kim", "Silva", "Hassan", "Brown",
  "Nguyen", "Martin", "Ali", "Lopez", "Tanaka", "Walker", "Khan", "Rossi", "Okafor", "Novak",
  "Ahmed", "Clark", "Sato", "Dubois", "Singh", "Young", "Costa", "Ivanov", "Reed", "Haque",
];

// Weighted so most historical orders are delivered, a few are still in flight or cancelled.
const STATUS_WEIGHTS: Record<(typeof ORDER_STATUSES)[number], number> = {
  delivered: 0.55,
  shipped: 0.15,
  paid: 0.12,
  pending: 0.08,
  cancelled: 0.1,
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Builds `count` deterministic orders whose line items reference the given products. */
export function generateOrders(products: Product[], count: number): Order[] {
  if (products.length === 0) throw new Error("Cannot generate orders without products");

  const random = createRandom(20261127);
  const randInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  const customers = Array.from({ length: CUSTOMER_POOL_SIZE }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const last = LAST_NAMES[(i * 7 + Math.floor(i / FIRST_NAMES.length) * 11) % LAST_NAMES.length]!;
    return { name: `${first} ${last}`, email: `${slug(first)}.${slug(last)}${i + 1}@example.com` };
  });

  const pickStatus = (): Order["status"] => {
    let roll = random();
    for (const status of ORDER_STATUSES) {
      roll -= STATUS_WEIGHTS[status];
      if (roll < 0) return status;
    }
    return "delivered";
  };

  const orders: Order[] = [];
  for (let i = 0; i < count; i++) {
    // 1-4 distinct products per order, 1-3 units each (mostly 1)
    const lineCount = Math.min(randInt(1, 4), products.length);
    const chosen = new Set<number>();
    while (chosen.size < lineCount) chosen.add(randInt(0, products.length - 1));

    const items: OrderItem[] = [...chosen].map((index) => {
      const product = products[index]!;
      return {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: random() < 0.75 ? 1 : randInt(2, 3),
      };
    });

    const totalCents = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0);

    orders.push({
      id: i + 1,
      customer: customers[randInt(0, customers.length - 1)]!,
      items,
      totalAmount: totalCents / 100,
      status: pickStatus(),
      orderedAt: new Date(ANCHOR_DATE - Math.floor(random() * HISTORY_DAYS * DAY_MS)),
    });
  }

  // Older orders get lower ids, like a real sequence.
  orders.sort((a, b) => a.orderedAt.getTime() - b.orderedAt.getTime());
  orders.forEach((order, index) => (order.id = index + 1));

  // Validated once, so a bug in the generator fails fast.
  return z.array(OrderSchema).parse(orders);
}
