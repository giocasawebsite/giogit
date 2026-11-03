import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { isValidPhoneNumber } from '../utils/phone';

const router = Router();

/**
 * Public Contact Settings Endpoint
 * Returns sanitized business contact settings, normalized WhatsApp number, and address.
 * No authentication required. Fast and memory-cached.
 */
router.get(['/settings', '/'], async (_req: Request, res: Response) => {
  try {
    const settings = await dbService.getContactSettings();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (err: any) {
    console.error('Error fetching public contact settings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve contact settings.' });
  }
});

/**
 * Admin Contact Settings Update (Protected Alias)
 * Allows updating contact settings via /api/contact/settings or /api/contact
 */
router.put(['/settings', '/'], requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const updates = req.body || {};

    if (updates.whatsappNumber !== undefined) {
      if (typeof updates.whatsappNumber !== 'string' || !isValidPhoneNumber(updates.whatsappNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid 10-digit mobile number or international phone number for WhatsApp.',
        });
      }
    }

    if (updates.phone !== undefined && updates.phone !== '') {
      if (typeof updates.phone !== 'string' || !isValidPhoneNumber(updates.phone)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid business phone number.',
        });
      }
    }

    if (updates.email !== undefined && updates.email !== '') {
      if (typeof updates.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address.',
        });
      }
    }

    const updated = await dbService.updateContactSettings(updates);

    return res.json({
      success: true,
      message: 'Contact settings updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating contact settings via alias:', err);
    return res.status(500).json({ success: false, error: 'Failed to update contact settings.' });
  }
});

export default router;
