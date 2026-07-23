# Current Database Inventory (`thebook`)

Snapshot of the existing PostgreSQL database used by this project’s `.env` credentials.  
**Purpose:** keep new “12 Rules” MVP tables compatible with what already exists — no name clashes, no accidental reuse of unrelated tables.

- **Engine:** PostgreSQL
- **Database name:** `thebook` (from `DB_NAME`)
- **Schema in use:** `public` only
- **Connection:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` in `.env` (do not commit secrets)
- **Captured:** 2026-07-23

---

## Important: this DB is already shared

`thebook` already powers another product (Bible / library / Telegram mailing).  
Do **not** treat existing tables as empty or free to redefine.

Existing domains in `public`:

| Domain | Tables |
|--------|--------|
| Library / books catalog | `"Book"`, `"Library"`, `"TextFragment"`, `"Relationship"`, `"Route"`, `slovnik_index` |
| Web auth users (Clerk) | `"User"` |
| Telegram bot users + journey | `telegram_users`, `user_journey_events`, `ai_responses`, `mailing_iterations` |

---

## Existing tables (do not rename / overwrite)

### PascalCase tables

#### `"Book"` (~15 rows)

Catalog of books (Bible translations, novels, etc.). **Not** structured Rule/Chapter content for Peterson.

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial PK | |
| `title` | varchar(255) NOT NULL | |
| `author` | varchar(255) | |
| `link` | varchar(255) | |
| `content` | text | often empty for listed rows |
| `category` | varchar(255) | |
| `format` | varchar(10) | |
| `filePath` | varchar(255) | |
| `slug` | varchar(255) NOT NULL UNIQUE | |

#### `"Library"` (~1 row)

Library container (`id` is text/UUID-like).

| Column | Type |
|--------|------|
| `id` | text PK |
| `title` | text NOT NULL UNIQUE |
| `author`, `link`, `content`, `category`, `format`, `filePath` | text |
| `slug` | text NOT NULL UNIQUE |

#### `"TextFragment"` (~11 rows)

Fragments linked to a library item; optional `vectorEmbedding` (jsonb).

| Column | Type |
|--------|------|
| `id` | serial PK |
| `libraryId` | text NOT NULL |
| `text` | text NOT NULL |
| `pageNumber` | integer |
| `vectorEmbedding` | jsonb |

#### `"Relationship"` (0 rows)

Similarity between fragments: `fragmentId1`, `fragmentId2`, `similarityScore`.

#### `"Route"` (0 rows)

Named routes: `name`, `startPoint`, `endPoint`, `distance`, `createdAt`, `updatedAt`.

#### `"User"` (~3 rows)

**Clerk web users** — not Telegram users.

| Column | Type |
|--------|------|
| `id` | serial PK |
| `clerkId` | varchar(255) UNIQUE NOT NULL |
| `name`, `email` | varchar(255) NOT NULL |
| `role` | varchar(45) default `'user'` |
| `createdAt`, `updatedAt` | timestamp |

---

### snake_case tables

#### `telegram_users` (~14 rows)

Telegram identities for the existing bot. Prefer **reusing** this later for 12 Rules users instead of creating a second Telegram user table.

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial PK | |
| `telegramId` | bigint UNIQUE NOT NULL | |
| `username`, `firstName`, `lastName` | varchar | |
| `languageCode` | varchar(10) | |
| `isBot`, `isPremium`, `addedToAttachmentMenu`, `allowsWriteToPm`, `isActive` | boolean | |
| `lastActivity` | timestamptz | |
| `totalInteractions` | integer | |
| `preferences` | jsonb | |
| `createdAt`, `updatedAt` | timestamptz NOT NULL | |

#### `mailing_iterations` (~136 rows)

Daily **Bible** mailing cursor / send log (`bookName`, `chapterIndex`, `chapterNumber`, verses…).  
**Do not** overload this for Peterson daily learning — use a separate progress table.

#### `user_journey_events` (~74 rows)

Analytics events for Telegram users (`eventType`, `metadata` jsonb, FKs to `telegram_users`, `mailing_iterations`, `ai_responses`).

#### `ai_responses` (~74 rows)

Stored AI replies tied to journey events (`responseText`, `promptUsed`, `status`, `aiModel` default `gemini-pro`).  
This is **runtime AI logging**, not the MVP “translate once at import” store.

#### `slovnik_index` (~374 rows)

Word → page index (`word`, `page`). No PK.

---

## Name collision check for MVP TA names

| Proposed MVP name (from TA) | Status in DB today |
|-----------------------------|--------------------|
| `rules` | **Free** (does not exist) |
| `chapters` | **Free** (does not exist) |
| `learning_progress` | **Free** (does not exist) |
| `translations` | **Free** (does not exist) |
| `Book` / `books` | **Taken / confusing** — `"Book"` exists |
| `User` / `users` | **Taken / confusing** — `"User"` is Clerk; Telegram users are `telegram_users` |
| `mailing_*` | Prefer avoid — already Bible mailing |

Technically `rules` / `chapters` can be created as-is.  
**Recommended anyway:** prefix new tables so this shared DB stays readable and future-proof.

---

## Recommended naming for 12 Rules MVP (stage 1)

Use a clear project prefix, e.g. `twelverules_` (or `jp12_`):

| MVP concept | Recommended table name | Why |
|-------------|------------------------|-----|
| Rules (12) | `twelverules_rules` | Avoids generic `rules`; distinct from `"Book"` |
| Chapters | `twelverules_chapters` | Avoids confusion with Bible `chapterIndex` / mailing |
| Daily cursor (later) | `twelverules_learning_progress` | Separate from `mailing_iterations` |
| Telegram users | **reuse** `telegram_users` | Already exists; do not create a duplicate |

### Suggested stage-1 columns (for later migration design)

**`twelverules_rules`**

- `id` serial PK  
- `rule_number` integer UNIQUE NOT NULL (1–12)  
- `title_original` text NOT NULL  
- `title_ua` text  
- `created_at` / `updated_at` timestamptz  

**`twelverules_chapters`**

- `id` serial PK  
- `rule_id` integer NOT NULL → FK `twelverules_rules(id)` ON DELETE CASCADE  
- `chapter_number` integer NOT NULL  
- `title_original` text NOT NULL  
- `title_ua` text  
- `content_original` text NOT NULL  
- `content_ua` text  
- UNIQUE (`rule_id`, `chapter_number`)  

Optional later: `book_id` FK to `"Book"(id)` if you also register Peterson in the library catalog — **not required** for MVP stage 1.

---

## Conventions observed in this DB (match when adding tables)

1. **Mixed naming styles** coexist: PascalCase (`"Book"`) and snake_case (`telegram_users`). Prefer **snake_case + prefix** for new 12 Rules tables.
2. Many app columns use **camelCase** (`telegramId`, `createdAt`) even inside snake_case table names — if we join Sequelize/ORM later, stay consistent within the new tables (prefer either all `snake_case` columns or all camelCase; do not mix inside one new table).
3. Telegram timestamps tend to be **`timestamptz`**; some older tables use `timestamp without time zone`. Prefer **`timestamptz`** for new tables.
4. Never drop or alter existing tables for MVP unless explicitly planned and backed up.

---

## Safe development rules

1. Only **create** new prefixed tables; do not ALTER existing Bible/library tables for 12 Rules MVP.
2. Do not store Peterson chapter text in `"Book".content` or `"TextFragment"` — different product model.
3. Do not reuse `mailing_iterations` for daily 12 Rules sends.
4. Do not create a second Telegram users table; extend or reference `telegram_users` when needed.
5. Keep Gemini import translations **in** `twelverules_chapters.content_ua` (MVP); do not require the existing `ai_responses` table for that pipeline.

---

## Applied: stage-1 MVP tables

Migration: `DB/migrations/001_twelverules_rules_chapters.sql`  
Run with: `npm run db:migrate`

| Table | Status |
|-------|--------|
| `twelverules_rules` | Created + seeded from `content.txt` (titles) |
| `twelverules_chapters` | Created + seeded from `content.txt` (chapter titles; bodies empty) |
| `twelverules_learning_progress` | Not yet — daily-scheduler stage |

Seed command: `npm run db:seed` (`DB/seed-from-content.ts`)
