import express, { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { Tournament, TournamentRegistration, HallOfFameEntry, TournamentResult } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../public/assets/uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const router = Router();

// Secure all admin tournament routes
router.use(requireAdminAuth);

// ==========================================
// TOURNAMENT CRUD & STATS
// ==========================================

// GET /api/admin/tournaments - List all tournaments + admin summary metrics
router.get('/tournaments', async (_req: Request, res: Response) => {
  try {
    const tournaments = await dbService.getTournaments({ includeDrafts: true });

    let totalPublished = 0;
    let totalDrafts = 0;
    let totalLive = 0;
    let totalCompleted = 0;
    let totalRegistrations = 0;

    for (const t of tournaments) {
      if (t.status === 'published') totalPublished++;
      else if (t.status === 'draft') totalDrafts++;
      else if (t.status === 'live') totalLive++;
      else if (t.status === 'completed') totalCompleted++;

      totalRegistrations += (t.confirmedCount || 0) + (t.waitlistCount || 0);
    }

    return res.json({
      success: true,
      data: {
        tournaments,
        metrics: {
          totalTournaments: tournaments.length,
          totalPublished,
          totalDrafts,
          totalLive,
          totalCompleted,
          totalRegistrations,
        },
      },
    });
  } catch (err: any) {
    console.error('Error in admin GET /tournaments:', err);
    return res.status(500).json({ success: false, error: 'Failed to load tournaments.' });
  }
});

// POST /api/admin/tournaments - Create new tournament
router.post('/tournaments', async (req: Request, res: Response) => {
  try {
    const tournament = await dbService.createTournament(req.body);
    return res.status(201).json({
      success: true,
      message: `Tournament "${tournament.title}" created successfully.`,
      data: tournament,
    });
  } catch (err: any) {
    console.error('Error in admin POST /tournaments:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create tournament.' });
  }
});

// GET /api/admin/tournaments/:id - Get tournament by ID
router.get('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const tournament = await dbService.getTournamentById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }
    return res.json({ success: true, data: tournament });
  } catch (err: any) {
    console.error('Error in admin GET /tournaments/:id:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tournament.' });
  }
});

// PUT /api/admin/tournaments/:id - Update tournament
router.put('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const updated = await dbService.updateTournament(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }
    return res.json({
      success: true,
      message: `Tournament "${updated.title}" updated successfully.`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error in admin PUT /tournaments/:id:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update tournament.' });
  }
});

// DELETE /api/admin/tournaments/:id - Delete or cancel tournament
router.delete('/tournaments/:id', async (req: Request, res: Response) => {
  try {
    const ok = await dbService.deleteTournament(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }
    return res.json({ success: true, message: 'Tournament deleted/cancelled successfully.' });
  } catch (err: any) {
    console.error('Error in admin DELETE /tournaments/:id:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete tournament.' });
  }
});

// ==========================================
// REGISTRATION MANAGEMENT & CSV EXPORT
// ==========================================

// GET /api/admin/tournaments/:id/registrations - List registrations for a tournament
router.get('/tournaments/:id/registrations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, search } = req.query;

    const tournament = await dbService.getTournamentById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }

    const registrations = await dbService.getTournamentRegistrations(id, {
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });

    return res.json({
      success: true,
      data: {
        tournament,
        registrations,
        counts: {
          total: registrations.length,
          confirmed: registrations.filter((r) => r.status === 'confirmed').length,
          waitlisted: registrations.filter((r) => r.status === 'waitlisted').length,
          checkedIn: registrations.filter((r) => r.status === 'checked_in').length,
          pending: registrations.filter((r) => r.status === 'pending_approval').length,
        },
      },
    });
  } catch (err: any) {
    console.error('Error in admin GET /tournaments/:id/registrations:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch registrations.' });
  }
});

