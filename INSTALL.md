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
bun run check        # Type check (web)
bun run deploy       # Deploy API and web
bun run db:generate  # Generate Drizzle migrations
bun run db:push      # Push schema directly to the database
bun run db:migrate   # Apply migrations (production)
bun run db:migrate:local
```
