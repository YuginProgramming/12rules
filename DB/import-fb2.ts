import { isAbsolute, join } from "node:path";
import {
  extractRulesFromFb2,
  loadFb2File,
  resolveDefaultFb2Path,
} from "../fb2/parse.js";
import { pool } from "./client.js";

/**
 * Import English chapter bodies from FB2 into twelverules_chapters.content_original.
 * Idempotent: updates existing seeded rows by (rule_number, chapter_number).
 */
async function importFb2(fb2Path: string): Promise<void> {
  const doc = await loadFb2File(fb2Path);
  const rules = extractRulesFromFb2(doc);
  if (rules.length === 0) {
    throw new Error(`No RULE sections found in ${fb2Path}`);
  }

  const client = await pool.connect();
  let updated = 0;
  let missing = 0;
  let emptyContent = 0;

  try {
    await client.query("BEGIN");

    for (const rule of rules) {
      await client.query(
        `UPDATE twelverules_rules
         SET title_original = $2, updated_at = NOW()
         WHERE rule_number = $1`,
        [rule.ruleNumber, rule.title],
      );

      for (const chapter of rule.chapters) {
        if (!chapter.content.trim()) emptyContent += 1;

        const res = await client.query(
          `UPDATE twelverules_chapters AS c
           SET title_original = $3,
               content_original = $4,
               updated_at = NOW()
           FROM twelverules_rules AS r
           WHERE c.rule_id = r.id
             AND r.rule_number = $1
             AND c.chapter_number = $2`,
          [
            rule.ruleNumber,
            chapter.chapterNumber,
            chapter.title,
            chapter.content,
          ],
        );

        if (res.rowCount && res.rowCount > 0) updated += 1;
        else {
          missing += 1;
          console.warn(
            `No DB row for Rule ${rule.ruleNumber} Chapter ${chapter.chapterNumber}: ${chapter.title}`,
          );
        }
      }
    }

    await client.query("COMMIT");
    console.log(`FB2: ${fb2Path}`);
    console.log(`Book: ${doc.metadata.bookTitle}`);
    console.log(`Rules in FB2: ${rules.length}`);
    console.log(`Chapters updated: ${updated}`);
    console.log(`Missing DB rows: ${missing}`);
    console.log(`Chapters with empty content: ${emptyContent}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

const argPath = process.argv[2];
const fb2Path = argPath
  ? isAbsolute(argPath)
    ? argPath
    : join(process.cwd(), argPath)
  : await resolveDefaultFb2Path();

importFb2(fb2Path).catch((err) => {
  console.error("FB2 import failed:", err);
  process.exitCode = 1;
});
