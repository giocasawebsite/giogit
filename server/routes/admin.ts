import { Router, Request, Response, NextFunction } from 'express';
import { dbService } from '../db';
import { config } from '../config';
import { pushNotificationService } from '../services/pushNotification';
import { getNowInKolkata, timeToMinutes, generateBookingId, minutesToTime, getOperatingHours } from '../utils/timezone';
import { Booking, BookingStatus, PaymentStatus } from '../types';
import { isValidPhoneNumber } from '../utils/phone';
import { calculateBookingPrice } from '../utils/pricing';
import {
  adminLoginLimiter,
  createAdminSession,
  validateAdminSession,
  invalidateAdminSession,
  invalidateAllAdminSessions,
  logSecurityEvent,
  getSecurityAuditLogs,
} from '../middleware/security';

const router = Router();

// =========================================================================
// PUBLIC ADMIN AUTHENTICATION ENDPOINTS (With Brute-force Rate Limiting)
// =========================================================================

// POST /api/admin/login - Authenticate admin with rate limiting & issue session token
router.post('/login', adminLoginLimiter.middleware, async (req: Request, res: Response) => {
  try {
    const { passcode } = req.body || {};
    const candidate = passcode || req.headers['x-admin-passcode'];

    if (!candidate || typeof candidate !== 'string') {
      return res.status(400).json({ success: false, error: 'Admin passcode is required.' });
    }

    const isValid = await dbService.verifyAdminPasscode(candidate);
    if (!isValid) {
      adminLoginLimiter.recordFailure(req);
      logSecurityEvent('AUTH_FAILURE', req, 'Failed admin login attempt');
      return res.status(401).json({ success: false, error: 'Invalid Admin Passcode.' });
    }

    adminLoginLimiter.reset(req);
    const sessionVersion = await dbService.getSessionVersion();
    const session = createAdminSession(req, sessionVersion);
    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err: any) {
    console.error('Error in admin login:', err);
    return res.status(500).json({ success: false, error: 'Login failed due to an internal error.' });
  }
});

// POST /api/admin/verify - Verify admin session or raw passcode
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const tokenOrPasscode = (
      req.body?.passcode ||
      bearerToken ||
      req.headers['x-admin-token'] ||
      req.headers['x-admin-passcode'] ||
      req.query.passcode
    ) as string;

    if (!tokenOrPasscode) {
      return res.status(401).json({ success: false, error: 'Admin credentials required.' });
    }

    const sessionVersion = await dbService.getSessionVersion();

    // 1. Check if token is already a valid session
    if (validateAdminSession(tokenOrPasscode, sessionVersion)) {
      return res.json({ success: true, message: 'Passcode verified.' });
    }

    // 2. Check if it matches active passcode
    const isValid = await dbService.verifyAdminPasscode(tokenOrPasscode);
    if (isValid) {
      adminLoginLimiter.reset(req);
      const session = createAdminSession(req, sessionVersion);
      return res.json({
        success: true,
        message: 'Passcode verified.',
        data: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      });
    }

    adminLoginLimiter.recordFailure(req);
    logSecurityEvent('AUTH_FAILURE', req, 'Verification failed');
    return res.status(401).json({ success: false, error: 'Invalid Admin Passcode.' });
  } catch (err: any) {
    console.error('Error in /api/admin/verify:', err);
    return res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// POST /api/admin/logout - Revoke active admin session
router.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = (
    bearerToken ||
    req.headers['x-admin-token'] ||
    req.headers['x-admin-passcode'] ||
    req.body?.token
  ) as string;

  if (token) {
    invalidateAdminSession(token, req);
  }
  return res.json({ success: true, message: 'Admin logged out successfully.' });
});

// =========================================================================
// AUTHENTICATION MIDDLEWARE FOR PROTECTED ADMIN ROUTES
// =========================================================================
export const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const credential = (
      bearerToken ||
      req.headers['x-admin-token'] ||
      req.headers['x-admin-passcode'] ||
      req.query.passcode
    ) as string;

    if (!credential) {
      logSecurityEvent('AUTH_FAILURE', req, 'Missing admin credentials');
      return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication required.' });
    }

    // 1. Check if credential is a valid stateless HMAC session token
    //    (These start with gio_sec_ and are self-validating — no DB lookup needed
    //     except for the cached sessionVersion, which is O(1) most of the time)
    if (credential.startsWith('gio_sec_')) {
      const sessionVersion = await dbService.getSessionVersion();
      if (validateAdminSession(credential, sessionVersion)) {
        return next();
      }
      // Session token is invalid or expired — do NOT record as brute-force attempt.
      // The token was legitimately issued; it may be expired or from another device.
      logSecurityEvent('AUTH_FAILURE', req, 'Expired or invalidated session token');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session expired. Please log in again.',
        code: 'SESSION_EXPIRED',
      });
    }

    // 2. Check if credential matches raw admin passcode (legacy / direct passcode path)
    const isPasscodeValid = await dbService.verifyAdminPasscode(credential);
    if (isPasscodeValid) {
      adminLoginLimiter.reset(req);
      return next();
    }

    // 3. Neither — record as a brute-force failure
    adminLoginLimiter.recordFailure(req);
    logSecurityEvent('AUTH_FAILURE', req, 'Invalid admin passcode');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Admin Passcode.',
      code: 'AUTH_INVALID',
    });
  } catch (err: any) {
    console.error('Error in requireAdminAuth middleware:', err?.message || err);
    return res.status(500).json({ success: false, error: 'Internal authentication error.' });
  }
};

