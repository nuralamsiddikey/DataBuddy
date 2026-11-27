import type { PipelineStage } from "mongoose";
import { env } from "../../config/env.js";
import { OrderModel } from "../orders/order.model.js";
import { resolveRange } from "./analytics.periods.js";
import {
  DEFAULT_STATUSES,
  TIME_GROUPS,
  type GroupRow,
  type QuerySpec,
  type SalesResult,
} from "./analytics.schema.js";

type GroupBy = NonNullable<QuerySpec["groupBy"]>;

const round2 = (n: number): number => Math.round(n * 100) / 100;
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactCaseInsensitive = (s: string) => ({ $regex: `^${escapeRegExp(s.trim())}$`, $options: "i" });

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Group key expression for a dimension (null = one overall group). */
function groupKey(groupBy: GroupBy | undefined, timeZone: string): unknown {
  const date = "$orderedAt";
  const fmt = (format: string, value: unknown = date) => ({ $dateToString: { format, date: value, timezone: timeZone } });
  switch (groupBy) {
    case undefined:
      return null;
    case "product":
      return "$items.productId";
    case "category":
      return "$category";
    case "customer":
      return "$customer.email";
    case "status":
      return "$status";
    case "hour":
      return fmt("%H");
    case "day":
      return fmt("%Y-%m-%d");
    case "week": // labelled by the Monday that starts the week
      return fmt("%Y-%m-%d", {
        $dateTrunc: { date, unit: "week", startOfWeek: "monday", timezone: timeZone },
      });
    case "month":
      return fmt("%Y-%m");
    case "weekday":
      return fmt("%u"); // ISO weekday, 1 = Monday
  }
}

/** Field a group is labelled with in addition to its key (product / customer name). */
function nameField(groupBy: GroupBy | undefined): string | null {
  if (groupBy === "product") return "$items.name";
  if (groupBy === "customer") return "$customer.name";
  return null;
}

/**
 * Group stages computing revenue / orders / unitsSold per key.
 *
 * Order-level questions read `totalAmount` straight off the order. Questions about products or
 * categories first unwind the line items, then count each order once per group
 * (group by order+key first, then by key).
 */
function groupStages(key: unknown, name: string | null, itemLevel: boolean): PipelineStage[] {
  const average = {
    $set: { averageOrderValue: { $cond: [{ $gt: ["$orders", 0] }, { $divide: ["$revenue", "$orders"] }, 0] } },
  };

  if (!itemLevel) {
    return [
      {
        $group: {
          _id: key,
          ...(name && { name: { $first: name } }),
          revenue: { $sum: "$totalAmount" },
          unitsSold: { $sum: { $sum: "$items.quantity" } },
          orders: { $sum: 1 },
        },
      },
      average,
    ];
  }

  return [
    {
      $group: {
        _id: { order: "$id", key },
        ...(name && { name: { $first: name } }),
        revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
        unitsSold: { $sum: "$items.quantity" },
      },
    },
    {
      $group: {
        _id: "$_id.key",
        ...(name && { name: { $first: "$name" } }),
        revenue: { $sum: "$revenue" },
        unitsSold: { $sum: "$unitsSold" },
        orders: { $sum: 1 },
      },
    },
    average,
  ];
}

const measures = (raw: { revenue?: number; orders?: number; unitsSold?: number; averageOrderValue?: number } | undefined) => ({
  revenue: round2(raw?.revenue ?? 0),
  orders: raw?.orders ?? 0,
  unitsSold: raw?.unitsSold ?? 0,
  averageOrderValue: round2(raw?.averageOrderValue ?? 0),
});

interface RawGroup {
  _id: string | number | null;
  name?: string;
  revenue: number;
  orders: number;
  unitsSold: number;
  averageOrderValue: number;
}

