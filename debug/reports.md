# Debug Reports

## Sprint 1

We completed the first sprint and finished it with live testing in Telegram.

- Set up the Telegram bot skeleton (`telegram/bot.ts`, `telegram/run-bot.ts`).
- Added `/start` handler that replies with RULE 1 content (`telegram/handlers/command-handlers.ts`).
- Installed `telegraf` + `dotenv`, added `npm run bot` script.
- Verified end-to-end with live testing in Telegram — working.

## Sprint 2

- Added `telegram/content/rules.ts` to parse `content.txt` into the 12 rules.
- `/rules` lists all rule titles; `/start` points users to `/rules`.
- Updated bot command menu to `start` + `rules`; included `telegram/**/*.ts` in `tsconfig.json`.

## Sprint 3 — Database (stage 1)

Inspected shared Postgres DB `thebook` and added 12 Rules tables without colliding with existing Bible/library tables.

- Documented live schema in `DB/current-db.md` (existing tables, naming rules, reuse of `telegram_users`).
- Chose prefixed tables: `twelverules_rules`, `twelverules_chapters` (avoid clash with `"Book"`, `mailing_iterations`, etc.).
- Added `DB/client.ts` (pg pool from `.env`), migration `DB/migrations/001_twelverules_rules_chapters.sql`, runner `DB/migrate.ts`.
- Installed `pg` / `@types/pg`; added `npm run db:migrate` — applied successfully on the remote DB.
- Seeded titles from `content.txt` via `DB/seed-from-content.ts` + `npm run db:seed` (chapter bodies left empty until FB2 import).
- Left `twelverules_learning_progress` for a later daily-scheduler stage.