router.use(requireAdminAuth);

// GET /api/admin/security-audit - Admin audit trail of recent security events
router.get('/security-audit', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: getSecurityAuditLogs(),
  });
});

// POST /api/admin/change-passcode - Update admin passcode and revoke ALL active sessions
router.post('/change-passcode', async (req: Request, res: Response) => {
  try {
    const { currentPasscode, newPasscode } = req.body || {};

    if (!currentPasscode || typeof currentPasscode !== 'string') {
      return res.status(400).json({ success: false, error: 'Current passcode is required.' });
    }

    const isCurrentValid = await dbService.verifyAdminPasscode(currentPasscode);
    if (!isCurrentValid) {
      logSecurityEvent('AUTH_FAILURE', req, 'Passcode change rejected: current passcode mismatch');
      return res.status(400).json({ success: false, error: 'Current passcode is incorrect.' });
    }

    if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim().length < 8) {
      return res.status(400).json({ success: false, error: 'New passcode must be at least 8 characters long.' });
    }

    // 1. Save the new passcode
    await dbService.setAdminPasscode(newPasscode.trim());

    // 2. Increment session version — this GLOBALLY INVALIDATES all existing session tokens
    //    across every device/browser that is currently logged in.
    const newSessionVersion = await dbService.incrementSessionVersion();
    invalidateAllAdminSessions(req);

    // 3. Issue a fresh token for the current device so it stays logged in
    const session = createAdminSession(req, newSessionVersion);

    logSecurityEvent('PASSCODE_CHANGED', req, 'Admin passcode changed — all sessions revoked');
    return res.json({
      success: true,
      message: 'Admin passcode updated. All other devices have been logged out.',
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
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
    const endTime = minutesToTime(endMins); // FIX: was missing — caused "ReferenceError: endTime is not defined"
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

    // Database insert confirmed! Dispatch real-time admin push notification asynchronously
    if (result.booking) {
      pushNotificationService.notifyNewBooking(result.booking).catch((err) => {
        console.error('Failed to dispatch manual booking push alert:', err?.message || err);
      });
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
    const { isMaintenance, maintenanceReason, active, ratePerHour, machineIdentifier, name, specs } = req.body;
    const updates: any = {};

    if (isMaintenance !== undefined) updates.isMaintenance = Boolean(isMaintenance);
    if (maintenanceReason !== undefined) updates.maintenanceReason = maintenanceReason;
    if (active !== undefined) updates.active = Boolean(active);
    if (ratePerHour !== undefined) updates.ratePerHour = Number(ratePerHour);
    if (machineIdentifier !== undefined) updates.machineIdentifier = String(machineIdentifier);
    if (name !== undefined) updates.name = String(name);
    if (specs !== undefined && Array.isArray(specs)) updates.specs = specs;

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

// =========================================================================
// GAMING EQUIPMENT & MACHINE QUANTITY MANAGEMENT (PROTECTED ADMIN ROUTES)
// =========================================================================

// GET /api/admin/equipment - Summary and machine breakdown
router.get('/equipment', async (_req: Request, res: Response) => {
  try {
    const [summary, allResources] = await Promise.all([
      dbService.getEquipmentSummary(),
      dbService.getAllResources(true),
    ]);
    return res.json({
      success: true,
      data: {
        summary,
        resources: allResources,
      },
    });
  } catch (err: any) {
    console.error('Error fetching equipment summary:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve equipment data.' });
  }
});

// GET /api/admin/resources - Alias for equipment resource list
router.get('/resources', async (_req: Request, res: Response) => {
  try {
    const resources = await dbService.getAllResources(true);
    return res.json({ success: true, data: resources });
  } catch (err: any) {
    console.error('Error fetching resources:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve resources.' });
  }
});

// POST /api/admin/equipment - Add new equipment machine or equipment type
router.post('/equipment', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.category) {
      return res.status(400).json({ success: false, error: 'Equipment name and category are required.' });
    }

    const created = await dbService.createResource(body);
    return res.status(201).json({
      success: true,
      message: `Equipment ${created.name} created successfully.`,
      data: created,
    });
  } catch (err: any) {
    console.error('Error creating equipment:', err);
    return res.status(500).json({ success: false, error: 'Failed to create equipment.' });
  }
});

