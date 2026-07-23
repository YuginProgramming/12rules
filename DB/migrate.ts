import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = ["001_twelverules_rules_chapters.sql"] as const;

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const file of MIGRATIONS) {
      const sqlPath = join(__dirname, "migrations", file);
      const sql = await readFile(sqlPath, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`OK ${file}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
