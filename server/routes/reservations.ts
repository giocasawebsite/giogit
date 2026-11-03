import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { createRateLimiter } from '../middleware/security';
import { pushNotificationService } from '../services/pushNotification';

const router = Router();

// Public reservation submission rate limiter: max 15 submissions per 15 minutes per IP
const reservationSubmitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many reservation requests from your network. Please wait a few minutes before trying again.',
}).middleware;

// Public reservation lookup limiter: max 40 lookups per 10 minutes per IP
const reservationLookupLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: 'Too many lookup requests. Please slow down.',
}).middleware;

// POST /api/reservations/dining - Submit a dining table reservation (1st Floor Restaurant)
router.post('/dining', reservationSubmitLimiter, async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      phone,
      whatsappPhone,
      email,
      guests,
      date,
      time,
      seatingPreference,
      specialRequests,
      additionalRequirements,
    } = req.body || {};

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Customer full name is required (at least 2 characters).' });
    }

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, error: 'Reservation date is required.' });
    }

    if (!time || typeof time !== 'string') {
      return res.status(400).json({ success: false, error: 'Preferred arrival time is required.' });
    }

    const reservation = await dbService.createDiningReservation({
      customerName: customerName.trim(),
      phone: cleanPhone.slice(-10),
      whatsappPhone: whatsappPhone ? String(whatsappPhone).replace(/\D/g, '').slice(-10) : undefined,
      email: email ? String(email).trim() : undefined,
      guests: Number(guests) || 2,
      date: date.trim(),
      time: time.trim(),
      seatingPreference: seatingPreference ? String(seatingPreference).trim() : undefined,
      specialRequests: specialRequests ? String(specialRequests).trim() : undefined,
      additionalRequirements: additionalRequirements ? String(additionalRequirements).trim() : undefined,
    });

    // Database insert confirmed! Dispatch real-time admin push notification asynchronously
    pushNotificationService.notifyNewDiningReservation(reservation).catch((err) => {
      console.error('Failed to dispatch dining push alert:', err?.message || err);
    });

    return res.status(201).json({
      success: true,
      message: `Dining table reservation #${reservation.reference} submitted successfully.`,
      data: reservation,
    });
  } catch (err: any) {
    console.error('Error submitting dining reservation:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to submit dining reservation.' });
  }
});

// POST /api/reservations/event - Submit an event enquiry / reservation
router.post('/event', reservationSubmitLimiter, async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      phone,
      whatsappPhone,
      email,
      eventType,
      date,
      time,
      expectedGuests,
      estimatedBudget,
      foodRequirements,
      decorationRequirements,
      additionalMessage,
    } = req.body || {};

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Customer full name is required (at least 2 characters).' });
    }

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit mobile number is required.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required for event enquiries.' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ success: false, error: 'Event date is required.' });
    }

    if (!time || typeof time !== 'string') {
      return res.status(400).json({ success: false, error: 'Preferred time is required.' });
    }

    const reservation = await dbService.createEventReservation({
      customerName: customerName.trim(),
      phone: cleanPhone.slice(-10),
      whatsappPhone: whatsappPhone ? String(whatsappPhone).replace(/\D/g, '').slice(-10) : undefined,
      email: email.trim(),
      eventType: eventType ? String(eventType).trim() : 'Birthday',
      date: date.trim(),
      time: time.trim(),
      expectedGuests: Number(expectedGuests) || 10,
      estimatedBudget: estimatedBudget ? String(estimatedBudget).trim() : undefined,
      foodRequirements: foodRequirements ? String(foodRequirements).trim() : undefined,
      decorationRequirements: decorationRequirements ? String(decorationRequirements).trim() : undefined,
      additionalMessage: additionalMessage ? String(additionalMessage).trim() : undefined,
    });

    // Database insert confirmed! Dispatch real-time admin push notification asynchronously
    pushNotificationService.notifyNewEventReservation(reservation).catch((err) => {
      console.error('Failed to dispatch event push alert:', err?.message || err);
    });

    return res.status(201).json({
      success: true,
      message: `Event enquiry #${reservation.reference} submitted successfully.`,
      data: reservation,
    });
  } catch (err: any) {
    console.error('Error submitting event enquiry:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to submit event enquiry.' });
  }
});

// GET /api/reservations/lookup/:ref - Look up reservation status by reference code
router.get('/lookup/:ref', reservationLookupLimiter, async (req: Request, res: Response) => {
  try {
    const { ref } = req.params;
    if (!ref) {
      return res.status(400).json({ success: false, error: 'Reservation reference is required.' });
    }

    const cleanRef = ref.trim().toUpperCase();
    let result: any = null;

    if (cleanRef.startsWith('GDR') || cleanRef.startsWith('GDR-')) {
      result = await dbService.getDiningReservationById(cleanRef);
    } else if (cleanRef.startsWith('GER') || cleanRef.startsWith('GER-')) {
      result = await dbService.getEventReservationById(cleanRef);
    } else {
      result = (await dbService.getDiningReservationById(cleanRef)) || (await dbService.getEventReservationById(cleanRef));
    }

    if (!result) {
      return res.status(404).json({ success: false, error: 'Reservation not found.' });
    }

    return res.json({
      success: true,
      data: {
        reference: result.reference,
        type: result.type,
        customerName: result.customerName,
        date: result.date,
        time: result.time,
        status: result.status,
        location: result.location || 'GioCasa Ayodhya',
        createdAt: result.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error looking up reservation:', err);
    return res.status(500).json({ success: false, error: 'Lookup failed.' });
  }
});

export default router;
