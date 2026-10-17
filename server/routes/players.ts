import { Router, Request, Response } from 'express';
import { dbService } from '../db';

const router = Router();

// 1. POST /api/players/lookup - Public lookup for GioCasa Player ID
router.post('/lookup', async (req: Request, res: Response) => {
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
router.get('/lookup/:gioId', async (req: Request, res: Response) => {
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
router.post('/verify', async (req: Request, res: Response) => {
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

// 4. POST /api/players/register - Public customer self-registration / one-time signup
router.post('/register', async (req: Request, res: Response) => {
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

    const player = await dbService.createPlayer({
      name: name.trim(),
      gamerTag: gamerTag?.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      favoriteGame: favoriteGame?.trim() || 'EA Sports FC 25',
      favoritePlatform: favoritePlatform || 'ps5',
      dateOfBirth,
      referredBy: referredBy?.trim(),
      identityVerificationStatus: 'verified',
      tags: ['Online Registration'],
      consent: {
        whatsappUpdates: consent?.whatsappUpdates ?? true,
        emailUpdates: consent?.emailUpdates ?? true,
      },
    });

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

// 5. POST /api/players/recover-id - Recover GioCasa Player ID using mobile number
router.post('/recover-id', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile number is required.' });
    }

    const result = await dbService.recoverPlayerId(phone.trim());
    if (!result.found) {
      return res.status(404).json({ success: false, error: result.error || 'Player ID not found.' });
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
