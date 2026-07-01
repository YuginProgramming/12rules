# Technical Assignment — Telegram Bot “12 Rules for Life Learning Assistant” (Full Version)

## 1. Project Overview

### Project Name

Telegram educational bot for studying:

**“12 Rules for Life: An Antidote to Chaos” by Jordan Peterson**

---

## 2. Main Purpose

The bot is designed for users who want to study the book step-by-step.

The bot provides:

* structured access to the book;
* daily learning process;
* Ukrainian translation;
* original English version;
* navigation through all book sections and chapters;
* AI-assisted translation.

Primary interface language:

**Ukrainian**

---

# 3. Book Structure Model

The book structure:

```
Book
│
├── Rule 1
│     │
│     ├── Chapter 1
│     ├── Chapter 2
│     └── Chapter N
│
├── Rule 2
│     │
│     ├── Chapter 1
│     └── Chapter N
│
...
│
└── Rule 12
      │
      ├── Chapter 1
      └── Chapter N
```

Terminology:

* **Rule** — one of 12 main sections of the book.
* **Chapter** — smaller chapters inside each Rule.

---

# 4. Source Book Processing

## Input Source

Administrator uploads:

FB2 file containing the English version of the book.

---

## FB2 Analysis Module

The system must analyze the FB2 structure.

Goal:

Understand how the book content can be accessed.

Possible implementations:

### Method A — Direct FB2 anchors

If FB2 contains stable IDs:

Store:

* chapter ID;
* rule ID;
* internal references.

The system can retrieve chapters directly from FB2.

---

### Method B — Full parsing into database

If FB2 navigation is not reliable:

The parser extracts:

* Rule number;
* Rule title;
* Chapter number;
* Chapter title;
* Chapter content.

The extracted structure is stored in the database.

---

# 5. Content Import Process

Import script:

1. Reads FB2 file.
2. Detects Rules.
3. Detects Chapters.
4. Extracts original English content.
5. Creates content structure.
6. Sends extracted text to Gemini AI.
7. Receives Ukrainian translation.
8. Saves both versions.

---

# 6. Database Structure

## Table: `rules`

Stores main 12 Rules.

Fields:

```
id
rule_number
title_original
title_ua
fb2_reference
created_at
```

Example:

```
1
Stand up straight with your shoulders back
Випряміться і розправте плечі
```

---

## Table: `chapters`

Stores chapters.

Fields:

```
id
rule_id
chapter_number
title_original
title_ua
content_original
content_ua
fb2_reference
created_at
```

---

## Table: `translations`

Stores translation information.

Fields:

```
id
chapter_id
source_language
target_language
translation_model
translation_date
```

---

## Table: `learning_progress`

Stores daily position.

Fields:

```
id
current_rule_number
current_chapter_number
last_sent_date
```

---

# 7. Telegram Start Flow

Command:

```
/start
```

Bot sends:

```
Вітаю! 👋

Цей бот створений для тих, хто хоче вивчати книгу Джордана Пітерсона
«12 правил життя: протиотрута від хаосу».

Тут ви зможете поступово знайомитися зі змістом книги,
вивчати основні ідеї та повертатися до важливих думок.

Почнімо дослідження книги разом 📖
```

---

Main inline button:

```
📖 Зміст книги
```

Callback:

```
show_content
```

---

# 8. Daily Learning Scheduler

## Schedule

Every day:

```
07:00
```

---

Process:

1. Scheduler starts.
2. Gets current learning position.
3. Finds corresponding:

```
Rule
+
Chapter
```

4. Gets Ukrainian content.
5. Sends message.
6. Updates progress.

---

## Sequence Logic

Example:

```
Rule 1
 Chapter 1
 Chapter 2
 Chapter 3

Rule 2
 Chapter 1
...
Rule 12
 Chapter N
```

After completion:

Restart:

```
Rule 1 Chapter 1
```

---

# 9. Daily Learning Message

Example:

```
📖 Правило 1

Випряміться і розправте плечі


Розділ 1:

Омари та їхнє середовище


[Український текст]
```

---

Buttons:

```
📘 Читати оригінал
```

Callback:

```
read_original_{rule}_{chapter}
```

---

# 10. Original English Version

When user clicks:

```
📘 Читати оригінал
```

Process:

1. Receive:

```
rule_number
chapter_number
```

2. Locate chapter.

3. Access original source:

* FB2 directly OR
* parsed database content.

4. Return exact English text.

---

Message:

```
📘 Rule 1

Stand up straight with your shoulders back


Chapter 1:

Lobsters and Their Environment


[Original English content]
```

---

# 11. Telegram Command Menu

The bot has a persistent command menu.

Commands:

```
/start
/content
```

---

# 12. Content Navigation

Command:

```
📖 Зміст
```

opens:

12 inline buttons:

```
1
2
3
4
...
12
```

---

Callback:

```
open_rule_1
open_rule_2
...
open_rule_12
```

---

# 13. Rule View

Example:

```
📖 Правило 1

Випряміться і розправте плечі
```

Shows chapters:

```
Розділ 1
Розділ 2
Розділ 3
```

Each chapter is an inline button.

---

# 14. Chapter Navigation

Callback:

```
open_rule_1_chapter_1
```

Bot displays:

```
📖 Правило 1

Розділ 1:
Омари та їхнє середовище


[Ukrainian content]
```

Buttons:

```
📘 Читати оригінал
```

---

# 15. Gemini AI Integration

Purpose:

Translation.

Input:

English:

* Rule title;
* Chapter title;
* Chapter content.

Output:

Ukrainian:

* Rule title;
* Chapter title;
* Content.

---

Gemini is used for:

* initial translation;
* possible future retranslation.

---

# 16. Error Handling

System should handle:

## Missing translation

Fallback:

Show original English.

---

## Missing chapter

Return:

```
Вибачте, цей розділ зараз недоступний.
```

---

## FB2 parsing error

Log:

* file;
* chapter;
* error message.

---

# 17. Future Extensions (Not Required)

Possible future modules:

* personal progress;
* bookmarks;
* notes;
* AI discussion;
* questions after chapters;
* vocabulary learning;
* summaries;
* reading statistics;
* user profiles;
* admin panel.

---

# 18. Final System Architecture

```
FB2 Book
    |
    ↓
FB2 Parser
    |
    ↓
Content Database
    |
    ↓
Gemini Translation Layer
    |
    ↓
Telegram Bot
    |
    ├── Daily Learning
    |
    ├── Content Navigation
    |
    └── Original Text Access
```

---

## Main Development Goal

Create a Telegram-based interactive learning system where the user can:

1. Open the bot.
2. Receive one chapter every day.
3. Study Ukrainian translation.
4. Switch to original English.
5. Navigate the entire book structure.
