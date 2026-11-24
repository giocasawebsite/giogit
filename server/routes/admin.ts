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
  validateAdminRefreshToken,
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
        refreshToken: session.refreshToken,
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
          refreshToken: session.refreshToken,
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

// POST /api/admin/refresh - Exchange a valid refresh token for fresh access & refresh tokens
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const refreshToken = (
      req.body?.refreshToken ||
      bearerToken ||
      req.headers['x-admin-refresh-token']
    ) as string;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required.',
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    const sessionVersion = await dbService.getSessionVersion();
    const isValid = validateAdminRefreshToken(refreshToken, sessionVersion);

    if (!isValid) {
      logSecurityEvent('AUTH_FAILURE', req, 'Invalid, expired, or revoked admin refresh token');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session expired or revoked. Please log in again.',
        code: 'SESSION_REVOKED',
      });
    }

    // Single-use token rotation: Invalidate previous refresh token
    invalidateAdminSession(refreshToken, req);

    // Issue fresh access token and fresh refresh token
    const newSession = createAdminSession(req, sessionVersion);
    return res.json({
      success: true,
      message: 'Admin session refreshed successfully.',
      data: {
        token: newSession.token,
        refreshToken: newSession.refreshToken,
        expiresAt: newSession.expiresAt,
      },
    });
  } catch (err: any) {
    console.error('Error in admin session refresh:', err);
    return res.status(500).json({ success: false, error: 'Failed to refresh session.' });
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

  const refreshToken = (
    req.headers['x-admin-refresh-token'] ||
    req.body?.refreshToken
  ) as string;

  if (token) {
    invalidateAdminSession(token, req);
  }
  if (refreshToken) {
    invalidateAdminSession(refreshToken, req);
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
        refreshToken: session.refreshToken,
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
      return res.status(400).json({ success: false, error: 'Missing required booking fields (customerName, phone, resourceId, date, startTime).' });
    }

    const resource = await dbService.getResourceById(body.resourceId);
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found.' });
    }

    const startMins = timeToMinutes(body.startTime);
    let endMins: number;
    let endTime: string;
    let durationMinutes: number;

    // Support admin custom end time selection (e.g. 14:15 to 14:45)
    if (body.endTime) {
      endMins = timeToMinutes(body.endTime);
      if (endMins <= startMins) {
        return res.status(400).json({ success: false, error: 'End time must be strictly after start time.' });
      }
      durationMinutes = endMins - startMins;
      endTime = body.endTime;
    } else {
      durationMinutes = body.durationMinutes || 60;
      endMins = startMins + durationMinutes;
      endTime = minutesToTime(endMins);
    }

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
      numberOfPeople,
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

