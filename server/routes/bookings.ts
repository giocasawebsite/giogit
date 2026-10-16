import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import {
  getNowInKolkata,
  getOperatingHours,
  timeToMinutes,
  minutesToTime,
  doIntervalsOverlap,
  generateBookingId,
} from '../utils/timezone';
import { TimeSlot, Booking, CreateBookingRequest, ExtendBookingRequest } from '../types';
import { calculateBookingPrice } from '../utils/pricing';

const router = Router();

// GET /api/booking/resources - Retrieve all gaming resources with live status
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const resources = await dbService.getResources();
    return res.json({ success: true, data: resources });
  } catch (err: any) {
    console.error('Error fetching resources:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve gaming resources.' });
  }
});

// GET /api/booking/availability - Query slot availability for a resource, date and duration
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const resourceId = req.query.resourceId as string;
    const date = req.query.date as string; // YYYY-MM-DD
    const durationMinutes = parseInt(req.query.durationMinutes as string || '60', 10);

    if (!resourceId || !date) {
      return res.status(400).json({ success: false, error: 'resourceId and date are required.' });
    }

    const resource = await dbService.getResourceById(resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Gaming resource not found.' });
    }

    const now = getNowInKolkata();
    // Prevent past date check
    if (date < now.dateStr) {
      return res.status(400).json({ success: false, error: 'Cannot check availability for past dates.' });
    }

    const opHours = getOperatingHours(date);
    const existingBookings = await dbService.getBookings({ resourceId, date });
    const activeBookings = existingBookings.filter((b) => ['confirmed', 'active', 'pending'].includes(b.status));

    // Generate slots in 30-minute intervals from openMinutes up to closeMinutes - durationMinutes
    const slotStep = 30; // 30-min slot resolution
    const slots: TimeSlot[] = [];

    const isToday = date === now.dateStr;
    const currentMins = now.totalMinutes;

    for (let slotStart = opHours.openMinutes; slotStart + durationMinutes <= opHours.closeMinutes; slotStart += slotStep) {
      const slotEnd = slotStart + durationMinutes;
      const startTimeStr = minutesToTime(slotStart);
      const endTimeStr = minutesToTime(slotEnd);

      // Check if slot has already passed today
      if (isToday && slotStart <= currentMins) {
        slots.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          status: 'unavailable',
          reason: 'Slot time has passed',
        });
        continue;
      }

      // Check if resource is under maintenance
      if (resource.isMaintenance) {
        slots.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          status: 'unavailable',
          reason: resource.maintenanceReason || 'Station under maintenance',
        });
        continue;
      }

      // Check for overlapping bookings
      let isBooked = false;
      let isPlayingNow = false;
      let matchedBooking: Booking | null = null;

      for (const b of activeBookings) {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);

        if (doIntervalsOverlap(slotStart, slotEnd, bStart, bEnd)) {
          isBooked = true;
          matchedBooking = b;
          if (isToday && currentMins >= bStart && currentMins < bEnd) {
            isPlayingNow = true;
          }
          break;
        }
      }

      if (isBooked) {
        slots.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          status: isPlayingNow ? 'playing' : 'booked',
          bookingId: matchedBooking ? matchedBooking.id : undefined,
          reason: isPlayingNow ? 'Currently in play' : 'Reserved by another guest',
        });
      } else {
        slots.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          status: 'available',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        resourceId,
        date,
        durationMinutes,
        operatingHours: {
          open: opHours.openTime,
          close: opHours.closeTime,
        },
        slots,
      },
    });
  } catch (err: any) {
    console.error('Error fetching availability:', err);
    return res.status(500).json({ success: false, error: 'Internal error checking slot availability.' });
  }
});

