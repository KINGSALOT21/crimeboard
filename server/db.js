import pg from "pg";

const { Pool } = pg;

// A connection pool manages a set of reusable DB connections.
// The connection string points at the Docker Postgres from Step 1.
const pool = new Pool({
  host: "127.0.0.1",
  port: 5544,
  user: "postgres",
  password: "crimeboard",
  database: "crimeboard",
});


// Create the notes table if it doesn't already exist.
// Each note is one row; we store position, text, color, etc.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id        TEXT PRIMARY KEY,
      type      TEXT NOT NULL DEFAULT 'note',
      x         REAL NOT NULL,
      y         REAL NOT NULL,
      text      TEXT DEFAULT '',
      color     TEXT DEFAULT '#fff8b8',
      rotation  REAL DEFAULT 0,
      image_url TEXT DEFAULT ''
    );
  `);
  console.log("📦 Database ready");
}

export { pool };