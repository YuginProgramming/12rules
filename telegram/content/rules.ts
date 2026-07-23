import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = join(__dirname, "..", "..", "content.txt");

export type Rule = {
  number: number;
  title: string;
  sections: string[];
};

const RULE_LINE = /^RULE\s+(\d+)\s+(.+)$/;

export async function loadRules(): Promise<Rule[]> {
  const raw = await readFile(CONTENT_PATH, "utf8");
  const rules: Rule[] = [];
  let current: Rule | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const m = RULE_LINE.exec(line.trim());
    if (m) {
      current = { number: Number(m[1]), title: m[2].trim(), sections: [] };
      rules.push(current);
      continue;
    }
    if (!line.trim()) continue;
    if (current && /^\s/.test(line)) {
      current.sections.push(line.trim());
    } else {
      // top-level non-rule heading (Foreword, Coda, ...) closes the current rule
      current = null;
    }
  }

  return rules;
}
