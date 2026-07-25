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

## Sprint 4 — Bot reads from DB

Wired Telegram commands to Postgres instead of reading `content.txt` at runtime.

- Added `DB/queries/rules.ts`: `listRules()`, `getRuleWithChapters(n)`.
- `/rules` and `/rule <n>` load from `twelverules_rules` / `twelverules_chapters`.
- `/start` mentions both commands; bot menu includes `rule`.
- `content.txt` remains the source for `npm run db:seed` only (not used by the bot live path).
- **Live testing in Telegram:** passed — `/rules` and `/rule <n>` work against the remote DB.

## Sprint 5 — FB2 import into DB

Filled English chapter bodies from `12rules.fb2` into Postgres and exposed reading in the bot.

- Extracted shared FB2 parsing into `fb2/parse.ts` (`extractRulesFromFb2`); `app.ts` is now a thin CLI entry.
- Added `DB/import-fb2.ts` + `npm run db:import-fb2` — idempotent UPDATE of `content_original` / titles by rule+chapter number.
- Added `getChapter()` in `DB/queries/rules.ts`.
- Added `/chapter <rule> <n>` with Telegram message splitting (`telegram/core/split-message.ts`).
- Bot menu includes `chapter`.
