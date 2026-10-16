export type ResourceCategory = 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';

export interface GamingResource {
  id: string; // e.g. 'ps5-station-1'
  name: string; // 'PS5 Pro Station 1'
  category: ResourceCategory;
  zoneId: string; // 'ps5-arena'
  ratePerHour: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  playersCapacity: { min: number; max: number };
  active: boolean;
  isMaintenance: boolean;
  maintenanceReason?: string;
  specs: string[];
  image: string;
  order: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded';

export interface Booking {
  id: string; // 'GC-XXXXXX'
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  resourceName: string;
  category: ResourceCategory;
  date: string; // YYYY-MM-DD (Asia/Kolkata)
  startTime: string; // HH:mm in 24h (e.g. '14:00')
  endTime: string; // HH:mm in 24h (e.g. '15:00')
  durationMinutes: number;
  numberOfPeople: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  source: 'web' | 'admin' | 'phone';
  playerId?: string;
}

export type SlotStatus = 'available' | 'booked' | 'playing' | 'unavailable';

export interface TimeSlot {
  startTime: string; // '14:00'
  endTime: string; // '15:00'
  status: SlotStatus;
  bookingId?: string;
  reason?: string;
}

export interface CreateBookingRequest {
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number; // 30, 60, 90, 120, etc.
  numberOfPeople: number;
  notes?: string;
}

export interface ExtendBookingRequest {
  additionalMinutes: number; // e.g. 30 or 60
}

export interface AdminBookingFilter {
  date?: string;
  resourceId?: string;
  category?: ResourceCategory;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
}

// ==========================================
// GIOCASA ARENA TOURNAMENT TYPES
// ==========================================

export type TournamentStatus = 'draft' | 'published' | 'live' | 'completed' | 'cancelled';
export type TournamentRegistrationStatus = 'confirmed' | 'waitlisted' | 'pending_approval' | 'rejected' | 'cancelled' | 'checked_in';
export type TournamentPaymentStatus = 'unpaid' | 'paid' | 'waived';

export interface TournamentPrize {
  rank: string; // e.g. "1st Place", "2nd Place", "MVP"
  reward: string; // e.g. "₹5,000 Cash + GioCasa Trophy"
}

export interface Tournament {
  id: string; // 'tourn-xxx'
  title: string;
  slug: string; // unique URL slug
  shortDescription: string;
  description: string;
  gameTitle: string; // 'EA Sports FC 25', 'Championship 8-Ball', etc.
  gameCategory: ResourceCategory | 'other';
  format: string; // '1v1 Knockout', '2v2 Doubles', 'Double Elimination', etc.
  teamType: 'individual' | 'team';
  teamSize: { min: number; max: number };
  bannerImage: string;
  venue: string; // e.g. 'GioCasa Upper Deck Gaming Lounge, Ayodhya'
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate?: string;
  endTime?: string;
  registrationOpeningDate: string; // YYYY-MM-DD
  registrationOpeningTime: string; // HH:mm
  registrationDeadlineDate: string; // YYYY-MM-DD
  registrationDeadlineTime: string; // HH:mm
  maxCapacity: number; // Max confirmed players / teams
  waitlistEnabled: boolean;
  waitlistCapacity: number;
  entryFeePaise: number; // Stored in integer paise (e.g. 19900 = ₹199)
  prizePoolDetails: string;
  prizes?: TournamentPrize[];
  eligibilityRequirements?: string;
  rules: string[];
  scheduleInstructions?: string;
  requiredFields: string[]; // e.g. ['email', 'inGameId']
  isFeatured: boolean;
  status: TournamentStatus;
  isRegistrationApprovalRequired: boolean;
  confirmedCount: number;
  waitlistCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentRegistrationTeammate {
  name: string;
  phone?: string;
  inGameId?: string;
}

export interface TournamentRegistration {
  id: string; // 'reg-xxx'
  registrationReference: string; // Human readable (e.g. 'GCA-FC25-4A9F')
  accessToken: string; // High entropy token for viewing confirmation page
  tournamentId: string;
  tournamentSlug: string;
  participantName: string;
  phone: string;
  email?: string;
  inGameId?: string; // PSN ID, Gamertag, etc.
  teamName?: string;
  teammates?: TournamentRegistrationTeammate[];
  status: TournamentRegistrationStatus;
  paymentStatus: TournamentPaymentStatus;
  paymentNotes?: string;
  notes?: string;
  rulesAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  playerId?: string;
}

export interface TournamentResultStanding {
  rank: number; // 1, 2, 3...
  awardLabel: string; // 'Champion', 'Runner-up', '3rd Place', 'MVP'
  participantName: string;
  teamName?: string;
  inGameId?: string;
  scoreOrRecord?: string; // e.g. '4 - 2 in Grand Final'
  photoUrl?: string;
  notes?: string;
}

export interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentSlug: string;
  isPublished: boolean;
  publishedAt?: string;
  summary?: string;
  standings: TournamentResultStanding[];
  createdAt: string;
  updatedAt: string;
}

export interface HallOfFameEntry {
  id: string;
  tournamentId?: string;
  tournamentTitle: string;
  tournamentSlug?: string;
  playerName: string;
  teamName?: string;
  award: string; // 'Champion', 'Runner-up', 'MVP', etc.
  gameTitle: string;
  gameCategory: ResourceCategory | 'other';
  season: string; // 'Summer 2026', 'Inaugural Season'
  eventDate: string; // YYYY-MM-DD
  scoreDescription?: string;
  photoUrl: string;
  isFeatured: boolean;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// GIOCASA PLAYER CRM TYPES
// ==========================================

export type MembershipTier = 'standard' | 'bronze' | 'silver' | 'gold' | 'vip';
export type PlayerStatus = 'active' | 'inactive' | 'banned' | 'archived';

export interface StaffNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface FollowUpReminder {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface LoyaltyLedgerEntry {
  id: string;
  playerId: string;
  points: number; // positive for earn/bonus, negative for redeem
  type: 'earn' | 'redeem' | 'adjustment' | 'bonus';
  reason: string;
  referenceId?: string; // bookingId or tournamentId
  createdAt: string;
}

export interface PlayerStats {
  tournamentCount: number;
  tournamentWins: number;
  bookingsCount: number;
  totalHoursPlayed: number;
  totalSpend: number; // Verified INR
  firstVisitDate?: string;
  lastVisitDate?: string;
}

export interface Player {
  id: string; // 'ply-xxx'
  name: string;
  gamerTag: string;
  phone: string;
  normalizedPhone: string; // 10 digit normalized
  email?: string;
  avatarUrl?: string;
  favoriteGame?: string;
  favoritePlatform?: ResourceCategory | 'other';
  membershipTier: MembershipTier;
  status: PlayerStatus;
  notes: StaffNote[];
  reminders: FollowUpReminder[];
  tags: string[];
  consent: {
    whatsappUpdates: boolean;
    emailUpdates: boolean;
  };
  loyalty: {
    pointsBalance: number;
    lifetimePoints: number;
    tier: MembershipTier;
  };
  stats: PlayerStats;
  createdAt: string;
  updatedAt: string;
}

export type PlayerSegment =
  | 'all'
  | 'new'
  | 'frequent'
  | 'tournament_regulars'
  | 'winners'
  | 'vip'
  | 'inactive'
  | 'upcoming_bookings';

export interface PlayerQueryParams {
  search?: string;
  segment?: PlayerSegment;
  status?: PlayerStatus | 'all';
  tier?: MembershipTier | 'all';
  sortBy?: 'lastVisit' | 'totalSpend' | 'tournaments' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PlayerTimelineEvent {
  id: string;
  type: 'tournament' | 'booking' | 'win' | 'loyalty' | 'note' | 'reminder';
  title: string;
  description: string;
  date: string;
  badge?: string;
  metadata?: Record<string, any>;
}

export interface PlayerProfileDetails {
  player: Player;
  registrations: TournamentRegistration[];
  bookings: Booking[];
  wins: Array<{
    id: string;
    tournamentTitle: string;
    award: string;
    gameTitle: string;
    season?: string;
    eventDate?: string;
    scoreDescription?: string;
  }>;
  loyaltyLedger: LoyaltyLedgerEntry[];
  activityTimeline: PlayerTimelineEvent[];
}
