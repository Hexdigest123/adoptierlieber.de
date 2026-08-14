# Installation

The project is a Bun monorepo (API + Web). Prerequisite: [Bun](https://bun.com) – a fast all-in-one JavaScript runtime.

## Install dependencies

```bash
bun install
```

## Start the development server

```bash
bun run dev
```

## Other scripts

```bash
bun run check           # Type check (web)
bun run deploy          # Deploy API and web
bun run deploy:staging  # Deploy to staging
bun run db:generate     # Generate Drizzle migrations (SQL, no DB access)
bun run db:migrate      # Apply migrations (production)
bun run db:migrate:staging  # Apply migrations (staging)
bun run db:migrate:local
```
