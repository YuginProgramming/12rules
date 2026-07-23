import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env`);
  }
  return value;
}

export const pool = new Pool({
  host: requireEnv("DB_HOST"),
  port: Number(process.env.DB_PORT ?? 5432),
  database: requireEnv("DB_NAME"),
  user: requireEnv("DB_USER"),
  password: requireEnv("DB_PASSWORD"),
  ssl: false,
});
