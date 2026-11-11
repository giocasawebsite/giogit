import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { securityHeaders } from '../server/middleware/security';

test('🔒 GioCasa Security Headers Verification Suite', async (t) => {

  await t.test('1. Netlify configuration (netlify.toml) includes all required security headers', () => {
    const netlifyPath = path.resolve(process.cwd(), 'netlify.toml');
    assert.ok(fs.existsSync(netlifyPath), 'netlify.toml must exist');
    const content = fs.readFileSync(netlifyPath, 'utf-8');

    assert.ok(content.includes('Strict-Transport-Security'), 'HSTS header must be in netlify.toml');
    assert.ok(content.includes('max-age=31536000'), 'HSTS must specify 1 year (31536000)');
    assert.ok(content.includes('includeSubDomains'), 'HSTS must include subdomains');
    assert.ok(content.includes('preload'), 'HSTS must specify preload');

    assert.ok(content.includes('X-Frame-Options = "DENY"'), 'X-Frame-Options DENY must be in netlify.toml');
    assert.ok(content.includes('X-Content-Type-Options = "nosniff"'), 'X-Content-Type-Options nosniff must be in netlify.toml');
    assert.ok(content.includes('Referrer-Policy = "strict-origin-when-cross-origin"'), 'Referrer-Policy must be strict-origin-when-cross-origin');
    assert.ok(content.includes('Permissions-Policy'), 'Permissions-Policy must be in netlify.toml');
    assert.ok(content.includes('Cross-Origin-Opener-Policy = "same-origin-allow-popups"'), 'COOP must permit popups like WhatsApp');

    // Strict CSP Script Directives Verification (Scanner-hardened)
    assert.ok(content.includes("script-src 'self'"), "CSP must include script-src 'self'");
    assert.ok(!content.includes("script-src 'self' 'unsafe-inline'"), "CSP must NOT contain 'unsafe-inline' in script-src");
    assert.ok(!content.includes("script-src 'self' data:"), "CSP must NOT contain data: in script-src");
    assert.ok(content.includes("frame-ancestors 'none'"), "CSP must include frame-ancestors 'none'");
    assert.ok(content.includes("object-src 'none'"), "CSP must include object-src 'none'");
    assert.ok(content.includes("base-uri 'self'"), "CSP must include base-uri 'self'");
    assert.ok(content.includes("form-action 'self'"), "CSP must include form-action 'self'");
    assert.ok(content.includes("https://res.cloudinary.com"), "CSP must whitelist Cloudinary");
    assert.ok(content.includes("worker-src 'self'"), "CSP must whitelist Service Worker");
    assert.ok(content.includes("manifest-src 'self'"), "CSP must whitelist manifest");
    assert.ok(content.includes("upgrade-insecure-requests"), "CSP must include upgrade-insecure-requests");
  });

  await t.test('2. Netlify static headers file (public/_headers) exists for Vite build dist delivery', () => {
    const headersPath = path.resolve(process.cwd(), 'public/_headers');
    assert.ok(fs.existsSync(headersPath), 'public/_headers must exist');
    const content = fs.readFileSync(headersPath, 'utf-8');

    assert.ok(content.includes('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'));
    assert.ok(content.includes('X-Frame-Options: DENY'));
    assert.ok(content.includes('X-Content-Type-Options: nosniff'));
    assert.ok(content.includes('Referrer-Policy: strict-origin-when-cross-origin'));
    assert.ok(content.includes("https://res.cloudinary.com"));
    assert.ok(content.includes("frame-ancestors 'none'"));
  });

  await t.test('3. Express backend middleware sets all security headers on live API responses', async () => {
    const app = express();
    app.use(securityHeaders);
    app.get('/api/test-headers', (_req, res) => {
      res.json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const port = address.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/test-headers`, {
        headers: {
          'x-forwarded-proto': 'https',
        },
      });

      assert.equal(res.status, 200);

      // Clickjacking
      assert.equal(res.headers.get('x-frame-options'), 'DENY');

      // MIME sniffing
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');

      // Referrer
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');

      // Device permissions
      const perm = res.headers.get('permissions-policy');
      assert.ok(perm);
      assert.ok(perm.includes('camera=()'));

      // COOP & CORP
      assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
      assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');

      // HSTS (HTTPS request)
      assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains; preload');

      // CSP
      const csp = res.headers.get('content-security-policy');
      assert.ok(csp, 'Content-Security-Policy header must be present');
      assert.ok(csp.includes("script-src 'self'"), 'CSP must restrict script-src to self');
      assert.ok(!csp.includes("'unsafe-inline'") || csp.includes("style-src 'self' 'unsafe-inline'"), 'CSP must not allow unsafe-inline in script-src');
      assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"), 'CSP script-src must not contain unsafe-inline');
      assert.ok(!csp.includes("script-src 'self' data:"), 'CSP script-src must not contain data:');
      assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP must block frame-ancestors');
      assert.ok(csp.includes("object-src 'none'"), 'CSP must block object-src');
      assert.ok(csp.includes("base-uri 'self'"), 'CSP must set base-uri');
      assert.ok(csp.includes("form-action 'self'"), 'CSP must set form-action');
      assert.ok(csp.includes("https://res.cloudinary.com"), 'CSP must allow Cloudinary in img-src');
      assert.ok(csp.includes("worker-src 'self' blob:"), 'CSP must allow worker-src for push notifications');
      assert.ok(csp.includes("manifest-src 'self'"), 'CSP must allow manifest-src');
      assert.ok(csp.includes("upgrade-insecure-requests"), 'CSP must include upgrade-insecure-requests');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  await t.test('4. Cross-Origin Embedder Policy (COEP) is NOT set to require-corp (prevents breaking Cloudinary images)', async () => {
    const netlifyContent = fs.readFileSync(path.resolve(process.cwd(), 'netlify.toml'), 'utf-8');
    assert.ok(
      !netlifyContent.includes('require-corp'),
      'COEP require-corp must NOT be enabled as it breaks Cloudinary and third-party image delivery'
    );
  });

  await t.test('5. Express server configures dedicated 10MB limit for /api/admin/uploads before global 1MB limit', () => {
    const indexPath = path.resolve(process.cwd(), 'server/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');

    const uploadsPos = content.indexOf("app.use('/api/admin/uploads', express.json({ limit: '10mb' }));");
    const globalPos = content.indexOf("app.use(express.json({ limit: '1mb' }));");

    assert.ok(uploadsPos !== -1, '/api/admin/uploads 10mb middleware must be present');
    assert.ok(globalPos !== -1, 'Global 1mb middleware must be present');
    assert.ok(uploadsPos < globalPos, '/api/admin/uploads must be mounted BEFORE global 1mb limit');
  });
});
