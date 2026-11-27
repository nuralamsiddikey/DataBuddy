import { z } from "zod";
import { ORDER_STATUSES } from "../orders/order.schema.js";

// ---- Query spec (what the model asks for) ----------------------------------

export const PERIODS = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "all_time",
] as const;

export const GROUP_BY = [
  "product",
  "category",
  "customer",
  "status",
  "hour",
  "day",
  "week",
  "month",
  "weekday",
] as const;
export const TIME_GROUPS: readonly (typeof GROUP_BY)[number][] = ["hour", "day", "week", "month", "weekday"];

export const SORT_BY = ["revenue", "orders", "unitsSold", "averageOrderValue"] as const;

/** Orders that count as a "sale" unless the question says otherwise. */
export const DEFAULT_STATUSES = ["paid", "shipped", "delivered"] as const;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

// These `.describe()` texts are sent to the model as the tool's parameter docs.
export const QuerySpecSchema = z.object({
  period: z
    .enum(PERIODS)
    .optional()
    .describe(
      "Named time window, resolved on the server in the business time zone. " +
        "Weeks start on Monday. last_N_days includes today. Omit (or all_time) for no date filter.",
    ),
  from: dateString.optional().describe("Custom range start, inclusive, YYYY-MM-DD. Overrides `period`."),
  to: dateString.optional().describe("Custom range end, inclusive, YYYY-MM-DD. Overrides `period`."),
  groupBy: z
    .enum(GROUP_BY)
    .optional()
    .describe(
      "Break the result down by this dimension. Time groups (hour of day, day, week, month, weekday) " +
        "come back in chronological order, as a trend, unless `sortBy` is set. Omit for a single overall total.",
    ),
  sortBy: z
    .enum(SORT_BY)
    .optional()
    .describe(
      "Rank groups by this measure. Default revenue for product/category/customer/status groups. " +
        "Use unitsSold for 'most sold'. For time groups, set it only to rank them " +
        "(e.g. 'busiest weekday', 'best day'); leave it out to get a chronological trend.",
    ),
  sortOrder: z
    .enum(["desc", "asc"])
    .optional()
    .describe("Default desc (top first). Use asc for 'least' / 'worst'. For an unranked time trend, desc = newest first."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(366)
    .optional()
    .describe(
      "Max groups returned. Default 10 (all groups for an unranked time trend). " +
        "For 'which ... most / least' questions use 3 so ties for first place stay visible.",
    ),
  statuses: z
    .array(z.enum(ORDER_STATUSES))
    .min(1)
    .optional()
    .describe(
      `Order statuses to include. Default: ${DEFAULT_STATUSES.join(", ")} ` +
        "(pending and cancelled are NOT counted as sales). Set explicitly to look at cancelled/pending orders " +
        "or to count every order.",
    ),
  category: z.string().min(1).optional().describe("Only line items in this product category, e.g. laptops."),
  productName: z
    .string()
    .min(1)
    .optional()
    .describe("Only line items whose product name contains this text (case-insensitive)."),
  customerEmail: z.email().optional().describe("Only orders placed by this customer."),
});
export type QuerySpec = z.infer<typeof QuerySpecSchema>;

// ---- Query result (what the model and the client get back) -----------------

const MeasuresSchema = z.object({
  revenue: z.number(),
  orders: z.number().int(),
  unitsSold: z.number().int(),
  averageOrderValue: z.number(),
});

export const GroupRowSchema = MeasuresSchema.extend({
  group: z.string(),
  productId: z.number().int().optional(),
  email: z.string().optional(),
});
export type GroupRow = z.infer<typeof GroupRowSchema>;

export const SalesResultSchema = z.object({
  range: z.object({
    label: z.string(),
    timezone: z.string(),
    from: z.string().nullable(), // inclusive local date, null = unbounded
    to: z.string().nullable(),
  }),
  statusesIncluded: z.array(z.enum(ORDER_STATUSES)),
  filters: z.object({
    category: z.string().optional(),
    productName: z.string().optional(),
    customerEmail: z.string().optional(),
  }),
  totals: MeasuresSchema,
  groupBy: z.enum(GROUP_BY).optional(),
  groupCount: z.number().int().optional(), // number of groups before `limit` was applied
  rows: z.array(GroupRowSchema).optional(),
});
export type SalesResult = z.infer<typeof SalesResultSchema>;

// ---- Request / response bodies ---------------------------------------------

export const ChatBodySchema = z.object({
  message: z.string().trim().min(1, "`message` must not be empty").max(1000),
  conversationId: z.string().min(1).max(500).optional(),
});
export type ChatBody = z.infer<typeof ChatBodySchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  /** Send back as `conversationId` to ask a follow-up question. */
  conversationId: z.string(),
  /** The queries that were run to produce the answer, with their raw results. */
  queries: z.array(z.object({ spec: QuerySpecSchema, result: SalesResultSchema })),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
