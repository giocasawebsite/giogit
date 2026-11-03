import assert from 'assert';
import http from 'http';
import app from '../server/index';
import { dbService, DEFAULT_CONTACT_SETTINGS } from '../server/db';
import { config } from '../server/config';
import {
  normalizeWhatsAppNumber,
  isValidPhoneNumber,
  formatReadablePhone,
  getWhatsAppMessageForPage,
  generateWhatsAppUrl,
  DEFAULT_WHATSAPP_NUMBER,
} from '../server/utils/phone';

const TEST_PORT = 5099;
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
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {}
          resolve({
            status: res.statusCode || 500,
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

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failed++;
  }
}

async function runWhatsAppSuite() {
  console.log('======================================================');
  console.log('🚀 GIOCASA WHATSAPP FLOATER & CONTACT SETTINGS TEST SUITE');
  console.log('======================================================\n');

  // Initialize DB Service
  await dbService.init();

  // Start HTTP server on test port
  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, () => {
      resolve();
    });
  });

  // =========================================================================
  console.log('📌 Section 1: Phone Normalization & WhatsApp Number Formatting');
  // =========================================================================

  await test('Default business number is normalized to 919696028522', async () => {
    assert.strictEqual(DEFAULT_WHATSAPP_NUMBER, '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber(), '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber(null), '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber(''), '919696028522');
  });

  await test('10-digit Indian mobile number normalizes with 91 country code', async () => {
    assert.strictEqual(normalizeWhatsAppNumber('9696028522'), '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber('9876543210'), '919876543210');
  });

  await test('11-digit number with leading zero converts to 91 prefix', async () => {
    assert.strictEqual(normalizeWhatsAppNumber('09696028522'), '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber('09876543210'), '919876543210');
  });

  await test('Formatted strings with spaces, plus sign, and dashes normalize correctly', async () => {
    assert.strictEqual(normalizeWhatsAppNumber('+91 96960 28522'), '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber('+91-96960-28522'), '919696028522');
    assert.strictEqual(normalizeWhatsAppNumber('  +91  96960  28522  '), '919696028522');
  });

  await test('International phone numbers preserve country digits without spaces', async () => {
    assert.strictEqual(normalizeWhatsAppNumber('+1 (555) 234-5678'), '15552345678');
    assert.strictEqual(normalizeWhatsAppNumber('+44 7911 123456'), '447911123456');
  });

  await test('formatReadablePhone renders readable Indian display phone format', async () => {
    assert.strictEqual(formatReadablePhone('919696028522'), '+91 96960 28522');
    assert.strictEqual(formatReadablePhone('9696028522'), '+91 96960 28522');
    assert.strictEqual(formatReadablePhone('09696028522'), '+91 96960 28522');
  });

  await test('isValidPhoneNumber validates reasonable length numbers', async () => {
    assert.strictEqual(isValidPhoneNumber('9696028522'), true);
    assert.strictEqual(isValidPhoneNumber('+91 96960 28522'), true);
    assert.strictEqual(isValidPhoneNumber('123'), false);
    assert.strictEqual(isValidPhoneNumber('abcdefghijk'), false);
    assert.strictEqual(isValidPhoneNumber(''), false);
  });

  // =========================================================================
  console.log('\n📌 Section 2: Smart Context-Aware WhatsApp Pre-filled Messages');
  // =========================================================================

  await test('Home / General page generates exact requested enquiry message', async () => {
    const msg = getWhatsAppMessageForPage('home');
    assert.strictEqual(msg, "Hi GioCasa! I'd like to know more about your gaming experience and restaurant.");
  });

  await test('Experience & Gaming pages generate slots and availability message', async () => {
    const msgExp = getWhatsAppMessageForPage('experience');
    const msgGam = getWhatsAppMessageForPage('gaming');
    assert.strictEqual(msgExp, "Hi GioCasa! I'd like to know more about gaming slots and availability.");
    assert.strictEqual(msgGam, "Hi GioCasa! I'd like to know more about gaming slots and availability.");
  });

  await test('Menu page generates food and pizza ordering message', async () => {
    const msg = getWhatsAppMessageForPage('menu');
    assert.strictEqual(msg, "Hi GioCasa! I'd like to know more about your menu and food ordering.");
  });

  await test('Bookings page generates gaming booking enquiry message', async () => {
    const msg = getWhatsAppMessageForPage('book');
    assert.strictEqual(msg, "Hi GioCasa! I'd like to enquire about a gaming booking.");
  });

  await test('Tournaments pages generate tournament enquiry message', async () => {
    const msg = getWhatsAppMessageForPage('tournaments');
    assert(msg.includes('tournaments at GioCasa Arena'), 'Contains tournaments mention');
  });

  await test('Events page generates private event enquiry message', async () => {
    const msg = getWhatsAppMessageForPage('events');
    assert(msg.includes('hosting a private event or celebration'), 'Contains private event mention');
  });

  await test('Contact page generates team contact enquiry message', async () => {
    const msg = getWhatsAppMessageForPage('contact');
    assert.strictEqual(msg, "Hi GioCasa! I'd like to get in touch with the GioCasa team.");
  });

  await test('Unknown or fallback page defaults to friendly general message', async () => {
    const msg = getWhatsAppMessageForPage('unknown_random_page');
    assert.strictEqual(msg, "Hi GioCasa! I'd like to know more about your gaming experience and restaurant.");
  });

  // =========================================================================
  console.log('\n📌 Section 3: wa.me URL Construction & Encoding');
  // =========================================================================

  await test('generateWhatsAppUrl builds valid wa.me link with URL-encoded parameters', async () => {
    const url = generateWhatsAppUrl('919696028522', 'home', true);
    assert(url.startsWith('https://wa.me/919696028522?text='), 'Target domain is wa.me with number');
    assert(url.includes(encodeURIComponent("Hi GioCasa! I'd like to know more about your gaming experience and restaurant.")));
  });

  await test('generateWhatsAppUrl handles custom raw message strings', async () => {
    const custom = 'Hello GioCasa! Table for 4 please.';
    const url = generateWhatsAppUrl('9696028522', custom, false);
    assert.strictEqual(url, `https://wa.me/919696028522?text=${encodeURIComponent(custom)}`);
  });

  // =========================================================================
  console.log('\n📌 Section 4: Public Contact Settings API Endpoints');
  // =========================================================================

  await test('GET /api/contact/settings returns HTTP 200 with public contact configuration', async () => {
    const res = await request('GET', '/api/contact/settings');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.whatsappNumber, '919696028522');
    assert.strictEqual(res.body.data.brandName, 'GioCasa');
    assert(res.body.data.displayPhone, 'Includes display phone');
    assert(res.body.data.email, 'Includes contact email');
    assert(res.body.data.addressLine1, 'Includes address line 1');
  });

  await test('GET /api/contact alias also returns HTTP 200 with contact configuration', async () => {
    const res = await request('GET', '/api/contact');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.whatsappNumber, '919696028522');
  });

  await test('Public endpoint requires no authentication header', async () => {
    const res = await request('GET', '/api/contact/settings');
    assert.strictEqual(res.status, 200);
  });

  // =========================================================================
  console.log('\n📌 Section 5: Admin Authentication & Security');
  // =========================================================================

  await test('PUT /api/admin/contact-settings rejects unauthenticated requests with 401', async () => {
    const res = await request('PUT', '/api/admin/contact-settings', {
      body: { whatsappNumber: '9696028522' },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('PUT /api/admin/contact-settings rejects requests with invalid passcode with 401', async () => {
    const res = await request('PUT', '/api/admin/contact-settings', {
      headers: { 'x-admin-passcode': 'WRONG_PASSCODE_123' },
      body: { whatsappNumber: '9696028522' },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await test('GET /api/admin/contact-settings requires admin authentication', async () => {
    const unauth = await request('GET', '/api/admin/contact-settings');
    assert.strictEqual(unauth.status, 401);

    const auth = await request('GET', '/api/admin/contact-settings', {
      headers: { 'x-admin-passcode': config.adminPasscode },
    });
    assert.strictEqual(auth.status, 200);
    assert.strictEqual(auth.body.success, true);
    assert.strictEqual(auth.body.data.whatsappNumber, '919696028522');
  });

  // =========================================================================
  console.log('\n📌 Section 6: Admin Contact Settings Update & Validation');
  // =========================================================================

  await test('PUT /api/admin/contact-settings rejects invalid WhatsApp number format with 400', async () => {
    const res = await request('PUT', '/api/admin/contact-settings', {
      headers: { 'x-admin-passcode': config.adminPasscode },
      body: { whatsappNumber: 'invalid-non-number' },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.includes('valid 10-digit mobile number'));
  });

  await test('PUT /api/admin/contact-settings rejects invalid email format with 400', async () => {
    const res = await request('PUT', '/api/admin/contact-settings', {
      headers: { 'x-admin-passcode': config.adminPasscode },
      body: { email: 'not-an-email-address' },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert(res.body.error.includes('valid email address'));
  });

  await test('PUT /api/admin/contact-settings successfully updates settings with normalized number', async () => {
    const updatePayload = {
      whatsappNumber: '9696028522', // 10-digit input
      email: 'test-admin@giocasa.in',
      addressLine1: 'Ground Floor & Arena, Civil Lines',
      landmark: 'Opposite City Center',
    };

    const res = await request('PUT', '/api/admin/contact-settings', {
      headers: { 'x-admin-passcode': config.adminPasscode },
      body: updatePayload,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.whatsappNumber, '919696028522');
    assert.strictEqual(res.body.data.email, 'test-admin@giocasa.in');
    assert.strictEqual(res.body.data.addressLine1, 'Ground Floor & Arena, Civil Lines');
    assert.strictEqual(res.body.data.landmark, 'Opposite City Center');
    assert(res.body.data.updatedAt, 'Includes updatedAt timestamp');
  });

  // =========================================================================
  console.log('\n📌 Section 7: MongoDB / Disk Persistence & Dynamic Public Propagation');
  // =========================================================================

  await test('Public GET /api/contact/settings immediately reflects admin changes without redeployment', async () => {
    const res = await request('GET', '/api/contact/settings');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.email, 'test-admin@giocasa.in');
    assert.strictEqual(res.body.data.addressLine1, 'Ground Floor & Arena, Civil Lines');
    assert.strictEqual(res.body.data.landmark, 'Opposite City Center');
    assert.strictEqual(res.body.data.whatsappNumber, '919696028522');
  });

  await test('Database service reloads persisted settings from storage upon cache invalidation', async () => {
    // Invalidate in-memory cache
    dbService.resetContactSettingsCache();

    // Re-fetch from DB service
    const settings = await dbService.getContactSettings();
    assert.strictEqual(settings.email, 'test-admin@giocasa.in');
    assert.strictEqual(settings.whatsappNumber, '919696028522');
  });

  await test('PUT /api/contact/settings alias route also updates settings with admin auth', async () => {
    const res = await request('PUT', '/api/contact/settings', {
      headers: { 'x-admin-passcode': config.adminPasscode },
      body: { email: 'contact-alias@giocasa.in' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.email, 'contact-alias@giocasa.in');
  });

  // =========================================================================
  console.log('\n📌 Section 8: Teardown & Reset to Default GioCasa Settings');
  // =========================================================================

  await test('Reset contact settings back to GioCasa official default values', async () => {
    const res = await request('PUT', '/api/admin/contact-settings', {
      headers: { 'x-admin-passcode': config.adminPasscode },
      body: DEFAULT_CONTACT_SETTINGS,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.whatsappNumber, '919696028522');
    assert.strictEqual(res.body.data.email, 'ciao@giocasa.in');
  });

  // Close HTTP server
  server.close();

  console.log('\n======================================================');
  console.log(`🎉 ALL TESTS COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runWhatsAppSuite().catch((err) => {
  console.error('Fatal error in WhatsApp suite:', err);
  if (server) server.close();
  process.exit(1);
});
