# Personal Expense Tracker

A local-first personal finance app for recording everyday spending, setting a monthly budget, and understanding spending patterns at a glance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/expense-tracker/src/App.tsx` — app routes, localStorage persistence, expense/category/settings state, and UI.
- `artifacts/expense-tracker/src/index.css` — shared visual tokens and responsive application styles.
- `artifacts/expense-tracker/.replit-artifact/artifact.toml` — artifact metadata and managed web workflow.

## Architecture decisions

- The first release is local-first: browser storage keeps expenses, categories, budget, currency, and sample-data state across refreshes without requiring accounts.
- Seed data is included for first-time users and can be cleared or restored from Settings.
- Dashboard and transaction views share the same state model so edits, deletes, filters, and budget status update immediately.
- Responsive navigation switches from a desktop sidebar to a compact mobile bottom bar.

## Product

- Dashboard with monthly spend, remaining budget, count, daily average, category breakdown, recent expenses, and budget threshold states.
- Transaction management with add/edit/delete, validation, search, date/category/amount filters, and sort options.
- Settings for monthly budget, currency, custom category management, sample data controls, and clearing all local data.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