function toRow(raw: RawGroup, groupBy: GroupBy): GroupRow {
  const key = raw._id === null ? "(none)" : String(raw._id);
  switch (groupBy) {
    case "product":
      return { group: raw.name ?? key, productId: Number(raw._id), ...measures(raw) };
    case "customer":
      return { group: raw.name ?? key, email: key, ...measures(raw) };
    case "hour":
      return { group: `${key}:00`, ...measures(raw) };
    case "weekday":
      return { group: WEEKDAYS[Number(key) - 1] ?? key, ...measures(raw) };
    default:
      return { group: key, ...measures(raw) };
  }
}

/** Runs one analytics query. Throws `AnalyticsQueryError` for a question that can't be answered as asked. */
export async function runSalesQuery(spec: QuerySpec, now = new Date(), timeZone = env.TIMEZONE): Promise<SalesResult> {
  const range = resolveRange(spec, now, timeZone);
  const statuses = [...new Set(spec.statuses ?? DEFAULT_STATUSES)];
  const { groupBy } = spec;
  const isTimeGroup = groupBy !== undefined && TIME_GROUPS.includes(groupBy);

  const itemLevel = groupBy === "product" || groupBy === "category" || !!spec.productName || !!spec.category;
  const needsCategory = groupBy === "category" || !!spec.category;

  // Shared by the totals and the per-group queries.
  const prefix: PipelineStage[] = [
    {
      $match: {
        status: { $in: statuses },
        ...((range.start || range.end) && {
          orderedAt: { ...(range.start && { $gte: range.start }), ...(range.end && { $lt: range.end }) },
        }),
        ...(spec.customerEmail && { "customer.email": exactCaseInsensitive(spec.customerEmail) }),
      },
    },
  ];
  if (itemLevel) prefix.push({ $unwind: "$items" });
  if (spec.productName) {
    prefix.push({ $match: { "items.name": { $regex: escapeRegExp(spec.productName.trim()), $options: "i" } } });
  }
  if (needsCategory) {
    // Items only snapshot name/price, so the category comes from the live product.
    prefix.push(
      { $lookup: { from: "products", localField: "items.productId", foreignField: "id", as: "product" } },
      { $set: { category: { $first: "$product.category" } } },
    );
  }
  if (spec.category) prefix.push({ $match: { category: exactCaseInsensitive(spec.category) } });

  const totalsPipeline = [...prefix, ...groupStages(null, null, itemLevel)];

  // Time groups are a trend (chronological) unless the caller asks to rank them, e.g. "busiest weekday".
  const chronological = isTimeGroup && spec.sortBy === undefined;
  const sort = chronological
    ? { _id: spec.sortOrder === "desc" ? (-1 as const) : (1 as const) }
    : { [spec.sortBy ?? "revenue"]: spec.sortOrder === "asc" ? 1 : -1, _id: 1 as const };
  const limit = spec.limit ?? (chronological ? 366 : 10);
  const rowsPipeline: PipelineStage[] = [
    ...prefix,
    ...groupStages(groupKey(groupBy, timeZone), nameField(groupBy), itemLevel),
    { $facet: { rows: [{ $sort: sort }, { $limit: limit }], groupCount: [{ $count: "n" }] } },
  ];

  const [[totals], grouped] = await Promise.all([
    OrderModel.aggregate<RawGroup>(totalsPipeline),
    groupBy
      ? OrderModel.aggregate<{ rows: RawGroup[]; groupCount: { n: number }[] }>(rowsPipeline)
      : Promise.resolve(undefined),
  ]);

  return {
    range: { label: range.label, timezone: range.timezone, from: range.from, to: range.to },
    statusesIncluded: statuses,
    filters: {
      ...(spec.category && { category: spec.category }),
      ...(spec.productName && { productName: spec.productName }),
      ...(spec.customerEmail && { customerEmail: spec.customerEmail }),
    },
    totals: measures(totals),
    ...(groupBy && {
      groupBy,
      groupCount: grouped?.[0]?.groupCount[0]?.n ?? 0,
      rows: (grouped?.[0]?.rows ?? []).map((row) => toRow(row, groupBy)),
    }),
  };
}