// PUT /api/admin/equipment/:id - Update equipment details
router.put('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const updated = await dbService.updateResource(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Equipment not found.' });
    }
    return res.json({
      success: true,
      message: `Equipment ${updated.name} updated successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating equipment:', err);
    return res.status(500).json({ success: false, error: 'Failed to update equipment.' });
  }
});

// DELETE /api/admin/equipment/:id - Delete equipment with safety checks for active bookings
router.delete('/equipment/:id', async (req: Request, res: Response) => {
  try {
    const result = await dbService.deleteResource(req.params.id);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        activeBookingsCount: result.activeBookingsCount,
      });
    }
    return res.json({
      success: true,
      message: 'Equipment deleted successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting equipment:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete equipment.' });
  }
});

// POST /api/admin/equipment/quantity - Adjust quantity (+1 or -1) with active booking verification
router.post('/equipment/quantity', async (req: Request, res: Response) => {
  try {
    const { category, delta, templateData } = req.body;
    if (!category || typeof delta !== 'number') {
      return res.status(400).json({ success: false, error: 'category and delta (number) are required.' });
    }

    const result = await dbService.adjustCategoryQuantity(category, delta, templateData);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        activeBookingsCount: result.activeBookingsCount,
      });
    }

    return res.json({
      success: true,
      message: delta > 0 ? `Machine added for ${category}.` : `Machine removed for ${category}.`,
      data: result.resource,
    });
  } catch (err: any) {
    console.error('Error adjusting machine quantity:', err);
    return res.status(500).json({ success: false, error: 'Failed to adjust machine quantity.' });
  }
});

// =========================================================================
// GAMES LIBRARY MANAGEMENT (PROTECTED ADMIN ROUTES)
// =========================================================================

// GET /api/admin/games - Fetch all games (including unavailable)
router.get('/games', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    const games = await dbService.getGames({ category });
    return res.json({
      success: true,
      data: games,
    });
  } catch (err: any) {
    console.error('Error fetching admin games:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch games.' });
  }
});

// POST /api/admin/games - Add a new game
router.post('/games', async (req: Request, res: Response) => {
  try {
    const {
      title,
      category,
      description,
      image,
      imagePublicId,
      isAvailable,
      availabilityStatus,
      isFeatured,
      resourceId,
      resourceName,
      playOptions,
      badge,
      genre,
      minPlayers,
      maxPlayers,
      order,
    } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Game title and category are required.' });
    }

    const game = await dbService.createGame({
      title,
      category,
      description: description || '',
      image: image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      imagePublicId,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : availabilityStatus !== 'unavailable' && availabilityStatus !== 'coming_soon',
      availabilityStatus: availabilityStatus || (isAvailable === false ? 'coming_soon' : 'available'),
      isFeatured: Boolean(isFeatured),
      resourceId: resourceId || '',
      resourceName: resourceName || '',
      playOptions: Array.isArray(playOptions) ? playOptions : [],
      badge: badge || '',
      genre: genre || 'Action',
      minPlayers: Number(minPlayers) || 1,
      maxPlayers: Number(maxPlayers) || 2,
      order: order !== undefined ? Number(order) : 50,
    });

    return res.status(201).json({
      success: true,
      message: `Game "${game.title}" added to library.`,
      data: game,
    });
  } catch (err: any) {
    console.error('Error creating game:', err);
    return res.status(500).json({ success: false, error: 'Failed to add game.' });
  }
});

// PUT /api/admin/games/:id - Update game
router.put('/games/:id', async (req: Request, res: Response) => {
  try {
    const updated = await dbService.updateGame(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Game not found.' });
    }
    return res.json({
      success: true,
      message: `Game "${updated.title}" updated successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating game:', err);
    return res.status(500).json({ success: false, error: 'Failed to update game.' });
  }
});

// DELETE /api/admin/games/:id - Delete game
router.delete('/games/:id', async (req: Request, res: Response) => {
  try {
    const result = await dbService.deleteGame(req.params.id);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error || 'Game not found.' });
    }
    return res.json({
      success: true,
      message: 'Game deleted successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting game:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete game.' });
  }
});

// =========================================================================
// CONTACT & WHATSAPP SETTINGS (PROTECTED ADMIN ROUTES)
// =========================================================================

// GET /api/admin/contact-settings - Fetch current contact settings
router.get('/contact-settings', async (_req: Request, res: Response) => {
  try {
    const settings = await dbService.getContactSettings();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (err: any) {
    console.error('Error fetching contact settings in admin route:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch contact settings.' });
  }
});

// PUT /api/admin/contact-settings - Update contact settings with validation & MongoDB persistence
router.put('/contact-settings', async (req: Request, res: Response) => {
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
    console.error('Error updating contact settings in admin route:', err);
    return res.status(500).json({ success: false, error: 'Failed to update contact settings.' });
  }
});

export default router;
