import { loadRules } from "../telegram/content/rules.js";
import { pool } from "./client.js";

/**
 * Seeds stage-1 content tables from content.txt (titles only; bodies empty until FB2 import).
 * Idempotent: upserts rules by rule_number; upserts chapters by (rule_id, chapter_number).
 */
async function seed(): Promise<void> {
  const rules = await loadRules();
  if (rules.length === 0) {
    throw new Error("No rules found in content.txt");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let chapterCount = 0;
    for (const rule of rules) {
      const ruleRes = await client.query<{ id: number }>(
        `INSERT INTO twelverules_rules (rule_number, title_original, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (rule_number) DO UPDATE
           SET title_original = EXCLUDED.title_original,
               updated_at = NOW()
         RETURNING id`,
        [rule.number, rule.title],
      );
      const ruleId = ruleRes.rows[0].id;

      for (let i = 0; i < rule.sections.length; i++) {
        const chapterNumber = i + 1;
        const titleOriginal = rule.sections[i];
        await client.query(
          `INSERT INTO twelverules_chapters
             (rule_id, chapter_number, title_original, content_original, updated_at)
           VALUES ($1, $2, $3, '', NOW())
           ON CONFLICT (rule_id, chapter_number) DO UPDATE
             SET title_original = EXCLUDED.title_original,
                 updated_at = NOW()`,
          [ruleId, chapterNumber, titleOriginal],
        );
        chapterCount += 1;
      }
    }

    await client.query("COMMIT");
    console.log(
      `Seeded ${rules.length} rules and ${chapterCount} chapters from content.txt`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
