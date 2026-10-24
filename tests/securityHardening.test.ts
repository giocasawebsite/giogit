import assert from 'assert';
import http from 'http';
import app from '../server/index';
import { dbService } from '../server/db';
import { config } from '../server/config';
import {
  hashPassword,
  verifyPassword,
  timingSafeCompare,
  createAdminSession,
  validateAdminSession,
  invalidateAdminSession,
} from '../server/middleware/security';

const TEST_PORT = 5098;
let server: http.Server;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper: send HTTP request to test server
function request(
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders: Record<string, string> = {
      ...options.headers,
    };

    let postData: string | undefined;
    if (options.body !== undefined) {
      postData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {}
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSecurityTestSuite() {
  console.log('🛡️ Starting GioCasa Production Security Hardening Acceptance Suite...\n');

  // Start test server
  server = app.listen(TEST_PORT);
  await dbService.init();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`, err?.message || err);
      failed++;
    }
  }

  // =========================================================================
  // SECTION 1: ADMIN SECURITY & AUTHENTICATION ENFORCEMENT
  // =========================================================================
  console.log('📌 Section 1: Admin Authentication Enforcement (Server-Side)');

  await test('Reject unauthenticated GET /api/admin/overview with 401', async () => {
    const res = await request('GET', '/api/admin/overview');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('Reject unauthenticated GET /api/admin/bookings with 401', async () => {
    const res = await request('GET', '/api/admin/bookings');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('Reject unauthenticated GET /api/admin/players with 401', async () => {
    const res = await request('GET', '/api/admin/players');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('Reject unauthenticated GET /api/admin/tournaments with 401', async () => {
    const res = await request('GET', '/api/admin/tournaments');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('Reject unauthenticated manual booking creation POST /api/admin/bookings with 401', async () => {
    const res = await request('POST', '/api/admin/bookings', {
      body: { customerName: 'Attacker', phone: '9999999999' },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('Reject fake/forged passcode with 401', async () => {
    const res = await request('GET', '/api/admin/overview', {
      headers: { 'x-admin-passcode': 'WRONG_FAKE_PASSCODE_1234' },
    });
    assert.strictEqual(res.status, 401);
  });

  // =========================================================================
  // SECTION 2: PASSWORD HASHING & CONSTANT-TIME VERIFICATION
  // =========================================================================
  console.log('\n📌 Section 2: Password Hashing & Timing-Safe Equal');

  await test('Passcode hashing generates unique salted scrypt hashes', async () => {
    const hash1 = hashPassword('MySecretPasscode2026!');
    const hash2 = hashPassword('MySecretPasscode2026!');
    assert(hash1.includes('$'), 'Hash contains salt separator');
    assert.notStrictEqual(hash1, hash2, 'Salt ensures two hashes of identical password differ');
    assert(verifyPassword('MySecretPasscode2026!', hash1), 'Verify valid password succeeds');
    assert(!verifyPassword('WrongSecretPassword', hash1), 'Verify incorrect password fails');
  });

  await test('Timing-safe compare prevents timing leak attacks', async () => {
    assert(timingSafeCompare('correct-token-string-123', 'correct-token-string-123'));
    assert(!timingSafeCompare('correct-token-string-123', 'wrong-token-string-4567'));
    assert(!timingSafeCompare('short', 'much-longer-string-comparison'));
  });

  // =========================================================================
  // SECTION 3: SESSION MANAGEMENT, EXPIRATION & LOGOUT
  // =========================================================================
  console.log('\n📌 Section 3: Secure Session Lifecycle & Logout');

  let activeSessionToken = '';

  await test('POST /api/admin/login authenticates and issues 12-hour session token', async () => {
    const passcode = await dbService.getAdminPasscode();
    const candidate = passcode.includes('$') ? config.adminPasscode : passcode;

    const res = await request('POST', '/api/admin/login', {
      body: { passcode: candidate },
    });
    assert.strictEqual(res.status, 200);
    assert(res.body.success);
    assert(res.body.data.token.startsWith('gio_sec_'), 'Session token format is valid');
    assert(res.body.data.expiresAt, 'Session expiry timestamp present');
    activeSessionToken = res.body.data.token;
  });

  await test('Access protected admin endpoint using session token via Bearer header', async () => {
    const res = await request('GET', '/api/admin/overview', {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert(res.body.success);
    assert(res.body.data.liveStations, 'Overview data returned to authenticated admin');
  });

  await test('POST /api/admin/logout revokes session token immediately', async () => {
    const logoutRes = await request('POST', '/api/admin/logout', {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
      body: { token: activeSessionToken },
    });
    assert.strictEqual(logoutRes.status, 200);

    // Verify revoked token is now rejected with 401
    const checkRes = await request('GET', '/api/admin/overview', {
      headers: { Authorization: `Bearer ${activeSessionToken}` },
    });
    assert.strictEqual(checkRes.status, 401);
  });

  // =========================================================================
  // SECTION 4: BROWSER SECURITY HEADERS & RESTRICTIVE CORS
  // =========================================================================
  console.log('\n📌 Section 4: Browser Security Headers & CORS Enforcement');

  await test('Security headers include X-Frame-Options: DENY and X-Content-Type-Options: nosniff', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    assert(res.headers['content-security-policy'], 'CSP header is present');
    assert(
      (res.headers['content-security-policy'] as string).includes("frame-ancestors 'none'"),
      'CSP blocks clickjacking frame-ancestors'
    );
  });

  await test('Reject unauthorized cross-origin CORS requests with 403 Forbidden', async () => {
    const res = await request('GET', '/api/booking/resources', {
      headers: { Origin: 'https://malicious-phishing-attacker.com' },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await test('Permit authorized production Netlify domain origin', async () => {
    const res = await request('GET', '/api/booking/resources', {
      headers: { Origin: 'https://giocasa1.netlify.app' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://giocasa1.netlify.app');
  });

  await test('Permit local development localhost origin', async () => {
    const res = await request('GET', '/api/booking/resources', {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  // =========================================================================
  // SECTION 5: NOSQL OPERATOR INJECTION PREVENTION & PARAMETER SANITIZATION
  // =========================================================================
  console.log('\n📌 Section 5: Injection Sanitization & Safe Error Responses');

  await test('Sanitizer strips MongoDB $ operator query injections from request payload', async () => {
    const res = await request('POST', '/api/players/lookup', {
      body: {
        gioId: { $ne: null },
      },
    });
    // The nested object with $ne operator should be sanitized to primitive or rejected
    assert(res.status === 400 || res.status === 404);
  });

  // =========================================================================
  // SECTION 6: CUSTOMER PRIVACY & SENSITIVE DATA MASKING
  // =========================================================================
  console.log('\n📌 Section 6: Customer Privacy & Data Masking');

  let testBookingId = '';
  const testSlotDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 15 + Math.floor(Math.random() * 30));
    return d.toISOString().slice(0, 10);
  })();

  await test('Customer booking creation succeeds and records booking', async () => {
    const res = await request('POST', '/api/bookings', {
      body: {
        customerName: 'Privacy Test Guest',
        phone: '9876543210',
        email: 'privacyguest@example.com',
        resourceId: 'ps5-station-1',
        date: testSlotDate,
        startTime: '16:00',
        durationMinutes: 60,
      },
    });
    assert.strictEqual(res.status, 201);
    assert(res.body.success);
    testBookingId = res.body.data.id;
  });

  await test('GET /api/bookings/:id masks customer phone and email for unauthenticated public requests', async () => {
    assert(testBookingId, 'Valid test booking ID exists');
    const res = await request('GET', `/api/bookings/${testBookingId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.phone, '98******10', 'Phone number is properly masked');
    assert(res.body.data.email.includes('***'), 'Email address is properly masked');
  });

  await test('Prevent double-booking conflict on same station and time', async () => {
    const conflictRes = await request('POST', '/api/bookings', {
      body: {
        customerName: 'Double Book Tester',
        phone: '9123456789',
        resourceId: 'ps5-station-1',
        date: testSlotDate,
        startTime: '16:00',
        durationMinutes: 60,
      },
    });
    assert.strictEqual(conflictRes.status, 409, 'Conflict returns HTTP 409');
    assert.strictEqual(conflictRes.body.success, false);
  });

  // =========================================================================
  // SECTION 7: RATE LIMITING & BRUTE FORCE PROTECTION
  // =========================================================================
  console.log('\n📌 Section 7: Brute-Force & Rate Limiting Enforcement');

  await test('Admin login rate limiter blocks repeated failed brute-force attempts', async () => {
    let finalStatus = 0;
    // Attempt 6 consecutive failed logins
    for (let i = 0; i < 6; i++) {
      const res = await request('POST', '/api/admin/login', {
        body: { passcode: `WRONG_GUESS_${i}` },
      });
      finalStatus = res.status;
    }
    // After 5 failed attempts, the 6th must return 429 Too Many Requests
    assert.strictEqual(finalStatus, 429, 'Brute force attempts trigger 429 rate limit lock');
  });

  // =========================================================================
  // SECTION 8: HEALTH ENDPOINT SANITIZATION
  // =========================================================================
  console.log('\n📌 Section 8: Health Endpoint Inspection');

  await test('Health check returns operational status without exposing database secrets or passwords', async () => {
    const res = await request('GET', '/health');
    assert(res.status === 200 || res.status === 503, 'Health endpoint responds with 200 or 503');
    assert.strictEqual(res.body.service, 'giocasa-gaming-booking');
    const raw = JSON.stringify(res.body);
    assert(!raw.includes('mongodb+srv://'), 'MongoDB connection string not exposed in health response');
    assert(!raw.includes('adminPasscode'), 'Admin passcode not exposed in health response');
    assert(!raw.includes('GIOCASA2026'), 'Default passcode not exposed in health response');
  });

  // =========================================================================
  // CLEANUP & SUMMARY
  // =========================================================================
  server.close();

  console.log('\n======================================================');
  console.log(`🎉 SECURITY AUDIT COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error('Fatal error in security test runner:', err);
  if (server) server.close();
  process.exit(1);
});
