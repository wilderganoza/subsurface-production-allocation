import pg from 'pg';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export async function initDB() {
  const client = await pool.connect();
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, '..', 'schema.sql');
    const schemaSql = await readFile(schemaPath, 'utf8');
    await client.query(schemaSql);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}
