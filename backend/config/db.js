require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- DB_HOST:', process.env.DB_HOST ? 'Set' : 'Not set');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

let pool;

// Check if we're in production (Render) - use individual variables first
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '') {
  // 🚀 Production on Render (using individual variables)
  console.log('🚀 Connecting to production database on Render using individual variables...');
  console.log('📦 Host:', process.env.DB_HOST);
  
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false // Required for Render/Cloud DBs
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });
} 
else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@')) {
  // Fallback: Production with DATABASE_URL (if individual vars not set)
  console.log('🚀 Connecting using DATABASE_URL...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} 
else {
  // 💻 Local development (Your HP Laptop)
  console.log('💻 Connecting to local database...');
  console.log('📦 Host:', process.env.DB_HOST || 'localhost');
  
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'afya_connect',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  });
}

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('💡 Please check your database credentials');
    if (process.env.NODE_ENV === 'production') {
      console.error('🔧 Verify environment variables in Render dashboard');
    }
  } else {
    console.log('✅ Database connected successfully to:', process.env.DB_NAME || 'database');
    release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

module.exports = pool;