# DataBuddy

Natural-language product search API. A query like "cheapest laptop in stock" is sent to Gemini together with the product catalog stored in MongoDB, and the matching products are returned.

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

### Configuration

Environment variables are validated at startup (`src/config/env.ts`); the app exits with a clear message if one is invalid.

| Variable         | Required | Default                     |
| ---------------- | -------- | --------------------------- |
| `GEMINI_API_KEY` | yes      |                             |
| `PORT`           | no       | `3000`                      |
| `NODE_ENV`       | no       | `development`               |
| `MONGODB_URI`    | no       | `mongodb://localhost:27017` |
| `MONGO_DB_NAME`  | no       | `databuddy`                 |

## API

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
│   └── seed.ts          `npm run seed`: insert / refresh the 1000-product catalog
├── utils/
│   └── errors.ts        HttpError
└── modules/
    └── products/        One folder per feature
        ├── product.schema.ts      Zod schemas and types
        ├── product.model.ts       Mongoose model
        ├── product.seed.ts        Starter catalog and seeding
        ├── product.service.ts     Business logic (search)
        ├── product.controller.ts  HTTP handlers
        └── product.routes.ts      Route definitions
```

New features go in their own folder under `src/modules/` and get mounted in `src/routes/index.ts`.
