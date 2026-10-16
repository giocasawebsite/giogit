import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { PlayerQueryParams, PlayerSegment, MembershipTier, PlayerStatus } from '../types';

const router = Router();

// Protect all CRM endpoints with admin passcode authentication
router.use(requireAdminAuth);

// 1. GET /api/admin/players/export/csv - Export CSV of players
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const { search, segment, status, tier, sortBy, sortOrder } = req.query;

    const queryParams: PlayerQueryParams = {
      search: typeof search === 'string' ? search : undefined,
      segment: typeof segment === 'string' ? (segment as PlayerSegment) : undefined,
      status: typeof status === 'string' ? (status as PlayerStatus | 'all') : undefined,
      tier: typeof tier === 'string' ? (tier as MembershipTier | 'all') : undefined,
      sortBy: typeof sortBy === 'string' ? (sortBy as any) : undefined,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      page: 1,
      limit: 10000, // Export all matching
    };

    const { players } = await dbService.getPlayers(queryParams);

    // CSV header row
    const headers = [
      'Player ID',
      'Name',
      'Gamer Tag',
      'Phone',
      'Email',
      'Favorite Game',
      'Platform',
      'Membership Tier',
      'Status',
      'Tournaments Played',
      'Tournament Wins',
      'Gaming Bookings',
      'Total Hours Played',
      'Total Spend (INR)',
      'Loyalty Points',
      'First Visit',
      'Last Visit',
      'Tags',
      'Created At',
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = players.map((p) => [
      escapeCsv(p.id),
      escapeCsv(p.name),
      escapeCsv(p.gamerTag),
      escapeCsv(p.phone),
      escapeCsv(p.email || ''),
      escapeCsv(p.favoriteGame || ''),
      escapeCsv(p.favoritePlatform || ''),
      escapeCsv(p.membershipTier.toUpperCase()),
      escapeCsv(p.status.toUpperCase()),
      p.stats.tournamentCount || 0,
      p.stats.tournamentWins || 0,
      p.stats.bookingsCount || 0,
      p.stats.totalHoursPlayed || 0,
      p.stats.totalSpend || 0,
      p.loyalty.pointsBalance || 0,
      escapeCsv(p.stats.firstVisitDate || ''),
      escapeCsv(p.stats.lastVisitDate || ''),
      escapeCsv(p.tags.join('; ')),
      escapeCsv(p.createdAt),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="giocasa_players_${dateStr}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Error exporting players to CSV:', err);
    return res.status(500).json({ success: false, error: 'Failed to export CSV.' });
  }
});

// 2. POST /api/admin/players/sync-backfill - Trigger historical data scan
router.post('/sync-backfill', async (_req: Request, res: Response) => {
  try {
    const result = await dbService.backfillHistoricalData();
    return res.json({
      success: true,
      message: `Historical backfill completed. Synced ${result.syncedPlayersCount} player profile(s).`,
      data: result,
    });
  } catch (err: any) {
    console.error('Error running historical backfill:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete historical backfill.' });
  }
});

// 3. GET /api/admin/players/loyalty/recent - Get recent loyalty transactions across all players
router.get('/loyalty/recent', async (_req: Request, res: Response) => {
  try {
    const recent = await dbService.getAllLoyaltyLedger(50);
    return res.json({ success: true, data: recent });
  } catch (err: any) {
    console.error('Error fetching recent loyalty ledger:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch recent loyalty ledger.' });
  }
});

// 4. GET /api/admin/players - Query paginated directory
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, segment, status, tier, sortBy, sortOrder, page, limit } = req.query;

    const queryParams: PlayerQueryParams = {
      search: typeof search === 'string' ? search : undefined,
      segment: typeof segment === 'string' ? (segment as PlayerSegment) : undefined,
      status: typeof status === 'string' ? (status as PlayerStatus | 'all') : undefined,
      tier: typeof tier === 'string' ? (tier as MembershipTier | 'all') : undefined,
      sortBy: typeof sortBy === 'string' ? (sortBy as any) : undefined,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 15,
    };

    const result = await dbService.getPlayers(queryParams);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Error querying players directory:', err);
    return res.status(500).json({ success: false, error: 'Failed to query players.' });
  }
});

// 5. GET /api/admin/players/:id - Full individual profile with timeline
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const profile = await dbService.getPlayerDetailedProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }
    return res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error('Error fetching player profile:', err);
    return res.status(500).json({ success: false, error: 'Failed to load player profile.' });
  }
});

