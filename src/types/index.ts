export type PageRoute = 
  | 'home'
  | 'experience'
  | 'menu'
  | 'gaming'
  | 'games'
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
  resourceId?: string;
  adminTab?: 'overview' | 'verify' | 'games' | 'tournaments' | 'tournament-new' | 'tournament-edit' | 'tournament-registrations' | 'tournament-results' | 'hall-of-fame' | 'players' | 'contact' | 'equipment' | 'reservations' | 'media';
  adminSubTab?: 'directory' | 'profile' | 'segments' | 'loyalty' | 'referrals' | 'reminders';
  adminTournamentId?: string;
  adminPlayerId?: string;
}

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'waived';

export type ResourceCategory = 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames' | 'xbox' | 'pc' | 'snooker' | string;

export interface GamingResource {
  id: string;
  name: string;
  category: ResourceCategory;
  zoneId: string;
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
  machineIdentifier?: string;
  availableGames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type GameAvailabilityStatus = 'available' | 'coming_soon' | 'unavailable' | 'maintenance';

export interface GameItem {
  id: string;
  title: string;
  category: string;
  genre?: string;
  description: string;
  image: string;
  heroImage?: string;
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
  bannerPublicId?: string;
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
  photoPublicId?: string;
  isFeatured: boolean;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ReservationType = 'choice' | 'dining' | 'event' | 'gaming' | 'combo';
export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export type CheckInStatus = 'pending' | 'checked_in';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface BookingAuditLog {
  action: 'CHECK_IN' | 'PAYMENT_VERIFIED' | 'STATUS_CHANGE' | 'CREATED' | 'EXTENDED' | 'CANCELLED';
  timestamp: string;
  performedBy?: string;
  details?: Record<string, any>;
}

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
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'refunded';
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
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'refunded';
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
  imageUrl?: string;
  imagePublicId?: string;
  isFeatured?: boolean;
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
  sourceRecordId?: string;
  idempotencyKey?: string;
  ruleVersion?: string;
  reason: string;
  adminActor?: string;
  referenceId?: string;
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
  normalizedGioId?: string; // Uppercase alphanumeric normalized ID
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

export interface BookingExtension {
  id: string; // 'ext-xxx'
  extensionMinutes: number; // 30, 60
  amount: number; // INR
  paymentStatus: PaymentStatus;
  paidAt?: string;
  createdAt: string;
  idempotencyKey?: string;
  notes?: string;
}

export interface BookingPayment {
  id: string; // 'pay-xxx'
  amount: number; // INR actual amount received
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paidAt: string;
  verifiedBy?: string;
  notes?: string;
  pointsAwarded?: number;
  loyaltyLedgerId?: string;
  idempotencyKey?: string;
}

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  resourceId: string;
  resourceName?: string;
  category?: 'ps5' | 'pool' | 'racing' | 'foosball' | 'boardgames';
  location?: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  numberOfPeople?: number;
  totalAmount?: number;
  totalPrice?: number;
  originalAmount?: number;
  extensionAmount?: number;
  extensions?: BookingExtension[];
  payments?: BookingPayment[];
  paidAmount?: number;
  remainingBalance?: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'refunded';
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
  createdAt: string;
  playerId?: string;
}

export interface PlayerPaymentSummary {
  lifetimeSpend: number;
  originalBookingsSpend: number;
  extensionsSpend: number;
  confirmedBookingsCount: number;
  confirmedExtensionsCount: number;
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



