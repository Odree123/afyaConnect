require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- DB_HOST:', process.env.DB_HOST ? 'Set' : 'Not set');

let pool;

// Check if we're in production (Render)
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '') {
  // 🚀 Production on Render (using individual variables)
  console.log('🚀 Connecting to production database on Render...');
  console.log('📦 Host:', process.env.DB_HOST);
  
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false  // ✅ REQUIRED for Render PostgreSQL
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });
} 
else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@')) {
  // Fallback: Production with DATABASE_URL
  console.log('🚀 Connecting using DATABASE_URL...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false  // ✅ REQUIRED for Render PostgreSQL
    }
  });
} 
else {
  // 💻 Local development (no SSL needed)
  console.log('💻 Connecting to local database...');
  console.log('📦 Host:', process.env.DB_HOST || 'localhost');
  
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'afya_connect',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // No SSL for local development
  });
}

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    if (err.message.includes('SSL')) {
      console.error('🔧 SSL required - make sure ssl: { rejectUnauthorized: false } is set');
    }
  } else {
    console.log('✅ Database connected successfully to:', process.env.DB_NAME || 'database');
    release();
  }
});

module.exports = pool;