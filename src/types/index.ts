export type PageRoute = 
  | 'home'
  | 'experience'
  | 'menu'
  | 'gaming'
  | 'events'
  | 'about'
  | 'contact'
  | 'book'
  | 'admin'
  | 'tournaments'
  | 'tournament-detail'
  | 'tournament-register'
  | 'tournament-confirmation'
  | 'tournament-results'
  | 'hall-of-fame';

export interface RouteParams {
  slug?: string;
  registrationId?: string;
  token?: string;
  adminTab?: 'overview' | 'tournaments' | 'tournament-new' | 'tournament-edit' | 'tournament-registrations' | 'tournament-results' | 'hall-of-fame' | 'players';
  adminSubTab?: 'directory' | 'profile' | 'segments' | 'loyalty';
  adminTournamentId?: string;
  adminPlayerId?: string;
}

export type ResourceCategory = 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';

// ==========================================
// GIOCASA ARENA TYPES
// ==========================================

export type TournamentStatus = 'draft' | 'published' | 'live' | 'completed' | 'cancelled';
export type TournamentRegistrationStatus = 'confirmed' | 'waitlisted' | 'pending_approval' | 'rejected' | 'cancelled' | 'checked_in';
export type TournamentPaymentStatus = 'unpaid' | 'paid' | 'waived';
export type TournamentComputedStatus = 'draft' | 'upcoming_registration' | 'registration_open' | 'waitlist_open' | 'registration_closed' | 'sold_out' | 'live' | 'completed' | 'cancelled';

export interface TournamentPrize {
  rank: string;
  reward: string;
}

export interface Tournament {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  gameTitle: string;
  gameCategory: 'ps5' | 'pool' | 'foosball' | 'boardgames' | 'other';
  format: string;
  teamType: 'individual' | 'team';
  teamSize: { min: number; max: number };
  bannerImage: string;
  venue: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  registrationOpeningDate: string;
  registrationOpeningTime: string;
  registrationDeadlineDate: string;
  registrationDeadlineTime: string;
  maxCapacity: number;
  waitlistEnabled: boolean;
  waitlistCapacity: number;
  entryFeePaise: number;
  prizePoolDetails: string;
  prizes?: TournamentPrize[];
  eligibilityRequirements?: string;
  rules: string[];
  scheduleInstructions?: string;
  requiredFields: string[];
  isFeatured: boolean;
  status: TournamentStatus;
  isRegistrationApprovalRequired: boolean;
  confirmedCount: number;
  waitlistCount: number;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API
  computedStatus?: TournamentComputedStatus;
  statusLabel?: string;
  isRegistrationAllowed?: boolean;
  isWaitlistAllowed?: boolean;
  spotsRemaining?: number;
}

export interface TournamentRegistrationTeammate {
  name: string;
  phone?: string;
  inGameId?: string;
}

export interface TournamentRegistration {
  id: string;
  registrationReference: string;
  accessToken: string;
  tournamentId: string;
  tournamentSlug: string;
  participantName: string;
  phone: string;
  email?: string;
  inGameId?: string;
  teamName?: string;
  teammates?: TournamentRegistrationTeammate[];
  status: TournamentRegistrationStatus;
  paymentStatus: TournamentPaymentStatus;
  paymentNotes?: string;
  notes?: string;
  rulesAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentResultStanding {
  rank: number;
  awardLabel: string;
  participantName: string;
  teamName?: string;
  inGameId?: string;
  scoreOrRecord?: string;
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
  award: string;
  gameTitle: string;
  gameCategory: 'ps5' | 'pool' | 'foosball' | 'boardgames' | 'other';
  season: string;
  eventDate: string;
  scoreDescription?: string;
  photoUrl: string;
  isFeatured: boolean;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ReservationType = 'dining' | 'gaming' | 'combo' | 'event';

export interface MenuItem {
  id: string;
  name: string;
  category: 'tea' | 'hot-coffee' | 'cold-coffee' | 'shakes' | 'mocktails' | 'sides' | 'burgers' | 'pizza' | 'pasta' | 'combos';
  price: number | 'MRP';
  description?: string;
  ingredients?: string[];
  isVegetarian: boolean;
  isBestseller?: boolean;
  isSignature?: boolean;
  isWoodFired?: boolean;
  spicyLevel?: 0 | 1 | 2 | 3;
  image?: string;
  prepTime?: string;
}

export interface GamingZone {
  id: string;
  name: string;
  subtitle: string;
  type: 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';
  image: string;
  specs: string[];
  description: string;
  highlights: string[];
  popularGames?: string[];
  ratePerHour?: string;
  playersCapacity: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  dayOfWeek: string;
  time: string;
  category: 'tournament' | 'game-night' | 'live' | 'special';
  description: string;
  entryFee?: string;
  prizePool?: string;
  image: string;
  status: 'upcoming' | 'registering' | 'sold-out';
}

export interface NightExperience {
  id: string;
  title: string;
  tagline: string;
  idealFor: string;
  image: string;
  includes: string[];
  duration: string;
  vibe: string;
  bookingType: ReservationType;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

export interface BookingFormData {
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guests: number;
  reservationType: ReservationType;
  preferredLevel: 'downstairs-dine' | 'upstairs-gaming' | 'full-venue' | 'any';
  specialRequests?: string;
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
  favoritePlatform?: 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames' | 'other';
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

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  resourceName?: string;
  category?: 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  numberOfPeople?: number;
  totalAmount?: number;
  totalPrice?: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: string;
  playerId?: string;
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
