import { z } from "zod";

// ---- Domain ----------------------------------------------------------------

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

// A line item snapshots the product's name and price at purchase time,
// so an order keeps its history even if the product is later edited or removed.
export const OrderItemSchema = z.object({
  productId: z.number().int().positive(), // references Product.id
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});
export type OrderCustomer = z.infer<typeof OrderCustomerSchema>;

export const OrderSchema = z
  .object({
    id: z.number().int().positive(),
    customer: OrderCustomerSchema,
    items: z.array(OrderItemSchema).min(1),
    totalAmount: z.number().nonnegative(),
    status: z.enum(ORDER_STATUSES),
    orderedAt: z.date(),
  })
  .refine(
    (order) =>
      Math.round(order.totalAmount * 100) ===
      order.items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0),
    { message: "totalAmount must equal the sum of unitPrice x quantity over all items", path: ["totalAmount"] },
  );
export type Order = z.infer<typeof OrderSchema>;