// PATCH /api/admin/tournaments/:id/registrations/:regId - Update participant registration
router.patch('/tournaments/:id/registrations/:regId', async (req: Request, res: Response) => {
  try {
    const { regId } = req.params;
    const updates = req.body;

    const updated = await dbService.updateRegistration(regId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Registration not found.' });
    }

    return res.json({
      success: true,
      message: `Participant registration updated (${updated.status}).`,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error in admin PATCH registration:', err);
    return res.status(500).json({ success: false, error: 'Failed to update registration.' });
  }
});

// GET /api/admin/tournaments/:id/registrations/export - Export registrations to CSV
router.get('/tournaments/:id/registrations/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tournament = await dbService.getTournamentById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }

    const registrations = await dbService.getTournamentRegistrations(id);

    // Build CSV
    const headers = [
      'Registration Reference',
      'Participant Name',
      'Phone',
      'Email',
      'In-Game ID',
      'Team Name',
      'Status',
      'Payment Status',
      'Registered At (IST)',
      'Notes',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const rows = registrations.map((r) => [
      escapeCsv(r.registrationReference),
      escapeCsv(r.participantName),
      escapeCsv(r.phone),
      escapeCsv(r.email),
      escapeCsv(r.inGameId),
      escapeCsv(r.teamName),
      escapeCsv(r.status),
      escapeCsv(r.paymentStatus),
      escapeCsv(r.createdAt),
      escapeCsv(r.notes),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const filename = `giocasa_tournament_${tournament.slug}_registrations.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Error exporting registrations to CSV:', err);
    return res.status(500).json({ success: false, error: 'Failed to export registrations.' });
  }
});

// ==========================================
// TOURNAMENT RESULTS & STANDINGS
// ==========================================

// GET /api/admin/tournaments/:id/results - Get tournament results
router.get('/tournaments/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tournament = await dbService.getTournamentById(id);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }

    const results = await dbService.getTournamentResults(id);
    return res.json({
      success: true,
      data: {
        tournament,
        results: results || {
          tournamentId: tournament.id,
          tournamentSlug: tournament.slug,
          isPublished: false,
          summary: '',
          standings: [],
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching results in admin:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tournament results.' });
  }
});

// PUT /api/admin/tournaments/:id/results - Update/publish tournament results
router.put('/tournaments/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const results = await dbService.saveTournamentResults(id, req.body);
    return res.json({
      success: true,
      message: results.isPublished ? 'Results published to public arena!' : 'Results saved as draft.',
      data: results,
    });
  } catch (err: any) {
    console.error('Error saving tournament results:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to save results.' });
  }
});

// POST /api/admin/tournaments/:id/results/publish-to-hall-of-fame - Promote champion to Hall of Fame
router.post('/tournaments/:id/results/publish-to-hall-of-fame', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = await dbService.publishResultsToHallOfFame(id);
    return res.json({
      success: true,
      message: `Champion "${entry?.playerName}" published to GioCasa Hall of Fame!`,
      data: entry,
    });
  } catch (err: any) {
    console.error('Error publishing to Hall of Fame:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to publish to Hall of Fame.' });
  }
});

// ==========================================
// HALL OF FAME CRUD
// ==========================================

// GET /api/admin/hall-of-fame - List all Hall of Fame entries
router.get('/hall-of-fame', async (_req: Request, res: Response) => {
  try {
    const entries = await dbService.getHallOfFame({ publishedOnly: false });
    return res.json({ success: true, data: entries });
  } catch (err: any) {
    console.error('Error listing Hall of Fame in admin:', err);
    return res.status(500).json({ success: false, error: 'Failed to load Hall of Fame entries.' });
  }
});

// POST /api/admin/hall-of-fame - Create Hall of Fame entry
router.post('/hall-of-fame', async (req: Request, res: Response) => {
  try {
    const entry = await dbService.createHallOfFameEntry(req.body);
    return res.status(201).json({
      success: true,
      message: `Hall of Fame entry for "${entry.playerName}" created.`,
      data: entry,
    });
  } catch (err: any) {
    console.error('Error creating Hall of Fame entry:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create Hall of Fame entry.' });
  }
});

// PUT /api/admin/hall-of-fame/:id - Update Hall of Fame entry
router.put('/hall-of-fame/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, error: 'Valid Hall of Fame entry ID is required.' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, error: 'Request body must be a valid JSON object.' });
    }

    // Schema validation for editable fields if supplied
    if ('playerName' in body) {
      if (typeof body.playerName !== 'string' || !body.playerName.trim()) {
        return res.status(400).json({ success: false, error: 'Winner / Player name cannot be empty.' });
      }
    }
    if ('gameTitle' in body) {
      if (typeof body.gameTitle !== 'string' || !body.gameTitle.trim()) {
        return res.status(400).json({ success: false, error: 'Game title cannot be empty.' });
      }
    }
    if ('eventDate' in body) {
      if (typeof body.eventDate !== 'string' || !body.eventDate.trim()) {
        return res.status(400).json({ success: false, error: 'Event date cannot be empty.' });
      }
    }
    if ('order' in body) {
      if (typeof body.order !== 'number' || isNaN(body.order)) {
        return res.status(400).json({ success: false, error: 'Order must be a valid number.' });
      }
    }

    // Whitelist only allowed editable fields from the schema.
    // Explicitly exclude database-managed fields: _id, id, __v, createdAt, updatedAt
    const allowedFields = [
      'tournamentId',
      'tournamentTitle',
      'tournamentSlug',
      'playerName',
      'teamName',
      'award',
      'gameTitle',
      'gameCategory',
      'season',
      'eventDate',
      'scoreDescription',
      'photoUrl',
      'isFeatured',
      'isPublished',
      'order',
    ] as const;

    const sanitizedUpdates: Partial<HallOfFameEntry> = {};
    for (const field of allowedFields) {
      if (field in body && body[field] !== undefined) {
        if (field === 'playerName') {
          sanitizedUpdates.playerName = body.playerName.trim();
        } else if (field === 'isFeatured') {
          sanitizedUpdates.isFeatured = Boolean(body.isFeatured);
        } else if (field === 'isPublished') {
          sanitizedUpdates.isPublished = Boolean(body.isPublished);
        } else if (field === 'order') {
          sanitizedUpdates.order = Number(body.order);
        } else {
          (sanitizedUpdates as any)[field] = body[field];
        }
      }
    }

    const updated = await dbService.updateHallOfFameEntry(id.trim(), sanitizedUpdates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Hall of Fame entry not found.' });
    }
    return res.json({
      success: true,
      message: 'Hall of Fame entry updated.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating Hall of Fame entry:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update entry.' });
  }
});

// DELETE /api/admin/hall-of-fame/:id - Delete Hall of Fame entry
router.delete('/hall-of-fame/:id', async (req: Request, res: Response) => {
  try {
    const ok = await dbService.deleteHallOfFameEntry(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Entry not found.' });
    }
    return res.json({ success: true, message: 'Hall of Fame entry removed.' });
  } catch (err: any) {
    console.error('Error deleting Hall of Fame entry:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete entry.' });
  }
});

// ==========================================
// IMAGE UPLOAD HANDLER
// ==========================================

// POST /api/admin/uploads - Upload banner or winner portrait (base64 data URI or raw JSON)
router.post('/uploads', express.json({ limit: '6mb' }), async (req: Request, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Image base64 data is required.' });
    }

    // Match data URI pattern: data:image/(png|jpeg|jpg|webp);base64,...
    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format. Must be a base64 image data URI (PNG, JPEG, WEBP).',
      });
    }

    const mimeExt = matches[1].toLowerCase().replace('jpeg', 'jpg');
    const allowedExts = ['png', 'jpg', 'webp'];
    if (!allowedExts.includes(mimeExt)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported image type. Only PNG, JPEG, and WEBP are permitted.',
      });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    // Max 5MB size limit
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum permitted limit of 5MB.',
      });
    }

    const safeFilename = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${mimeExt}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/assets/uploads/${safeFilename}`;
    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        url: publicUrl,
        filename: safeFilename,
        sizeBytes: buffer.length,
      },
    });
  } catch (err: any) {
    console.error('Error uploading image in admin:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload image.' });
  }
});

export default router;
