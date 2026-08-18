# Cohort Table

A live, mobile-friendly question queue for Zoom classes. Students join a room by code and ask questions, vote, reply, and mark themselves blocked — no account required. TAs get a private slide-out desk to claim questions, create groups, and manage the live queue.

## Stack

- **Frontend**: React + Vite + Tailwind + shadcn/ui (`artifacts/cohort-table`)
- **API**: Express 5 + TypeScript (`artifacts/api-server`)
- **Database**: Replit-managed Neon PostgreSQL via Drizzle ORM (`lib/db`)
- **API contract**: OpenAPI spec + Orval codegen → React Query hooks (`lib/api-spec`, `lib/api-client-react`)

## How to run

Both workflows start automatically. The app is available at the root preview path (`/`).

- **Frontend** — `pnpm --filter @workspace/cohort-table run dev`
- **API server** — `pnpm --filter @workspace/api-server run dev` (builds with esbuild, starts on `$PORT`)

## Database

Schema is managed with Drizzle Kit. To push schema changes:

```
pnpm --filter @workspace/db run push
```

The `DATABASE_URL` is injected automatically by Replit. No manual setup needed.

## Secrets

| Secret | Purpose |
|---|---|
| `SESSION_SECRET` | Signs TA session cookies |
| `TA_PASSWORD` | Shared TA login password (default: `cohort2024` — change before sharing) |

## Rooms

A default room `AGENTS-W4` is seeded. To add more rooms, insert directly into the `rooms` table or add a seed script.

## User preferences

- Keep the project's existing monorepo structure (pnpm workspaces).
- Do not restructure or migrate the stack without explicit request.
