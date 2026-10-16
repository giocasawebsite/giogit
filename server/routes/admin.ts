import { Router, Request, Response, NextFunction } from 'express';
import { dbService } from '../db';
import { config } from '../config';
import { getNowInKolkata, timeToMinutes, generateBookingId, minutesToTime, getOperatingHours } from '../utils/timezone';
import { Booking, BookingStatus, PaymentStatus } from '../types';
import { calculateBookingPrice } from '../utils/pricing';

const router = Router();

// Middleware: Verify Admin Passcode header
export const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const passcode = req.headers['x-admin-passcode'] || req.query.passcode;
    const currentPasscode = await dbService.getAdminPasscode();
    if (!passcode || passcode !== currentPasscode) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Admin Passcode.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal authentication error.' });
  }
};

router.use(requireAdminAuth);

// POST /api/admin/verify - Verify admin session
router.post('/verify', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Passcode verified.' });
});

// POST /api/admin/change-passcode - Update admin passcode
router.post('/change-passcode', async (req: Request, res: Response) => {
  try {
    const { currentPasscode, newPasscode } = req.body;
    const activePasscode = await dbService.getAdminPasscode();

    if (!currentPasscode || currentPasscode !== activePasscode) {
      return res.status(400).json({ success: false, error: 'Current passcode is incorrect.' });
    }

    if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'New passcode must be at least 6 characters long.' });
    }

    await dbService.setAdminPasscode(newPasscode.trim());
    return res.json({ success: true, message: 'Admin passcode updated successfully.' });
  } catch (err: any) {
    console.error('Error changing admin passcode:', err);
    return res.status(500).json({ success: false, error: 'Failed to change admin passcode.' });
  }
});

// GET /api/admin/overview - Real-time operational dashboard overview
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const now = getNowInKolkata();
    const todayBookings = await dbService.getBookings({ date: now.dateStr });
    const resources = await dbService.getResources();

    let upcomingCount = 0;
    let playingNowCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let todayRevenue = 0;

    for (const b of todayBookings) {
      if (b.status === 'active') playingNowCount++;
      else if (b.status === 'confirmed' || b.status === 'pending') upcomingCount++;
      else if (b.status === 'completed') completedCount++;
      else if (b.status === 'cancelled') cancelledCount++;

      if (b.status !== 'cancelled') {
        todayRevenue += b.totalAmount;
      }
    }

    // Determine live status of every resource
    const liveStations = resources.map((r) => {
      if (r.isMaintenance) {
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          status: 'maintenance',
          statusLabel: 'Maintenance',
          reason: r.maintenanceReason || 'Servicing',
          currentBooking: null,
        };
      }

      // Check if any booking is active right now
      const currentActive = todayBookings.find(
        (b) => b.resourceId === r.id && b.status === 'active'
      );

      if (currentActive) {
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          status: 'playing',
          statusLabel: 'Currently Playing',
          currentBooking: {
            id: currentActive.id,
            customerName: currentActive.customerName,
            phone: currentActive.phone,
            endTime: currentActive.endTime,
          },
        };
      }

      // Check upcoming today
      const nextUpcoming = todayBookings
        .filter((b) => b.resourceId === r.id && (b.status === 'confirmed' || b.status === 'pending'))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

      if (nextUpcoming) {
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          status: 'reserved',
          statusLabel: 'Reserved Upcoming',
          nextBooking: {
            id: nextUpcoming.id,
            customerName: nextUpcoming.customerName,
            startTime: nextUpcoming.startTime,
          },
        };
      }

      return {
        id: r.id,
        name: r.name,
        category: r.category,
        status: 'available',
        statusLabel: 'Available',
      };
    });

    return res.json({
      success: true,
      data: {
        date: now.dateStr,
        currentTime: now.timeStr,
        metrics: {
          upcoming: upcomingCount,
          playingNow: playingNowCount,
          completed: completedCount,
          cancelled: cancelledCount,
          revenue: todayRevenue,
          totalToday: todayBookings.length,
        },
        liveStations,
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin overview:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve overview statistics.' });
  }
});

// GET /api/admin/bookings - List all bookings with filters
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const { date, resourceId, category, status, paymentStatus, search } = req.query;
    const bookings = await dbService.getBookings({
      date: date as string,
      resourceId: resourceId as string,
      category: category as any,
      status: status as any,
      paymentStatus: paymentStatus as any,
      search: search as string,
    });

    return res.json({ success: true, count: bookings.length, data: bookings });
  } catch (err: any) {
    console.error('Error fetching admin bookings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve bookings list.' });
  }
});

