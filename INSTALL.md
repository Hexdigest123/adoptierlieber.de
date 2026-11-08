# Installation

The project is a Bun monorepo (API + Web). Prerequisite: [Bun](https://bun.com) – a fast all-in-one JavaScript runtime.

## Install dependencies

```bash
bun install
```

## Configure

```bash
cp .env.example .env
```

Both apps read the repo-root `.env` in development; `.env.example` explains every key. `SECRET_TOTP_KEY` is required for MFA. In development, mail goes to the SMTP server configured there (the defaults match the mailpit service in `docker-compose.yml`). Apply the database migrations locally once with `bun run db:migrate:local`.

## Start the development server

```bash
bun run dev
```

## Other scripts

```bash
bun run check           # Type check (API and web)
bun run lint            # Formatting (API and web) and ESLint (web)
bun run format          # Format API and web with Prettier
bun run deploy          # Deploy API and web
bun run deploy:staging  # Deploy to staging
bun run db:generate     # Generate Drizzle migrations (SQL, no DB access)
bun run db:migrate      # Apply migrations (production)
bun run db:migrate:staging  # Apply migrations (staging)
bun run db:migrate:local    # Apply migrations (local D1)
```
