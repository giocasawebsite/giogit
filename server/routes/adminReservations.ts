import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdminAuth);

// GET /api/admin/reservations/dining - List dining reservations with filters
router.get('/dining', async (req: Request, res: Response) => {
  try {
    const { status, date, search } = req.query;
    const reservations = await dbService.getDiningReservations({
      status: status ? String(status) : undefined,
      date: date ? String(date) : undefined,
      search: search ? String(search) : undefined,
    });

    const pendingCount = reservations.filter((r) => r.status === 'pending').length;
    const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;

    return res.json({
      success: true,
      data: {
        reservations,
        metrics: {
          total: reservations.length,
          pending: pendingCount,
          confirmed: confirmedCount,
        },
      },
    });
  } catch (err: any) {
    console.error('Error in admin GET /reservations/dining:', err);
    return res.status(500).json({ success: false, error: 'Failed to load dining reservations.' });
  }
});

// GET /api/admin/reservations/events - List event enquiries with filters
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { status, date, search } = req.query;
    const reservations = await dbService.getEventReservations({
      status: status ? String(status) : undefined,
      date: date ? String(date) : undefined,
      search: search ? String(search) : undefined,
    });

    const pendingCount = reservations.filter((r) => r.status === 'pending').length;
    const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;

    return res.json({
      success: true,
      data: {
        reservations,
        metrics: {
          total: reservations.length,
          pending: pendingCount,
          confirmed: confirmedCount,
        },
      },
    });
  } catch (err: any) {
    console.error('Error in admin GET /reservations/events:', err);
    return res.status(500).json({ success: false, error: 'Failed to load event enquiries.' });
  }
});

// GET /api/admin/reservations/dining/:id
router.get('/dining/:id', async (req: Request, res: Response) => {
  try {
    const reservation = await dbService.getDiningReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Dining reservation not found.' });
    }
    return res.json({ success: true, data: reservation });
  } catch (err: any) {
    console.error('Error in admin GET /reservations/dining/:id:', err);
    return res.status(500).json({ success: false, error: 'Failed to load dining reservation.' });
  }
});

// GET /api/admin/reservations/events/:id
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const reservation = await dbService.getEventReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Event enquiry not found.' });
    }
    return res.json({ success: true, data: reservation });
  } catch (err: any) {
    console.error('Error in admin GET /reservations/events/:id:', err);
    return res.status(500).json({ success: false, error: 'Failed to load event enquiry.' });
  }
});

// PATCH /api/admin/reservations/dining/:id - Update status, admin notes, etc.
router.patch('/dining/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updated = await dbService.updateDiningReservation(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dining reservation not found.' });
    }

    return res.json({
      success: true,
      message: `Dining reservation #${updated.reference} updated successfully (${updated.status}).`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating dining reservation:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update dining reservation.' });
  }
});

// PATCH /api/admin/reservations/events/:id - Update status, admin notes, etc.
router.patch('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updated = await dbService.updateEventReservation(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Event enquiry not found.' });
    }

    return res.json({
      success: true,
      message: `Event enquiry #${updated.reference} updated successfully (${updated.status}).`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating event enquiry:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update event enquiry.' });
  }
});

// DELETE /api/admin/reservations/dining/:id - Permanent deletion upon explicit confirmed request
router.delete('/dining/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await dbService.deleteDiningReservation(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Dining reservation not found.' });
    }
    return res.json({ success: true, message: 'Dining reservation record permanently deleted.' });
  } catch (err: any) {
    console.error('Error deleting dining reservation:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete dining reservation.' });
  }
});

// DELETE /api/admin/reservations/events/:id - Permanent deletion upon explicit confirmed request
router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await dbService.deleteEventReservation(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Event enquiry not found.' });
    }
    return res.json({ success: true, message: 'Event enquiry record permanently deleted.' });
  } catch (err: any) {
    console.error('Error deleting event enquiry:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete event enquiry.' });
  }
});

export default router;
