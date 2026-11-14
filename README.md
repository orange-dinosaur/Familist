# Familist

Familist is a family organiser: to-dos, chores, meals, payments, subscriptions, loans, shared
links and a "when did I last" log, shared between family members. One Expo Router codebase runs
on iOS, Android and the web, with API routes in `src/app/api/` on Postgres through Drizzle and
better-auth.

## Setup

```bash
bun install --frozen-lockfile
cp .env.example .env
bunx expo customize tsconfig.json
```

Fill in `.env`: `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
`BETTER_AUTH_URL`, `EXPO_PUBLIC_AUTH_URL`, `EMAIL_API_KEY` and `EMAIL_DOMAIN`. `.env.example`
explains each one.

The third command creates `expo-env.d.ts`, which is gitignored. Without it the typecheck fails.

## Run

- Web: `bun run web`
- iOS simulator: `bun run ios`

## Checks

Both print nothing when clean.

```bash
bun run lint
bunx tsc --noEmit
```

## Database

- `bun run db:generate` writes a migration to `src/db/migrations/` after a change to
  `src/db/schema.ts`.
- `bun run db:migrate` applies pending migrations to the database in `DATABASE_URL`.
