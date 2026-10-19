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
      'Gio ID',
      'Player ID',
      'Name',
      'Gamer Tag',
      'Phone',
      'Email',
      'Acquisition Sources',
      'Membership Tier',
      'Status',
      'Tournaments Played',
      'Tournament Wins',
      'Total Bookings',
      'Completed Bookings',
      'Total Hours Played',
      'Total Spend (INR)',
      'Loyalty Points',
      'First Visit',
      'Last Visit',
      'Last Activity',
      'Tags',
      'Created At',
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = players.map((p) => [
      escapeCsv(p.gioId || ''),
      escapeCsv(p.id),
      escapeCsv(p.name),
      escapeCsv(p.gamerTag),
      escapeCsv(p.phone),
      escapeCsv(p.email || 'Not provided'),
      escapeCsv(p.sources && p.sources.length > 0 ? p.sources.join('; ') : p.source || 'player_registration'),
      escapeCsv(p.membershipTier.toUpperCase()),
      escapeCsv(p.status.toUpperCase()),
      p.stats.tournamentCount || 0,
      p.stats.tournamentWins || 0,
      p.stats.bookingsCount || 0,
      p.stats.completedBookingsCount || 0,
      p.stats.totalHoursPlayed || 0,
      p.stats.totalSpend || 0,
      p.loyalty.pointsBalance || 0,
      escapeCsv(p.stats.firstVisitDate || ''),
      escapeCsv(p.stats.lastVisitDate || ''),
      escapeCsv(p.stats.lastActivityDate || ''),
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
    const report = await dbService.reconcileHistoricalData();
    return res.json({
      success: true,
      message: `Historical backfill completed. Synced ${report.totalSyncedPlayers} player profile(s).`,
      data: { syncedPlayersCount: report.totalSyncedPlayers, report },
    });
  } catch (err: any) {
    console.error('Error running historical backfill:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete historical backfill.' });
  }
});

// 2b. POST /api/admin/players/reconcile - Comprehensive safe historical reconciliation
router.post('/reconcile', async (_req: Request, res: Response) => {
  try {
    const report = await dbService.reconcileHistoricalData();
    return res.json({
      success: true,
      message: `Historical reconciliation complete. Processed ${report.bookingsProcessed} bookings and ${report.tournamentsProcessed} tournament registrations. Synced ${report.totalSyncedPlayers} player profile(s).`,
      data: report,
    });
  } catch (err: any) {
    console.error('Error running historical reconciliation:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete historical reconciliation.' });
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

// 3b. Loyalty Rules endpoints
router.get('/loyalty/rules', async (_req: Request, res: Response) => {
  try {
    const rules = await dbService.getLoyaltyRules();
    return res.json({ success: true, data: rules });
  } catch (err: any) {
    console.error('Error fetching loyalty rules:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch loyalty rules.' });
  }
});

router.put('/loyalty/rules', async (req: Request, res: Response) => {
  try {
    const rules = await dbService.updateLoyaltyRules(req.body, 'Staff Admin');
    return res.json({ success: true, message: 'Loyalty rules updated successfully.', data: rules });
  } catch (err: any) {
    console.error('Error updating loyalty rules:', err);
    return res.status(400).json({ success: false, error: 'Failed to update loyalty rules.' });
  }
});

// 3c. Referrals endpoints
router.get('/referrals', async (req: Request, res: Response) => {
  try {
    const { referrerPlayerId, status, limit } = req.query;
    const referrals = await dbService.getReferrals({
      referrerPlayerId: typeof referrerPlayerId === 'string' ? referrerPlayerId : undefined,
      status: typeof status === 'string' ? status : undefined,
      limit: limit ? parseInt(String(limit), 10) : 100,
    });
    return res.json({ success: true, data: referrals });
  } catch (err: any) {
    console.error('Error fetching referrals:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch referrals.' });
  }
});

router.get('/referrals/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    const leaderboard = await dbService.getReferralLeaderboard(limit);
    return res.json({ success: true, data: leaderboard });
  } catch (err: any) {
    console.error('Error fetching referral leaderboard:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch referral leaderboard.' });
  }
});

