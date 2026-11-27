import { Schema, model } from "mongoose";
import { ORDER_STATUSES, type Order, type OrderCustomer, type OrderItem } from "./order.schema.js";

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const customerSchema = new Schema<OrderCustomer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    id: { type: Number, required: true, unique: true },
    customer: { type: customerSchema, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: { validator: (items: OrderItem[]) => items.length > 0, message: "An order needs at least one item" },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    orderedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// Mongoose pluralizes the model name, so this maps to the "orders" collection.
export const OrderModel = model<Order>("Order", orderSchema);
