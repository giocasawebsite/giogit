export type ResourceCategory = 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames' | 'xbox' | 'pc' | 'snooker' | string;

export interface GamingResource {
  id: string; // e.g. 'ps5-station-1'
  name: string; // 'PS5 Pro Station 1'
  category: ResourceCategory;
  zoneId: string; // 'ps5-arena'
  floorLocation?: 'Basement' | '1st Floor';
  ratePerHour: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  playersCapacity: { min: number; max: number };
  active: boolean;
  isMaintenance: boolean;
  maintenanceReason?: string;
  specs: string[];
  image: string;
  imagePublicId?: string;
  order: number;
  machineIdentifier?: string; // e.g. 'PS5-01', 'RIG-01', 'TABLE-1'
  availableGames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type GameAvailabilityStatus = 'available' | 'coming_soon' | 'unavailable' | 'maintenance';

export interface GameItem {
  id: string; // e.g. 'game-gta-5'
  title: string; // 'GTA 5'
  category: string; // 'ps5', 'xbox', 'pc', 'racing', 'pool', 'foosball', 'boardgames', 'all'
  genre?: string; // 'Action', 'Racing', 'Fighting', 'Sports', 'Adventure', 'Sandbox'
  description: string;
  image: string;
  imagePublicId?: string;
  isAvailable: boolean;
  availabilityStatus?: GameAvailabilityStatus;
  isFeatured?: boolean;
  resourceId?: string;
  resourceName?: string;
  playOptions?: string[];
  badge?: string;
  minPlayers?: number;
  maxPlayers?: number;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentSummary {
  category: string;
  name: string;
  totalMachines: number;
  availableMachines: number;
  bookedMachines: number;
  maintenanceMachines: number;
  ratePerHour: number;
  minPlayers: number;
  maxPlayers: number;
  image: string;
  machines: GamingResource[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded';

export interface BookingExtension {
  id: string; // 'ext-xxx'
  extensionMinutes: number; // 30, 60
  amount: number; // INR
  paymentStatus: PaymentStatus; // 'paid', 'pending', 'unpaid'
  paidAt?: string;
  createdAt: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface BookingPayment {
  id: string; // 'pay-xxx'
  amount: number; // INR actual amount received
  paymentStatus: PaymentStatus; // 'paid', 'pending', 'unpaid', 'refunded'
  paymentMethod?: PaymentMethod; // 'cash' | 'upi' | 'card' | 'other'
  paymentReference?: string; // UPI UTR or receipt number
  paidAt: string; // ISO timestamp
  verifiedBy?: string; // Staff member who verified payment
  notes?: string;
  pointsAwarded?: number; // Loyalty points awarded for this payment
  loyaltyLedgerId?: string; // ID of LoyaltyLedgerEntry
  idempotencyKey?: string;
}

export type CheckInStatus = 'pending' | 'checked_in';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface BookingAuditLog {
  action: 'CHECK_IN' | 'PAYMENT_VERIFIED' | 'STATUS_CHANGE' | 'CREATED' | 'EXTENDED' | 'CANCELLED';
  timestamp: string;
  performedBy?: string;
  details?: Record<string, any>;
}

export interface Booking {
  id: string; // 'GC-XXXXXX'
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  resourceName: string;
  category: ResourceCategory;
  location?: string;
  date: string; // YYYY-MM-DD (Asia/Kolkata)
  startTime: string; // HH:mm in 24h (e.g. '14:00')
  endTime: string; // HH:mm in 24h (e.g. '15:00')
  durationMinutes: number;
  numberOfPeople: number;
  totalAmount: number;
  originalAmount?: number; // Initial booking cost before extensions
  extensionAmount?: number; // Total confirmed extension payments
  extensions?: BookingExtension[];
  payments?: BookingPayment[]; // Individual payment installments & extensions
  paidAmount?: number; // Total amount paid so far in INR
  remainingBalance?: number; // Remaining balance to be paid
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  guestCode?: string; // 4-digit verification code e.g. '4829'
  checkInStatus?: CheckInStatus; // 'pending' | 'checked_in'
  checkedInAt?: string;
  checkedInBy?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  auditLogs?: BookingAuditLog[];
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
  paymentStatus?: PaymentStatus;
  idempotencyKey?: string;
  notes?: string;
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
  bannerPublicId?: string;
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
  guestCode?: string; // 4-digit verification code e.g. '4829'
  checkInStatus?: CheckInStatus; // 'pending' | 'checked_in'
  checkedInAt?: string;
  checkedInBy?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  auditLogs?: BookingAuditLog[];
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
  playerId?: string;
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
  photoPublicId?: string;
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

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjustment' | 'bonus' | 'reversal';
export type LoyaltySourceActivity =
  | 'gaming_session'
  | 'tournament_participation'
  | 'tournament_placement'
  | 'referral_reward'
  | 'referred_welcome'
  | 'admin_adjustment'
  | 'booking_payment'
  | 'reversal'
  | 'manual';

export interface LoyaltyLedgerEntry {
  id: string;
  playerId: string;
  gioId?: string;
  points: number; // positive for earn/bonus, negative for redeem/reversal
  type: LoyaltyTransactionType;
  sourceActivityType?: LoyaltySourceActivity;
  sourceRecordId?: string; // bookingId, registrationId, tournamentId, referralId
  idempotencyKey?: string;
  ruleVersion?: string;
  reason: string;
  adminActor?: string;
  referenceId?: string; // backward compat
  paymentAmount?: number; // Actual amount received in INR
  previousBalance?: number; // Balance before this entry
  updatedBalance?: number; // Balance after this entry
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
  pointsPerHundredRupees?: number; // Configured conversion rate: default 10 (1 pt per ₹10 spent)
  rulesEnabled: {
    gamingSession: boolean;
    tournamentParticipation: boolean;
    tournamentPlacement: boolean;
    referral: boolean;
    referredWelcome: boolean;
    paymentSpend?: boolean; // default true
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
  referredPlayerName: string;
  referredPlayerPhone: string;
  referralCodeUsed: string;
  status: ReferralStatus;
  qualifyingActivityType?: 'gaming_session' | 'tournament_participation';
  qualifyingRecordId?: string;
  pointsAwarded: number;
  notes?: string;
  createdAt: string;
  qualifiedAt?: string;
}

export type AutomationEventType =
  | 'player.created'
  | 'booking.created'
  | 'booking.completed'
  | 'booking.cancelled'
  | 'tournament.registered'
  | 'tournament.checked_in'
  | 'tournament.results_finalized'
  | 'referral.qualified'
  | 'points.awarded'
  | 'points.reversed';

export interface AutomationEvent {
  id: string;
  eventType: AutomationEventType;
  payload: Record<string, any>;
  status: 'pending' | 'processed' | 'failed';
  attempts: number;
  lastError?: string;
  idempotencyKey: string;
  createdAt: string;
  processedAt?: string;
}

export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReminderCategory =
  | 'upcoming_booking'
  | 'upcoming_tournament'
  | 'pending_verification'
  | 'referral_review'
  | 'inactive_followup'
  | 'failed_automation'
  | 'general';

export interface AdminReminder {
  id: string;
  playerId?: string;
  gioId?: string;
  playerName?: string;
  playerPhone?: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  priority: ReminderPriority;
  category: ReminderCategory;
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
  originalBookingSpend?: number; // Spending from initial bookings (INR)
  extensionSpend?: number; // Spending from session extensions (INR)
  diningCount?: number;
  eventCount?: number;
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
  gioId: string; // Permanent Public Unique ID: e.g. 'GIO-7K4P9X' or 'GIOKING23'
  normalizedGioId?: string; // Uppercase alphanumeric normalized ID for uniqueness indexing
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

export interface PlayerPaymentSummary {
  lifetimeSpend: number;
  originalBookingsSpend: number;
  extensionsSpend: number;
  confirmedBookingsCount: number;
  confirmedExtensionsCount: number;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface DiningReservation {
  id: string; // 'gdr-xxx'
  reference: string; // 'GDR-XXXXXX'
  referenceCode: string; // Alias 'GDR-XXXXXX'
  type: 'dining';
  customerName: string;
  phone: string;
  whatsappPhone?: string;
  email?: string;
  guests: number;
  date: string;
  time: string;
  location: string; // 'GioCasa Dine-in Restaurant — 1st Floor'
  seatingPreference?: string;
  specialRequests?: string;
  additionalRequirements?: string;
  status: ReservationStatus;
  guestCode?: string; // 4-digit verification code e.g. '4829'
  checkInStatus?: CheckInStatus; // 'pending' | 'checked_in'
  checkedInAt?: string;
  checkedInBy?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  totalAmount?: number;
  auditLogs?: BookingAuditLog[];
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  playerId?: string;
  gioId?: string;
}

export interface EventReservation {
  id: string; // 'ger-xxx'
  reference: string; // 'GER-XXXXXX'
  referenceCode: string; // Alias 'GER-XXXXXX'
  type: 'event';
  customerName: string;
  phone: string;
  whatsappPhone?: string;
  email: string;
  eventType: string; // 'Birthday' | 'Anniversary' | 'Corporate Event' | 'Private Party' | 'Other'
  date: string;
  time: string;
  expectedGuests: number;
  estimatedBudget?: string;
  foodRequirements?: string;
  decorationRequirements?: string;
  additionalMessage?: string;
  status: ReservationStatus;
  guestCode?: string; // 4-digit verification code e.g. '4829'
  checkInStatus?: CheckInStatus; // 'pending' | 'checked_in'
  checkedInAt?: string;
  checkedInBy?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  totalAmount?: number;
  auditLogs?: BookingAuditLog[];
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  playerId?: string;
  gioId?: string;
}

export interface VerifiedGuestBooking {
  bookingType: 'gaming' | 'dining' | 'event' | 'tournament';
  id: string;
  reference: string;
  guestCode: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  endTime?: string;
  durationMinutes?: number;
  resourceName?: string;
  location?: string;
  numberOfPeople?: number;
  guests?: number;
  expectedGuests?: number;
  eventType?: string;
  estimatedBudget?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
  payments?: BookingPayment[];
  status: string;
  checkInStatus: CheckInStatus;
  checkedInAt?: string;
  checkedInBy?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  notes?: string;
  specialRequests?: string;
  additionalRequirements?: string;
  foodRequirements?: string;
  decorationRequirements?: string;
  additionalMessage?: string;
  createdAt: string;
  auditLogs?: BookingAuditLog[];
}

export interface PlayerProfileDetails {
  player: Player;
  registrations: TournamentRegistration[];
  bookings: Booking[];
  diningReservations?: DiningReservation[];
  eventReservations?: EventReservation[];
  diningCount?: number;
  eventCount?: number;
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
  paymentSummary?: PlayerPaymentSummary;
  reminders?: AdminReminder[];
  communicationLogs?: CommunicationLog[];
  activityTimeline: PlayerTimelineEvent[];
}

// =========================================================================
// CONTACT SETTINGS & WHATSAPP CONFIGURATION
// =========================================================================

export interface ContactSettings {
  brandName: string;
  whatsappNumber: string; // digits only, e.g. '919696028522'
  phone: string; // e.g. '+91 96960 28522'
  displayPhone: string; // e.g. '+91 96960 28522'
  email: string; // e.g. 'ciao@giocasa.in'
  addressLine1: string; // e.g. 'Civil Lines / Main Hub'
  addressLine2: string; // e.g. 'Ayodhya, Uttar Pradesh 224001'
  landmark: string; // e.g. 'Near City Center'
  city: string; // e.g. 'Ayodhya'
  state: string; // e.g. 'Uttar Pradesh'
  country: string; // e.g. 'India'
  pincode: string; // e.g. '224001'
  googleMapsUrl: string; // e.g. 'https://maps.google.com/?q=Ayodhya+Uttar+Pradesh'
  instagramHandle: string; // e.g. '@giocasa.ayodhya'
  instagramUrl: string; // e.g. 'https://instagram.com'
  updatedAt?: string;
}

// =========================================================================
// ADMIN WEB PUSH NOTIFICATIONS & DEVICE SUBSCRIPTIONS
// =========================================================================

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface AdminPushSubscription {
  id: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  updatedAt?: string;
  lastUsedAt?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url: string;
    type: 'booking' | 'dining' | 'event' | 'tournament' | 'test';
    reference?: string;
    timestamp?: number;
  };
}

// ==========================================
// MENU CUSTOMIZATION & MEDIA GALLERY TYPES
// ==========================================

export interface MenuCustomization {
  id: string; // matches menuItemId (e.g. 'chinese-honey-chilli-potato')
  menuItemId: string;
  name?: string;
  category?: string;
  price?: number | 'MRP';
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  isFeatured?: boolean;
  featuredTitle?: string;
  featuredDescription?: string;
  badge?: string;
  updatedAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'food' | 'gaming' | 'ambiance' | 'events' | 'tournaments' | string;
  imageUrl: string;
  imagePublicId?: string;
  thumbnailUrl?: string;
  description?: string;
  tags?: string[];
  isFeatured?: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}



