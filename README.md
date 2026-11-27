# DataBuddy

AI-powered sales analytics and product search API.

- **Analytics chat** — ask about your sales in plain language ("what is the total sale today?", "which product sold the most this month?", "compare revenue this month vs last month") and get a written answer backed by real numbers from MongoDB.
- **Product search** — a query like "cheapest laptop in stock" is sent to Gemini together with the product catalog, and the matching products are returned.

**Stack:** Node.js (>= 20.12), TypeScript, Express 5, Mongoose, Zod, Google Gemini.

## Getting started

```bash
cp .env.example .env        # then set GEMINI_API_KEY
docker compose up -d        # MongoDB on localhost:27017
npm install
npm run dev                 # http://localhost:3000
```

Seed the product catalog with `npm run seed` (it is no longer seeded automatically on server start).

### Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start with file watching (tsx)               |
| `npm run build`     | Compile TypeScript to `dist/`                |
| `npm start`         | Run the compiled build                       |
| `npm run typecheck` | Type-check without emitting                  |
| `npm run seed`      | Upsert the 1000-product catalog (`-- --reset` clears products first) |
| `npm run seed:orders` | Upsert 1000 orders built from the products in the DB (`-- --reset` clears orders first) |

### Configuration

Environment variables are validated at startup (`src/config/env.ts`); the app exits with a clear message if one is invalid.

| Variable         | Required | Default                     |
| ---------------- | -------- | --------------------------- |
| `GEMINI_API_KEY` | yes      |                             |
| `PORT`           | no       | `3000`                      |
| `NODE_ENV`       | no       | `development`               |
| `MONGODB_URI`    | no       | `mongodb://localhost:27017` |
| `MONGO_DB_NAME`  | no       | `databuddy`                 |
| `TIMEZONE`       | no       | server's time zone          |

`TIMEZONE` (an IANA name such as `Asia/Dhaka`) decides where "today", "this week" and "this month" begin and end in analytics answers.

## API

### `POST /analytics/chat`

```bash
curl -X POST localhost:3000/analytics/chat \
  -H 'content-type: application/json' \
  -d '{"message": "which product sold the most today?"}'
```

```json
{
  "answer": "Today (2026-11-27) the best seller was **Zenith Plus 5G Phone 903** with 3 units ($761.97).",
  "conversationId": "v1_Chc...",
  "queries": [ { "spec": { "period": "today", "groupBy": "product", "sortBy": "unitsSold" }, "result": { "...": "..." } } ]
}
```

- Send the returned `conversationId` back with the next message to ask follow-ups ("and last month?"). An unknown or expired id returns `400`; omit it to start over.
- `queries` lists every query that was run, with its raw result, so each number in the answer can be checked.
- **Sales rules:** only `paid`, `shipped` and `delivered` orders count as sales; `pending` and `cancelled` are excluded unless the question asks about them. Revenue is the sum of line items (`unitPrice × quantity`).

**How it works.** Gemini never writes database queries. It calls one tool, `query_sales`, with a validated spec (period, group-by, filters, ranking). The server resolves dates in `TIMEZONE`, compiles the spec into a MongoDB aggregation, runs it, and hands the result back to Gemini to phrase the answer. This keeps numbers exact and the model unable to run anything but read-only sales queries. Conversation history is kept by Gemini (`previous_interaction_id`), not by this server.

### `POST /products/search`

```bash
curl -X POST localhost:3000/products/search \
  -H 'content-type: application/json' \
  -d '{"query": "cheapest laptop in stock"}'
```

```json
{ "query": "cheapest laptop in stock", "products": [ { "id": 2, "name": "BudgetBook 15", "...": "..." } ] }
```

Errors are JSON: `400` for an invalid body (with per-field `issues`), `404` for unknown routes, `500` if the search fails.

## Project structure

```
src/
├── server.ts            Entrypoint: connect DB, seed, listen, graceful shutdown
├── app.ts               Express app factory (middleware, routes, error handling)
├── config/
│   └── env.ts           Validated environment variables
├── db/
│   └── connection.ts    MongoDB connect / disconnect
├── lib/
│   └── gemini.ts        Gemini client wrapper
├── middleware/
│   ├── validate.ts      Zod request-body validation
│   └── error-handler.ts 404 and centralized error responses
├── routes/
│   └── index.ts         Mounts each module's router
├── scripts/
│   ├── seed.ts          `npm run seed`: insert / refresh the 1000-product catalog
│   └── seed-orders.ts   `npm run seed:orders`: insert / refresh 1000 orders (dated up to now)
├── utils/
│   └── errors.ts        HttpError
└── modules/             One folder per feature
    ├── products/
    │   ├── product.schema.ts      Zod schemas and types
    │   ├── product.model.ts       Mongoose model
    │   ├── product.service.ts     Business logic (search)
    │   ├── product.controller.ts  HTTP handlers
    │   └── product.routes.ts      Route definitions
    ├── orders/
    │   ├── order.schema.ts        Zod schemas and types
    │   └── order.model.ts         Mongoose model
    └── analytics/
        ├── analytics.schema.ts    Query spec, results, request/response bodies
        ├── analytics.periods.ts   "today" / "this month" -> date ranges in TIMEZONE
        ├── analytics.query.ts     Query spec -> MongoDB aggregation
        ├── analytics.chat.ts      Gemini tool-calling loop and system prompt
        ├── analytics.controller.ts
        └── analytics.routes.ts
```

New features go in their own folder under `src/modules/` and get mounted in `src/routes/index.ts`.
