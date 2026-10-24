import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { getNowInKolkata } from '../utils/timezone';
import { Tournament } from '../types';
import { tournamentRegistrationLimiter } from '../middleware/security';

const router = Router();

/**
 * Computes authoritative real-time registration and tournament status based on Asia/Kolkata clock
 */
export function computeTournamentStatus(t: Tournament): {
  computedStatus: 'draft' | 'upcoming_registration' | 'registration_open' | 'waitlist_open' | 'registration_closed' | 'sold_out' | 'live' | 'completed' | 'cancelled';
  statusLabel: string;
  isRegistrationAllowed: boolean;
  isWaitlistAllowed: boolean;
  spotsRemaining: number;
} {
  const spotsRemaining = Math.max(0, t.maxCapacity - (t.confirmedCount || 0));

  if (t.status === 'cancelled') {
    return {
      computedStatus: 'cancelled',
      statusLabel: 'Tournament Cancelled',
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining: 0,
    };
  }

  if (t.status === 'completed') {
    return {
      computedStatus: 'completed',
      statusLabel: 'Completed',
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining: 0,
    };
  }

  if (t.status === 'live') {
    return {
      computedStatus: 'live',
      statusLabel: 'Live Matches Ongoing',
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining: 0,
    };
  }

  if (t.status === 'draft') {
    return {
      computedStatus: 'draft',
      statusLabel: 'Draft',
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining,
    };
  }

  // Evaluate time window for published tournament
  const now = getNowInKolkata();
  const currentStamp = `${now.dateStr}T${now.timeStr}`;
  const openStamp = `${t.registrationOpeningDate}T${t.registrationOpeningTime || '00:00'}`;
  const deadlineStamp = `${t.registrationDeadlineDate}T${t.registrationDeadlineTime || '23:59'}`;

  if (currentStamp < openStamp) {
    return {
      computedStatus: 'upcoming_registration',
      statusLabel: `Opens on ${t.registrationOpeningDate}`,
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining,
    };
  }

  if (currentStamp > deadlineStamp) {
    return {
      computedStatus: 'registration_closed',
      statusLabel: 'Registration Closed',
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining,
    };
  }

  if (spotsRemaining === 0) {
    if (t.waitlistEnabled && (t.waitlistCapacity === 0 || (t.waitlistCount || 0) < t.waitlistCapacity)) {
      return {
        computedStatus: 'waitlist_open',
        statusLabel: 'Waitlist Open',
        isRegistrationAllowed: true,
        isWaitlistAllowed: true,
        spotsRemaining: 0,
      };
    }
    return {
      computedStatus: 'sold_out',
      statusLabel: 'Fully Booked',
      isRegistrationAllowed: false,
      isWaitlistAllowed: false,
      spotsRemaining: 0,
    };
  }

  return {
    computedStatus: 'registration_open',
    statusLabel: `${spotsRemaining} Spot${spotsRemaining === 1 ? '' : 's'} Remaining`,
    isRegistrationAllowed: true,
    isWaitlistAllowed: false,
    spotsRemaining,
  };
}

// GET /api/tournaments - Public list of published tournaments
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status, search, featured } = req.query;

    const tournaments = await dbService.getTournaments({
      gameCategory: category ? String(category) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      isFeatured: featured === 'true' ? true : undefined,
      includeDrafts: false,
    });

    const enriched = tournaments.map((t) => {
      const statusInfo = computeTournamentStatus(t);
      return {
        ...t,
        ...statusInfo,
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error('Error listing public tournaments:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tournaments.' });
  }
});

// GET /api/tournaments/:slug - Public single tournament details
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    let tournament = await dbService.getTournamentBySlug(slug);
    if (!tournament) {
      tournament = await dbService.getTournamentById(slug);
    }

    if (!tournament || tournament.status === 'draft') {
      return res.status(404).json({ success: false, error: 'Tournament not found or not published.' });
    }

    const statusInfo = computeTournamentStatus(tournament);

    return res.json({
      success: true,
      data: {
        ...tournament,
        ...statusInfo,
      },
    });
  } catch (err: any) {
    console.error('Error fetching tournament details:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch tournament.' });
  }
});

