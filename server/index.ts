import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';
import { dbService } from './db';
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

// Middlewares
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'giocasa-gaming-booking',
    timezone: config.timezone,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/booking', bookingsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/hall-of-fame', hallOfFameRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminTournamentsRouter);
app.use('/api/admin/players', adminPlayersRouter);
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

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start Server
async function startServer() {
  await dbService.init();

  app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`🎮 GioCasa Gaming Booking API running on port ${config.port}`);
    console.log(`🌏 Timezone: ${config.timezone} (India Standard Time)`);
    console.log(`🌐 API Base: http://localhost:${config.port}/api`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});

export default app;