router.patch('/referrals/:id', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const referral = await dbService.updateReferralStatus(req.params.id, status, notes);
    if (!referral) {
      return res.status(404).json({ success: false, error: 'Referral not found.' });
    }
    return res.json({ success: true, message: 'Referral updated.', data: referral });
  } catch (err: any) {
    console.error('Error updating referral:', err);
    return res.status(400).json({ success: false, error: 'Failed to update referral.' });
  }
});

// 3d. Reminders management endpoints (global list)
router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const { status, playerId } = req.query;
    const reminders = await dbService.getAdminReminders({
      status: typeof status === 'string' ? status : undefined,
      playerId: typeof playerId === 'string' ? playerId : undefined,
    });
    return res.json({ success: true, data: reminders });
  } catch (err: any) {
    console.error('Error fetching admin reminders:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reminders.' });
  }
});

router.post('/reminders', async (req: Request, res: Response) => {
  try {
    const reminder = await dbService.createAdminReminder(req.body);
    return res.status(201).json({ success: true, message: 'Reminder created.', data: reminder });
  } catch (err: any) {
    console.error('Error creating admin reminder:', err);
    return res.status(400).json({ success: false, error: 'Failed to create reminder.' });
  }
});

router.patch('/reminders/:reminderId', async (req: Request, res: Response) => {
  try {
    const reminder = await dbService.updateAdminReminder(req.params.reminderId, req.body);
    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found.' });
    }
    return res.json({ success: true, message: 'Reminder updated.', data: reminder });
  } catch (err: any) {
    console.error('Error updating admin reminder:', err);
    return res.status(400).json({ success: false, error: 'Failed to update reminder.' });
  }
});

router.delete('/reminders/:reminderId', async (req: Request, res: Response) => {
  try {
    const success = await dbService.deleteAdminReminder(req.params.reminderId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Reminder not found.' });
    }
    return res.json({ success: true, message: 'Reminder deleted.' });
  } catch (err: any) {
    console.error('Error deleting admin reminder:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete reminder.' });
  }
});

// 3e. Automation Events endpoints
router.get('/automation-events', async (req: Request, res: Response) => {
  try {
    const { status, limit } = req.query;
    const events = await dbService.getAutomationEvents({
      status: typeof status === 'string' ? status : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
    });
    return res.json({ success: true, data: events });
  } catch (err: any) {
    console.error('Error fetching automation events:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch automation events.' });
  }
});

router.post('/automation-events/:id/retry', async (req: Request, res: Response) => {
  try {
    const event = await dbService.retryAutomationEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Automation event not found.' });
    }
    return res.json({ success: true, message: 'Automation event queued for retry.', data: event });
  } catch (err: any) {
    console.error('Error retrying automation event:', err);
    return res.status(500).json({ success: false, error: 'Failed to retry automation event.' });
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
    console.error('Error adjusting loyalty:', err);
    return res.status(500).json({ success: false, error: 'Failed to adjust loyalty points.' });
  }
});

// 15. POST /api/admin/players/:id/communication - Log communication (e.g. WhatsApp opened)
router.post('/:id/communication', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { channel, templateName, messagePreview, sentBy } = req.body;

    const log = await dbService.logCommunication({
      playerId: id,
      channel: channel || 'whatsapp',
      templateName: templateName || 'Custom Message',
      messagePreview: messagePreview || '',
      sentBy: sentBy || 'Staff Admin',
      status: 'opened',
    });

    return res.status(201).json({
      success: true,
      message: 'Communication event logged.',
      data: log,
    });
  } catch (err: any) {
    console.error('Error logging communication:', err);
    return res.status(500).json({ success: false, error: 'Failed to log communication.' });
  }
});

// 16. GET /api/admin/players/:id/communication - Get communication history
router.get('/:id/communication', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await dbService.getCommunicationLogs(id);
    return res.json({ success: true, data: logs });
  } catch (err: any) {
    console.error('Error fetching communication logs:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch communication logs.' });
  }
});

export default router;
