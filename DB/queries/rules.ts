import { pool } from "../client.js";

export type DbRule = {
  ruleNumber: number;
  titleOriginal: string;
};

export type DbChapter = {
  chapterNumber: number;
  titleOriginal: string;
};

export type DbRuleWithChapters = DbRule & {
  chapters: DbChapter[];
};

export async function listRules(): Promise<DbRule[]> {
  const res = await pool.query<{
    rule_number: number;
    title_original: string;
  }>(
    `SELECT rule_number, title_original
     FROM twelverules_rules
     ORDER BY rule_number ASC`,
  );

  return res.rows.map((row) => ({
    ruleNumber: row.rule_number,
    titleOriginal: row.title_original,
  }));
}

export type DbChapterContent = {
  ruleNumber: number;
  ruleTitle: string;
  chapterNumber: number;
  titleOriginal: string;
  contentOriginal: string;
};

export async function getChapter(
  ruleNumber: number,
  chapterNumber: number,
): Promise<DbChapterContent | null> {
  const res = await pool.query<{
    rule_number: number;
    rule_title: string;
    chapter_number: number;
    title_original: string;
    content_original: string;
  }>(
    `SELECT r.rule_number,
            r.title_original AS rule_title,
            c.chapter_number,
            c.title_original,
            c.content_original
     FROM twelverules_chapters c
     INNER JOIN twelverules_rules r ON r.id = c.rule_id
     WHERE r.rule_number = $1
       AND c.chapter_number = $2`,
    [ruleNumber, chapterNumber],
  );

  const row = res.rows[0];
  if (!row) return null;

  return {
    ruleNumber: row.rule_number,
    ruleTitle: row.rule_title,
    chapterNumber: row.chapter_number,
    titleOriginal: row.title_original,
    contentOriginal: row.content_original ?? "",
  };
}

export async function getRuleWithChapters(
  ruleNumber: number,
): Promise<DbRuleWithChapters | null> {
  const ruleRes = await pool.query<{
    rule_number: number;
    title_original: string;
  }>(
    `SELECT rule_number, title_original
     FROM twelverules_rules
     WHERE rule_number = $1`,
    [ruleNumber],
  );

  const rule = ruleRes.rows[0];
  if (!rule) return null;

  const chaptersRes = await pool.query<{
    chapter_number: number;
    title_original: string;
  }>(
    `SELECT c.chapter_number, c.title_original
     FROM twelverules_chapters c
     INNER JOIN twelverules_rules r ON r.id = c.rule_id
     WHERE r.rule_number = $1
     ORDER BY c.chapter_number ASC`,
    [ruleNumber],
  );

  return {
    ruleNumber: rule.rule_number,
    titleOriginal: rule.title_original,
    chapters: chaptersRes.rows.map((row) => ({
      chapterNumber: row.chapter_number,
      titleOriginal: row.title_original,
    })),
  };
}