// 6. POST /api/admin/players - Create new player
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      gamerTag,
      phone,
      email,
      favoriteGame,
      favoritePlatform,
      membershipTier,
      tags,
      consent,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Player name and mobile number are required.' });
    }

    const player = await dbService.createPlayer({
      name,
      gamerTag,
      phone,
      email,
      favoriteGame,
      favoritePlatform,
      membershipTier,
      tags: Array.isArray(tags) ? tags : [],
      consent,
    });

    return res.status(201).json({
      success: true,
      message: 'Player profile created successfully.',
      data: player,
    });
  } catch (err: any) {
    console.error('Error creating player profile:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to create player.' });
  }
});

// 7. PUT /api/admin/players/:id - Update player details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Never allow MongoDB _id or id modification
    delete (updates as any)._id;
    delete (updates as any).id;

    const updated = await dbService.updatePlayer(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }

    return res.json({
      success: true,
      message: 'Player profile updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating player profile:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to update player.' });
  }
});

// 8. DELETE /api/admin/players/:id - Archive player
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const archived = await dbService.archivePlayer(id);
    if (!archived) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }
    return res.json({
      success: true,
      message: 'Player profile archived successfully.',
      data: archived,
    });
  } catch (err: any) {
    console.error('Error archiving player:', err);
    return res.status(500).json({ success: false, error: 'Failed to archive player.' });
  }
});

// 9. POST /api/admin/players/:id/restore - Restore player
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const restored = await dbService.restorePlayer(id);
    if (!restored) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }
    return res.json({
      success: true,
      message: 'Player profile restored to active status.',
      data: restored,
    });
  } catch (err: any) {
    console.error('Error restoring player:', err);
    return res.status(500).json({ success: false, error: 'Failed to restore player.' });
  }
});

// 10. POST /api/admin/players/:id/notes - Add staff note
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Note text cannot be empty.' });
    }

    const note = await dbService.addPlayerNote(id, text, author || 'Admin');
    if (!note) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Staff note added.',
      data: note,
    });
  } catch (err: any) {
    console.error('Error adding staff note:', err);
    return res.status(500).json({ success: false, error: 'Failed to add staff note.' });
  }
});

// 11. DELETE /api/admin/players/:id/notes/:noteId - Delete staff note
router.delete('/:id/notes/:noteId', async (req: Request, res: Response) => {
  try {
    const { id, noteId } = req.params;
    const success = await dbService.deletePlayerNote(id, noteId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Player profile or note not found.' });
    }
    return res.json({ success: true, message: 'Note deleted.' });
  } catch (err: any) {
    console.error('Error deleting staff note:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete note.' });
  }
});

// 12. POST /api/admin/players/:id/reminders - Add follow-up reminder
router.post('/:id/reminders', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Reminder title is required.' });
    }
    if (!dueDate || !dueDate.trim()) {
      return res.status(400).json({ success: false, error: 'Due date is required.' });
    }

    const reminder = await dbService.addPlayerReminder(id, title, dueDate);
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Follow-up reminder set.',
      data: reminder,
    });
  } catch (err: any) {
    console.error('Error adding reminder:', err);
    return res.status(500).json({ success: false, error: 'Failed to add reminder.' });
  }
});

// 13. PATCH /api/admin/players/:id/reminders/:reminderId - Update reminder completion
router.patch('/:id/reminders/:reminderId', async (req: Request, res: Response) => {
  try {
    const { id, reminderId } = req.params;
    const { isCompleted } = req.body;

    const reminder = await dbService.updatePlayerReminder(id, reminderId, Boolean(isCompleted));
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Player or reminder not found.' });
    }

    return res.json({
      success: true,
      message: isCompleted ? 'Reminder marked as completed.' : 'Reminder reopened.',
      data: reminder,
    });
  } catch (err: any) {
    console.error('Error updating reminder:', err);
    return res.status(500).json({ success: false, error: 'Failed to update reminder.' });
  }
});

// 14. POST /api/admin/players/:id/loyalty - Adjust loyalty points with ledger
router.post('/:id/loyalty', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { points, type, reason, referenceId } = req.body;

    const pts = parseInt(String(points), 10);
    if (isNaN(pts) || pts === 0) {
      return res.status(400).json({ success: false, error: 'Points amount must be a non-zero number.' });
    }

    if (!type || !['earn', 'redeem', 'adjustment', 'bonus'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Valid transaction type is required (earn, redeem, adjustment, bonus).' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Reason for loyalty adjustment is required for audit.' });
    }

    const result = await dbService.adjustPlayerLoyalty(id, pts, type, reason, referenceId);
    return res.json({
      success: true,
      message: `Loyalty points updated: ${pts > 0 ? '+' : ''}${pts} pts.`,
      data: result,
    });
  } catch (err: any) {
    console.error('Error adjusting loyalty points:', err);
    return res.status(400).json({ success: false, error: err.message || 'Failed to adjust loyalty.' });
  }
});

export default router;
