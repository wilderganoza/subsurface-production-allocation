import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wells (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        decline_model VARCHAR(50) DEFAULT 'best_fit',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS production_data (
        id SERIAL PRIMARY KEY,
        well_id INTEGER REFERENCES wells(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_production DOUBLE PRECISION NOT NULL DEFAULT 0,
        UNIQUE(well_id, date)
      );

      CREATE TABLE IF NOT EXISTS sand_properties (
        id SERIAL PRIMARY KEY,
        well_id INTEGER REFERENCES wells(id) ON DELETE CASCADE,
        sand_name VARCHAR(100) NOT NULL,
        kh DOUBLE PRECISION NOT NULL,
        UNIQUE(well_id, sand_name)
      );

      CREATE TABLE IF NOT EXISTS intervention_dates (
        id SERIAL PRIMARY KEY,
        well_id INTEGER REFERENCES wells(id) ON DELETE CASCADE,
        intervention_date DATE NOT NULL,
        sort_order INTEGER DEFAULT 0,
        UNIQUE(well_id, intervention_date)
      );

      CREATE TABLE IF NOT EXISTS intervention_matrix (
        id SERIAL PRIMARY KEY,
        well_id INTEGER REFERENCES wells(id) ON DELETE CASCADE,
        sand_name VARCHAR(100) NOT NULL,
        intervention_date DATE NOT NULL,
        is_open BOOLEAN DEFAULT FALSE,
        UNIQUE(well_id, sand_name, intervention_date)
      );

      CREATE TABLE IF NOT EXISTS allocation_results (
        id SERIAL PRIMARY KEY,
        well_id INTEGER UNIQUE REFERENCES wells(id) ON DELETE CASCADE,
        results JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed initial admin user if no users exist
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0].count === 0) {
      const bcrypt = await import('bcryptjs');
      const hash = bcrypt.default.hashSync('hALYSibaCesc', 10);
      await client.query(
        'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3)',
        ['admin', hash, true]
      );
      console.log('Default admin user created: admin');
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}
