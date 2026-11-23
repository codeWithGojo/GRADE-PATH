import { createRequire } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";

// Only application-owned SQL passes through this adapter. Values are always bound.
export function postgres(connectionString) {
  const pg = createRequire(import.meta.url)("pg");
  const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 8000 });
  const context = new AsyncLocalStorage();
  function prepare(sql) {
    let index = 0;
    const statement = sql.replace(/\?/g, () => "$" + ++index);
    async function query(values) {
      const client = context.getStore();
      if (!client) return runTransaction(() => query(values), false);
      return client.query({ text: statement, values, types: {
        getTypeParser: (oid, format) => oid === 20 ? Number : pg.types.getTypeParser(oid, format)
      } });
    }
    return {
      get: async (...values) => (await query(values)).rows[0],
      all: async (...values) => (await query(values)).rows,
      run: async (...values) => ({ changes: (await query(values)).rowCount })
    };
  }
  async function runTransaction(callback, serialize) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize the short quota, checkout and one-time-token reservations across instances.
      await client.query("SET LOCAL search_path = gradepath, pg_catalog");
      if (serialize) await client.query("SELECT pg_advisory_xact_lock(418026)");
      const value = await context.run(client, callback);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return { prepare, transaction: callback => runTransaction(callback, true), close: () => pool.end() };
}
