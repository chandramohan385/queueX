import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * What is a Connection Pool?
 * 
 * Opening a new TCP connection to PostgreSQL takes ~50-100ms (handshakes, authentication).
 * If 100 customers hit the server simultaneously, opening 100 individual connections would crash the database.
 * 
 * A Pool maintains a reusable pool of pre-established database connections.
 * When a request arrives, it borrows a connection, executes the SQL, and immediately returns it to the pool!
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
