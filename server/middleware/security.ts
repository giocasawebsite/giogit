import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';

// =========================================================================
// 1. CLIENT IP RESOLVER
// =========================================================================
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// =========================================================================
// 2. AUDIT LOGGING (Zero PII, Zero Secret Leakage)
// =========================================================================
export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'RATE_LIMITED' | 'PASSCODE_CHANGED' | 'LOGOUT' | 'SECURITY_BLOCKED';
  ip: string;
  path: string;
  method: string;
  details?: string;
}

const securityAuditLogs: SecurityAuditEntry[] = [];
const MAX_AUDIT_LOGS = 200;

export function logSecurityEvent(
  eventType: SecurityAuditEntry['eventType'],
  req: Request,
  details?: string
) {
  const ip = getClientIp(req);
  const entry: SecurityAuditEntry = {
    id: `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    eventType,
    ip,
    path: req.path,
    method: req.method,
    details: details ? details.slice(0, 100) : undefined,
  };

  securityAuditLogs.unshift(entry);
  if (securityAuditLogs.length > MAX_AUDIT_LOGS) {
    securityAuditLogs.pop();
  }

  // Safe server log
  console.log(`[SECURITY-AUDIT] [${entry.timestamp}] ${eventType} from ${ip} -> ${req.method} ${req.path}${details ? ` (${details})` : ''}`);
}

export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  return [...securityAuditLogs];
}

// =========================================================================
// 3. SECURE PASSWORD HASHING (scrypt + random salt + timingSafeEqual)
// =========================================================================
export function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainText.trim(), salt, 64);
  return `${salt}$${derivedKey.toString('hex')}`;
}

export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) {
      // Run dummy comparison to mitigate length-dependent timing leak
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyPassword(plainText: string, storedHashOrPlain: string): boolean {
  if (!plainText || !storedHashOrPlain) return false;

  const trimmed = plainText.trim();
  if (storedHashOrPlain.includes('$')) {
    const [salt, expectedKeyHex] = storedHashOrPlain.split('$');
    if (!salt || !expectedKeyHex) return false;
    try {
      const derivedKey = crypto.scryptSync(trimmed, salt, 64);
      return timingSafeCompare(derivedKey.toString('hex'), expectedKeyHex);
    } catch {
      return false;
    }
  }

  // Fallback for legacy plaintext stored passcodes (constant-time comparison)
  return timingSafeCompare(trimmed, storedHashOrPlain.trim());
}

// =========================================================================
// 4. STATELESS HMAC-SIGNED ADMIN SESSIONS
//
// Tokens are cryptographically self-validating — no server-side Map needed.
// This means admin sessions survive Render server restarts and sleep cycles.
//
// Token format:  gio_sec_<base64url(payload)>.<hmac_hex_32>
// Payload:       { iat: epochMs, exp: epochMs, v: sessionVersion }
//
// Global revocation (password change invalidates ALL devices):
//   The `v` field (sessionVersion) is stored in MongoDB.
//   Incrementing it in the DB instantly invalidates every existing token
//   because their embedded `v` will no longer match the current DB version.
//
// Single-device logout:
//   Token is added to a small in-memory denylist until it expires.
//   The denylist is cleared on server restart, which is acceptable because
//   single-device logouts are user-initiated from live sessions.
// =========================================================================
const ACCESS_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_TTL_MS = ACCESS_TOKEN_TTL_MS; // Legacy alias

// Denylist for explicit single-device logout: token -> expiry timestamp
const tokenDenylist = new Map<string, number>();

// Auto-clean expired denylist entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of tokenDenylist.entries()) {
    if (exp <= now) tokenDenylist.delete(token);
  }
}, 10 * 60 * 1000).unref();

function getSigningSecret(): string {
  const secret = config.sessionSecret || config.adminPasscode;
  if (!secret) {
    console.error(
      '⚠️  [SECURITY] Neither SESSION_SECRET nor ADMIN_PASSCODE is set. ' +
      'Admin session signing is insecure. Set SESSION_SECRET in your Render environment dashboard.'
    );
    return 'giocasa-fallback-signing-key-v2';
  }
  return secret;
}

interface AdminSessionPayload {
  iat: number; // issued-at ms
  exp: number; // expiry ms
  v: number;   // sessionVersion — must match current DB value
  type?: 'access' | 'refresh';
}

/**
 * Creates a stateless, HMAC-signed admin session access token and refresh token.
 * No server-side session state is stored.
 *
 * @param req            Express request (used for audit logging)
 * @param sessionVersion Current DB sessionVersion (from dbService.getSessionVersion())
 */
export function createAdminSession(
  req: Request,
  sessionVersion: number
): { token: string; refreshToken: string; expiresAt: string } {
  const now = Date.now();
  const accessExp = now + ACCESS_TOKEN_TTL_MS;
  const refreshExp = now + REFRESH_TOKEN_TTL_MS;
  const secret = getSigningSecret();

  // 1. Access Token (gio_sec_...)
  const accessPayload: AdminSessionPayload = { iat: now, exp: accessExp, v: sessionVersion, type: 'access' };
  const accessB64 = Buffer.from(JSON.stringify(accessPayload)).toString('base64url');
  const accessSig = crypto.createHmac('sha256', secret).update(accessB64).digest('hex').slice(0, 32);
  const token = `gio_sec_${accessB64}.${accessSig}`;

  // 2. Refresh Token (gio_ref_...)
  const refreshPayload: AdminSessionPayload = { iat: now, exp: refreshExp, v: sessionVersion, type: 'refresh' };
  const refreshB64 = Buffer.from(JSON.stringify(refreshPayload)).toString('base64url');
  const refreshSig = crypto.createHmac('sha256', secret).update(refreshB64).digest('hex').slice(0, 32);
  const refreshToken = `gio_ref_${refreshB64}.${refreshSig}`;

  logSecurityEvent('AUTH_SUCCESS', req, `Admin session issued (v${sessionVersion})`);
  return { token, refreshToken, expiresAt: new Date(accessExp).toISOString() };
}

/**
 * Validates a stateless admin session access token.
 * Returns true only when ALL conditions hold:
 *   1. HMAC signature is correct
 *   2. Token has not expired
 *   3. Embedded sessionVersion matches the current DB version
 *   4. Token is not in the per-process denylist
 *   5. Token is not a refresh token
 */
export function validateAdminSession(token: string, currentSessionVersion: number): boolean {
  if (!token || !token.startsWith('gio_sec_')) return false;

  try {
    const inner = token.slice('gio_sec_'.length); // "<payloadB64>.<sig>"
    const lastDot = inner.lastIndexOf('.');
    if (lastDot === -1) return false;

    const payloadB64 = inner.slice(0, lastDot);
    const receivedSig = inner.slice(lastDot + 1);

    // 1. Verify HMAC signature (timing-safe)
    const secret = getSigningSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex').slice(0, 32);
    if (!timingSafeCompare(receivedSig, expectedSig)) return false;

    // 2. Decode payload
    const payload: AdminSessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    // 3. Reject if this is a refresh token mistakenly passed as an access token
    if (payload.type === 'refresh') return false;

    // 4. Check expiry
    if (!payload.exp || payload.exp <= Date.now()) return false;

    // 5. Check session version (global revocation on password change)
    if (typeof payload.v !== 'number' || payload.v !== currentSessionVersion) return false;

    // 6. Check single-device denylist
    if (tokenDenylist.has(token)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a stateless admin refresh token.
 * Returns true only when HMAC signature is correct, expiry is valid,
 * the token is not on the denylist, and the embedded sessionVersion matches
 * currentSessionVersion (ensuring password changes revoke ALL refresh tokens).
 */
export function validateAdminRefreshToken(token: string, currentSessionVersion: number): boolean {
  if (!token || !token.startsWith('gio_ref_')) return false;

  try {
    const inner = token.slice('gio_ref_'.length);
    const lastDot = inner.lastIndexOf('.');
    if (lastDot === -1) return false;

    const payloadB64 = inner.slice(0, lastDot);
    const receivedSig = inner.slice(lastDot + 1);

    const secret = getSigningSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex').slice(0, 32);
    if (!timingSafeCompare(receivedSig, expectedSig)) return false;

    const payload: AdminSessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    if (payload.type !== 'refresh') return false;
    if (!payload.exp || payload.exp <= Date.now()) return false;
    if (typeof payload.v !== 'number' || payload.v !== currentSessionVersion) return false;
    if (tokenDenylist.has(token)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Invalidates a single admin session token or refresh token (browser logout).
 * Adds the token to the per-process denylist until its natural expiry.
 */
export function invalidateAdminSession(token: string, req?: Request): boolean {
  if (!token || (!token.startsWith('gio_sec_') && !token.startsWith('gio_ref_'))) return false;

  try {
    const prefix = token.startsWith('gio_sec_') ? 'gio_sec_' : 'gio_ref_';
    const inner = token.slice(prefix.length);
    const lastDot = inner.lastIndexOf('.');
    if (lastDot !== -1) {
      const payloadB64 = inner.slice(0, lastDot);
      const payload: AdminSessionPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      );
      tokenDenylist.set(token, payload.exp || Date.now() + REFRESH_TOKEN_TTL_MS);
    }
  } catch {
    tokenDenylist.set(token, Date.now() + REFRESH_TOKEN_TTL_MS);
  }

  if (req) {
    logSecurityEvent('LOGOUT', req, 'Admin session revoked (single device)');
  }
  return true;
}

/**
 * Invalidates ALL admin sessions globally.
 * With stateless tokens, global invalidation is done by incrementing the
 * sessionVersion in the DB (dbService.incrementSessionVersion()).
 * This function clears the local denylist as housekeeping.
 */
export function invalidateAllAdminSessions(req?: Request): void {
  tokenDenylist.clear();
  if (req) {
    logSecurityEvent('PASSCODE_CHANGED', req, 'All admin sessions globally revoked');
  }
}

// =========================================================================
// 5. IN-MEMORY RATE LIMITERS (Zero dependencies, automatic memory management)
// =========================================================================
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  recordFailureOnly?: boolean;
}) {
  const ipMap = new Map<string, RateLimitRecord>();

  // Cleanup expired windows every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipMap.entries()) {
      if (record.resetAt <= now) {
        ipMap.delete(ip);
      }
    }
  }, 2 * 60 * 1000).unref();

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const record = ipMap.get(ip);

    if (record && record.resetAt > now && record.count >= options.max) {
      logSecurityEvent('RATE_LIMITED', req, `Exceeded limit of ${options.max} in ${options.windowMs / 1000}s`);
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        error: options.message,
        retryAfterSeconds: retryAfterSec,
      });
    }

    if (!options.recordFailureOnly) {
      if (!record || record.resetAt <= now) {
        ipMap.set(ip, { count: 1, resetAt: now + options.windowMs });
      } else {
        record.count += 1;
      }
    }

    next();
  };

  const recordFailure = (req: Request) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const record = ipMap.get(ip);
    if (!record || record.resetAt <= now) {
      ipMap.set(ip, { count: 1, resetAt: now + options.windowMs });
    } else {
      record.count += 1;
    }
  };

  const reset = (req: Request) => {
    const ip = getClientIp(req);
    ipMap.delete(ip);
  };

  return { middleware, recordFailure, reset };
}

// Specific rate limit instances:
// 1. Admin login limiter: max 5 failed attempts per 15 minutes
export const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many failed admin authentication attempts. For security, your IP has been temporarily locked for 15 minutes.',
  recordFailureOnly: true,
});

// 2. Booking creation limiter: max 15 bookings per 15 minutes per IP
export const bookingCreationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many booking requests from your network. Please wait a few minutes before submitting another booking.',
}).middleware;

// 3. Tournament registration limiter: max 10 registrations per 15 minutes per IP
export const tournamentRegistrationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many tournament registration requests. Please wait a few minutes before trying again.',
}).middleware;

// 4. Player registration limiter: max 10 per 15 minutes per IP
export const playerRegistrationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many registration requests. Please try again after 15 minutes.',
}).middleware;

// 5. Public lookup limiter: max 40 lookups per 10 minutes per IP
export const publicLookupLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: 'Too many lookup requests. Please slow down.',
}).middleware;

// 6. Global API general limiter: max 300 requests per minute per IP
// (Note: Admin live auto-sync polls every 3 seconds = 20 req/min, which easily passes)
export const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Request rate limit exceeded. Please slow down your requests.',
}).middleware;

// 7. Guest verification code limiter: max 30 code lookups per 5 minutes per IP
export const guestVerificationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many verification attempts. Please wait 5 minutes before trying again.',
}).middleware;

// =========================================================================
// 6. NOSQL INJECTION & PARAMETER SANITIZATION MIDDLEWARE
// =========================================================================
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Prohibit MongoDB operators starting with $ or dot notation in keys
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

function sanitizeInPlace(obj: any) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map(sanitizeObject);
      } else {
        sanitizeInPlace(obj[key]);
      }
    }
  }
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.body && typeof req.body === 'object') {
      sanitizeInPlace(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      sanitizeInPlace(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      sanitizeInPlace(req.params);
    }
  } catch (err) {
    console.warn('Sanitization notice:', err);
  }
  next();
}

// =========================================================================
// 7. BROWSER SECURITY HEADERS (Helmet-equivalent CSP + Hardened Headers)
// =========================================================================
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer privacy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable dangerous browser APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Cross-Origin Opener Policy: isolate top-level window while allowing customer popups (e.g. WhatsApp)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // Cross-Origin Resource Policy: allow cross-origin frontend (Netlify) to consume backend API without CORP blocks
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Enforce HSTS in production or HTTPS traffic
  if (
    process.env.NODE_ENV === 'production' ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.secure
  ) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Tested, restrictive Content Security Policy matching all required GioCasa services
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.unsplash.com https://cdn.cloudflare.steamstatic.com https://*.steamstatic.com https://media.rawg.io https://upload.wikimedia.org https://images.igdb.com",
    "connect-src 'self' https://giogit.onrender.com https://giocasa.in https://*.giocasa.in https://giocasa1.netlify.app https://*.netlify.app https://res.cloudinary.com http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
}

// =========================================================================
// 8. HTTPS REDIRECT (Production Gateway / Render)
// =========================================================================
export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] &&
    req.headers['x-forwarded-proto'] !== 'https'
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}
