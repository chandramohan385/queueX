import pool from './index';
import bcrypt from 'bcryptjs';

async function runMigrations() {
  console.log('🔄 Running QueueX database migrations...');

  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    // 1. Services Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        base_price NUMERIC(10, 2) NOT NULL,
        unit VARCHAR(30) NOT NULL DEFAULT 'per_page',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Orders Table (The Master Ticket)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        token_number VARCHAR(20) UNIQUE NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Order Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        service_id INTEGER REFERENCES services(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        specifications JSONB DEFAULT '{}'::jsonb
      );
    `);

    // 4. Order Files Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_files (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size_bytes BIGINT,
        mime_type VARCHAR(100),
        page_count INTEGER DEFAULT 1,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 5. Staff Users Table (Authentication & RBAC)
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'OPERATOR',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Seed default services if table is empty
    const checkServices = await client.query('SELECT COUNT(*) FROM services');
    if (parseInt(checkServices.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial shop services catalog...');
      await client.query(`
        INSERT INTO services (name, category, description, base_price, unit) VALUES
        ('A4 Black & White Document', 'PRINTING', 'High-speed 80 GSM standard black and white print', 2.00, 'per_page'),
        ('A4 Color Document', 'PRINTING', 'Vibrant laser color print on premium 100 GSM paper', 8.00, 'per_page'),
        ('A3 Color Poster', 'PRINTING', 'Large format A3 print for posters, diagrams, and schematics', 25.00, 'per_page'),
        ('A4 Document Lamination', 'FINISHING', 'Glossy waterproof heat-sealed lamination pouch', 20.00, 'per_item'),
        ('Spiral Binding', 'FINISHING', 'Durable plastic coil spiral binding with transparent covers', 35.00, 'per_item'),
        ('PVC Smart ID Card', 'CARD_PRINT', 'Rigid thermal-printed plastic ID card with lanyard punch', 60.00, 'per_item'),
        ('Passport Photos (Sheet of 8)', 'PHOTO', 'Studio quality glossy photo sheet for official applications', 50.00, 'per_set')
      `);
      console.log('✅ Default services seeded.');
    }

    // Seed default staff accounts if table is empty
    const checkStaff = await client.query('SELECT COUNT(*) FROM staff_users');
    if (parseInt(checkStaff.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding default staff and admin accounts...');
      const adminHash = bcrypt.hashSync('QueueX@2026', 10);
      const staffHash = bcrypt.hashSync('Staff@2026', 10);

      await client.query(
        `INSERT INTO staff_users (name, email, password_hash, role) VALUES
         ($1, $2, $3, $4),
         ($5, $6, $7, $8)`,
        [
          'Chandra Mohan (Admin)', 'admin@queuex.com', adminHash, 'OWNER',
          'Counter Operator', 'staff@queuex.com', staffHash, 'OPERATOR',
        ]
      );
      console.log('✅ Default staff accounts seeded (admin@queuex.com & staff@queuex.com).');
    }

    await client.query('COMMIT');
    console.log('✨ All migrations completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
