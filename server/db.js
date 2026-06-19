import pg from "pg";

const { Pool } = pg;

// A connection pool manages a set of reusable DB connections.
// The connection string points at the Docker Postgres from Step 1.
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 5544,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "crimeboard",
        database: process.env.DB_NAME || "crimeboard",
      }
);


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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS connections (
      id      TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id   TEXT NOT NULL
    );
  `);

  console.log("📦 Database ready");
}


export { pool };