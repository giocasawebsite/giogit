import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { playerRegistrationLimiter, publicLookupLimiter } from '../middleware/security';

const router = Router();

// 1. POST /api/players/lookup - Public lookup for GioCasa Player ID
router.post('/lookup', publicLookupLimiter, async (req: Request, res: Response) => {
  try {
    const { gioId } = req.body;
    if (!gioId || typeof gioId !== 'string') {
      return res.status(400).json({ success: false, error: 'GioCasa Player ID is required.' });
    }

    const result = await dbService.lookupPlayerPublic(gioId.trim());
    if (!result.found) {
      return res.status(404).json({ success: false, error: result.error || 'Player ID not found.' });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error during public player lookup:', err);
    return res.status(500).json({ success: false, error: 'Failed to look up Player ID.' });
  }
});

// 2. GET /api/players/lookup/:gioId - Public lookup GET convenience
router.get('/lookup/:gioId', publicLookupLimiter, async (req: Request, res: Response) => {
  try {
    const { gioId } = req.params;
    const result = await dbService.lookupPlayerPublic(gioId);
    if (!result.found) {
      return res.status(404).json({ success: false, error: result.error || 'Player ID not found.' });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error during public player lookup:', err);
    return res.status(500).json({ success: false, error: 'Failed to look up Player ID.' });
  }
});

// 3. POST /api/players/verify - Verify identity with phone last 4 digits for autofill
router.post('/verify', publicLookupLimiter, async (req: Request, res: Response) => {
  try {
    const { gioId, phoneLast4, fullPhone } = req.body;
    if (!gioId) {
      return res.status(400).json({ success: false, error: 'Player ID is required.' });
    }
    if (!phoneLast4 && !fullPhone) {
      return res.status(400).json({ success: false, error: 'Verification digits or phone number are required.' });
    }

    const result = await dbService.verifyPlayerIdentity(gioId, phoneLast4, fullPhone);
    if (!result.verified) {
      return res.status(400).json({ success: false, error: result.error || 'Verification failed.' });
    }

    return res.json({
      success: true,
      message: 'Player identity verified. Autofill details ready.',
      data: result,
    });
  } catch (err: any) {
    console.error('Error during player verification:', err);
    return res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// 4. POST /api/players/register - Public customer self-registration / one-time signup with rate limiting
router.post('/register', playerRegistrationLimiter, async (req: Request, res: Response) => {
  try {
    const {
      name,
      gamerTag,
      phone,
      email,
      favoriteGame,
      favoritePlatform,
      dateOfBirth,
      referredBy,
      consent,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile number is required.' });
    }

    const normPhone = dbService.normalizePhone(phone.trim());
    const existing = normPhone ? await dbService.getPlayerByPhone(normPhone) : null;

    let player: any;

    if (existing) {
      const sourcesSet = new Set(existing.sources || (existing.source ? [existing.source] : []));
      sourcesSet.add('player_registration');
      const tagsSet = new Set(existing.tags || []);
      tagsSet.add('Online Registration');

      const updated = await dbService.updatePlayer(existing.id, {
        name: name.trim(),
        gamerTag: gamerTag?.trim() || existing.gamerTag,
        email: email?.trim() ? email.trim().toLowerCase() : existing.email,
        favoriteGame: favoriteGame?.trim() || existing.favoriteGame,
        favoritePlatform: favoritePlatform || existing.favoritePlatform,
        dateOfBirth: dateOfBirth || existing.dateOfBirth,
        sources: Array.from(sourcesSet),
        tags: Array.from(tagsSet),
        consent: {
          whatsappUpdates: consent?.whatsappUpdates ?? existing.consent?.whatsappUpdates ?? true,
          emailUpdates: consent?.emailUpdates ?? existing.consent?.emailUpdates ?? true,
        },
      } as any);

      const recalculated = await dbService.recalculatePlayerStats(existing.id);
      player = recalculated || updated || existing;

      const verifyResult = await dbService.verifyPlayerIdentity(player.gioId, player.phone.slice(-4));

      return res.status(200).json({
        success: true,
        message: `Welcome back to GioCasa! Your profile has been updated. Your Unique Player ID is ${player.gioId}.`,
        data: {
          player,
          token: verifyResult.token,
        },
      });
    }

    player = await dbService.createPlayer({
      name: name.trim(),
      gamerTag: gamerTag?.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      favoriteGame: favoriteGame?.trim() || 'EA Sports FC 25',
      favoritePlatform: favoritePlatform || 'ps5',
      dateOfBirth,
      referredBy: referredBy?.trim(),
      source: 'player_registration',
      sources: ['player_registration'],
      identityVerificationStatus: 'verified',
      tags: ['Online Registration'],
      consent: {
        whatsappUpdates: consent?.whatsappUpdates ?? true,
        emailUpdates: consent?.emailUpdates ?? true,
      },
    });

    // Reconcile and recalculate stats in case there were prior bookings or tournament registrations
    const recalculated = await dbService.recalculatePlayerStats(player.id);
    if (recalculated) player = recalculated;

    // Generate immediate verification token for seamless autofill
    const verifyResult = await dbService.verifyPlayerIdentity(player.gioId, player.phone.slice(-4));

    return res.status(201).json({
      success: true,
      message: `Welcome to GioCasa! Your Unique Player ID is ${player.gioId}.`,
      data: {
        player,
        token: verifyResult.token,
      },
    });
  } catch (err: any) {
    console.error('Error registering new player:', err);
    return res.status(400).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

// In-memory rate limiting map for recovery attempts: max 15 requests per 10 minutes per IP
const recoveryRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RECOVERY_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RECOVERY_RATE_LIMIT_MAX = 15;

function checkRecoveryRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = recoveryRateLimitMap.get(ip);
  if (!record || record.resetAt <= now) {
    recoveryRateLimitMap.set(ip, { count: 1, resetAt: now + RECOVERY_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RECOVERY_RATE_LIMIT_MAX) {
    return false;
  }
  record.count += 1;
  return true;
}

// 5a. GET /api/players/recover-id - Diagnostics & health check (prevents false 404s on browser direct access)
router.get('/recover-id', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'GioCasa Player ID Recovery service is operational. Send a POST request to initiate or complete recovery.',
    supportedMethods: ['GET', 'POST'],
    supportedIdentifiers: ['phone', 'email'],
  });
});

// 5b. POST /api/players/recover-id - Recover GioCasa Player ID with privacy protection & challenge verification
router.post('/recover-id', async (req: Request, res: Response) => {
  try {
    const forwardedHeader = req.headers['x-forwarded-for'];
    const clientIp = typeof forwardedHeader === 'string'
      ? forwardedHeader.split(',')[0].trim()
      : (req.ip || req.socket.remoteAddress || 'unknown');

    if (!checkRecoveryRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many recovery attempts. Please wait a few minutes before trying again.',
      });
    }

    const { identifier, phone, email, verificationName, sessionToken } = req.body || {};
    const inputVal = (identifier || phone || email || '').toString().trim();
    const tokenVal = sessionToken ? sessionToken.toString().trim() : undefined;
    const nameVal = verificationName ? verificationName.toString().trim() : undefined;

    if (!inputVal && !tokenVal) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number or email address is required to recover your Player ID.',
      });
    }

    const result = await dbService.recoverPlayerId({
      identifier: inputVal || undefined,
      phone: phone ? phone.toString().trim() : undefined,
      email: email ? email.toString().trim() : undefined,
      verificationName: nameVal,
      sessionToken: tokenVal,
    });

    if (!result.found) {
      // NOTE: Anti-enumeration & avoid false 404 network alarms. Return 200 with success: false.
      return res.json({
        success: false,
        error: result.error || 'Player ID could not be recovered with the details provided.',
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error recovering player ID:', err);
    return res.status(500).json({ success: false, error: 'Failed to recover Player ID.' });
  }
});

export default router;

