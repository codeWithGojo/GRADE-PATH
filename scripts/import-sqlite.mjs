// Run against a backed-up, read-only SQLite snapshot and an empty migrated target.
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
import { existsSync } from "node:fs";

const file = process.argv[2];
if (!file || !existsSync(file) || !process.env.DATABASE_URL) throw new Error("Set DATABASE_URL and supply a SQLite snapshot path.");
const source = new DatabaseSync(file, { readOnly: true });
const target = new pg.Client({ connectionString: process.env.DATABASE_URL });
const tables = ["users","workspace_backups","benchmarks","ai_uses","checkouts","billing_customers","subscriptions","payments","tutor_metrics"];
try {
  await target.connect();
  await target.query("BEGIN");
  source.exec("BEGIN");
  await target.query("SET LOCAL search_path = gradepath, pg_catalog");
  await target.query("LOCK TABLE " + tables.join(", ") + " IN ACCESS EXCLUSIVE MODE");
  for (const table of tables) {
    if ((await target.query("SELECT 1 FROM " + table + " LIMIT 1")).rowCount) throw new Error("Target contains existing data. Import stopped.");
    const present = source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!present) continue;
    const allowed = (await target.query("SELECT column_name FROM information_schema.columns WHERE table_schema='gradepath' AND table_name=$1", [table])).rows.map(row => row.column_name);
    const columns = source.prepare("PRAGMA table_info(" + table + ")").all().map(row => row.name);
    if (!columns.every(column => allowed.includes(column))) throw new Error("Unrecognized columns in " + table);
    const insert = "INSERT INTO " + table + "(" + columns.join(",") + ") VALUES (" + columns.map((_, i) => "$" + (i + 1)).join(",") + ")";
    let count = 0;
    for (const row of source.prepare("SELECT * FROM " + table).iterate()) {
      await target.query(insert, columns.map(col => row[col]));
      count++;
    }
    console.log(table, count);
  }
  await target.query("COMMIT");
} catch (error) {
  await target.query("ROLLBACK").catch(() => {});
  console.error("Import stopped:", error.code || error.name);
  process.exitCode = 1;
} finally {
  source.close();
  await target.end();
}
