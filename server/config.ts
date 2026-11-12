import dotenv from 'dotenv';
dotenv.config();

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

const isProd = cleanEnv(process.env.NODE_ENV) === 'production';

export const config = {
  port: parseInt(cleanEnv(process.env.PORT) || '5001', 10),
  mongoUri: cleanEnv(process.env.MONGODB_URI),
  dbName: cleanEnv(process.env.MONGODB_DB_NAME) || 'giocasa',
  adminPasscode: cleanEnv(process.env.ADMIN_PASSCODE) || (isProd ? '' : 'GIOCASA2026'),
  sessionSecret: cleanEnv(process.env.SESSION_SECRET),
  timezone: 'Asia/Kolkata',
  corsOrigin: cleanEnv(process.env.CORS_ORIGIN),
  isProduction: isProd,
  vapidPublicKey: cleanEnv(process.env.VAPID_PUBLIC_KEY),
  vapidPrivateKey: cleanEnv(process.env.VAPID_PRIVATE_KEY),
  vapidSubject: cleanEnv(process.env.VAPID_SUBJECT) || 'mailto:admin@giocasa.com',
  cloudinaryCloudName: cleanEnv(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: cleanEnv(process.env.CLOUDINARY_API_KEY),
  cloudinaryApiSecret: cleanEnv(process.env.CLOUDINARY_API_SECRET),
};

if (isProd && !config.adminPasscode) {
  console.warn('⚠️ [SECURITY WARNING] ADMIN_PASSCODE environment variable is not set in production. Please set it in Render dashboard.');
}