// POST /api/admin/bookings/:id/start-play (and /start-session) - Mark gaming session started
router.post(['/bookings/:id/start-play', '/bookings/:id/start-session'], async (req: Request, res: Response) => {
  try {
    const booking = await dbService.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    if (booking.status === 'active' || booking.actualStartTime) {
      return res.status(400).json({
        success: false,
        error: `Session has already been started at ${booking.actualStartTime || booking.sessionStartedAt || 'earlier time'}.`,
      });
    }

    if (['cancelled', 'completed', 'expired'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot start play on a ${booking.status} booking.`,
      });
    }

    const nowIso = new Date().toISOString();
    const adminUser = (req as any).adminUser || 'Admin Staff';

    const auditLog: any = {
      action: 'STATUS_CHANGE',
      timestamp: nowIso,
      performedBy: adminUser,
      details: `Gaming session started. Customer checked in for live play.`,
    };

    const existingLogs = Array.isArray(booking.auditLogs) ? booking.auditLogs : [];

    const updates: Partial<Booking> = {
      status: 'active',
      actualStartTime: nowIso,
      sessionStartedAt: nowIso,
      sessionStartedBy: adminUser,
      checkInStatus: 'checked_in',
      checkedInAt: booking.checkedInAt || nowIso,
      checkedInBy: booking.checkedInBy || adminUser,
      auditLogs: [...existingLogs, auditLog],
    };

    const updated = await dbService.updateBooking(booking.id, updates);
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Failed to update session start state.' });
    }

    return res.json({
      success: true,
      message: `Gaming session started for #${booking.id} (${booking.customerName}).`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error starting session:', err);
    return res.status(500).json({ success: false, error: 'Failed to start gaming session.' });
  }
});

// POST /api/admin/bookings/:id/end-play (and /end-session) - End active gaming session
router.post(['/bookings/:id/end-play', '/bookings/:id/end-session'], async (req: Request, res: Response) => {
  try {
    const booking = await dbService.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    if (booking.status === 'completed' || booking.actualEndTime || booking.sessionEndedAt) {
      return res.status(400).json({
        success: false,
        error: `Session has already ended (duration: ${booking.actualPlayDurationMinutes || 0} mins).`,
      });
    }

    if (booking.status !== 'active' && !booking.actualStartTime) {
      return res.status(400).json({
        success: false,
        error: 'Cannot end a session that has not started yet. Please click Start Play first.',
      });
    }

    const nowIso = new Date().toISOString();
    const adminUser = (req as any).adminUser || 'Admin Staff';

    // Calculate actual play duration in minutes
    const startTimeMs = booking.sessionStartedAt
      ? new Date(booking.sessionStartedAt).getTime()
      : booking.actualStartTime
      ? new Date(booking.actualStartTime).getTime()
      : Date.now();
    const actualDurationMins = Math.max(1, Math.round((Date.now() - startTimeMs) / 60000));

    const auditLog: any = {
      action: 'STATUS_CHANGE',
      timestamp: nowIso,
      performedBy: adminUser,
      details: `Gaming session ended. Actual play duration: ${actualDurationMins} minutes.`,
    };

    const existingLogs = Array.isArray(booking.auditLogs) ? booking.auditLogs : [];

    const updates: Partial<Booking> = {
      status: 'completed',
      actualEndTime: nowIso,
      sessionEndedAt: nowIso,
      sessionEndedBy: adminUser,
      actualPlayDurationMinutes: actualDurationMins,
      auditLogs: [...existingLogs, auditLog],
    };

    const updated = await dbService.updateBooking(booking.id, updates);
    if (!updated) {
      return res.status(500).json({ success: false, error: 'Failed to update session end state.' });
    }

    return res.json({
      success: true,
      message: `Gaming session ended. Actual play duration: ${actualDurationMins} mins.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error ending session:', err);
    return res.status(500).json({ success: false, error: 'Failed to end gaming session.' });
  }
});

// PUT & PATCH /api/admin/bookings/:id - Complete booking editing with conflict validation & audit trail
router.all('/bookings/:id', async (req: Request, res: Response, next) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return next();
  }

  try {
    const {
      customerName,
      phone,
      email,
      resourceId,
      date,
      startTime,
      endTime,
      durationMinutes,
      totalAmount,
      status,
      paymentStatus,
      paymentMethod,
      paymentReference,
      notes,
    } = req.body;

    const existing = await dbService.getBookingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const updates: Partial<Booking> = {};
    const changesSummary: string[] = [];

    // 1. Customer Details
    if (customerName !== undefined) {
      const cleanName = customerName.trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ success: false, error: 'Customer name must have at least 2 characters.' });
      }
      if (cleanName !== existing.customerName) {
        updates.customerName = cleanName;
        changesSummary.push(`Name: '${existing.customerName}' → '${cleanName}'`);
      }
    }

    if (phone !== undefined) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'Phone must be a valid 10-digit number.' });
      }
      if (cleanPhone !== existing.phone) {
        updates.phone = cleanPhone;
        changesSummary.push(`Phone: '${existing.phone}' → '${cleanPhone}'`);
      }
    }

    if (email !== undefined) {
      const cleanEmail = email ? email.trim() : undefined;
      if (cleanEmail !== existing.email) {
        updates.email = cleanEmail;
        changesSummary.push(`Email updated`);
      }
    }

    // 2. Resource/Equipment
    let targetResourceId = existing.resourceId;
    if (resourceId && resourceId !== existing.resourceId) {
      const newRes = await dbService.getResourceById(resourceId);
      if (!newRes) {
        return res.status(404).json({ success: false, error: 'Specified equipment resource does not exist.' });
      }
      targetResourceId = newRes.id;
      updates.resourceId = newRes.id;
      updates.resourceName = newRes.name;
      updates.category = newRes.category;
      updates.location = newRes.floorLocation || (newRes.category === 'pool' ? '1st Floor' : 'Basement');
      changesSummary.push(`Equipment: '${existing.resourceName}' → '${newRes.name}'`);
    }

    // 3. Timing & Scheduling
    const targetDate = date || existing.date;
    const targetStart = startTime || existing.startTime;
    const targetEnd = endTime || existing.endTime;

    if (date && date !== existing.date) {
      updates.date = date;
      changesSummary.push(`Date: '${existing.date}' → '${date}'`);
    }

    const isTimingChanged =
      (startTime && startTime !== existing.startTime) ||
      (endTime && endTime !== existing.endTime) ||
      (date && date !== existing.date) ||
      (resourceId && resourceId !== existing.resourceId);

    if (isTimingChanged) {
      const startMins = timeToMinutes(targetStart);
      const endMins = timeToMinutes(targetEnd);

      if (endMins <= startMins) {
        return res.status(400).json({ success: false, error: 'End time must be strictly after start time.' });
      }

      // Check conflict against other bookings for that resource & date
      const conflict = await dbService.checkConflict(
        targetResourceId,
        targetDate,
        targetStart,
        targetEnd,
        existing.id
      );

      if (conflict.hasConflict) {
        return res.status(409).json({
          success: false,
          error: `Time conflict with existing booking #${conflict.conflictingBooking?.id} (${conflict.conflictingBooking?.startTime} – ${conflict.conflictingBooking?.endTime}).`,
        });
      }

      updates.startTime = targetStart;
      updates.endTime = targetEnd;
      const calcDuration = endMins - startMins;
      updates.durationMinutes = durationMinutes !== undefined ? Number(durationMinutes) : calcDuration;
      changesSummary.push(`Time: ${targetStart}–${targetEnd} (${updates.durationMinutes}m)`);
    } else if (durationMinutes !== undefined && durationMinutes !== existing.durationMinutes) {
      updates.durationMinutes = Number(durationMinutes);
      changesSummary.push(`Duration: ${existing.durationMinutes}m → ${durationMinutes}m`);
    }

    // 4. Financial & Pricing
    if (totalAmount !== undefined && Number(totalAmount) !== existing.totalAmount) {
      updates.totalAmount = Number(totalAmount);
      changesSummary.push(`Price: ₹${existing.totalAmount} → ₹${totalAmount}`);
    }

    if (paymentStatus && paymentStatus !== existing.paymentStatus) {
      updates.paymentStatus = paymentStatus as PaymentStatus;
      changesSummary.push(`Payment Status: '${existing.paymentStatus}' → '${paymentStatus}'`);
    }

    if (paymentMethod !== undefined) {
      updates.paymentMethod = paymentMethod;
      changesSummary.push(`Payment Method: '${paymentMethod}'`);
    }

    if (paymentReference !== undefined) {
      updates.paymentReference = paymentReference;
      changesSummary.push(`Payment Ref: '${paymentReference}'`);
    }

    // 5. Booking Status & Notes
    if (status && status !== existing.status) {
      updates.status = status as BookingStatus;
      changesSummary.push(`Status: '${existing.status}' → '${status}'`);
    }

    if (notes !== undefined && notes !== existing.notes) {
      updates.notes = notes;
      changesSummary.push('Notes updated');
    }

    // Preserve actual session timestamps — do NOT silently overwrite them
    if (existing.actualStartTime) updates.actualStartTime = existing.actualStartTime;
    if (existing.actualEndTime) updates.actualEndTime = existing.actualEndTime;
    if (existing.sessionStartedAt) updates.sessionStartedAt = existing.sessionStartedAt;
    if (existing.sessionEndedAt) updates.sessionEndedAt = existing.sessionEndedAt;
    if (existing.sessionStartedBy) updates.sessionStartedBy = existing.sessionStartedBy;
    if (existing.sessionEndedBy) updates.sessionEndedBy = existing.sessionEndedBy;
    if (existing.actualPlayDurationMinutes !== undefined) {
      updates.actualPlayDurationMinutes = existing.actualPlayDurationMinutes;
    }

    // Append audit log if any fields changed
    if (changesSummary.length > 0) {
      const nowIso = new Date().toISOString();
      const adminUser = (req as any).adminUser || 'Admin Staff';
      const auditLog: any = {
        action: 'STATUS_CHANGE',
        timestamp: nowIso,
        performedBy: adminUser,
        details: `Booking edited by admin: ${changesSummary.join(', ')}`,
      };
      const existingLogs = Array.isArray(existing.auditLogs) ? existing.auditLogs : [];
      updates.auditLogs = [...existingLogs, auditLog];
    }

    const updated = await dbService.updateBooking(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    return res.json({
      success: true,
      message: changesSummary.length > 0 ? `Booking updated: ${changesSummary.join(', ')}` : 'No changes detected.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating booking:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update booking.' });
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
