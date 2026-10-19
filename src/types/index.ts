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
  adminSubTab?: 'directory' | 'profile' | 'segments' | 'loyalty' | 'referrals' | 'reminders';
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

export type MenuCategory = 
  | 'chinese'
  | 'tea'
  | 'hot-coffee'
  | 'cold-coffee'
  | 'smoothies-shakes'
  | 'mocktails'
  | 'sides-extras'
  | 'wraps'
  | 'pizza'
  | 'sandwiches'
  | 'burgers'
  | 'pasta'
  | 'combos'
  | 'shakes'
  | 'sides';

export interface MenuItemSize {
  size: '8-inch' | '10-inch' | '12-inch' | string;
  price: number;
}

export interface MenuItemVariant {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory | string;
  price: number | 'MRP';
  description?: string;
  ingredients?: string[];
  isVegetarian: boolean;
  isBestseller?: boolean;
  isSignature?: boolean;
  isWoodFired?: boolean;
  spicyLevel?: 0 | 1 | 2 | 3;
  spiceLabel?: string;
  servingNote?: string;
  sizes?: MenuItemSize[];
  flavors?: MenuItemVariant[];
  portions?: MenuItemVariant[];
  flaggedForVerification?: boolean;
  verificationNote?: string;
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

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjustment' | 'bonus' | 'reversal';
export type LoyaltySourceActivity =
  | 'gaming_session'
  | 'tournament_participation'
  | 'tournament_placement'
  | 'referral_reward'
  | 'referred_welcome'
  | 'admin_adjustment'
  | 'reversal'
  | 'manual';

export interface LoyaltyLedgerEntry {
  id: string;
  playerId: string;
  gioId?: string;
  points: number; // positive for earn/bonus, negative for redeem/reversal
  type: LoyaltyTransactionType;
  sourceActivityType?: LoyaltySourceActivity;
  sourceRecordId?: string;
  idempotencyKey?: string;
  ruleVersion?: string;
  reason: string;
  adminActor?: string;
  referenceId?: string;
  createdAt: string;
}

export interface LoyaltyRules {
  gamingSessionPoints: number;
  tournamentParticipationPoints: number;
  tournamentPlacementBonus: {
    first: number;
    second: number;
    third: number;
  };
  referralPoints: number;
  referredWelcomeBonus: number;
  rulesEnabled: {
    gamingSession: boolean;
    tournamentParticipation: boolean;
    tournamentPlacement: boolean;
    referral: boolean;
    referredWelcome: boolean;
  };
  updatedAt: string;
  updatedBy: string;
}

export type ReferralStatus = 'pending' | 'qualified' | 'rejected' | 'reversed';

export interface Referral {
  id: string;
  referrerPlayerId: string;
  referrerGioId: string;
  referrerName: string;
  referredPlayerId: string;
  referredGioId: string;
  referredPlayerName?: string;
  referredName?: string;
  referredPlayerPhone?: string;
  referralCodeUsed?: string;
  referralCode?: string;
  status: ReferralStatus;
  qualifyingActivityType?: 'gaming_session' | 'tournament_participation';
  qualifyingRecordId?: string;
  pointsAwarded?: number;
  notes?: string;
  createdAt: string;
  qualifiedAt?: string;
}

export interface AdminReminder {
  id: string;
  playerId?: string;
  gioId?: string;
  playerName?: string;
  playerPhone?: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'upcoming_booking' | 'upcoming_tournament' | 'pending_verification' | 'referral_review' | 'inactive_followup' | 'failed_automation' | 'general';
  status: 'pending' | 'completed' | 'dismissed';
  assignedAdmin?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CommunicationLog {
  id: string;
  playerId: string;
  gioId?: string;
  channel: 'whatsapp';
  action: 'whatsapp_opened' | 'message_prepared';
  templateName: string;
  phone: string;
  initiatedBy: string;
  createdAt: string;
}

export interface PlayerStats {
  tournamentCount: number;
  tournamentWins: number;
  bookingsCount: number;
  completedBookingsCount?: number;
  totalHoursPlayed: number;
  totalSpend: number; // Verified INR
  firstVisitDate?: string;
  lastVisitDate?: string;
  lastActivityDate?: string;
}

export type PlayerAcquisitionSource =
  | 'player_registration'
  | 'gaming_booking'
  | 'tournament_registration'
  | 'admin';

export interface Player {
  id: string; // 'ply-xxx'
  gioId: string; // Permanent Public Unique ID: e.g. 'GIO-7K4P9X'
  referralCode: string; // e.g. 'REF-7K4P9X'
  referredBy?: string; // referrer's referralCode or gioId
  referralCount: number;
  successfulReferralCount: number;
  identityVerificationStatus: 'unverified' | 'phone_verified' | 'id_verified';
  name: string;
  gamerTag: string;
  phone: string;
  normalizedPhone: string; // 10 digit normalized
  email?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  favoriteGame?: string;
  favoritePlatform?: ResourceCategory | 'other';
  membershipTier: MembershipTier;
  status: PlayerStatus;
  source?: PlayerAcquisitionSource;
  sources?: PlayerAcquisitionSource[];
  notes: StaffNote[];
  reminders: FollowUpReminder[];
  tags: string[];
  consent: {
    whatsappUpdates: boolean;
    emailUpdates: boolean;
    privacyTermsAccepted?: boolean;
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
  | 'gaming_booking'
  | 'tournament_registration'
  | 'player_registration'
  | 'upcoming_bookings'
  | 'tournament_participants'
  | 'new'
  | 'frequent'
  | 'tournament_regulars'
  | 'winners'
  | 'vip'
  | 'inactive';

export interface HistoricalReconciliationReport {
  bookingsProcessed: number;
  bookingsLinked: number;
  bookingsCreatedProfiles: number;
  bookingsSkipped: number;
  tournamentsProcessed: number;
  tournamentsLinked: number;
  tournamentsCreatedProfiles: number;
  tournamentsSkipped: number;
  ambiguousRecordsFlagged: Array<{
    type: 'booking' | 'tournament_registration';
    id: string;
    name: string;
    phone: string;
    reason: string;
  }>;
  totalSyncedPlayers: number;
}

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
  type: 'tournament' | 'booking' | 'win' | 'loyalty' | 'note' | 'reminder' | 'referral' | 'communication';
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
  referrals?: Referral[];
  reminders?: AdminReminder[];
  communicationLogs?: CommunicationLog[];
  activityTimeline: PlayerTimelineEvent[];
}