// POST /api/admin/bookings - Manual booking created by staff/manager
router.post('/bookings', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.customerName || !body.phone || !body.resourceId || !body.date || !body.startTime) {
      return res.status(400).json({ success: false, error: 'Missing required booking fields.' });
    }

    const resource = await dbService.getResourceById(body.resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    const durationMinutes = body.durationMinutes || 60;
    const startMins = timeToMinutes(body.startTime);
    const endMins = startMins + durationMinutes;
    const numberOfPeople = body.numberOfPeople || 1;
    const totalAmount =
      body.totalAmount !== undefined
        ? body.totalAmount
        : calculateBookingPrice(resource.category, durationMinutes, numberOfPeople, resource.ratePerHour);

    const booking: Booking = {
      id: generateBookingId(),
      customerName: body.customerName.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim(),
      resourceId: resource.id,
      resourceName: resource.name,
      category: resource.category,
      date: body.date,
      startTime: body.startTime,
      endTime,
      durationMinutes,
      numberOfPeople: body.numberOfPeople || 1,
      totalAmount,
      status: body.status || 'confirmed',
      paymentStatus: body.paymentStatus || 'paid',
      notes: body.notes ? `[Manual Booking] ${body.notes}` : '[Manual Booking by Staff]',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'admin',
    };

    const result = await dbService.createBooking(booking);
    if (!result.success) {
      return res.status(409).json({ success: false, error: result.error });
    }

    return res.status(201).json({ success: true, message: 'Manual booking created!', data: result.booking });
  } catch (err: any) {
    console.error('Error creating manual booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to create manual booking.' });
  }
});

// PATCH /api/admin/bookings/:id - Update booking status or payment
router.patch('/bookings/:id', async (req: Request, res: Response) => {
  try {
    const { status, paymentStatus, notes, startTime, endTime } = req.body;
    const updates: Partial<Booking> = {};

    if (status) updates.status = status as BookingStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus as PaymentStatus;
    if (notes !== undefined) updates.notes = notes;
    if (startTime) updates.startTime = startTime;
    if (endTime) updates.endTime = endTime;

    const updated = await dbService.updateBooking(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    return res.json({ success: true, message: 'Booking updated.', data: updated });
  } catch (err: any) {
    console.error('Error updating booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to update booking.' });
  }
});

// DELETE /api/admin/bookings/:id - Delete a single booking
router.delete('/bookings/:id', async (req: Request, res: Response) => {
  try {
    const success = await dbService.deleteBooking(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Booking not found or already deleted.' });
    }
    return res.json({ success: true, message: `Booking #${req.params.id} deleted successfully.` });
  } catch (err: any) {
    console.error('Error deleting booking:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete booking.' });
  }
});

// POST /api/admin/bookings/delete-batch - Delete selected bookings in batch
router.post('/bookings/delete-batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'An array of booking IDs is required.' });
    }

    const count = await dbService.deleteBookings(ids);
    return res.json({
      success: true,
      count,
      message: `Successfully deleted ${count} selected booking${count === 1 ? '' : 's'}.`,
    });
  } catch (err: any) {
    console.error('Error in batch booking deletion:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete selected bookings.' });
  }
});

// POST /api/admin/bookings/clear-history - Clear booking history (completed & cancelled or all)
router.post('/bookings/clear-history', async (req: Request, res: Response) => {
  try {
    const { scope } = req.body;
    const cleanScope = scope === 'all' ? 'all' : 'completed_and_cancelled';

    const count = await dbService.clearBookingHistory(cleanScope);
    const scopeLabel = cleanScope === 'all' ? 'all bookings' : 'completed and cancelled sessions';

    return res.json({
      success: true,
      count,
      message: `History cleared: removed ${count} ${scopeLabel}.`,
    });
  } catch (err: any) {
    console.error('Error clearing booking history:', err);
    return res.status(500).json({ success: false, error: 'Failed to clear booking history.' });
  }
});

// PATCH /api/admin/resources/:id - Toggle maintenance or active status
router.patch('/resources/:id', async (req: Request, res: Response) => {
  try {
    const { isMaintenance, maintenanceReason, active, ratePerHour } = req.body;
    const updates: any = {};

    if (isMaintenance !== undefined) updates.isMaintenance = Boolean(isMaintenance);
    if (maintenanceReason !== undefined) updates.maintenanceReason = maintenanceReason;
    if (active !== undefined) updates.active = Boolean(active);
    if (ratePerHour !== undefined) updates.ratePerHour = Number(ratePerHour);

    const updated = await dbService.updateResource(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    return res.json({
      success: true,
      message: `Resource ${updated.name} updated successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating resource:', err);
    return res.status(500).json({ success: false, error: 'Failed to update resource.' });
  }
});

export default router;
