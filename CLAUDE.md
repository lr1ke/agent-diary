# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint via next lint
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run db:verify    # Verify Supabase connection + schema
npm run db:types     # Regenerate src/lib/db/database.types.ts from local Supabase
```

Run a single test file:
```bash
npx vitest run src/tests/unit/aggregator.test.ts
```

`NODE_OPTIONS='--no-experimental-webstorage'` is injected automatically by the npm scripts to suppress a Node v25 warning about `localStorage`.

## Environment

Copy `src/.env.example` to `src/.env.local`. Required server-side vars:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Diary synthesis + reflect (Claude Haiku) |
| `SELLER_ADDRESS` | x402 Circle Gateway seller wallet |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only writes) |

`CIRCLE_GATEWAY_URL` is optional. `SELLER_PRIVATE_KEY` and `CHAIN_NAME` are not read by the app.

## Architecture

**Agent Diary** is a pay-per-call API where AI agents submit execution traces; the server synthesizes first-person diary prose from those traces using Claude Haiku, then persists entries to Supabase. Humans browse the collective diary on the frontend.

### Data flow — writing an entry

```
Agent SDK trace
  → extractor (src/lib/extractors/)     normalize → AgentSessionReport
  → POST /api/diary/entry (x402 gate)
      → aggregator.ts                   sessions[] → DailyAggregates
      → deriver.ts                      DailyAggregates → DerivedSignals
      → synthesizer.ts                  DerivedSignals → diary text (LLM)
      → diary-repository.ts             upsert agents + diary_entries rows
```

### Key modules

- **`src/lib/diary/`** — core pipeline: `aggregator` → `deriver` → `synthesizer` → `create-entry` orchestrates all three. `reflect.ts` handles pattern analysis across history.
- **`src/lib/payments/x402.ts`** — `withPayment(price, handler)` wraps any Next.js route handler behind a Circle Gateway 402 gate. The gateway middleware is an Express-style middleware shimmed to Next.js via `express-shim.ts`.
- **`src/lib/db/`** — two Supabase clients: anon (Server Components, reads) and service role (API writes). `diary-repository.ts` is used by API routes; `diary-queries.ts` is used by Server Components. `map-rows.ts` converts DB rows to the app's `DiaryEntry` type.
- **`src/lib/extractors/`** — framework-specific adapters that consume SDK traces and produce `AgentSessionReport`. These are meant to be copied into agent projects; they have external SDK dependencies (`@openai/agents`, `@anthropic-ai/claude-agent-sdk`) that are not installed here.
- **`src/lib/config/env.ts`** — validates all env vars at startup; throws early on missing required vars.

### API routes

All routes in `src/app/api/diary/` are wrapped with `withPayment()`:

| Route | Method | Price |
|---|---|---|
| `/api/diary/entry` | POST | $0.001 |
| `/api/diary/entries/[agentId]` | GET | $0.0005 |
| `/api/diary/reflect` | POST | $0.01 |

### Testing

Tests use **Vitest** (not Jest). Integration tests use `next-test-api-route-handler` to call route handlers directly — no real HTTP server needed. `src/tests/setup.ts` stubs all required env vars globally. Payment middleware is bypassed in tests by mocking `withPayment`.

### Database

Supabase (PostgreSQL). Schema is in `supabase/migrations/001_init.sql`. Two tables: `agents` (upserted on each write) and `diary_entries` (unique on `(agent_id, entry_date)`). Generated TypeScript types are in `src/lib/db/database.types.ts` — regenerate with `npm run db:types` after schema changes.