// POST /api/tournaments/:slug/register - Submit tournament registration with rate limiting
router.post('/:slug/register', tournamentRegistrationLimiter, async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const { participantName, phone, email, inGameId, teamName, teammates, notes, rulesAccepted } = req.body;

    if (!participantName || !phone) {
      return res.status(400).json({ success: false, error: 'Full name and mobile number are required.' });
    }

    if (!rulesAccepted) {
      return res.status(400).json({ success: false, error: 'You must accept the tournament rules to register.' });
    }

    const result = await dbService.registerForTournament(slug, {
      participantName,
      phone,
      email,
      inGameId,
      teamName,
      teammates,
      notes,
      rulesAccepted: Boolean(rulesAccepted),
    });

    return res.status(201).json({
      success: true,
      message:
        result.registration.status === 'waitlisted'
          ? 'You have been placed on the official tournament waitlist.'
          : result.registration.status === 'pending_approval'
          ? 'Registration received and pending venue approval.'
          : 'Registration confirmed successfully!',
      data: {
        registration: {
          id: result.registration.id,
          registrationReference: result.registration.registrationReference,
          accessToken: result.registration.accessToken,
          participantName: result.registration.participantName,
          status: result.registration.status,
          tournamentId: result.registration.tournamentId,
          tournamentSlug: result.registration.tournamentSlug,
          createdAt: result.registration.createdAt,
        },
        tournament: {
          id: result.tournament.id,
          title: result.tournament.title,
          slug: result.tournament.slug,
          startDate: result.tournament.startDate,
          startTime: result.tournament.startTime,
          venue: result.tournament.venue,
          entryFeePaise: result.tournament.entryFeePaise,
        },
      },
    });
  } catch (err: any) {
    console.error('Error registering for tournament:', err);
    return res.status(400).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

// GET /api/tournaments/:slug/registration/:registrationId - Secure registration confirmation lookup
router.get('/:slug/registration/:registrationId', async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.params;
    const token = req.query.token as string;
    const adminPasscode = req.headers['x-admin-passcode'] || req.query.passcode;

    // Check if authorized admin
    let isAdmin = false;
    if (adminPasscode) {
      const activePasscode = await dbService.getAdminPasscode();
      isAdmin = adminPasscode === activePasscode;
    }

    let record: { registration: any; tournament: any } | null = null;

    if (token) {
      record = await dbService.getRegistrationByAccessToken(registrationId, token);
    } else if (isAdmin) {
      const reg = await dbService.getRegistrationById(registrationId);
      if (reg) {
        const tourn = await dbService.getTournamentById(reg.tournamentId);
        if (tourn) record = { registration: reg, tournament: tourn };
      }
    }

    if (!record) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Valid secure access token or admin passcode is required to view this registration.',
      });
    }

    return res.json({
      success: true,
      data: {
        registration: record.registration,
        tournament: {
          id: record.tournament.id,
          title: record.tournament.title,
          slug: record.tournament.slug,
          gameTitle: record.tournament.gameTitle,
          format: record.tournament.format,
          startDate: record.tournament.startDate,
          startTime: record.tournament.startTime,
          venue: record.tournament.venue,
          entryFeePaise: record.tournament.entryFeePaise,
          prizePoolDetails: record.tournament.prizePoolDetails,
          rules: record.tournament.rules,
          scheduleInstructions: record.tournament.scheduleInstructions,
          bannerImage: record.tournament.bannerImage,
        },
      },
    });
  } catch (err: any) {
    console.error('Error retrieving registration confirmation:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve confirmation.' });
  }
});

// GET /api/tournaments/:slug/results - Public published results for a tournament
router.get('/:slug/results', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    let tournament = await dbService.getTournamentBySlug(slug);
    if (!tournament) {
      tournament = await dbService.getTournamentById(slug);
    }

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found.' });
    }

    const results = await dbService.getTournamentResults(tournament.id);
    if (!results || !results.isPublished) {
      return res.status(404).json({ success: false, error: 'Results have not been published for this tournament yet.' });
    }

    return res.json({
      success: true,
      data: {
        tournament: {
          id: tournament.id,
          title: tournament.title,
          slug: tournament.slug,
          gameTitle: tournament.gameTitle,
          format: tournament.format,
          startDate: tournament.startDate,
          bannerImage: tournament.bannerImage,
          prizePoolDetails: tournament.prizePoolDetails,
        },
        results,
      },
    });
  } catch (err: any) {
    console.error('Error fetching tournament results:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve results.' });
  }
});

export default router;
