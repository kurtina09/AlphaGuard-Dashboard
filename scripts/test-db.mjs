import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
);

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SCREENSHOT_TABLE } = env;

console.log(`Connecting to ${DB_USER}@${DB_HOST}:${DB_PORT || 3306}/${DB_NAME} ...`);

let conn;
try {
  conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectTimeout: 10000,
  });

  console.log("✓ Connected successfully\n");

  // Check the screenshot table exists
  const table = DB_SCREENSHOT_TABLE || "data";
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, table],
  );
  if (tables.length === 0) {
    console.warn(`⚠ Table '${table}' not found in database '${DB_NAME}'.`);
    console.log("\nAvailable tables in this database:");
    const [allTables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [DB_NAME],
    );
    allTables.forEach((r) => console.log("  -", r.TABLE_NAME));
  } else {
    console.log(`✓ Table '${table}' exists\n`);

    // Row count
    const [[{ c }]] = await conn.query(
      `SELECT COUNT(*) AS c FROM \`${table}\``,
    );
    console.log(`  Total rows : ${c}`);

    // Show columns
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [DB_NAME, table],
    );
    console.log("\n  Columns:");
    cols.forEach((col) => {
      const len = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : "";
      console.log(`    ${col.COLUMN_NAME}  —  ${col.DATA_TYPE}${len}`);
    });

    // Preview latest 3 rows (metadata only, no blob)
    const colNames = cols
      .filter((c) => c.DATA_TYPE !== "mediumblob" && c.DATA_TYPE !== "blob" && c.DATA_TYPE !== "longblob")
      .map((c) => `\`${c.COLUMN_NAME}\``)
      .join(", ");
    if (colNames) {
      const [rows] = await conn.query(
        `SELECT ${colNames} FROM \`${table}\` ORDER BY 1 DESC LIMIT 3`,
      );
      console.log("\n  Latest 3 rows (no blob):");
      rows.forEach((r) => console.log("   ", r));
    }
  }
} catch (err) {
  console.error("✗ Connection failed:", err.message);
  process.exit(1);
} finally {
  if (conn) await conn.end();
}
