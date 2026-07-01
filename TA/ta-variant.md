I merged all previous parts into one **MVP-focused Technical Assignment**. I removed the unnecessary complexity we discussed (runtime FB2 parsing, Gemini on every request, advanced analytics, admin panel, etc.).

# Technical Assignment — Telegram Bot “12 Rules for Life Learning Assistant” (MVP)

## 1. Project Overview

### Project Name

Telegram bot for studying the book:

**“12 Rules for Life: An Antidote to Chaos” by Jordan Peterson**

### Purpose

The bot helps users gradually study the book by:

* receiving daily learning content;
* reading chapters in Ukrainian translation;
* accessing the original English text;
* navigating through the book structure.

The primary bot language is **Ukrainian**.

---

# 2. Core Concept

The book structure:

```
Book
│
├── Rule 1
│     ├── Chapter 1
│     ├── Chapter 2
│     └── ...
│
├── Rule 2
│     ├── Chapter 1
│     └── ...
│
...
│
└── Rule 12
      ├── Chapter 1
      └── ...
```

Terminology:

* **Rule** = one of 12 main sections
* **Chapter** = smaller chapters inside each Rule

---

# 3. Data Import Process

## Source

Administrator provides:

FB2 book file (English original version)

---

## Import Script

A one-time import script should:

1. Read FB2 file.

2. Extract:

   * Rule number
   * Rule title
   * Chapter number
   * Chapter title
   * Chapter text

3. Save all data into database.

---

# 4. Database Structure

## Table: `rules`

Stores 12 main sections.

Fields:

```
id
rule_number
title_original
title_ua
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
```

Stores:

* English original
* Ukrainian translation

---

## Table: `learning_progress`

Stores current daily position.

Fields:

```
id
current_rule_number
current_chapter_number
last_sent_date
```

Example:

```
Rule: 1
Chapter: 2
```

---

# 5. Translation Process

## MVP Approach

Translation is done during import.

Flow:

```
FB2
 ↓
Extract text
 ↓
Gemini AI translation
 ↓
Save Ukrainian version
 ↓
Bot uses database
```

Gemini is NOT used when users read content.

Advantages:

* faster response;
* lower API cost;
* stable content.

---

# 6. Start Command

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

Buttons:

```
📖 Зміст книги
```

---

# 7. Daily Learning System

## Scheduler

Every day at:

```
07:00
```

Bot sends the next chapter.

---

## Algorithm

1. Get current position.
2. Find:

```
Rule X
Chapter Y
```

3. Send Ukrainian content.
4. Update progress.

After the last chapter:

restart:

```
Rule 1 → Chapter 1
```

---

# 8. Daily Message Format

Example:

```
📖 Правило 1

Випряміться і розправте плечі


Розділ 1:

Омари та їхнє середовище


[Ukrainian chapter content]
```

Buttons:

```
📘 Читати оригінал
```

---

# 9. Original Version Feature

When user presses:

```
📘 Читати оригінал
```

Bot:

1. Gets:

```
rule_id
chapter_id
```

2. Queries database.

3. Sends:

* English rule title
* English chapter title
* English original text

No Gemini.

---

# 10. Content Navigation

Command menu:

```
📖 Зміст
```

opens:

```
1
2
3
4
...
12
```

Each number is an inline button.

Example:

```
Правило 1
```

opens:

```
📖 Правило 1

Випряміться і розправте плечі
```

Then:

```
Розділ 1
Розділ 2
Розділ 3
```

---

# 11. Chapter View

When user selects chapter:

Bot sends:

```
📖 Правило 1

Розділ 1:
Омари та їхнє середовище

[Ukrainian text]
```

Button:

```
📘 Читати оригінал
```

---

# 12. Telegram Interface

The bot should use:

* Commands menu
* Inline keyboards
* Callback buttons

Required commands:

```
/start
/content
```

---

# 13. MVP Excluded Features

Not included:

* user personal progress;
* bookmarks;
* notes;
* reading statistics;
* admin panel;
* content editor;
* dynamic FB2 reading;
* translation on demand;
* AI chat about the book;
* user accounts.

---

# 14. Future Extensions

Possible later:

* personal reading progress;
* questions after chapters;
* AI discussion mode;
* vocabulary extraction;
* highlights;
* notes;
* reminders;
* spaced repetition.

---

## MVP Goal

Deliver a simple reliable learning system:

```
Book
 ↓
Database
 ↓
Daily chapter
 ↓
Ukrainian learning
 ↓
Original text access
 ↓
Complete book navigation
```

This version is enough to launch the first working product.
