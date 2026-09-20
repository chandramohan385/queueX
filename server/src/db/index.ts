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
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  // Cloud poolers (like Supabase PgBouncer) terminate idle TCP sockets periodically.
  // The pool automatically evicts the dead socket and creates a fresh connection on the next query.
  // Do NOT exit process.
  console.warn('⚠️ Idle PostgreSQL client disconnected (pool will auto-reconnect on next query):', err.message);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
