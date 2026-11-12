import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { isOriginAllowed, allowedOrigins } from '../server/index';
import bookingsRouter from '../server/routes/bookings';
import menuCustomizationsRouter from '../server/routes/menuCustomizations';

test('🌐 GioCasa Production CORS & Origin Hardening Test Suite', async (t) => {

  await t.test('1. Origin Validation Logic (isOriginAllowed)', () => {
    // Production domains
    assert.equal(isOriginAllowed('https://giocasa.in'), true, 'https://giocasa.in must be allowed');
    assert.equal(isOriginAllowed('https://www.giocasa.in'), true, 'https://www.giocasa.in must be allowed');
    assert.equal(isOriginAllowed('https://giocasa.in/'), true, 'Trailing slash must be handled cleanly');
    assert.equal(isOriginAllowed('https://WWW.GIOCASA.IN'), true, 'Case insensitive check must pass');

    // Netlify primary & preview domains
    assert.equal(isOriginAllowed('https://giocasa1.netlify.app'), true, 'Netlify primary origin must be allowed');
    assert.equal(isOriginAllowed('https://deploy-preview-42--giocasa1.netlify.app'), true, 'Netlify deploy previews must be allowed');
    assert.equal(isOriginAllowed('https://branch--giocasa1.netlify.app'), true, 'Netlify branch previews must be allowed');

    // Localhost development
    assert.equal(isOriginAllowed('http://localhost:5173'), true, 'Vite dev server must be allowed');
    assert.equal(isOriginAllowed('http://localhost:3000'), true, 'Localhost 3000 must be allowed');
    assert.equal(isOriginAllowed('http://127.0.0.1:5001'), true, 'Local IP must be allowed');

    // Non-browser callers (server-to-server, curl, tests)
    assert.equal(isOriginAllowed(undefined), true, 'Non-browser requests without Origin must be allowed');
    assert.equal(isOriginAllowed(''), true, 'Empty origin must be allowed');

    // Malicious or unauthorized origins
    assert.equal(isOriginAllowed('https://malicious-site.com'), false, 'Arbitrary origin must be rejected');
    assert.equal(isOriginAllowed('https://fakegiocasa.in.attacker.com'), false, 'Domain suffix spoofing must be rejected');
    assert.equal(isOriginAllowed('http://giocasa.in'), false, 'Insecure HTTP production origin must be rejected');
  });

  await t.test('2. Express App Endpoints & Preflight OPTIONS with CORS', async () => {
    const app = express();

    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS Not Allowed: Origin ${origin} is not permitted.`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-admin-passcode',
        'x-admin-token',
        'x-requested-with',
        'Accept',
        'Origin',
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range', 'ETag'],
      credentials: true,
      optionsSuccessStatus: 200,
    };

    app.use(cors(corsOptions));

    // Mount public routes
    app.use('/api/menu', menuCustomizationsRouter);
    app.use('/api/booking', bookingsRouter);

    // Global error handler
    app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const origin = req.headers.origin as string | undefined;
      if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
      }
      if (err.message && err.message.startsWith('CORS Not Allowed')) {
        return res.status(403).json({ success: false, error: 'Forbidden: Request origin is not permitted.' });
      }
      res.status(500).json({ success: false, error: err.message });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const base = `http://127.0.0.1:${port}`;

    try {
      // Test A: GET /api/menu/customizations from https://giocasa.in
      const resMenu = await fetch(`${base}/api/menu/customizations`, {
        headers: { Origin: 'https://giocasa.in' },
      });
      assert.equal(resMenu.status, 200);
      assert.equal(resMenu.headers.get('access-control-allow-origin'), 'https://giocasa.in');
      assert.equal(resMenu.headers.get('access-control-allow-credentials'), 'true');
      const menuJson = await resMenu.json();
      assert.equal(menuJson.success, true);

      // Test B: OPTIONS preflight on /api/menu/customizations from https://giocasa.in
      const resMenuOptions = await fetch(`${base}/api/menu/customizations`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://giocasa.in',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, x-admin-passcode',
        },
      });
      assert.ok([200, 204].includes(resMenuOptions.status), `Preflight must return 200 or 204, got ${resMenuOptions.status}`);
      assert.equal(resMenuOptions.headers.get('access-control-allow-origin'), 'https://giocasa.in');
      assert.ok(resMenuOptions.headers.get('access-control-allow-methods')?.includes('GET'));

      // Test C: GET /api/booking/resources from https://www.giocasa.in
      const resRes = await fetch(`${base}/api/booking/resources`, {
        headers: { Origin: 'https://www.giocasa.in' },
      });
      assert.equal(resRes.status, 200);
      assert.equal(resRes.headers.get('access-control-allow-origin'), 'https://www.giocasa.in');
      const resJson = await resRes.json();
      assert.equal(resJson.success, true);
      assert.ok(Array.isArray(resJson.data));

      // Test D: OPTIONS preflight on /api/booking/resources from https://www.giocasa.in
      const resResOptions = await fetch(`${base}/api/booking/resources`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://www.giocasa.in',
          'Access-Control-Request-Method': 'GET',
        },
      });
      assert.ok([200, 204].includes(resResOptions.status));
      assert.equal(resResOptions.headers.get('access-control-allow-origin'), 'https://www.giocasa.in');

      // Test E: GET /api/booking/availability from https://giocasa.in
      // (Even if missing query parameters returns 400 Bad Request, CORS headers MUST still be present!)
      const resAvail = await fetch(`${base}/api/booking/availability`, {
        headers: { Origin: 'https://giocasa.in' },
      });
      assert.equal(resAvail.headers.get('access-control-allow-origin'), 'https://giocasa.in');

      // Test F: GET request from unauthorized origin
      const resUnauthorized = await fetch(`${base}/api/booking/resources`, {
        headers: { Origin: 'https://malicious-attacker.com' },
      });
      assert.equal(resUnauthorized.status, 403);
      assert.notEqual(resUnauthorized.headers.get('access-control-allow-origin'), 'https://malicious-attacker.com');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
