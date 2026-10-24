import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';
import { dbService } from './db';
import {
  securityHeaders,
  enforceHttps,
  sanitizeInputs,
  globalApiLimiter,
} from './middleware/security';
import bookingsRouter from './routes/bookings';
import adminRouter from './routes/admin';
import tournamentsRouter from './routes/tournaments';
import hallOfFameRouter from './routes/hallOfFame';
import adminTournamentsRouter from './routes/adminTournaments';
import adminPlayersRouter from './routes/adminPlayers';
import playersRouter from './routes/players';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Render, Cloudflare, AWS)
app.set('trust proxy', 1);

// 1. Enforce HTTPS in production
app.use(enforceHttps);

// 2. Strict Security Headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
app.use(securityHeaders);

// 3. Restrictive CORS configuration
const allowedOrigins = [
  'https://giocasa1.netlify.app',
  ...(config.corsOrigin && config.corsOrigin !== '*'
    ? config.corsOrigin.split(',').map((o) => o.trim())
    : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser callers (mobile apps, server-to-server, curl, tests)
    if (!origin) return callback(null, true);

    // Explicitly allowed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Localhost in development
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Netlify deploy previews for giocasa1
    if (/^https:\/\/[a-z0-9-]+--giocasa1\.netlify\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Reject all other origins
    return callback(new Error('CORS Not Allowed: Origin is not permitted.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-passcode', 'x-admin-token'],
  credentials: true,
}));

// 4. Request body size limit (1MB default for all general JSON payloads)
app.use(express.json({ limit: '1mb' }));

// 5. Sanitize inputs to prevent NoSQL operator injection ($ and .)
app.use(sanitizeInputs);

// 6. Global API rate limiter (protects against scraping/flooding; easily permits 3s admin auto-sync)
app.use('/api', globalApiLimiter);

// Static serving for user-uploaded tournament and champion images
const uploadsPath = path.resolve(__dirname, '../public/assets/uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/assets/uploads', express.static(uploadsPath));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Process crash prevention guards
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception in server process:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection in server process at:', promise, 'reason:', reason);
});

// Health check endpoint (Available at both /api/health and /health)
const healthHandler = async (_req: express.Request, res: express.Response) => {
  try {
    const health = await dbService.getHealthStatus();
    const payload = {
      status: health.status,
      service: 'giocasa-gaming-booking',
      database: health.database,
      timezone: config.timezone,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      details: health.details,
    };

    if (health.healthy) {
      return res.status(200).json(payload);
    } else {
      return res.status(503).json({
        ...payload,
        error: health.error || 'Service is initializing or database is unreachable',
      });
    }
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      service: 'giocasa-gaming-booking',
      database: 'disconnected',
      error: err?.message || 'Health check error',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// API Routes (More specific sub-routers mounted first)
app.use('/api/booking', bookingsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/hall-of-fame', hallOfFameRouter);
app.use('/api/admin/players', adminPlayersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminTournamentsRouter);
app.use('/api/players', playersRouter);

// 404 handler for unknown API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: `API route ${req.originalUrl} not found.` });
  }
  next();
});

// Serve frontend production build from dist directory
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global error handler (protects against stack trace & internal error leakage)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message && err.message.startsWith('CORS Not Allowed')) {
    return res.status(403).json({ success: false, error: 'Forbidden: Request origin is not permitted.' });
  }
  console.error(`[Server Error] ${req.method} ${req.path}:`, err?.message || err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'Internal Server Error' : (err?.message || 'Internal Server Error'),
  });
});

// Start Server - Bind immediately to process.env.PORT on 0.0.0.0 for instant gateway readiness
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🎮 GioCasa Gaming Booking API running on port ${config.port}`);
  console.log(`🌏 Timezone: ${config.timezone} (India Standard Time)`);
  console.log(`🌐 API Base: http://0.0.0.0:${config.port}/api`);
  console.log(`❤️ Health:   http://0.0.0.0:${config.port}/api/health`);
  console.log(`======================================================\n`);
});

// Initialize database immediately upon startup without blocking port listening
dbService.init().catch((err) => {
  console.error('Database Initialization Warning:', err);
});

// Graceful termination for Render / Linux deployments
const shutdown = () => {
  console.log('🛑 Received shutdown signal, closing server gracefully...');
  server.close(async () => {
    console.log('HTTP server closed.');
    await dbService.close();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
