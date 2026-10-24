import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'giocasa',
  adminPasscode: process.env.ADMIN_PASSCODE || (isProd ? '' : 'GIOCASA2026'),
  sessionSecret: process.env.SESSION_SECRET || '',
  timezone: 'Asia/Kolkata',
  corsOrigin: process.env.CORS_ORIGIN || '',
  isProduction: isProd,
};

if (isProd && !process.env.ADMIN_PASSCODE) {
  console.warn('⚠️ [SECURITY WARNING] ADMIN_PASSCODE environment variable is not set in production. Please set it in Render dashboard.');
}

