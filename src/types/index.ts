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
  adminTab?: 'overview' | 'tournaments' | 'tournament-new' | 'tournament-edit' | 'tournament-registrations' | 'tournament-results' | 'hall-of-fame';
  adminTournamentId?: string;
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