// POST /api/bookings - Create booking with strict conflict detection
router.post('/', async (req: Request, res: Response) => {
  try {
    const body: CreateBookingRequest = req.body;

    // Validate fields
    if (!body.customerName || body.customerName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Valid customer name is required (min 2 characters).' });
    }

    const cleanPhone = (body.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit mobile number is required.' });
    }

    if (!body.resourceId || !body.date || !body.startTime) {
      return res.status(400).json({ success: false, error: 'resourceId, date, and startTime are required.' });
    }

    const durationMinutes = body.durationMinutes || 60;
    if (durationMinutes < 30 || durationMinutes > 240) {
      return res.status(400).json({ success: false, error: 'Booking duration must be between 30 and 240 minutes.' });
    }

    const resource = await dbService.getResourceById(body.resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Selected gaming resource does not exist.' });
    }

    if (resource.isMaintenance) {
      return res.status(400).json({
        success: false,
        error: `This station is currently under maintenance (${resource.maintenanceReason || 'Equipment servicing'}).`,
      });
    }

    const numberOfPeople = body.numberOfPeople || 1;
    if (numberOfPeople < resource.playersCapacity.min || numberOfPeople > resource.playersCapacity.max) {
      return res.status(400).json({
        success: false,
        error: `Player count for ${resource.name} must be between ${resource.playersCapacity.min} and ${resource.playersCapacity.max}.`,
      });
    }

    const now = getNowInKolkata();
    if (body.date < now.dateStr) {
      return res.status(400).json({ success: false, error: 'Cannot book slots on a past date.' });
    }

    const startMins = timeToMinutes(body.startTime);
    const endMins = startMins + durationMinutes;
    const opHours = getOperatingHours(body.date);

    if (startMins < opHours.openMinutes || endMins > opHours.closeMinutes) {
      return res.status(400).json({
        success: false,
        error: `Selected time is outside operating hours (${opHours.openTime} – ${opHours.closeTime === '24:00' ? 'Midnight' : opHours.closeTime}).`,
      });
    }

    if (body.date === now.dateStr && startMins <= now.totalMinutes) {
      return res.status(400).json({ success: false, error: 'Cannot book a time slot that has already passed.' });
    }

    const endTime = minutesToTime(endMins);

    // Calculate server-verified total amount
    const totalAmount = calculateBookingPrice(
      resource.category,
      durationMinutes,
      numberOfPeople,
      resource.ratePerHour
    );

    const bookingId = generateBookingId();
    const newBooking: Booking = {
      id: bookingId,
      customerName: body.customerName.trim(),
      phone: cleanPhone.slice(-10),
      email: body.email ? body.email.trim() : undefined,
      resourceId: resource.id,
      resourceName: resource.name,
      category: resource.category,
      date: body.date,
      startTime: body.startTime,
      endTime,
      durationMinutes,
      numberOfPeople,
      totalAmount,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      notes: body.notes ? body.notes.trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'web',
    };

    // Execute atomic conflict check & insert
    const result = await dbService.createBooking(newBooking);

    if (!result.success) {
      return res.status(409).json({ success: false, error: result.error });
    }

    return res.status(201).json({
      success: true,
      message: 'Booking successfully confirmed!',
      data: result.booking,
    });
  } catch (err: any) {
    console.error('Error creating booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to create booking. Please try again.' });
  }
});

// GET /api/bookings/lookup - Look up bookings by Booking ID or Phone number
router.get('/lookup', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'Please provide a Booking ID or Phone Number.' });
    }

    const bookings = await dbService.findBookingsByPhoneOrId(query);
    if (bookings.length === 0) {
      return res.status(404).json({ success: false, error: 'No booking found matching your details.' });
    }

    // Mask phone number for public privacy
    const sanitized = bookings.map((b) => ({
      ...b,
      phone: b.phone.slice(0, 2) + '******' + b.phone.slice(-2),
    }));

    return res.json({ success: true, data: sanitized });
  } catch (err: any) {
    console.error('Error looking up booking:', err);
    return res.status(500).json({ success: false, error: 'Lookup failed.' });
  }
});

// GET /api/bookings/:id - Get specific booking by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await dbService.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    return res.json({ success: true, data: booking });
  } catch (err: any) {
    console.error('Error fetching booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve booking.' });
  }
});

// POST /api/bookings/:id/extend - Extend active or upcoming booking
router.post('/:id/extend', async (req: Request, res: Response) => {
  try {
    const { additionalMinutes } = req.body as ExtendBookingRequest;
    if (!additionalMinutes || ![30, 60].includes(additionalMinutes)) {
      return res.status(400).json({ success: false, error: 'Extension must be either 30 or 60 minutes.' });
    }

    const result = await dbService.extendBooking(req.params.id, additionalMinutes);
    if (!result.success) {
      return res.status(409).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: `Booking successfully extended by ${additionalMinutes} minutes!`,
      data: result.booking,
    });
  } catch (err: any) {
    console.error('Error extending booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to process extension.' });
  }
});

// POST /api/bookings/:id/cancel - Cancel booking
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const result = await dbService.cancelBooking(req.params.id, reason);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: result.booking,
    });
  } catch (err: any) {
    console.error('Error cancelling booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel booking.' });
  }
});

export default router;
