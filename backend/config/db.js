require('dotenv').config();
const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

console.log('🔍 Environment Check:');
console.log('- NODE_ENV:',    process.env.NODE_ENV    || 'development');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Not set ❌');
console.log('- DB_HOST:',     process.env.DB_HOST     ? 'Set ✅' : 'Not set ❌');
console.log('- DB_NAME:',     process.env.DB_NAME     || 'not set');
console.log('- Mode:',        isProduction ? '🚀 Production' : '💻 Local');

// ===========================
// DATABASE POOL CONFIG
// Priority order:
//   1. DATABASE_URL (Render internal URL — most reliable)
//   2. Individual DB_* variables with SSL (production)
//   3. Individual DB_* variables without SSL (local dev)
// ===========================
let poolConfig;

if (process.env.DATABASE_URL) {
    // ✅ Render provides this automatically when you link a PostgreSQL service
    console.log('🚀 Using DATABASE_URL connection...');
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max:                    20,
        idleTimeoutMillis:  30000,
        connectionTimeoutMillis: 20000,
    };

} else if (isProduction) {
    // ✅ Fallback: individual vars in production — SSL required
    console.log('🚀 Using individual DB vars (production)...');
    console.log('📦 Host:', process.env.DB_HOST);
    poolConfig = {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      { rejectUnauthorized: false },
        max:                    20,
        idleTimeoutMillis:  30000,
        connectionTimeoutMillis: 20000,
    };

} else {
    // 💻 Local development — no SSL needed
    console.log('💻 Using local database (no SSL)...');
    console.log('📦 Host:', process.env.DB_HOST || 'localhost');
    poolConfig = {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'afya_connect',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
    };
}

const pool = new Pool(poolConfig);

// ===========================
// TEST CONNECTION ON STARTUP
// ===========================
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        if (err.message.includes('SSL')) {
            console.error('🔧 Fix: Make sure ssl: { rejectUnauthorized: false } is set');
            console.error('🔧 Fix: Or set DATABASE_URL in your Render environment variables');
        }
        if (err.message.includes('password')) {
            console.error('🔧 Fix: Check DB_PASSWORD in your Render environment variables');
        }
        if (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')) {
            console.error('🔧 Fix: Check DB_HOST — make sure you are using the Internal Database URL from Render');
        }
    } else {
        console.log('✅ Database connected successfully!');
        console.log('📦 Connected to:', process.env.DB_NAME || 'database');
        release();
    }
});

// ===========================
// HANDLE POOL ERRORS
// Prevents the server from crashing on idle connection drops
// ===========================
pool.on('error', (err) => {
    console.error('⚠️  Unexpected database pool error:', err.message);
});

module.exports = pool;