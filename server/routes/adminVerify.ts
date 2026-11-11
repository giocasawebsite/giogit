import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { guestVerificationLimiter } from '../middleware/security';
import { PaymentMethod, PaymentStatus } from '../types';

const router = Router();

// Apply admin authentication to all verification routes
router.use(requireAdminAuth);

/**
 * GET /api/admin/verify/code/:code
 * Look up a booking, dining reservation, event reservation, or tournament registration by 4-digit code.
 * Rate limited to prevent brute-force code guessing.
 * Never leaks data on wrong code.
 */
router.get('/code/:code', guestVerificationLimiter, async (req: Request, res: Response) => {
  try {
    const rawCode = (req.params.code || '').trim();

    if (!/^\d{4}$/.test(rawCode)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 4-digit numeric verification code.',
      });
    }

    const booking = await dbService.findBookingByGuestCode(rawCode);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'No active booking or reservation found matching verification code.',
      });
    }

    return res.json({
      success: true,
      data: booking,
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/verify/code/:code:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while looking up the verification code.',
    });
  }
});

/**
 * POST /api/admin/verify/check-in
 * Confirm guest arrival and mark check-in status.
 * Prevents accidental duplicate check-ins and blocks cancelled bookings.
 */
router.post('/check-in', async (req: Request, res: Response) => {
  try {
    const { bookingType, id, staffName } = req.body;

    if (!bookingType || !id) {
      return res.status(400).json({
        success: false,
        error: 'Booking type and ID are required to confirm check-in.',
      });
    }

    if (!['gaming', 'dining', 'event', 'tournament'].includes(bookingType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking type specified.',
      });
    }

    const staff = staffName?.trim() || (req as any).adminUser || 'Front Desk Staff';
    const result = await dbService.checkInGuest(bookingType, id, staff);

    if (!result.success) {
      const isDuplicate = result.error?.toLowerCase().includes('already');
      const isCancelled = result.error?.toLowerCase().includes('cancelled');
      const statusCode = isDuplicate ? 409 : isCancelled ? 400 : 400;

      return res.status(statusCode).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Guest arrival successfully confirmed!',
      data: result.data,
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/verify/check-in:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process check-in.',
    });
  }
});

/**
 * POST /api/admin/verify/payment
 * Update payment verification status, method, and reference.
 * If marked paid for gaming, recalculates player CRM spend.
 * Never marks payment as paid automatically from code lookup.
 */
router.post('/payment', async (req: Request, res: Response) => {
  try {
    const { bookingType, id, paymentStatus, paymentMethod, paymentReference, staffName, amount } = req.body;

    if (!bookingType || !id || !paymentStatus) {
      return res.status(400).json({
        success: false,
        error: 'Booking type, ID, and payment status are required.',
      });
    }

    if (!['gaming', 'dining', 'event', 'tournament'].includes(bookingType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking type specified.',
      });
    }

    const validStatuses: PaymentStatus[] = ['paid', 'unpaid', 'pending', 'refunded', 'waived'];
    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status value.',
      });
    }

    const validMethods: PaymentMethod[] = ['cash', 'upi', 'card', 'other'];
    let method: PaymentMethod | undefined = undefined;
    if (paymentMethod && validMethods.includes(paymentMethod)) {
      method = paymentMethod;
    } else if (paymentStatus === 'paid') {
      method = 'cash'; // Default fallback if paid without explicit method
    }

    const parsedAmount = amount !== undefined && amount !== null && amount !== '' ? Number(amount) : undefined;
    const staff = staffName?.trim() || (req as any).adminUser || 'Front Desk Staff';
    const result = await dbService.verifyGuestPayment(
      bookingType,
      id,
      paymentStatus,
      method,
      paymentReference,
      staff,
      parsedAmount
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: `Payment status successfully updated to ${paymentStatus.toUpperCase()}!`,
      data: result.data,
      pointsAwarded: result.pointsAwarded,
      playerLoyaltyBalance: result.playerLoyaltyBalance,
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/verify/payment:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment status.',
    });
  }
});

/**
 * GET /api/admin/verify/recent
 * Returns a list of recently checked-in or payment-verified guests.
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const recent = await dbService.getRecentVerifiedBookings(limit);

    return res.json({
      success: true,
      data: recent,
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/verify/recent:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent verifications.',
    });
  }
});

export default router;
