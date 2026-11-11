import { MongoClient, Db, Collection } from 'mongodb';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from './config';
import { hashPassword, verifyPassword, timingSafeCompare } from './middleware/security';
import {
  Booking,
  GamingResource,
  GameItem,
  EquipmentSummary,
  AdminBookingFilter,
  Tournament,
  TournamentRegistration,
  TournamentResult,
  HallOfFameEntry,
  TournamentStatus,
  TournamentRegistrationStatus,
  Player,
  StaffNote,
  FollowUpReminder,
  LoyaltyLedgerEntry,
  LoyaltyRules,
  Referral,
  AdminReminder,
  AutomationEvent,
  CommunicationLog,
  PlayerStats,
  MembershipTier,
  PlayerStatus,
  PlayerSegment,
  PlayerQueryParams,
  PlayerProfileDetails,
  PlayerTimelineEvent,
  ContactSettings,
  DiningReservation,
  EventReservation,
  AdminPushSubscription,
  MenuCustomization,
  GalleryItem,
} from './types';
import { cloudinaryService } from './services/cloudinary';
import { normalizeWhatsAppNumber, formatReadablePhone, DEFAULT_WHATSAPP_NUMBER, DEFAULT_DISPLAY_PHONE } from './utils/phone';
import { timeToMinutes, doIntervalsOverlap, getNowInKolkata } from './utils/timezone';
import { calculateBookingPrice } from './utils/pricing';
import { INITIAL_TOURNAMENTS, INITIAL_TOURNAMENT_RESULTS, INITIAL_HALL_OF_FAME } from './initialTournaments';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

// 32-character non-ambiguous uppercase alphabet (excludes 0, O, 1, I)
const GIO_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomCode(prefix: string, length = 6): string {
  const bytes = crypto.randomBytes(length);
  let res = prefix;
  for (let i = 0; i < length; i++) {
    res += GIO_ID_ALPHABET[bytes[i] % GIO_ID_ALPHABET.length];
  }
  return res;
}

/**
 * Masks a phone number hint according to GioCasa privacy rules:
 * - Shows first 2 digits
 * - Shows middle 2 digits (digits 5 and 6 of a 10-digit Indian mobile number)
 * - Masks all other digits with asterisks
 * Example: "9876543210" -> "98** **43"
 * Never leaks the last 4 digits or complete phone number.
 */
export function formatMaskedPhoneHint(phone?: string): string {
  if (!phone) return '****';
  const digits = phone.replace(/\D/g, '');
  const clean = digits.length >= 10 ? digits.slice(-10) : digits;
  if (clean.length < 4) return '****';
  if (clean.length < 10) return `${clean.slice(0, 2)}****`;
  return `${clean.slice(0, 2)}** **${clean.slice(5, 7)}`;
}

export const DEFAULT_LOYALTY_RULES: LoyaltyRules = {
  gamingSessionPoints: 50,
  tournamentParticipationPoints: 100,
  tournamentPlacementBonus: {
    first: 500,
    second: 300,
    third: 150,
  },
  referralPoints: 200,
  referredWelcomeBonus: 0,
  pointsPerHundredRupees: 10,
  rulesEnabled: {
    gamingSession: true,
    tournamentParticipation: true,
    tournamentPlacement: true,
    referral: true,
    referredWelcome: false,
    paymentSpend: true,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

// Initial default resources based on GioCasa gamingData.ts
export const INITIAL_RESOURCES: GamingResource[] = [
  {
    id: 'ps5-station-1',
    name: 'PS5 Pro Station 1 (4K 120Hz)',
    category: 'ps5',
    zoneId: 'ps5-arena',
    floorLocation: 'Basement',
    ratePerHour: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    machineIdentifier: 'PS5-01',
    specs: ['PlayStation 5 Console', '55" 4K HDR 120Hz Display', '2 DualSense Controllers', 'EA FC 25, Tekken 8, MK1'],
    image: '/assets/real/ps5_setup.png',
    order: 1,
  },
  {
    id: 'ps5-station-2',
    name: 'PS5 Pro Station 2 (4K 120Hz)',
    category: 'ps5',
    zoneId: 'ps5-arena',
    floorLocation: 'Basement',
    ratePerHour: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    machineIdentifier: 'PS5-02',
    specs: ['PlayStation 5 Console', '55" 4K HDR 120Hz Display', '2 DualSense Controllers', 'Spider-Man 2, Gran Turismo 7, GTA V'],
    image: '/assets/real/ps5_setup.png',
    order: 2,
  },
  {
    id: 'ps5-station-3',
    name: 'PS5 Pro Station 3 (Squad Lounge)',
    category: 'ps5',
    zoneId: 'ps5-arena',
    floorLocation: 'Basement',
    ratePerHour: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    machineIdentifier: 'PS5-03',
    specs: ['PlayStation 5 Console', '55" 4K HDR 120Hz Display', '4 DualSense Controllers', 'It Takes Two, WWE 2K24, Co-op Vault'],
    image: '/assets/real/ps5_setup.png',
    order: 3,
  },
  {
    id: 'pool-table-1',
    name: 'Hot-Shot 8-Ball Slate Championship Pool',
    category: 'pool',
    zoneId: 'hotshot-pool',
    floorLocation: '1st Floor',
    ratePerHour: 200,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 2, max: 6 },
    active: true,
    isMaintenance: false,
    machineIdentifier: 'POOL-01',
    specs: ['Italian Slate Bed', 'Aramith Pro Ball Set', 'Precision Ash Cues', 'Spectator Lounge Seating'],
    image: '/assets/real/pool_table.png',
    order: 4,
  },
  {
    id: 'racing-station-1',
    name: 'Pro Racing Simulator Rig (Force Feedback)',
    category: 'racing',
    zoneId: 'racing-arena',
    floorLocation: 'Basement',
    ratePerHour: 200,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    machineIdentifier: 'RACE-01',
    specs: ['Logitech G-Series Force Feedback Wheel & Pedals', 'Ergonomic GT Bucket Racing Seat', 'Curved Ultra-wide Cockpit Display', 'Forza, Gran Turismo 7, F1 24, Assetto Corsa'],
    image: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=800&q=80',
    order: 5,
  },
];

// Initial default games library for GioCasa
export const INITIAL_GAMES: GameItem[] = [
  {
    id: 'game-ea-fc-25',
    title: 'EA Sports FC 25 (FIFA)',
    category: 'ps5',
    genre: 'Sports',
    description: 'Next-gen football with HyperMotionV, authentic club rosters, and intense split-screen local multiplayer duels.',
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 4,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-tekken-8',
    title: 'Tekken 8',
    category: 'ps5',
    genre: 'Fighting',
    description: 'Unreal Engine 5 visceral fighting experience featuring the Heat system, high-speed combos, and next-gen stage destruction.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 2,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-mk-1',
    title: 'Mortal Kombat 1',
    category: 'ps5',
    genre: 'Fighting',
    description: 'Reborn universe created by the Fire God Liu Kang featuring Kameo fighters, cinematic fatalities, and tournament duels.',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 2,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-gta-v',
    title: 'Grand Theft Auto V',
    category: 'ps5',
    genre: 'Action',
    description: 'Los Santos in ray-traced 4K 60FPS. Fast cars, explosive heist missions, and open-world freedom.',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 1,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-spider-man-2',
    title: "Marvel's Spider-Man 2",
    category: 'ps5',
    genre: 'Action',
    description: 'Peter Parker and Miles Morales swing through Marvel New York with near-instant fast travel and Symbiote powers.',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 1,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-gt7',
    title: 'Gran Turismo 7',
    category: 'racing',
    genre: 'Racing',
    description: 'The Real Driving Simulator. Optimized for force-feedback wheels with dynamic weather and hundreds of precision cars.',
    image: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 2,
    order: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-f1-24',
    title: 'F1 24 Championship Edition',
    category: 'racing',
    genre: 'Racing',
    description: 'Dynamic handling physics, authentic telemetry, and official 2024 Formula 1 circuits with full sim cockpit integration.',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 2,
    order: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-forza-5',
    title: 'Forza Horizon 5',
    category: 'racing',
    genre: 'Racing',
    description: 'Vibrant open-world Mexican landscapes, supercars, drag strips, and off-road expedition challenges.',
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 1,
    maxPlayers: 2,
    order: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-pool-8ball',
    title: 'Hot-Shot 8-Ball Slate Championship Pool',
    category: 'pool',
    genre: 'Billiards',
    description: 'Tournament-grade Italian slate pool table with true-roll cloth, Aramith pro balls, and custom ash cues.',
    image: '/assets/real/pool_table.png',
    isAvailable: true,
    minPlayers: 2,
    maxPlayers: 6,
    order: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-foosball-pro',
    title: 'Pro Soccer Foosball Table',
    category: 'foosball',
    genre: 'Tabletop',
    description: 'High-speed telescopic rod foosball table with counter-balanced figures and fast ball return.',
    image: '/assets/real/foosball_lounge.png',
    isAvailable: true,
    minPlayers: 2,
    maxPlayers: 4,
    order: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-catan',
    title: 'Catan (Settlers of Catan)',
    category: 'boardgames',
    genre: 'Strategy',
    description: 'Trade, build, and settle the island of Catan. The quintessential modern tabletop strategy masterpiece.',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 3,
    maxPlayers: 4,
    order: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-codenames',
    title: 'Codenames',
    category: 'boardgames',
    genre: 'Party',
    description: 'Two rival spymasters know the secret identities of 25 agents. Teammates must decode one-word clues.',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    minPlayers: 4,
    maxPlayers: 8,
    order: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  brandName: 'GioCasa',
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  phone: DEFAULT_DISPLAY_PHONE,
  displayPhone: DEFAULT_DISPLAY_PHONE,
  email: 'ciao@giocasa.in',
  addressLine1: 'Civil Lines / Main Hub',
  addressLine2: 'Ayodhya, Uttar Pradesh 224001',
  landmark: 'Near City Center',
  city: 'Ayodhya',
  state: 'Uttar Pradesh',
  country: 'India',
  pincode: '224001',
  googleMapsUrl: 'https://maps.google.com/?q=Ayodhya+Uttar+Pradesh',
  instagramHandle: '@giocasa.ayodhya',
  instagramUrl: 'https://instagram.com',
};

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isMongoConnected = false;
  private isInitializing = true;
  private initError: string | null = null;
  private mutexLock = new Map<string, Promise<any>>();

  // Fallback in-memory and file store
  private fileBookings: Booking[] = [];
  private fileResources: GamingResource[] = [...INITIAL_RESOURCES];
  private fileGames: GameItem[] = [...INITIAL_GAMES];
  private fileTournaments: Tournament[] = [...INITIAL_TOURNAMENTS];
  private fileRegistrations: TournamentRegistration[] = [];
  private fileResults: TournamentResult[] = [...INITIAL_TOURNAMENT_RESULTS];
  private fileHallOfFame: HallOfFameEntry[] = [...INITIAL_HALL_OF_FAME];
  private filePlayers: Player[] = [];
  private fileLoyaltyLedger: LoyaltyLedgerEntry[] = [];
  private fileReferrals: Referral[] = [];
  private fileLoyaltyRules: LoyaltyRules = { ...DEFAULT_LOYALTY_RULES };
  private fileAutomationEvents: AutomationEvent[] = [];
  private fileCrmReminders: AdminReminder[] = [];
  private fileCommunicationLogs: CommunicationLog[] = [];
  private fileDiningReservations: DiningReservation[] = [];
  private fileEventReservations: EventReservation[] = [];
  private filePushSubscriptions: AdminPushSubscription[] = [];
  private fileMenuCustomizations: MenuCustomization[] = [];
  private fileGalleryItems: GalleryItem[] = [];

  private bookingsFilePath = path.join(DATA_DIR, 'bookings.json');
  private resourcesFilePath = path.join(DATA_DIR, 'resources.json');
  private gamesFilePath = path.join(DATA_DIR, 'games.json');
  private tournamentsFilePath = path.join(DATA_DIR, 'tournaments.json');
  private registrationsFilePath = path.join(DATA_DIR, 'tournament_registrations.json');
  private resultsFilePath = path.join(DATA_DIR, 'tournament_results.json');
  private hallOfFameFilePath = path.join(DATA_DIR, 'hall_of_fame.json');
  private playersFilePath = path.join(DATA_DIR, 'players.json');
  private loyaltyFilePath = path.join(DATA_DIR, 'loyalty_ledger.json');
  private referralsFilePath = path.join(DATA_DIR, 'referrals.json');
  private loyaltyRulesFilePath = path.join(DATA_DIR, 'loyalty_rules.json');
  private automationEventsFilePath = path.join(DATA_DIR, 'automation_events.json');
  private crmRemindersFilePath = path.join(DATA_DIR, 'crm_reminders.json');
  private communicationLogsFilePath = path.join(DATA_DIR, 'communication_logs.json');
  private diningReservationsFilePath = path.join(DATA_DIR, 'dining_reservations.json');
  private eventReservationsFilePath = path.join(DATA_DIR, 'event_reservations.json');
  private pushSubscriptionsFilePath = path.join(DATA_DIR, 'admin_push_subscriptions.json');
  private menuCustomizationsFilePath = path.join(DATA_DIR, 'menu_customizations.json');
  private galleryItemsFilePath = path.join(DATA_DIR, 'gallery_items.json');
  private settingsFilePath = path.join(DATA_DIR, 'settings.json');
  private cachedAdminPasscode: string | null = null;
  private cachedContactSettings: ContactSettings | null = null;

  async init(): Promise<void> {
    this.isInitializing = true;
    try {
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Load file-backed stores synchronously
      this.loadFileStores();

      // Try connecting to MongoDB Atlas if URI is provided
      if (config.mongoUri) {
        try {
          console.log('🔄 Connecting to MongoDB Atlas...');
          this.client = new MongoClient(config.mongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 10000,
          });

          this.client.on('close', () => {
            console.warn('⚠️ MongoDB connection closed.');
            this.isMongoConnected = false;
          });
          this.client.on('error', (err) => {
            console.error('⚠️ MongoDB client error:', err);
            this.isMongoConnected = false;
          });

          await this.client.connect();
          this.db = this.client.db(config.dbName);
          this.isMongoConnected = true;
          this.initError = null;
          console.log(`✅ Successfully connected to MongoDB Atlas (DB: ${config.dbName})`);

          // Run indexing and initial seed in background so HTTP port and health check are ready immediately
          this.ensureIndexesAndSeed().catch((idxErr) => {
            console.warn('Warning during background index/seed sync:', idxErr);
          });
        } catch (err: any) {
          console.warn('⚠️ MongoDB Atlas connection failed or timed out. Operating in persistent disk store mode.', err);
          this.isMongoConnected = false;
          this.initError = err?.message || 'MongoDB connection failed';
        }
      } else {
        console.log('ℹ️ MONGODB_URI not provided. Operating in robust local persistent file-store mode.');
      }
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Health and readiness inspector for Uptime monitors, Docker, and Render deployment manager
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    status: 'ok' | 'initializing' | 'error';
    database: 'connected' | 'connecting' | 'fallback_disk' | 'disconnected';
    error?: string;
    details?: {
      mongoConnected: boolean;
      dbName: string;
      pingMs?: number;
    };
  }> {
    if (this.isInitializing) {
      return {
        healthy: false,
        status: 'initializing',
        database: 'connecting',
      };
    }

    if (config.mongoUri) {
      if (!this.isMongoConnected || !this.db) {
        return {
          healthy: false,
          status: 'error',
          database: 'disconnected',
          error: this.initError || 'MongoDB Atlas is not connected',
        };
      }

      try {
        const start = Date.now();
        await this.db.command({ ping: 1 });
        const pingMs = Date.now() - start;
        return {
          healthy: true,
          status: 'ok',
          database: 'connected',
          details: {
            mongoConnected: true,
            dbName: config.dbName,
            pingMs,
          },
        };
      } catch (err: any) {
        this.isMongoConnected = false;
        return {
          healthy: false,
          status: 'error',
          database: 'disconnected',
          error: err?.message || 'MongoDB ping command failed',
        };
      }
    }

    return {
      healthy: true,
      status: 'ok',
      database: 'fallback_disk',
    };
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        console.warn('Error closing MongoDB client:', err);
      }
      this.isMongoConnected = false;
    }
  }

  private async ensureIndexesAndSeed(): Promise<void> {
    if (!this.isMongoConnected || !this.db) return;
    try {
      const db = this.db;
      // Parallelize index creations across collections for minimal startup lag
      await Promise.allSettled([
        (async () => {
          const bookingsCol = db.collection<Booking>('bookings');
          await bookingsCol.createIndex({ id: 1 }, { unique: true });
          await bookingsCol.createIndex({ resourceId: 1, date: 1, startTime: 1, endTime: 1 });
          await bookingsCol.createIndex({ phone: 1 });
          await bookingsCol.createIndex({ status: 1 });
        })(),
        (async () => {
          const resourcesCol = db.collection<GamingResource>('resources');
          await resourcesCol.createIndex({ id: 1 }, { unique: true });
          await resourcesCol.createIndex({ category: 1 });
          const countRes = await resourcesCol.countDocuments();
          if (countRes === 0) {
            await resourcesCol.insertMany(INITIAL_RESOURCES);
          } else {
            // Seed any initial resources that do not yet exist, preserving user changes & additions
            for (const res of INITIAL_RESOURCES) {
              const existing = await resourcesCol.findOne({ id: res.id });
              if (!existing) {
                await resourcesCol.insertOne(res);
              }
            }
            // Safely backfill floorLocation on existing MongoDB equipment records without touching pricing/quantities
            await resourcesCol.updateMany(
              { category: { $in: ['ps5', 'racing'] }, floorLocation: { $exists: false } },
              { $set: { floorLocation: 'Basement' } }
            );
            await resourcesCol.updateMany(
              { category: { $nin: ['ps5', 'racing'] }, floorLocation: { $exists: false } },
              { $set: { floorLocation: '1st Floor' } }
            );
          }
        })(),
        (async () => {
          const gamesCol = db.collection<GameItem>('games');
          await gamesCol.createIndex({ id: 1 }, { unique: true });
          await gamesCol.createIndex({ category: 1 });
          await gamesCol.createIndex({ isAvailable: 1 });
          const countGames = await gamesCol.countDocuments();
          if (countGames === 0) {
            await gamesCol.insertMany(INITIAL_GAMES);
          } else {
            for (const g of INITIAL_GAMES) {
              const existing = await gamesCol.findOne({ id: g.id });
              if (!existing) {
                await gamesCol.insertOne(g);
              }
            }
          }
        })(),
        (async () => {
          const tournamentsCol = db.collection<Tournament>('tournaments');
          await tournamentsCol.createIndex({ id: 1 }, { unique: true });
          await tournamentsCol.createIndex({ slug: 1 }, { unique: true });
          await tournamentsCol.createIndex({ status: 1 });
          await tournamentsCol.createIndex({ isFeatured: 1 });
          const countTourn = await tournamentsCol.countDocuments();
          if (countTourn === 0) {
            await tournamentsCol.insertMany(INITIAL_TOURNAMENTS);
          }
        })(),
        (async () => {
          const regCol = db.collection<TournamentRegistration>('tournament_registrations');
          await regCol.createIndex({ id: 1 }, { unique: true });
          await regCol.createIndex({ registrationReference: 1 }, { unique: true });
          await regCol.createIndex({ tournamentId: 1 });
          await regCol.createIndex({ accessToken: 1 });
          await regCol.createIndex({ tournamentId: 1, phone: 1 });
        })(),
        (async () => {
          const resultsCol = db.collection<TournamentResult>('tournament_results');
          await resultsCol.createIndex({ id: 1 }, { unique: true });
          await resultsCol.createIndex({ tournamentId: 1 }, { unique: true });
          await resultsCol.createIndex({ tournamentSlug: 1 });
          const countResults = await resultsCol.countDocuments();
          if (countResults === 0) {
            await resultsCol.insertMany(INITIAL_TOURNAMENT_RESULTS);
          }
        })(),
        (async () => {
          const hofCol = db.collection<HallOfFameEntry>('hall_of_fame');
          await hofCol.createIndex({ id: 1 }, { unique: true });
          await hofCol.createIndex({ isPublished: 1 });
          await hofCol.createIndex({ order: 1 });
          const countHof = await hofCol.countDocuments();
          if (countHof === 0) {
            await hofCol.insertMany(INITIAL_HALL_OF_FAME);
          }
        })(),
        (async () => {
          const playersCol = db.collection<Player>('players');
          await playersCol.createIndex({ id: 1 }, { unique: true });
          await playersCol.createIndex({ gioId: 1 }, { unique: true, sparse: true });
          await playersCol.createIndex({ normalizedGioId: 1 }, { unique: true, sparse: true });
          await playersCol.createIndex({ referralCode: 1 }, { unique: true, sparse: true });
          await playersCol.createIndex({ normalizedPhone: 1 });
          await playersCol.createIndex({ status: 1 });
          await playersCol.createIndex({ membershipTier: 1 });
          await playersCol.createIndex({ gamerTag: 1 });
        })(),
        (async () => {
          const loyaltyCol = db.collection<LoyaltyLedgerEntry>('loyalty_ledger');
          await loyaltyCol.createIndex({ id: 1 }, { unique: true });
          await loyaltyCol.createIndex({ playerId: 1, createdAt: -1 });
          await loyaltyCol.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
        })(),
        (async () => {
          const referralsCol = db.collection<Referral>('referrals');
          await referralsCol.createIndex({ id: 1 }, { unique: true });
          await referralsCol.createIndex({ referrerPlayerId: 1 });
          await referralsCol.createIndex({ referredPlayerId: 1 });
          await referralsCol.createIndex({ status: 1 });
        })(),
        (async () => {
          const remindersCol = db.collection<AdminReminder>('crm_reminders');
          await remindersCol.createIndex({ id: 1 }, { unique: true });
          await remindersCol.createIndex({ status: 1, dueDate: 1 });
        })(),
        (async () => {
          const eventsCol = db.collection<AutomationEvent>('automation_events');
          await eventsCol.createIndex({ id: 1 }, { unique: true });
          await eventsCol.createIndex({ status: 1 });
          await eventsCol.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
        })(),
        (async () => {
          const commsCol = db.collection<CommunicationLog>('communication_logs');
          await commsCol.createIndex({ id: 1 }, { unique: true });
          await commsCol.createIndex({ playerId: 1, createdAt: -1 });
        })(),
        (async () => {
          const diningCol = db.collection<DiningReservation>('dining_reservations');
          await diningCol.createIndex({ id: 1 }, { unique: true });
          await diningCol.createIndex({ reference: 1 }, { unique: true });
          await diningCol.createIndex({ phone: 1 });
          await diningCol.createIndex({ date: 1 });
          await diningCol.createIndex({ status: 1 });
          await diningCol.createIndex({ playerId: 1 });
        })(),
        (async () => {
          const eventCol = db.collection<EventReservation>('event_reservations');
          await eventCol.createIndex({ id: 1 }, { unique: true });
          await eventCol.createIndex({ reference: 1 }, { unique: true });
          await eventCol.createIndex({ phone: 1 });
          await eventCol.createIndex({ date: 1 });
          await eventCol.createIndex({ status: 1 });
          await eventCol.createIndex({ playerId: 1 });
        })(),
        (async () => {
          const pushCol = db.collection<AdminPushSubscription>('admin_push_subscriptions');
          await pushCol.createIndex({ id: 1 }, { unique: true });
          await pushCol.createIndex({ endpoint: 1 }, { unique: true });
        })(),
        (async () => {
          const menuCol = db.collection<MenuCustomization>('menu_customizations');
          await menuCol.createIndex({ menuItemId: 1 }, { unique: true });
          await menuCol.createIndex({ isFeatured: 1 });
        })(),
        (async () => {
          const galleryCol = db.collection<GalleryItem>('gallery_items');
          await galleryCol.createIndex({ id: 1 }, { unique: true });
          await galleryCol.createIndex({ category: 1 });
          await galleryCol.createIndex({ isFeatured: 1 });
          await galleryCol.createIndex({ displayOrder: 1 });
        })(),
      ]);

      // Auto-backfill existing registrations and bookings into player profiles
      try {
        await this.backfillHistoricalData();
      } catch (bfErr) {
        console.warn('Warning during startup player backfill:', bfErr);
      }
    } catch (err) {
      console.warn('Warning during ensureIndexesAndSeed:', err);
    }
  }

  private loadFileStores(): void {
    try {
      if (fs.existsSync(this.resourcesFilePath)) {
        const raw = fs.readFileSync(this.resourcesFilePath, 'utf-8');
        const parsed: GamingResource[] = JSON.parse(raw);
        this.fileResources = parsed && parsed.length > 0 ? parsed : [...INITIAL_RESOURCES];
        for (const res of INITIAL_RESOURCES) {
          if (!this.fileResources.some((r) => r.id === res.id)) {
            this.fileResources.push(res);
          }
        }
        this.fileResources = this.fileResources.map((r) => {
          if (r.floorLocation) return r;
          if (r.category === 'ps5' || r.category === 'racing') return { ...r, floorLocation: 'Basement' };
          return { ...r, floorLocation: '1st Floor' };
        });
      } else {
        this.fileResources = [...INITIAL_RESOURCES];
        this.saveResourcesToFile();
      }

      if (fs.existsSync(this.gamesFilePath)) {
        const raw = fs.readFileSync(this.gamesFilePath, 'utf-8');
        const parsed: GameItem[] = JSON.parse(raw);
        this.fileGames = parsed && parsed.length > 0 ? parsed : [...INITIAL_GAMES];
        for (const g of INITIAL_GAMES) {
          if (!this.fileGames.some((x) => x.id === g.id)) {
            this.fileGames.push(g);
          }
        }
      } else {
        this.fileGames = [...INITIAL_GAMES];
        this.saveGamesToFile();
      }

      if (fs.existsSync(this.bookingsFilePath)) {
        const raw = fs.readFileSync(this.bookingsFilePath, 'utf-8');
        this.fileBookings = JSON.parse(raw);
      } else {
        this.fileBookings = [];
        this.saveBookingsToFile();
      }

      // Load Tournaments
      if (fs.existsSync(this.tournamentsFilePath)) {
        const raw = fs.readFileSync(this.tournamentsFilePath, 'utf-8');
        this.fileTournaments = JSON.parse(raw);
      } else {
        this.fileTournaments = [...INITIAL_TOURNAMENTS];
        this.saveTournamentsToFile();
      }

      // Load Registrations
      if (fs.existsSync(this.registrationsFilePath)) {
        const raw = fs.readFileSync(this.registrationsFilePath, 'utf-8');
        this.fileRegistrations = JSON.parse(raw);
      } else {
        this.fileRegistrations = [];
        this.saveRegistrationsToFile();
      }

      // Load Results
      if (fs.existsSync(this.resultsFilePath)) {
        const raw = fs.readFileSync(this.resultsFilePath, 'utf-8');
        this.fileResults = JSON.parse(raw);
      } else {
        this.fileResults = [...INITIAL_TOURNAMENT_RESULTS];
        this.saveResultsToFile();
      }

      // Load Hall of Fame
      if (fs.existsSync(this.hallOfFameFilePath)) {
        const raw = fs.readFileSync(this.hallOfFameFilePath, 'utf-8');
        this.fileHallOfFame = JSON.parse(raw);
      } else {
        this.fileHallOfFame = [...INITIAL_HALL_OF_FAME];
        this.saveHallOfFameToFile();
      }

      // Load Players
      if (fs.existsSync(this.playersFilePath)) {
        const raw = fs.readFileSync(this.playersFilePath, 'utf-8');
        this.filePlayers = JSON.parse(raw);
      } else {
        this.filePlayers = [];
        this.savePlayersToFile();
      }

      // Load Loyalty Ledger
      if (fs.existsSync(this.loyaltyFilePath)) {
        const raw = fs.readFileSync(this.loyaltyFilePath, 'utf-8');
        this.fileLoyaltyLedger = JSON.parse(raw);
      } else {
        this.fileLoyaltyLedger = [];
        this.saveLoyaltyToFile();
      }

      // Load Referrals
      if (fs.existsSync(this.referralsFilePath)) {
        const raw = fs.readFileSync(this.referralsFilePath, 'utf-8');
        this.fileReferrals = JSON.parse(raw);
      } else {
        this.fileReferrals = [];
        this.saveReferralsToFile();
      }

      // Load Loyalty Rules
      if (fs.existsSync(this.loyaltyRulesFilePath)) {
        const raw = fs.readFileSync(this.loyaltyRulesFilePath, 'utf-8');
        this.fileLoyaltyRules = JSON.parse(raw);
      } else {
        this.fileLoyaltyRules = { ...DEFAULT_LOYALTY_RULES };
        this.saveLoyaltyRulesToFile();
      }

      // Load Automation Events
      if (fs.existsSync(this.automationEventsFilePath)) {
        const raw = fs.readFileSync(this.automationEventsFilePath, 'utf-8');
        this.fileAutomationEvents = JSON.parse(raw);
      } else {
        this.fileAutomationEvents = [];
        this.saveAutomationEventsToFile();
      }

      // Load CRM Reminders
      if (fs.existsSync(this.crmRemindersFilePath)) {
        const raw = fs.readFileSync(this.crmRemindersFilePath, 'utf-8');
        this.fileCrmReminders = JSON.parse(raw);
      } else {
        this.fileCrmReminders = [];
        this.saveCrmRemindersToFile();
      }

      // Load Communication Logs
      if (fs.existsSync(this.communicationLogsFilePath)) {
        const raw = fs.readFileSync(this.communicationLogsFilePath, 'utf-8');
        this.fileCommunicationLogs = JSON.parse(raw);
      } else {
        this.fileCommunicationLogs = [];
        this.saveCommunicationLogsToFile();
      }

      // Load Dining Reservations
      if (fs.existsSync(this.diningReservationsFilePath)) {
        const raw = fs.readFileSync(this.diningReservationsFilePath, 'utf-8');
        this.fileDiningReservations = JSON.parse(raw);
      } else {
        this.fileDiningReservations = [];
        this.saveDiningReservationsToFile();
      }

      // Load Event Reservations
      if (fs.existsSync(this.eventReservationsFilePath)) {
        const raw = fs.readFileSync(this.eventReservationsFilePath, 'utf-8');
        this.fileEventReservations = JSON.parse(raw);
      } else {
        this.fileEventReservations = [];
        this.saveEventReservationsToFile();
      }

      // Load Push Subscriptions
      if (fs.existsSync(this.pushSubscriptionsFilePath)) {
        const raw = fs.readFileSync(this.pushSubscriptionsFilePath, 'utf-8');
        this.filePushSubscriptions = JSON.parse(raw);
      } else {
        this.filePushSubscriptions = [];
        this.savePushSubscriptionsToFile();
      }

      // Load Menu Customizations
      if (fs.existsSync(this.menuCustomizationsFilePath)) {
        const raw = fs.readFileSync(this.menuCustomizationsFilePath, 'utf-8');
        this.fileMenuCustomizations = JSON.parse(raw);
      } else {
        this.fileMenuCustomizations = [];
        this.saveMenuCustomizationsToFile();
      }

      // Load Gallery Items
      if (fs.existsSync(this.galleryItemsFilePath)) {
        const raw = fs.readFileSync(this.galleryItemsFilePath, 'utf-8');
        this.fileGalleryItems = JSON.parse(raw);
      } else {
        this.fileGalleryItems = [];
        this.saveGalleryItemsToFile();
      }
    } catch (err) {
      console.error('Error reading fallback JSON stores:', err);
      this.fileResources = [...INITIAL_RESOURCES];
      this.fileBookings = [];
      this.fileTournaments = [...INITIAL_TOURNAMENTS];
      this.fileRegistrations = [];
      this.fileResults = [...INITIAL_TOURNAMENT_RESULTS];
      this.fileHallOfFame = [...INITIAL_HALL_OF_FAME];
      this.filePlayers = [];
      this.fileLoyaltyLedger = [];
      this.fileReferrals = [];
      this.fileLoyaltyRules = { ...DEFAULT_LOYALTY_RULES };
      this.fileAutomationEvents = [];
      this.fileCrmReminders = [];
      this.fileCommunicationLogs = [];
      this.fileDiningReservations = [];
      this.fileEventReservations = [];
      this.filePushSubscriptions = [];
      this.fileMenuCustomizations = [];
      this.fileGalleryItems = [];
    }
  }

  private saveMenuCustomizationsToFile(): void {
    try {
      fs.writeFileSync(this.menuCustomizationsFilePath, JSON.stringify(this.fileMenuCustomizations, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving menu customizations to file:', err);
    }
  }

  private saveGalleryItemsToFile(): void {
    try {
      fs.writeFileSync(this.galleryItemsFilePath, JSON.stringify(this.fileGalleryItems, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving gallery items to file:', err);
    }
  }

  private savePushSubscriptionsToFile(): void {
    try {
      fs.writeFileSync(this.pushSubscriptionsFilePath, JSON.stringify(this.filePushSubscriptions, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving push subscriptions to file:', err);
    }
  }

  private saveDiningReservationsToFile(): void {
    try {
      fs.writeFileSync(this.diningReservationsFilePath, JSON.stringify(this.fileDiningReservations, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving dining reservations to file:', err);
    }
  }

  private saveEventReservationsToFile(): void {
    try {
      fs.writeFileSync(this.eventReservationsFilePath, JSON.stringify(this.fileEventReservations, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving event reservations to file:', err);
    }
  }

  private saveResourcesToFile(): void {
    try {
      fs.writeFileSync(this.resourcesFilePath, JSON.stringify(this.fileResources, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving resources to file:', err);
    }
  }

  private saveGamesToFile(): void {
    try {
      fs.writeFileSync(this.gamesFilePath, JSON.stringify(this.fileGames, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving games to file:', err);
    }
  }

  private saveBookingsToFile(): void {
    try {
      fs.writeFileSync(this.bookingsFilePath, JSON.stringify(this.fileBookings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving bookings to file:', err);
    }
  }

  private saveTournamentsToFile(): void {
    try {
      fs.writeFileSync(this.tournamentsFilePath, JSON.stringify(this.fileTournaments, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving tournaments to file:', err);
    }
  }

  private saveRegistrationsToFile(): void {
    try {
      fs.writeFileSync(this.registrationsFilePath, JSON.stringify(this.fileRegistrations, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving registrations to file:', err);
    }
  }

  private saveResultsToFile(): void {
    try {
      fs.writeFileSync(this.resultsFilePath, JSON.stringify(this.fileResults, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving results to file:', err);
    }
  }

  private saveHallOfFameToFile(): void {
    try {
      fs.writeFileSync(this.hallOfFameFilePath, JSON.stringify(this.fileHallOfFame, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving hall of fame to file:', err);
    }
  }

  private savePlayersToFile(): void {
    try {
      fs.writeFileSync(this.playersFilePath, JSON.stringify(this.filePlayers, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving players to file:', err);
    }
  }

  private saveLoyaltyToFile(): void {
    try {
      fs.writeFileSync(this.loyaltyFilePath, JSON.stringify(this.fileLoyaltyLedger, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving loyalty ledger to file:', err);
    }
  }

  private saveReferralsToFile(): void {
    try {
      fs.writeFileSync(this.referralsFilePath, JSON.stringify(this.fileReferrals, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving referrals to file:', err);
    }
  }

  private saveLoyaltyRulesToFile(): void {
    try {
      fs.writeFileSync(this.loyaltyRulesFilePath, JSON.stringify(this.fileLoyaltyRules, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving loyalty rules to file:', err);
    }
  }

  private saveAutomationEventsToFile(): void {
    try {
      fs.writeFileSync(this.automationEventsFilePath, JSON.stringify(this.fileAutomationEvents, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving automation events to file:', err);
    }
  }

  private saveCrmRemindersToFile(): void {
    try {
      fs.writeFileSync(this.crmRemindersFilePath, JSON.stringify(this.fileCrmReminders, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving CRM reminders to file:', err);
    }
  }

  private saveCommunicationLogsToFile(): void {
    try {
      fs.writeFileSync(this.communicationLogsFilePath, JSON.stringify(this.fileCommunicationLogs, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving communication logs to file:', err);
    }
  }

  // Mutex wrapper to prevent race conditions on resource bookings
  private async acquireLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    while (this.mutexLock.has(key)) {
      await this.mutexLock.get(key);
    }
    let resolveLock!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.mutexLock.set(key, promise);
    try {
      return await task();
    } finally {
      this.mutexLock.delete(key);
      resolveLock();
    }
  }

  // ======================== RESOURCES & EQUIPMENT ========================

  private ensureFloorLocation(r: GamingResource): GamingResource {
    if (r.floorLocation) return r;
    if (r.category === 'ps5' || r.category === 'racing') return { ...r, floorLocation: 'Basement' };
    return { ...r, floorLocation: '1st Floor' };
  }

  async getResources(): Promise<GamingResource[]> {
    if (this.isMongoConnected && this.db) {
      const items = await this.db.collection<GamingResource>('resources').find({ active: true }).sort({ order: 1 }).toArray();
      return items.map((r) => this.ensureFloorLocation(r));
    }
    return this.fileResources.filter((r) => r.active).map((r) => this.ensureFloorLocation(r)).sort((a, b) => a.order - b.order);
  }

  async getAllResources(includeInactive = false): Promise<GamingResource[]> {
    if (this.isMongoConnected && this.db) {
      const query = includeInactive ? {} : { active: true };
      const items = await this.db.collection<GamingResource>('resources').find(query).sort({ order: 1 }).toArray();
      return items.map((r) => this.ensureFloorLocation(r));
    }
    if (includeInactive) {
      return [...this.fileResources].map((r) => this.ensureFloorLocation(r)).sort((a, b) => a.order - b.order);
    }
    return this.fileResources.filter((r) => r.active).map((r) => this.ensureFloorLocation(r)).sort((a, b) => a.order - b.order);
  }

  async getResourceById(id: string): Promise<GamingResource | null> {
    if (this.isMongoConnected && this.db) {
      const item = await this.db.collection<GamingResource>('resources').findOne({ id });
      return item ? this.ensureFloorLocation(item) : null;
    }
    const item = this.fileResources.find((r) => r.id === id) || null;
    return item ? this.ensureFloorLocation(item) : null;
  }

  async createResource(resourceData: Partial<GamingResource>): Promise<GamingResource> {
    const rawId = resourceData.id || `res-${(resourceData.category || 'station')}-${Date.now().toString().slice(-4)}`;
    const id = rawId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const now = new Date().toISOString();

    const floorLocation = resourceData.floorLocation || ((resourceData.category === 'ps5' || resourceData.category === 'racing') ? 'Basement' : '1st Floor');

    const resource: GamingResource = {
      id,
      name: resourceData.name || 'Gaming Station',
      category: resourceData.category || 'ps5',
      zoneId: resourceData.zoneId || `${resourceData.category || 'ps5'}-arena`,
      floorLocation,
      ratePerHour: Number(resourceData.ratePerHour) || 150,
      minDurationMinutes: Number(resourceData.minDurationMinutes) || 30,
      maxDurationMinutes: Number(resourceData.maxDurationMinutes) || 180,
      playersCapacity: resourceData.playersCapacity || { min: 1, max: 4 },
      active: resourceData.active !== undefined ? Boolean(resourceData.active) : true,
      isMaintenance: Boolean(resourceData.isMaintenance),
      maintenanceReason: resourceData.maintenanceReason || '',
      specs: Array.isArray(resourceData.specs) && resourceData.specs.length > 0 ? resourceData.specs : ['High Performance Gaming Station'],
      image: resourceData.image || '/assets/real/ps5_setup.png',
      order: Number(resourceData.order) || 10,
      machineIdentifier: resourceData.machineIdentifier || id.toUpperCase(),
      availableGames: Array.isArray(resourceData.availableGames) ? resourceData.availableGames : [],
      createdAt: now,
      updatedAt: now,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<GamingResource>('resources').updateOne(
        { id: resource.id },
        { $set: resource },
        { upsert: true }
      );
    }

    const idx = this.fileResources.findIndex((r) => r.id === resource.id);
    if (idx !== -1) {
      this.fileResources[idx] = resource;
    } else {
      this.fileResources.push(resource);
    }
    this.saveResourcesToFile();

    return resource;
  }

  async updateResource(id: string, updates: Partial<GamingResource>): Promise<GamingResource | null> {
    const timestampUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<GamingResource>('resources').findOneAndUpdate(
        { id },
        { $set: timestampUpdates },
        { returnDocument: 'after' }
      );
      return res || null;
    }
    const idx = this.fileResources.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.fileResources[idx] = { ...this.fileResources[idx], ...timestampUpdates };
    this.saveResourcesToFile();
    return this.fileResources[idx];
  }

  async deleteResource(id: string): Promise<{ success: boolean; error?: string; activeBookingsCount?: number }> {
    const resource = await this.getResourceById(id);
    if (!resource) {
      return { success: false, error: 'Equipment not found.' };
    }

    // Safety check: Check for active or upcoming bookings
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const allBookings = await this.getBookings({ resourceId: id });
    const activeOrUpcoming = allBookings.filter(
      (b) => (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending') && b.date >= today
    );

    if (activeOrUpcoming.length > 0) {
      return {
        success: false,
        error: `Cannot delete equipment "${resource.name}". It has ${activeOrUpcoming.length} active or scheduled booking(s). Please reschedule or complete these bookings first.`,
        activeBookingsCount: activeOrUpcoming.length,
      };
    }

    if (this.isMongoConnected && this.db) {
      await this.db.collection<GamingResource>('resources').deleteOne({ id });
    }

    const idx = this.fileResources.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.fileResources.splice(idx, 1);
      this.saveResourcesToFile();
    }

    if (resource.imagePublicId) {
      cloudinaryService.deleteImage(resource.imagePublicId).catch(() => {});
    }

    return { success: true };
  }

  async adjustCategoryQuantity(
    category: string,
    delta: number,
    templateData?: Partial<GamingResource>
  ): Promise<{ success: boolean; resource?: GamingResource; error?: string; activeBookingsCount?: number }> {
    const allResources = await this.getAllResources(true);
    const categoryResources = allResources.filter((r) => r.category === category && r.active);

    if (delta > 0) {
      // Increase machine count
      const existingCount = categoryResources.length;
      const nextNum = existingCount + 1;
      const baseTemplate = categoryResources[0] || INITIAL_RESOURCES.find((r) => r.category === category) || {
        ratePerHour: 150,
        playersCapacity: { min: 1, max: 4 },
        minDurationMinutes: 30,
        maxDurationMinutes: 180,
        zoneId: `${category}-arena`,
        specs: [`Standard ${category.toUpperCase()} Setup`],
        image: '/assets/real/ps5_setup.png',
      };

      const customName = templateData?.name || `${baseTemplate.name.split(' (')[0].replace(/\d+$/, '').trim()} ${nextNum}`;
      const customId = templateData?.id || `${category}-station-${Date.now().toString().slice(-4)}`;
      const customIdentifier = templateData?.machineIdentifier || `${category.toUpperCase()}-${String(nextNum).padStart(2, '0')}`;

      const newResource = await this.createResource({
        id: customId,
        name: customName,
        category: category as any,
        zoneId: templateData?.zoneId || baseTemplate.zoneId || `${category}-arena`,
        ratePerHour: templateData?.ratePerHour || baseTemplate.ratePerHour || 150,
        minDurationMinutes: templateData?.minDurationMinutes || baseTemplate.minDurationMinutes || 30,
        maxDurationMinutes: templateData?.maxDurationMinutes || baseTemplate.maxDurationMinutes || 180,
        playersCapacity: templateData?.playersCapacity || baseTemplate.playersCapacity || { min: 1, max: 4 },
        active: true,
        isMaintenance: false,
        specs: templateData?.specs || baseTemplate.specs || [`Standard ${category.toUpperCase()} Unit`],
        image: templateData?.image || baseTemplate.image || '/assets/real/ps5_setup.png',
        order: (baseTemplate.order || 1) + nextNum,
        machineIdentifier: customIdentifier,
      });

      return { success: true, resource: newResource };
    } else if (delta < 0) {
      // Decrease machine count: find an unbooked machine
      if (categoryResources.length <= 1) {
        return { success: false, error: `Cannot reduce quantity: Minimum 1 machine required for category ${category}.` };
      }

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const allBookings = await this.getBookings({ category: category as any });

      let targetMachine: GamingResource | null = null;
      for (let i = categoryResources.length - 1; i >= 0; i--) {
        const candidate = categoryResources[i];
        const candidateBookings = allBookings.filter(
          (b) => b.resourceId === candidate.id &&
                 (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending') &&
                 b.date >= today
        );
        if (candidateBookings.length === 0) {
          targetMachine = candidate;
          break;
        }
      }

      if (!targetMachine) {
        const totalActive = allBookings.filter((b) => (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending') && b.date >= today).length;
        return {
          success: false,
          error: `Cannot reduce machine quantity for ${category}. All ${categoryResources.length} machines have active or upcoming bookings.`,
          activeBookingsCount: totalActive,
        };
      }

      const res = await this.deleteResource(targetMachine.id);
      return { success: res.success, error: res.error, activeBookingsCount: res.activeBookingsCount };
    }

    return { success: true };
  }

  async getEquipmentSummary(): Promise<EquipmentSummary[]> {
    const allResources = await this.getAllResources(true);
    const activeResources = allResources.filter((r) => r.active);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const nowTime = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    
    // Get today's bookings to calculate active sessions
    const todayBookings = await this.getBookings({ date: today });
    const activeSessions = todayBookings.filter(
      (b) => (b.status === 'active' || b.status === 'confirmed') && b.startTime <= nowTime && b.endTime >= nowTime
    );

    const categories = Array.from(new Set(activeResources.map((r) => r.category)));
    
    const categoryLabels: Record<string, string> = {
      ps5: 'PlayStation 5 Pro Arena',
      pool: 'Hot-Shot 8-Ball Slate Pool',
      racing: 'Pro Racing Simulator Cockpit',
      foosball: 'Pro Soccer Foosball Table',
      boardgames: 'Curated Board Games Vault',
      xbox: 'Xbox Series X Arena',
      pc: 'PC Gaming Battlestation',
      snooker: 'Tournament Snooker Table',
    };

    return categories.map((cat) => {
      const machines = activeResources.filter((r) => r.category === cat);
      const maintenanceMachines = machines.filter((r) => r.isMaintenance).length;
      const bookedMachines = machines.filter((r) => activeSessions.some((b) => b.resourceId === r.id)).length;
      const availableMachines = machines.filter(
        (r) => !r.isMaintenance && !activeSessions.some((b) => b.resourceId === r.id)
      ).length;

      const first = machines[0];
      return {
        category: cat,
        name: categoryLabels[cat] || `${cat.toUpperCase()} Stations`,
        totalMachines: machines.length,
        availableMachines: Math.max(0, availableMachines),
        bookedMachines,
        maintenanceMachines,
        ratePerHour: first?.ratePerHour || 150,
        minPlayers: first?.playersCapacity?.min || 1,
        maxPlayers: first?.playersCapacity?.max || 4,
        image: first?.image || '/assets/real/ps5_setup.png',
        machines,
      };
    });
  }

  // ======================== GAMES LIBRARY ========================

  async getGames(filter?: { category?: string; isAvailable?: boolean }): Promise<GameItem[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.category && filter.category !== 'all') {
        query.category = filter.category;
      }
      if (filter?.isAvailable !== undefined) {
        query.isAvailable = filter.isAvailable;
      }
      return this.db.collection<GameItem>('games').find(query).sort({ order: 1, title: 1 }).toArray();
    }

    let games = [...this.fileGames];
    if (filter?.category && filter.category !== 'all') {
      games = games.filter((g) => g.category === filter.category);
    }
    if (filter?.isAvailable !== undefined) {
      games = games.filter((g) => g.isAvailable === filter.isAvailable);
    }
    return games.sort((a, b) => (a.order || 99) - (b.order || 99));
  }

  async getGameById(id: string): Promise<GameItem | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<GameItem>('games').findOne({ id });
    }
    return this.fileGames.find((g) => g.id === id) || null;
  }

  async createGame(gameData: Omit<GameItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<GameItem> {
    const rawId = gameData.id || `game-${gameData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}-${Date.now().toString().slice(-4)}`;
    const id = rawId.replace(/--+/g, '-');
    const now = new Date().toISOString();

    const game: GameItem = {
      id,
      title: gameData.title.trim(),
      category: gameData.category || 'ps5',
      genre: gameData.genre || 'Action',
      description: gameData.description || '',
      image: gameData.image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      isAvailable: gameData.isAvailable !== undefined ? Boolean(gameData.isAvailable) : true,
      minPlayers: Number(gameData.minPlayers) || 1,
      maxPlayers: Number(gameData.maxPlayers) || 2,
      order: Number(gameData.order) || 50,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<GameItem>('games').updateOne(
        { id: game.id },
        { $set: game },
        { upsert: true }
      );
    }

    const idx = this.fileGames.findIndex((g) => g.id === game.id);
    if (idx !== -1) {
      this.fileGames[idx] = game;
    } else {
      this.fileGames.push(game);
    }
    this.saveGamesToFile();

    return game;
  }

  async updateGame(id: string, updates: Partial<GameItem>): Promise<GameItem | null> {
    const timestampUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<GameItem>('games').findOneAndUpdate(
        { id },
        { $set: timestampUpdates },
        { returnDocument: 'after' }
      );
      return res || null;
    }

    const idx = this.fileGames.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.fileGames[idx] = { ...this.fileGames[idx], ...timestampUpdates };
    this.saveGamesToFile();
    return this.fileGames[idx];
  }

  async deleteGame(id: string): Promise<{ success: boolean; error?: string }> {
    const existing = await this.getGameById(id);
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<GameItem>('games').deleteOne({ id });
      if (res.deletedCount === 0) {
        return { success: false, error: 'Game not found.' };
      }
    }

    const idx = this.fileGames.findIndex((g) => g.id === id);
    if (idx !== -1) {
      this.fileGames.splice(idx, 1);
      this.saveGamesToFile();
    }

    if (existing?.imagePublicId) {
      cloudinaryService.deleteImage(existing.imagePublicId).catch(() => {});
    }

    return { success: true };
  }

  // ======================== BOOKINGS ========================

  async getBookings(filter?: AdminBookingFilter): Promise<Booking[]> {
    let bookings: Booking[] = [];

    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.date) query.date = filter.date;
      if (filter?.resourceId) query.resourceId = filter.resourceId;
      if (filter?.category) query.category = filter.category;
      if (filter?.status) query.status = filter.status;
      if (filter?.paymentStatus) query.paymentStatus = filter.paymentStatus;
      if (filter?.search) {
        const regex = new RegExp(filter.search, 'i');
        query.$or = [{ customerName: regex }, { phone: regex }, { id: regex }];
      }
      bookings = await this.db.collection<Booking>('bookings').find(query).sort({ date: -1, startTime: 1 }).toArray();
    } else {
      bookings = [...this.fileBookings];
      if (filter?.date) bookings = bookings.filter((b) => b.date === filter.date);
      if (filter?.resourceId) bookings = bookings.filter((b) => b.resourceId === filter.resourceId);
      if (filter?.category) bookings = bookings.filter((b) => b.category === filter.category);
      if (filter?.status) bookings = bookings.filter((b) => b.status === filter.status);
      if (filter?.paymentStatus) bookings = bookings.filter((b) => b.paymentStatus === filter.paymentStatus);
      if (filter?.search) {
        const s = filter.search.toLowerCase();
        bookings = bookings.filter(
          (b) =>
            b.customerName.toLowerCase().includes(s) ||
            b.phone.toLowerCase().includes(s) ||
            b.id.toLowerCase().includes(s)
        );
      }
      bookings.sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
    }

    // Auto-update statuses based on current time
    return this.refreshBookingStatuses(bookings);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    const rawId = (id || '').trim();
    const upperId = rawId.toUpperCase();
    let booking: Booking | null = null;

    if (this.isMongoConnected && this.db) {
      booking = await this.db.collection<Booking>('bookings').findOne({
        $or: [{ id: upperId }, { id: rawId }, { id: rawId.toLowerCase() }]
      });
    } else {
      booking = this.fileBookings.find((b) => b.id === upperId || b.id === rawId || b.id.toLowerCase() === rawId.toLowerCase()) || null;
    }

    if (booking) {
      const refreshed = this.refreshBookingStatuses([booking])[0];
      return refreshed;
    }
    return null;
  }

  async findBookingsByPhoneOrId(identifier: string): Promise<Booking[]> {
    const clean = identifier.trim();
    let results: Booking[] = [];

    if (this.isMongoConnected && this.db) {
      results = await this.db
        .collection<Booking>('bookings')
        .find({
          $or: [{ id: clean.toUpperCase() }, { phone: clean }],
        })
        .sort({ date: -1, startTime: -1 })
        .toArray();
    } else {
      results = this.fileBookings.filter(
        (b) => b.id.toUpperCase() === clean.toUpperCase() || b.phone === clean
      );
      results.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    }

    return this.refreshBookingStatuses(results);
  }

  /**
   * CRITICAL: Double Booking Prevention
   * Checks whether the requested interval [startTime, endTime) conflicts with any existing booking
   * on the same resource and date.
   */
  async checkConflict(
    resourceId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<{ hasConflict: boolean; conflictingBooking?: Booking }> {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);

    let candidateBookings: Booking[] = [];

    if (this.isMongoConnected && this.db) {
      candidateBookings = await this.db
        .collection<Booking>('bookings')
        .find({
          resourceId,
          date,
          status: { $in: ['confirmed', 'active', 'pending'] },
        })
        .toArray();
    } else {
      candidateBookings = this.fileBookings.filter(
        (b) =>
          b.resourceId === resourceId &&
          b.date === date &&
          ['confirmed', 'active', 'pending'].includes(b.status)
      );
    }

    for (const b of candidateBookings) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      if (doIntervalsOverlap(startMins, endMins, bStart, bEnd)) {
        return { hasConflict: true, conflictingBooking: b };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Atomically creates a booking with conflict verification under mutex lock.
   */
  async createBooking(booking: Booking): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    const lockKey = `${booking.resourceId}-${booking.date}`;

    return this.acquireLock(lockKey, async () => {
      // 1. Double check conflict immediately before write
      const conflictCheck = await this.checkConflict(
        booking.resourceId,
        booking.date,
        booking.startTime,
        booking.endTime
      );

      if (conflictCheck.hasConflict) {
        return {
          success: false,
          error: 'Sorry, this slot was just booked by another guest. Please select another time.',
        };
      }

      // 2. Initialize guestCode and verification attributes
      if (!booking.guestCode) {
        booking.guestCode = await this.generateUniqueGuestCode();
      }
      if (!booking.checkInStatus) {
        booking.checkInStatus = 'pending';
      }
      if (!booking.paymentStatus) {
        booking.paymentStatus = 'unpaid';
      }
      if (booking.paidAmount === undefined) {
        booking.paidAmount = booking.paymentStatus === 'paid' ? booking.totalAmount : 0;
      }
      if (booking.remainingBalance === undefined) {
        booking.remainingBalance = booking.paymentStatus === 'paid' ? 0 : Math.max(0, (booking.totalAmount || 0) - (booking.paidAmount || 0));
      }
      if (!booking.location) {
        booking.location = booking.category === 'ps5' || booking.category === 'racing' ? 'Basement' : '1st Floor';
      }
      if (!booking.payments) {
        booking.payments = [];
      }
      if (!booking.auditLogs) {
        booking.auditLogs = [];
      }

      // 3. Insert booking
      if (this.isMongoConnected && this.db) {
        await this.db.collection<Booking>('bookings').insertOne(booking);
      } else {
        this.fileBookings.push(booking);
        this.saveBookingsToFile();
      }

      // 3. Link or create player profile in CRM
      try {
        await this.linkPlayerToBooking(booking);
      } catch (crmErr) {
        console.warn('Non-fatal: Failed to link player to booking in CRM:', crmErr);
      }

      return { success: true, booking };
    });
  }

  /**
   * Extends an active or upcoming booking if no overlapping booking exists.
   * Tracks extension payments, duration, payment status, and syncs player CRM spending.
   */
  async extendBooking(
    id: string,
    additionalMinutes: number,
    options?: { paymentStatus?: PaymentStatus; idempotencyKey?: string; notes?: string }
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    const booking = await this.getBookingById(id);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return { success: false, error: `Cannot extend a ${booking.status} booking.` };
    }

    // Idempotency check: if an extension with this idempotencyKey already exists on this booking, return existing
    if (options?.idempotencyKey && Array.isArray(booking.extensions)) {
      const existingExt = booking.extensions.find((e) => e.idempotencyKey === options.idempotencyKey);
      if (existingExt) {
        return { success: true, booking };
      }
    }

    const currentEndMins = timeToMinutes(booking.endTime);
    const newEndMins = currentEndMins + additionalMinutes;
    const newEndTime = `${String(Math.floor(newEndMins / 60)).padStart(2, '0')}:${String(
      newEndMins % 60
    ).padStart(2, '0')}`;

    const lockKey = `${booking.resourceId}-${booking.date}`;

    return this.acquireLock(lockKey, async () => {
      // Check conflict for extended window [currentEndTime, newEndTime)
      const conflictCheck = await this.checkConflict(
        booking.resourceId,
        booking.date,
        booking.endTime,
        newEndTime,
        booking.id
      );

      if (conflictCheck.hasConflict) {
        return {
          success: false,
          error: 'Extension unavailable: another guest has already reserved the following time slot.',
        };
      }

      // Calculate updated total amount
      const resource = await this.getResourceById(booking.resourceId);
      const category = resource?.category || booking.category || 'ps5';
      const newDuration = booking.durationMinutes + additionalMinutes;
      const newTotal = calculateBookingPrice(
        category,
        newDuration,
        booking.numberOfPeople,
        resource?.ratePerHour || 150
      );

      const extensionCost = Math.max(0, newTotal - (booking.totalAmount || 0));
      const extPaymentStatus: PaymentStatus = options?.paymentStatus || 'paid';
      const nowIso = new Date().toISOString();

      const extensionRecord: BookingExtension = {
        id: `ext-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        extensionMinutes: additionalMinutes,
        amount: extensionCost,
        paymentStatus: extPaymentStatus,
        paidAt: extPaymentStatus === 'paid' ? nowIso : undefined,
        createdAt: nowIso,
        idempotencyKey: options?.idempotencyKey,
        notes: options?.notes || `Extended by ${additionalMinutes} mins`,
      };

      const existingExtensions = Array.isArray(booking.extensions) ? [...booking.extensions] : [];
      existingExtensions.push(extensionRecord);

      const originalAmount = booking.originalAmount !== undefined ? booking.originalAmount : booking.totalAmount;
      const extensionAmount = existingExtensions
        .filter((e) => e.paymentStatus === 'paid')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const updatedBooking: Booking = {
        ...booking,
        endTime: newEndTime,
        durationMinutes: newDuration,
        totalAmount: newTotal,
        originalAmount,
        extensionAmount,
        extensions: existingExtensions,
        updatedAt: nowIso,
      };

      if (this.isMongoConnected && this.db) {
        await this.db.collection<Booking>('bookings').updateOne({ id: booking.id }, { $set: updatedBooking });
      } else {
        const idx = this.fileBookings.findIndex((b) => b.id === booking.id);
        if (idx !== -1) {
          this.fileBookings[idx] = updatedBooking;
          this.saveBookingsToFile();
        }
      }

      // Sync and recalculate player spending if player linked
      let playerId = booking.playerId;
      if (!playerId) {
        const norm = this.normalizePhone(booking.phone);
        if (norm) {
          const pl = await this.getPlayerByPhone(norm);
          if (pl) {
            playerId = pl.id;
            // Also link player to booking in storage
            if (this.isMongoConnected && this.db) {
              await this.db.collection('bookings').updateOne({ id: booking.id }, { $set: { playerId: pl.id } });
            } else {
              const bIdx = this.fileBookings.findIndex((b) => b.id === booking.id);
              if (bIdx !== -1) this.fileBookings[bIdx].playerId = pl.id;
            }
          }
        }
      }

      if (playerId) {
        if (extPaymentStatus === 'paid' && extensionCost > 0) {
          try {
            const rules = await this.getLoyaltyRules();
            const extPoints = this.calculatePointsForSpend(extensionCost, rules);
            if (extPoints > 0) {
              await this.adjustPlayerLoyalty(
                playerId,
                extPoints,
                'earn',
                `Extension +${additionalMinutes} mins for Booking #${booking.id}`,
                booking.id,
                options?.idempotencyKey || `ext_${extensionRecord.id}`,
                {
                  sourceActivityType: 'booking_payment' as any,
                  paymentAmount: extensionCost,
                  adminActor: 'Staff',
                }
              );
            }
          } catch (extPointsErr) {
            console.warn('Failed to award loyalty points on booking extension:', extPointsErr);
          }
        }
        await this.recalculatePlayerStats(playerId);
      }

      return { success: true, booking: updatedBooking };
    });
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    const rawId = (id || '').trim();
    const cleanId = rawId.toUpperCase();
    const existing = await this.getBookingById(rawId);
    const payload = { ...updates, updatedAt: new Date().toISOString() };

    let updated: Booking | null = null;
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').findOneAndUpdate(
        { $or: [{ id: cleanId }, { id: rawId }, { id: rawId.toLowerCase() }] },
        { $set: payload },
        { returnDocument: 'after' }
      );
      updated = res || null;
    } else {
      const idx = this.fileBookings.findIndex((b) => b.id === cleanId || b.id === rawId || b.id.toLowerCase() === rawId.toLowerCase());
      if (idx !== -1) {
        this.fileBookings[idx] = { ...this.fileBookings[idx], ...payload };
        this.saveBookingsToFile();
        updated = this.fileBookings[idx];
      }
    }

    if (updated) {
      const isPaid = updated.paymentStatus === 'paid';
      const isCompleted = updated.status === 'completed';
      const wasPaid = existing?.paymentStatus === 'paid';
      const wasCompleted = existing?.status === 'completed';

      // 1. Award loyalty points if newly completed & paid (or if completed booking became paid)
      if (isCompleted && isPaid && (!wasCompleted || !wasPaid)) {
        try {
          await this.processGamingSessionCompleted(updated);
        } catch (e) {
          console.warn('Error processing gaming session completed loyalty:', e);
        }
      }

      // 2. Reverse loyalty points if cancelled
      if (updates.status === 'cancelled' && wasCompleted) {
        try {
          await this.processBookingCancelledOrRefunded(updated);
        } catch (e) {
          console.warn('Error reversing loyalty for cancelled booking:', e);
        }
      }

      // 3. Recalculate player stats immediately so spending/status is always up-to-date in CRM
      try {
        let pId = updated.playerId;
        if (!pId) {
          const norm = this.normalizePhone(updated.phone);
          if (norm) {
            const p = await this.getPlayerByPhone(norm);
            if (p) pId = p.id;
          }
        }
        if (pId) {
          await this.recalculatePlayerStats(pId);
        }
      } catch (statErr) {
        console.warn('Error recalculating player stats after booking update:', statErr);
      }
    }

    return updated;
  }

  async cancelBooking(id: string, reason?: string): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    const booking = await this.getBookingById(id);
    if (!booking) return { success: false, error: 'Booking not found.' };

    const notes = reason ? `${booking.notes ? booking.notes + ' | ' : ''}Cancelled: ${reason}` : booking.notes;
    const updated = await this.updateBooking(id, {
      status: 'cancelled',
      notes,
    });

    return { success: true, booking: updated || undefined };
  }

  async deleteBooking(id: string): Promise<boolean> {
    const rawId = (id || '').trim();
    const cleanId = rawId.toUpperCase();
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').deleteOne({
        $or: [{ id: cleanId }, { id: rawId }, { id: rawId.toLowerCase() }],
      });
      return (res.deletedCount || 0) > 0;
    } else {
      const initialLen = this.fileBookings.length;
      this.fileBookings = this.fileBookings.filter(
        (b) => b.id !== cleanId && b.id !== rawId && b.id.toLowerCase() !== rawId.toLowerCase()
      );
      if (this.fileBookings.length !== initialLen) {
        this.saveBookingsToFile();
        return true;
      }
      return false;
    }
  }

  async deleteBookings(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const cleanIds = ids.map((i) => i.trim().toUpperCase());

    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').deleteMany({ id: { $in: cleanIds } });
      return res.deletedCount || 0;
    } else {
      const initialLen = this.fileBookings.length;
      const idSet = new Set(cleanIds);
      this.fileBookings = this.fileBookings.filter((b) => !idSet.has(b.id));
      const deletedCount = initialLen - this.fileBookings.length;
      if (deletedCount > 0) {
        this.saveBookingsToFile();
      }
      return deletedCount;
    }
  }

  async clearBookingHistory(scope: 'completed_and_cancelled' | 'all' = 'completed_and_cancelled'): Promise<number> {
    const filterQuery: any = scope === 'all'
      ? {}
      : { status: { $in: ['completed', 'cancelled'] } };

    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').deleteMany(filterQuery);
      return res.deletedCount || 0;
    } else {
      const initialLen = this.fileBookings.length;
      if (scope === 'all') {
        this.fileBookings = [];
      } else {
        this.fileBookings = this.fileBookings.filter((b) => b.status !== 'completed' && b.status !== 'cancelled');
      }
      const deletedCount = initialLen - this.fileBookings.length;
      if (deletedCount > 0) {
        this.saveBookingsToFile();
      }
      return deletedCount;
    }
  }

  /**
   * Requirement 5: Automatic Booking Expiration & Status Refresh
   * Based on current time in Asia/Kolkata:
   * - If date < today: completed
   * - If date == today && currentTime >= endTime: completed
   * - If date == today && currentTime >= startTime && currentTime < endTime: active ("Currently Playing")
   * - If date == today && currentTime < startTime: confirmed
   */
  private refreshBookingStatuses(bookings: Booking[]): Booking[] {
    const now = getNowInKolkata();
    const currentMins = now.totalMinutes;
    let needsFileSave = false;

    const refreshed = bookings.map((b) => {
      if (b.status === 'cancelled') return b;

      let newStatus = b.status;
      if (b.date < now.dateStr) {
        newStatus = 'completed';
      } else if (b.date === now.dateStr) {
        const startMins = timeToMinutes(b.startTime);
        const endMins = timeToMinutes(b.endTime);

        if (currentMins >= endMins) {
          newStatus = 'completed';
        } else if (currentMins >= startMins && currentMins < endMins) {
          newStatus = 'active';
        } else if (b.status === 'active' && currentMins < startMins) {
          newStatus = 'confirmed';
        }
      }

      if (newStatus !== b.status) {
        b.status = newStatus;
        needsFileSave = true;
      }
      return b;
    });

    if (needsFileSave && !this.isMongoConnected) {
      this.saveBookingsToFile();
    }

    return refreshed;
  }

  // ======================== ADMIN SETTINGS ========================

  async getAdminPasscode(): Promise<string> {
    if (this.cachedAdminPasscode) {
      return this.cachedAdminPasscode;
    }

    if (this.isMongoConnected && this.db) {
      try {
        const doc = await this.db.collection('settings').findOne({ key: 'admin_passcode' });
        if (doc && (doc.hash || doc.value)) {
          this.cachedAdminPasscode = doc.hash || doc.value;
          return this.cachedAdminPasscode as string;
        }
      } catch (err) {
        console.error('Error fetching admin passcode from Mongo:', err);
      }
    } else {
      try {
        if (fs.existsSync(this.settingsFilePath)) {
          const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
          const data = JSON.parse(raw);
          if (data.admin_passcode_hash || data.admin_passcode) {
            this.cachedAdminPasscode = data.admin_passcode_hash || data.admin_passcode;
            return this.cachedAdminPasscode as string;
          }
        }
      } catch (err) {
        console.error('Error reading settings file:', err);
      }
    }

    this.cachedAdminPasscode = config.adminPasscode;
    return config.adminPasscode;
  }

  async verifyAdminPasscode(candidate: string): Promise<boolean> {
    if (!candidate || typeof candidate !== 'string') return false;
    const stored = await this.getAdminPasscode();
    if (!stored) return false;

    // Direct constant-time match (matches stored token or hash)
    if (timingSafeCompare(candidate.trim(), stored.trim())) {
      return true;
    }

    const isValid = verifyPassword(candidate, stored);
    if (isValid && !stored.includes('$')) {
      // Transparently upgrade legacy plaintext to secure scrypt hash
      this.setAdminPasscode(candidate).catch((err) =>
        console.warn('Notice: Background passcode hash upgrade notice:', err?.message || err)
      );
    }
    return isValid;
  }

  async setAdminPasscode(newPasscode: string): Promise<void> {
    const hashed = hashPassword(newPasscode);
    this.cachedAdminPasscode = hashed;

    if (this.isMongoConnected && this.db) {
      try {
        await this.db.collection('settings').updateOne(
          { key: 'admin_passcode' },
          {
            $set: { hash: hashed, updatedAt: new Date().toISOString() },
            $unset: { value: '' },
          },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving admin passcode to Mongo:', err);
      }
    }

    // Always also persist to local file store
    try {
      let data: any = {};
      if (fs.existsSync(this.settingsFilePath)) {
        try {
          data = JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf-8'));
        } catch {}
      }
      data.admin_passcode_hash = hashed;
      delete data.admin_passcode; // Remove unhashed legacy field
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving settings to file:', err);
    }
  }

  // ======================== CONTACT & WHATSAPP SETTINGS ========================

  resetContactSettingsCache(): void {
    this.cachedContactSettings = null;
  }

  async getContactSettings(): Promise<ContactSettings> {
    if (this.cachedContactSettings) {
      return { ...this.cachedContactSettings };
    }

    // Try MongoDB
    if (this.isMongoConnected && this.db) {
      try {
        const doc = await this.db.collection('settings').findOne({ key: 'contact_settings' });
        if (doc && doc.value) {
          this.cachedContactSettings = {
            ...DEFAULT_CONTACT_SETTINGS,
            ...doc.value,
            whatsappNumber: normalizeWhatsAppNumber(doc.value.whatsappNumber || DEFAULT_CONTACT_SETTINGS.whatsappNumber),
          };
          return { ...this.cachedContactSettings };
        }
      } catch (err) {
        console.error('Error fetching contact settings from Mongo:', err);
      }
    }

    // Try File store fallback
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.contact_settings) {
          this.cachedContactSettings = {
            ...DEFAULT_CONTACT_SETTINGS,
            ...data.contact_settings,
            whatsappNumber: normalizeWhatsAppNumber(data.contact_settings.whatsappNumber || DEFAULT_CONTACT_SETTINGS.whatsappNumber),
          };
          return { ...this.cachedContactSettings };
        }
      }
    } catch (err) {
      console.error('Error reading contact settings from file:', err);
    }

    this.cachedContactSettings = { ...DEFAULT_CONTACT_SETTINGS };
    return { ...this.cachedContactSettings };
  }

  async updateContactSettings(updates: Partial<ContactSettings>): Promise<ContactSettings> {
    const current = await this.getContactSettings();
    const cleanUpdates: Partial<ContactSettings> = {};

    if (updates.whatsappNumber !== undefined) {
      cleanUpdates.whatsappNumber = normalizeWhatsAppNumber(updates.whatsappNumber);
    }
    if (updates.phone !== undefined && typeof updates.phone === 'string') {
      cleanUpdates.phone = updates.phone.trim();
      cleanUpdates.displayPhone = formatReadablePhone(cleanUpdates.phone);
    } else if (cleanUpdates.whatsappNumber) {
      cleanUpdates.displayPhone = formatReadablePhone(cleanUpdates.whatsappNumber);
    }
    if (updates.displayPhone !== undefined && typeof updates.displayPhone === 'string') {
      cleanUpdates.displayPhone = updates.displayPhone.trim();
    }
    if (updates.email !== undefined && typeof updates.email === 'string') {
      cleanUpdates.email = updates.email.trim();
    }
    if (updates.brandName !== undefined && typeof updates.brandName === 'string') {
      cleanUpdates.brandName = updates.brandName.trim();
    }
    if (updates.addressLine1 !== undefined && typeof updates.addressLine1 === 'string') {
      cleanUpdates.addressLine1 = updates.addressLine1.trim();
    }
    if (updates.addressLine2 !== undefined && typeof updates.addressLine2 === 'string') {
      cleanUpdates.addressLine2 = updates.addressLine2.trim();
    }
    if (updates.landmark !== undefined && typeof updates.landmark === 'string') {
      cleanUpdates.landmark = updates.landmark.trim();
    }
    if (updates.city !== undefined && typeof updates.city === 'string') {
      cleanUpdates.city = updates.city.trim();
    }
    if (updates.state !== undefined && typeof updates.state === 'string') {
      cleanUpdates.state = updates.state.trim();
    }
    if (updates.country !== undefined && typeof updates.country === 'string') {
      cleanUpdates.country = updates.country.trim();
    }
    if (updates.pincode !== undefined && typeof updates.pincode === 'string') {
      cleanUpdates.pincode = updates.pincode.trim();
    }
    if (updates.googleMapsUrl !== undefined && typeof updates.googleMapsUrl === 'string') {
      cleanUpdates.googleMapsUrl = updates.googleMapsUrl.trim();
    }
    if (updates.instagramHandle !== undefined && typeof updates.instagramHandle === 'string') {
      cleanUpdates.instagramHandle = updates.instagramHandle.trim();
    }
    if (updates.instagramUrl !== undefined && typeof updates.instagramUrl === 'string') {
      cleanUpdates.instagramUrl = updates.instagramUrl.trim();
    }

    const merged: ContactSettings = {
      ...current,
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    };

    this.cachedContactSettings = merged;

    // 1. Save to MongoDB
    if (this.isMongoConnected && this.db) {
      try {
        await this.db.collection('settings').updateOne(
          { key: 'contact_settings' },
          {
            $set: {
              key: 'contact_settings',
              value: merged,
              updatedAt: merged.updatedAt,
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.error('Error saving contact settings to Mongo:', err);
      }
    }

    // 2. Save to local settings file
    try {
      let data: any = {};
      if (fs.existsSync(this.settingsFilePath)) {
        try {
          data = JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf-8'));
        } catch {}
      }
      data.contact_settings = merged;
      data.updatedAt = merged.updatedAt;
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving contact settings to file:', err);
    }

    return { ...merged };
  }

  // =========================================================================
  // DINING & EVENTS RESERVATIONS SYSTEM
  // =========================================================================

  async createDiningReservation(payload: {
    customerName: string;
    phone: string;
    whatsappPhone?: string;
    email?: string;
    guests: number;
    date: string;
    time: string;
    seatingPreference?: string;
    specialRequests?: string;
    additionalRequirements?: string;
  }): Promise<DiningReservation> {
    const customerName = (payload.customerName || '').trim();
    if (!customerName || customerName.length < 2) {
      throw new Error('Full name is required (at least 2 characters).');
    }
    const cleanPhone = (payload.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('A valid 10-digit mobile number is required.');
    }
    const normPhone = cleanPhone.slice(-10);
    const guests = Math.max(1, Number(payload.guests) || 2);
    if (!payload.date) throw new Error('Reservation date is required.');
    if (!payload.time) throw new Error('Preferred arrival time is required.');

    const nowIso = new Date().toISOString();
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reference = `GDR-${hex}`;
    const id = `gdr-${Date.now()}-${hex.toLowerCase()}`;

    // Match or create Player profile in CRM (Never award loyalty points for dining reservations)
    let player = await this.getPlayerByPhone(normPhone);
    if (!player) {
      try {
        const cleanGamerTag = customerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) || `Guest${hex.slice(0, 4)}`;
        player = await this.createPlayer({
          name: customerName,
          phone: normPhone,
          email: payload.email?.trim() || undefined,
          gamerTag: cleanGamerTag,
          acquisitionSource: 'dining_reservation' as any,
        });
      } catch (pErr) {
        console.warn('Could not auto-create player profile for dining reservation:', pErr);
      }
    }

    const guestCode = await this.generateUniqueGuestCode();
    const reservation: DiningReservation = {
      id,
      reference,
      referenceCode: reference,
      guestCode,
      checkInStatus: 'pending',
      paymentStatus: 'unpaid',
      type: 'dining',
      customerName,
      phone: normPhone,
      whatsappPhone: payload.whatsappPhone ? payload.whatsappPhone.replace(/\D/g, '').slice(-10) : undefined,
      email: payload.email?.trim() || undefined,
      guests,
      date: payload.date,
      time: payload.time,
      location: 'GioCasa Dine-in Restaurant — 1st Floor',
      seatingPreference: payload.seatingPreference || 'Any',
      specialRequests: payload.specialRequests?.trim() || undefined,
      additionalRequirements: payload.additionalRequirements?.trim() || undefined,
      status: 'confirmed',
      createdAt: nowIso,
      updatedAt: nowIso,
      playerId: player?.id,
      gioId: player?.gioId,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<DiningReservation>('dining_reservations').insertOne(reservation);
    } else {
      this.fileDiningReservations.push(reservation);
      this.saveDiningReservationsToFile();
    }

    if (player) {
      try {
        await this.recalculatePlayerStats(player.id);
      } catch (statErr) {
        console.warn('Could not recalculate player stats after dining reservation:', statErr);
      }
    }

    return reservation;
  }

  async createEventReservation(payload: {
    customerName: string;
    phone: string;
    whatsappPhone?: string;
    email: string;
    eventType: string;
    date: string;
    time: string;
    expectedGuests: number;
    estimatedBudget?: string;
    foodRequirements?: string;
    decorationRequirements?: string;
    additionalMessage?: string;
  }): Promise<EventReservation> {
    const customerName = (payload.customerName || '').trim();
    if (!customerName || customerName.length < 2) {
      throw new Error('Full name is required (at least 2 characters).');
    }
    const cleanPhone = (payload.phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('A valid 10-digit mobile number is required.');
    }
    const normPhone = cleanPhone.slice(-10);
    const email = (payload.email || '').trim();
    if (!email || !email.includes('@')) {
      throw new Error('A valid email address is required for event enquiries.');
    }
    const expectedGuests = Math.max(1, Number(payload.expectedGuests) || 10);
    if (!payload.date) throw new Error('Event date is required.');
    if (!payload.time) throw new Error('Preferred time is required.');

    const nowIso = new Date().toISOString();
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reference = `GER-${hex}`;
    const id = `ger-${Date.now()}-${hex.toLowerCase()}`;

    // Match or create Player profile in CRM (Never award loyalty points for event reservations)
    let player = await this.getPlayerByPhone(normPhone);
    if (!player) {
      try {
        const cleanGamerTag = customerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) || `Host${hex.slice(0, 4)}`;
        player = await this.createPlayer({
          name: customerName,
          phone: normPhone,
          email,
          gamerTag: cleanGamerTag,
          acquisitionSource: 'event_reservation' as any,
        });
      } catch (pErr) {
        console.warn('Could not auto-create player profile for event reservation:', pErr);
      }
    }

    const guestCode = await this.generateUniqueGuestCode();
    const reservation: EventReservation = {
      id,
      reference,
      referenceCode: reference,
      guestCode,
      checkInStatus: 'pending',
      paymentStatus: 'unpaid',
      type: 'event',
      customerName,
      phone: normPhone,
      whatsappPhone: payload.whatsappPhone ? payload.whatsappPhone.replace(/\D/g, '').slice(-10) : undefined,
      email,
      eventType: payload.eventType || 'Birthday',
      date: payload.date,
      time: payload.time,
      expectedGuests,
      estimatedBudget: payload.estimatedBudget?.trim() || undefined,
      foodRequirements: payload.foodRequirements?.trim() || undefined,
      decorationRequirements: payload.decorationRequirements?.trim() || undefined,
      additionalMessage: payload.additionalMessage?.trim() || undefined,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      playerId: player?.id,
      gioId: player?.gioId,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<EventReservation>('event_reservations').insertOne(reservation);
    } else {
      this.fileEventReservations.push(reservation);
      this.saveEventReservationsToFile();
    }

    if (player) {
      try {
        await this.recalculatePlayerStats(player.id);
      } catch (statErr) {
        console.warn('Could not recalculate player stats after event reservation:', statErr);
      }
    }

    return reservation;
  }

  async getDiningReservations(filter?: { status?: string; date?: string; search?: string }): Promise<DiningReservation[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.status && filter.status !== 'all') query.status = filter.status;
      if (filter?.date) query.date = filter.date;
      if (filter?.search) {
        const regex = new RegExp(filter.search, 'i');
        query.$or = [{ customerName: regex }, { phone: regex }, { reference: regex }, { id: regex }];
      }
      const res = await this.db.collection<DiningReservation>('dining_reservations').find(query).sort({ date: -1, time: -1, createdAt: -1 }).toArray();
      return res.map(r => ({ ...r, reference: r.reference || (r as any).referenceCode, referenceCode: (r as any).referenceCode || r.reference }));
    }
    let list = [...this.fileDiningReservations];
    if (filter?.status && filter.status !== 'all') list = list.filter((r) => r.status === filter.status);
    if (filter?.date) list = list.filter((r) => r.date === filter.date);
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      list = list.filter((r) => r.customerName.toLowerCase().includes(s) || r.phone.includes(s) || r.reference.toLowerCase().includes(s) || r.id.toLowerCase().includes(s));
    }
    return list.map(r => ({ ...r, reference: r.reference || (r as any).referenceCode, referenceCode: (r as any).referenceCode || r.reference })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getEventReservations(filter?: { status?: string; date?: string; search?: string }): Promise<EventReservation[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.status && filter.status !== 'all') query.status = filter.status;
      if (filter?.date) query.date = filter.date;
      if (filter?.search) {
        const regex = new RegExp(filter.search, 'i');
        query.$or = [{ customerName: regex }, { phone: regex }, { reference: regex }, { eventType: regex }, { id: regex }];
      }
      const res = await this.db.collection<EventReservation>('event_reservations').find(query).sort({ date: -1, time: -1, createdAt: -1 }).toArray();
      return res.map(r => ({ ...r, reference: r.reference || (r as any).referenceCode, referenceCode: (r as any).referenceCode || r.reference }));
    }
    let list = [...this.fileEventReservations];
    if (filter?.status && filter.status !== 'all') list = list.filter((r) => r.status === filter.status);
    if (filter?.date) list = list.filter((r) => r.date === filter.date);
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      list = list.filter((r) => r.customerName.toLowerCase().includes(s) || r.phone.includes(s) || r.reference.toLowerCase().includes(s) || r.eventType.toLowerCase().includes(s) || r.id.toLowerCase().includes(s));
    }
    return list.map(r => ({ ...r, reference: r.reference || (r as any).referenceCode, referenceCode: (r as any).referenceCode || r.reference })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getDiningReservationById(idOrRef: string): Promise<DiningReservation | null> {
    let item: DiningReservation | null = null;
    if (this.isMongoConnected && this.db) {
      item = await this.db.collection<DiningReservation>('dining_reservations').findOne({
        $or: [{ id: idOrRef }, { reference: idOrRef }, { referenceCode: idOrRef }]
      });
    } else {
      item = this.fileDiningReservations.find((r) => r.id === idOrRef || r.reference === idOrRef || (r as any).referenceCode === idOrRef) || null;
    }
    if (!item) return null;
    return { ...item, reference: item.reference || (item as any).referenceCode, referenceCode: (item as any).referenceCode || item.reference };
  }

  async getEventReservationById(idOrRef: string): Promise<EventReservation | null> {
    let item: EventReservation | null = null;
    if (this.isMongoConnected && this.db) {
      item = await this.db.collection<EventReservation>('event_reservations').findOne({
        $or: [{ id: idOrRef }, { reference: idOrRef }, { referenceCode: idOrRef }]
      });
    } else {
      item = this.fileEventReservations.find((r) => r.id === idOrRef || r.reference === idOrRef || (r as any).referenceCode === idOrRef) || null;
    }
    if (!item) return null;
    return { ...item, reference: item.reference || (item as any).referenceCode, referenceCode: (item as any).referenceCode || item.reference };
  }

  async updateDiningReservation(idOrRef: string, updates: Partial<DiningReservation>): Promise<DiningReservation | null> {
    const nowIso = new Date().toISOString();
    if (this.isMongoConnected && this.db) {
      const existing = await this.db.collection<DiningReservation>('dining_reservations').findOne({
        $or: [{ id: idOrRef }, { reference: idOrRef }]
      });
      if (!existing) return null;
      const { _id, id, reference, ...safeUpdates } = updates as any;
      safeUpdates.updatedAt = nowIso;
      await this.db.collection<DiningReservation>('dining_reservations').updateOne(
        { id: existing.id },
        { $set: safeUpdates }
      );
      return { ...existing, ...safeUpdates };
    }
    const idx = this.fileDiningReservations.findIndex((r) => r.id === idOrRef || r.reference === idOrRef);
    if (idx === -1) return null;
    const updated = { ...this.fileDiningReservations[idx], ...updates, updatedAt: nowIso };
    this.fileDiningReservations[idx] = updated;
    this.saveDiningReservationsToFile();
    return updated;
  }

  async updateEventReservation(idOrRef: string, updates: Partial<EventReservation>): Promise<EventReservation | null> {
    const nowIso = new Date().toISOString();
    if (this.isMongoConnected && this.db) {
      const existing = await this.db.collection<EventReservation>('event_reservations').findOne({
        $or: [{ id: idOrRef }, { reference: idOrRef }]
      });
      if (!existing) return null;
      const { _id, id, reference, ...safeUpdates } = updates as any;
      safeUpdates.updatedAt = nowIso;
      await this.db.collection<EventReservation>('event_reservations').updateOne(
        { id: existing.id },
        { $set: safeUpdates }
      );
      return { ...existing, ...safeUpdates };
    }
    const idx = this.fileEventReservations.findIndex((r) => r.id === idOrRef || r.reference === idOrRef);
    if (idx === -1) return null;
    const updated = { ...this.fileEventReservations[idx], ...updates, updatedAt: nowIso };
    this.fileEventReservations[idx] = updated;
    this.saveEventReservationsToFile();
    return updated;
  }

  async deleteDiningReservation(idOrRef: string): Promise<boolean> {
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection('dining_reservations').deleteOne({
        $or: [{ id: idOrRef }, { reference: idOrRef }]
      });
      return res.deletedCount > 0;
    }
    const before = this.fileDiningReservations.length;
    this.fileDiningReservations = this.fileDiningReservations.filter((r) => r.id !== idOrRef && r.reference !== idOrRef);
    if (this.fileDiningReservations.length !== before) {
      this.saveDiningReservationsToFile();
      return true;
    }
    return false;
  }

  async deleteEventReservation(idOrRef: string): Promise<boolean> {
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection('event_reservations').deleteOne({
        $or: [{ id: idOrRef }, { reference: idOrRef }]
      });
      return res.deletedCount > 0;
    }
    const before = this.fileEventReservations.length;
    this.fileEventReservations = this.fileEventReservations.filter((r) => r.id !== idOrRef && r.reference !== idOrRef);
    if (this.fileEventReservations.length !== before) {
      this.saveEventReservationsToFile();
      return true;
    }
    return false;
  }

  // =========================================================================
  // ADMIN WEB PUSH NOTIFICATIONS & DEVICE SUBSCRIPTIONS
  // =========================================================================

  async savePushSubscription(payload: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    deviceName?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AdminPushSubscription> {
    const nowIso = new Date().toISOString();
    const endpoint = payload.endpoint.trim();

    if (this.isMongoConnected && this.db) {
      const col = this.db.collection<AdminPushSubscription>('admin_push_subscriptions');
      const existing = await col.findOne({ endpoint });

      if (existing) {
        await col.updateOne(
          { endpoint },
          {
            $set: {
              keys: payload.keys,
              deviceName: payload.deviceName || existing.deviceName || 'Admin Device',
              userAgent: payload.userAgent || existing.userAgent,
              ipAddress: payload.ipAddress || existing.ipAddress,
              updatedAt: nowIso,
            },
          }
        );
        const updated = await col.findOne({ endpoint });
        return updated!;
      } else {
        const newSub: AdminPushSubscription = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          endpoint,
          keys: payload.keys,
          deviceName: payload.deviceName || 'Admin Device',
          userAgent: payload.userAgent,
          ipAddress: payload.ipAddress,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await col.insertOne(newSub);
        return newSub;
      }
    }

    // Disk fallback
    const idx = this.filePushSubscriptions.findIndex((s) => s.endpoint === endpoint);
    if (idx !== -1) {
      const existing = this.filePushSubscriptions[idx];
      const updated: AdminPushSubscription = {
        ...existing,
        keys: payload.keys,
        deviceName: payload.deviceName || existing.deviceName || 'Admin Device',
        userAgent: payload.userAgent || existing.userAgent,
        ipAddress: payload.ipAddress || existing.ipAddress,
        updatedAt: nowIso,
      };
      this.filePushSubscriptions[idx] = updated;
      this.savePushSubscriptionsToFile();
      return updated;
    } else {
      const newSub: AdminPushSubscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        endpoint,
        keys: payload.keys,
        deviceName: payload.deviceName || 'Admin Device',
        userAgent: payload.userAgent,
        ipAddress: payload.ipAddress,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.filePushSubscriptions.push(newSub);
      this.savePushSubscriptionsToFile();
      return newSub;
    }
  }

  async getPushSubscriptions(): Promise<AdminPushSubscription[]> {
    if (this.isMongoConnected && this.db) {
      return await this.db
        .collection<AdminPushSubscription>('admin_push_subscriptions')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
    }
    return [...this.filePushSubscriptions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<AdminPushSubscription | null> {
    const cleanEndpoint = endpoint.trim();
    if (this.isMongoConnected && this.db) {
      return await this.db.collection<AdminPushSubscription>('admin_push_subscriptions').findOne({ endpoint: cleanEndpoint });
    }
    return this.filePushSubscriptions.find((s) => s.endpoint === cleanEndpoint) || null;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const cleanEndpoint = endpoint.trim();
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection('admin_push_subscriptions').deleteOne({ endpoint: cleanEndpoint });
      return res.deletedCount > 0;
    }
    const before = this.filePushSubscriptions.length;
    this.filePushSubscriptions = this.filePushSubscriptions.filter((s) => s.endpoint !== cleanEndpoint);
    if (this.filePushSubscriptions.length !== before) {
      this.savePushSubscriptionsToFile();
      return true;
    }
    return false;
  }

  async deletePushSubscriptionById(id: string): Promise<boolean> {
    const cleanId = id.trim();
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection('admin_push_subscriptions').deleteOne({ id: cleanId });
      return res.deletedCount > 0;
    }
    const before = this.filePushSubscriptions.length;
    this.filePushSubscriptions = this.filePushSubscriptions.filter((s) => s.id !== cleanId);
    if (this.filePushSubscriptions.length !== before) {
      this.savePushSubscriptionsToFile();
      return true;
    }
    return false;
  }

  async touchPushSubscription(endpoint: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const cleanEndpoint = endpoint.trim();
    if (this.isMongoConnected && this.db) {
      await this.db.collection('admin_push_subscriptions').updateOne(
        { endpoint: cleanEndpoint },
        { $set: { lastUsedAt: nowIso } }
      );
      return;
    }
    const sub = this.filePushSubscriptions.find((s) => s.endpoint === cleanEndpoint);
    if (sub) {
      sub.lastUsedAt = nowIso;
      this.savePushSubscriptionsToFile();
    }
  }

  // =========================================================================
  // GIOCASA ARENA — TOURNAMENTS
  // =========================================================================

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async getTournaments(filter?: {
    status?: string;
    gameCategory?: string;
    isFeatured?: boolean;
    search?: string;
    includeDrafts?: boolean;
  }): Promise<Tournament[]> {
    let list: Tournament[] = [];

    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.status && filter.status !== 'all') {
        query.status = filter.status;
      } else if (!filter?.includeDrafts) {
        // Exclude draft from public
        query.status = { $ne: 'draft' };
      }

      if (filter?.gameCategory && filter.gameCategory !== 'all') {
        query.gameCategory = filter.gameCategory;
      }
      if (filter?.isFeatured !== undefined) {
        query.isFeatured = filter.isFeatured;
      }
      if (filter?.search) {
        const regex = new RegExp(filter.search, 'i');
        query.$or = [{ title: regex }, { gameTitle: regex }, { shortDescription: regex }];
      }

      list = await this.db.collection<Tournament>('tournaments').find(query).sort({ startDate: 1, startTime: 1 }).toArray();
    } else {
      list = [...this.fileTournaments];
      if (filter?.status && filter.status !== 'all') {
        list = list.filter((t) => t.status === filter.status);
      } else if (!filter?.includeDrafts) {
        list = list.filter((t) => t.status !== 'draft');
      }

      if (filter?.gameCategory && filter.gameCategory !== 'all') {
        list = list.filter((t) => t.gameCategory === filter.gameCategory);
      }
      if (filter?.isFeatured !== undefined) {
        list = list.filter((t) => t.isFeatured === filter.isFeatured);
      }
      if (filter?.search) {
        const s = filter.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.title.toLowerCase().includes(s) ||
            t.gameTitle.toLowerCase().includes(s) ||
            t.shortDescription.toLowerCase().includes(s)
        );
      }
      list.sort((a, b) => `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`));
    }

    return list;
  }

  async getTournamentBySlug(slug: string): Promise<Tournament | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Tournament>('tournaments').findOne({ slug });
    }
    return this.fileTournaments.find((t) => t.slug === slug) || null;
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Tournament>('tournaments').findOne({ id });
    }
    return this.fileTournaments.find((t) => t.id === id) || null;
  }

  async createTournament(payload: Partial<Tournament>): Promise<Tournament> {
    const title = (payload.title || '').trim();
    if (!title) throw new Error('Tournament title is required.');
    if (!payload.gameTitle) throw new Error('Game title is required.');
    if (!payload.startDate) throw new Error('Start date is required.');

    let baseSlug = payload.slug ? this.slugify(payload.slug) : this.slugify(title);
    if (!baseSlug) baseSlug = `tournament-${Date.now()}`;

    // Ensure slug uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (await this.getTournamentBySlug(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const nowIso = new Date().toISOString();
    const tournament: Tournament = {
      id: `tourn-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      title,
      slug,
      shortDescription: payload.shortDescription || '',
      description: payload.description || payload.shortDescription || '',
      gameTitle: payload.gameTitle,
      gameCategory: payload.gameCategory || 'ps5',
      format: payload.format || '1v1 Knockout',
      teamType: payload.teamType || 'individual',
      teamSize: payload.teamSize || { min: 1, max: 1 },
      bannerImage: payload.bannerImage || '/assets/real/ps5_setup.png',
      venue: payload.venue || 'GioCasa Upper Deck Gaming Lounge, Ayodhya',
      startDate: payload.startDate,
      startTime: payload.startTime || '18:00',
      endDate: payload.endDate,
      endTime: payload.endTime,
      registrationOpeningDate: payload.registrationOpeningDate || payload.startDate,
      registrationOpeningTime: payload.registrationOpeningTime || '10:00',
      registrationDeadlineDate: payload.registrationDeadlineDate || payload.startDate,
      registrationDeadlineTime: payload.registrationDeadlineTime || '16:00',
      maxCapacity: Math.max(2, Number(payload.maxCapacity) || 16),
      waitlistEnabled: Boolean(payload.waitlistEnabled),
      waitlistCapacity: Number(payload.waitlistCapacity) || 0,
      entryFeePaise: Math.max(0, Number(payload.entryFeePaise) || 0),
      prizePoolDetails: payload.prizePoolDetails || 'GioCasa Trophy + Honors',
      prizes: payload.prizes || [],
      eligibilityRequirements: payload.eligibilityRequirements || 'Open to all players.',
      rules: Array.isArray(payload.rules) && payload.rules.length > 0 ? payload.rules : ['Fair play and respectful conduct are mandatory.'],
      scheduleInstructions: payload.scheduleInstructions || 'Please arrive 30 minutes prior to match time.',
      requiredFields: Array.isArray(payload.requiredFields) ? payload.requiredFields : ['phone'],
      isFeatured: Boolean(payload.isFeatured),
      status: payload.status || 'draft',
      isRegistrationApprovalRequired: Boolean(payload.isRegistrationApprovalRequired),
      confirmedCount: 0,
      waitlistCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<Tournament>('tournaments').insertOne(tournament);
    } else {
      this.fileTournaments.push(tournament);
      this.saveTournamentsToFile();
    }

    return tournament;
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | null> {
    const existing = await this.getTournamentById(id);
    if (!existing) return null;

    if (updates.slug && updates.slug !== existing.slug) {
      const cleanSlug = this.slugify(updates.slug);
      const conflict = await this.getTournamentBySlug(cleanSlug);
      if (conflict && conflict.id !== id) {
        throw new Error(`The slug "${cleanSlug}" is already in use by another tournament.`);
      }
      updates.slug = cleanSlug;
    }

    // If replacing banner image on Cloudinary, clean up previous asset
    if (existing.bannerPublicId && updates.bannerPublicId && existing.bannerPublicId !== updates.bannerPublicId) {
      cloudinaryService.deleteImage(existing.bannerPublicId).catch((err) => {
        console.warn('Failed to delete old tournament banner from Cloudinary:', err);
      });
    }

    const updated: Tournament = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db.collection<Tournament>('tournaments').updateOne({ id }, { $set: fieldsToSet });
    } else {
      const idx = this.fileTournaments.findIndex((t) => t.id === id);
      if (idx !== -1) {
        this.fileTournaments[idx] = updated;
        this.saveTournamentsToFile();
      }
    }

    return updated;
  }

  async deleteTournament(id: string): Promise<boolean> {
    const existing = await this.getTournamentById(id);
    if (!existing) return false;

    // If registrations exist, mark as cancelled instead of hard deleting to preserve historical audit
    const registrations = await this.getTournamentRegistrations(id);
    if (registrations.length > 0) {
      await this.updateTournament(id, { status: 'cancelled' });
      return true;
    }

    if (this.isMongoConnected && this.db) {
      await this.db.collection<Tournament>('tournaments').deleteOne({ id });
    } else {
      this.fileTournaments = this.fileTournaments.filter((t) => t.id !== id);
      this.saveTournamentsToFile();
    }

    if (existing.bannerPublicId) {
      cloudinaryService.deleteImage(existing.bannerPublicId).catch((err) => {
        console.warn('Failed to delete tournament banner from Cloudinary:', err);
      });
    }

    return true;
  }

  // =========================================================================
  // GIOCASA ARENA — REGISTRATIONS (CONCURRENCY SAFE & ATOMIC)
  // =========================================================================

  async registerForTournament(
    slugOrId: string,
    payload: {
      participantName: string;
      phone: string;
      email?: string;
      inGameId?: string;
      teamName?: string;
      teammates?: { name: string; phone?: string; inGameId?: string }[];
      notes?: string;
      rulesAccepted: boolean;
    }
  ): Promise<{ registration: TournamentRegistration; tournament: Tournament }> {
    // 1. Basic input validation
    const participantName = (payload.participantName || '').trim();
    if (!participantName) throw new Error('Participant full name is required.');

    const normPhone = this.normalizePhone(payload.phone || '');
    if (!normPhone || normPhone.length < 10) {
      throw new Error('A valid mobile number (at least 10 digits) is required.');
    }

    if (!payload.rulesAccepted) {
      throw new Error('You must agree to the tournament rules and house guidelines.');
    }

    // 2. Concurrency-safe execution using tournament mutex lock
    return await this.acquireLock(`reg_${slugOrId}`, async () => {
      // Re-fetch latest tournament state inside lock
      let tournament = await this.getTournamentBySlug(slugOrId);
      if (!tournament) {
        tournament = await this.getTournamentById(slugOrId);
      }
      if (!tournament) {
        throw new Error('Tournament not found.');
      }

      // Check tournament status
      if (tournament.status !== 'published' && tournament.status !== 'live') {
        throw new Error(`Tournament registration is currently closed (Status: ${tournament.status}).`);
      }

      // Check dates in Asia/Kolkata
      const now = getNowInKolkata();
      const currentStamp = `${now.dateStr}T${now.timeStr}`;
      const openStamp = `${tournament.registrationOpeningDate}T${tournament.registrationOpeningTime || '00:00'}`;
      const deadlineStamp = `${tournament.registrationDeadlineDate}T${tournament.registrationDeadlineTime || '23:59'}`;

      if (currentStamp < openStamp) {
        throw new Error(
          `Registration opens on ${tournament.registrationOpeningDate} at ${tournament.registrationOpeningTime} IST.`
        );
      }

      if (currentStamp > deadlineStamp) {
        throw new Error(
          `Registration deadline passed on ${tournament.registrationDeadlineDate} at ${tournament.registrationDeadlineTime} IST.`
        );
      }

      // Check duplicate registration
      const existingRegistrations = await this.getTournamentRegistrations(tournament.id);
      const isDuplicate = existingRegistrations.some((r) => {
        if (r.status === 'cancelled' || r.status === 'rejected') return false;
        if (this.normalizePhone(r.phone) === normPhone) return true;
        if (payload.inGameId && r.inGameId && r.inGameId.toLowerCase() === payload.inGameId.trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      if (isDuplicate) {
        throw new Error('A registration with this mobile number or in-game ID already exists for this tournament.');
      }

      // Capacity enforcement
      const confirmedActiveCount = existingRegistrations.filter(
        (r) => r.status === 'confirmed' || r.status === 'checked_in' || r.status === 'pending_approval'
      ).length;

      let regStatus: TournamentRegistrationStatus = 'confirmed';
      if (confirmedActiveCount >= tournament.maxCapacity) {
        if (tournament.waitlistEnabled) {
          const waitlistActiveCount = existingRegistrations.filter((r) => r.status === 'waitlisted').length;
          if (tournament.waitlistCapacity > 0 && waitlistActiveCount >= tournament.waitlistCapacity) {
            throw new Error('Tournament capacity is full and the waitlist has reached maximum limits.');
          }
          regStatus = 'waitlisted';
        } else {
          throw new Error('Tournament has reached maximum participant capacity.');
        }
      } else if (tournament.isRegistrationApprovalRequired) {
        regStatus = 'pending_approval';
      }

      // Generate Reference Code
      const words = tournament.gameTitle.split(/\s+/);
      const codePart = words.map((w) => w[0]).join('').slice(0, 4).toUpperCase() || 'ARENA';
      const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
      const registrationReference = `GCA-${codePart}-${randomHex}`;

      // High entropy access token for private confirmation link
      const accessToken = crypto.randomBytes(24).toString('hex');
      const nowIso = new Date().toISOString();

      const registration: TournamentRegistration = {
        id: `reg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        registrationReference,
        accessToken,
        tournamentId: tournament.id,
        tournamentSlug: tournament.slug,
        participantName,
        phone: normPhone,
        email: payload.email ? payload.email.trim() : undefined,
        inGameId: payload.inGameId ? payload.inGameId.trim() : undefined,
        teamName: payload.teamName ? payload.teamName.trim() : undefined,
        teammates: payload.teammates || [],
        status: regStatus,
        paymentStatus: tournament.entryFeePaise === 0 ? 'waived' : 'unpaid',
        notes: payload.notes || '',
        rulesAccepted: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Persist Registration
      if (this.isMongoConnected && this.db) {
        await this.db.collection<TournamentRegistration>('tournament_registrations').insertOne(registration);
      } else {
        this.fileRegistrations.push(registration);
        this.saveRegistrationsToFile();
      }

      // Link or create player profile in CRM
      try {
        await this.linkPlayerToRegistration(registration);
      } catch (crmErr) {
        console.warn('Non-fatal: Failed to link player to registration in CRM:', crmErr);
      }

      // Update tournament participant counts
      const newConfirmedCount = regStatus === 'confirmed' || regStatus === 'pending_approval'
        ? confirmedActiveCount + 1
        : confirmedActiveCount;
      const newWaitlistCount = regStatus === 'waitlisted'
        ? (tournament.waitlistCount || 0) + 1
        : tournament.waitlistCount || 0;

      const updatedTournament = await this.updateTournament(tournament.id, {
        confirmedCount: newConfirmedCount,
        waitlistCount: newWaitlistCount,
      });

      return {
        registration,
        tournament: updatedTournament || tournament,
      };
    });
  }

  async getTournamentRegistrations(
    tournamentId: string,
    filter?: { status?: string; search?: string }
  ): Promise<TournamentRegistration[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = { tournamentId };
      if (filter?.status && filter.status !== 'all') {
        query.status = filter.status;
      }
      if (filter?.search) {
        const regex = new RegExp(filter.search, 'i');
        query.$or = [
          { participantName: regex },
          { registrationReference: regex },
          { phone: regex },
          { inGameId: regex },
          { teamName: regex },
        ];
      }
      return this.db
        .collection<TournamentRegistration>('tournament_registrations')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
    }

    let list = this.fileRegistrations.filter((r) => r.tournamentId === tournamentId);
    if (filter?.status && filter.status !== 'all') {
      list = list.filter((r) => r.status === filter.status);
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.participantName.toLowerCase().includes(s) ||
          r.registrationReference.toLowerCase().includes(s) ||
          r.phone.includes(s) ||
          (r.inGameId && r.inGameId.toLowerCase().includes(s)) ||
          (r.teamName && r.teamName.toLowerCase().includes(s))
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRegistrationById(idOrRef: string): Promise<TournamentRegistration | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<TournamentRegistration>('tournament_registrations').findOne({
        $or: [{ id: idOrRef }, { registrationReference: idOrRef }],
      });
    }
    return (
      this.fileRegistrations.find(
        (r) => r.id === idOrRef || r.registrationReference === idOrRef
      ) || null
    );
  }

  async getRegistrationByAccessToken(
    idOrRef: string,
    token: string
  ): Promise<{ registration: TournamentRegistration; tournament: Tournament } | null> {
    const reg = await this.getRegistrationById(idOrRef);
    if (!reg) return null;
    if (reg.accessToken !== token) return null;

    const tournament = await this.getTournamentById(reg.tournamentId);
    if (!tournament) return null;

    return { registration: reg, tournament };
  }

  async updateRegistration(
    id: string,
    updates: Partial<TournamentRegistration>
  ): Promise<TournamentRegistration | null> {
    const existing = await this.getRegistrationById(id);
    if (!existing) return null;

    const oldStatus = existing.status;
    const newStatus = updates.status || oldStatus;

    const updated: TournamentRegistration = {
      ...existing,
      ...updates,
      id: existing.id,
      tournamentId: existing.tournamentId,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db
        .collection<TournamentRegistration>('tournament_registrations')
        .updateOne({ id: existing.id }, { $set: fieldsToSet });
    } else {
      const idx = this.fileRegistrations.findIndex((r) => r.id === existing.id);
      if (idx !== -1) {
        this.fileRegistrations[idx] = updated;
        this.saveRegistrationsToFile();
      }
    }

    // Handle capacity change and waitlist promotion policy if confirmed participant was cancelled/rejected
    if (
      (oldStatus === 'confirmed' || oldStatus === 'pending_approval') &&
      (newStatus === 'cancelled' || newStatus === 'rejected')
    ) {
      const tournament = await this.getTournamentById(existing.tournamentId);
      if (tournament) {
        let confirmedCount = Math.max(0, (tournament.confirmedCount || 1) - 1);
        let waitlistCount = tournament.waitlistCount || 0;

        // Auto-promote earliest waitlisted participant if waitlist enabled
        if (tournament.waitlistEnabled) {
          const waitlistedRegs = (await this.getTournamentRegistrations(tournament.id, { status: 'waitlisted' }))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

          if (waitlistedRegs.length > 0) {
            const promoted = waitlistedRegs[0];
            promoted.status = 'confirmed';
            promoted.updatedAt = new Date().toISOString();
            if (this.isMongoConnected && this.db) {
              await this.db.collection('tournament_registrations').updateOne({ id: promoted.id }, { $set: promoted });
            } else {
              const pIdx = this.fileRegistrations.findIndex((r) => r.id === promoted.id);
              if (pIdx !== -1) this.fileRegistrations[pIdx] = promoted;
              this.saveRegistrationsToFile();
            }
            confirmedCount++;
            waitlistCount = Math.max(0, waitlistCount - 1);
          }
        }

        await this.updateTournament(tournament.id, { confirmedCount, waitlistCount });
      }
    }

    // Award loyalty points on verified tournament check-in
    const wasCheckedIn = oldStatus === 'checked_in';
    const isCheckedIn = newStatus === 'checked_in';
    const isPaidOrWaived = updated.paymentStatus !== 'unpaid';

    if (isCheckedIn && !wasCheckedIn && isPaidOrWaived) {
      try {
        await this.processTournamentParticipation(updated);
      } catch (err) {
        console.warn('Error processing tournament participation loyalty:', err);
      }
    } else if ((newStatus === 'cancelled' || newStatus === 'rejected') && wasCheckedIn) {
      try {
        await this.processTournamentRegistrationCancelled(updated);
      } catch (err) {
        console.warn('Error reversing tournament participation loyalty:', err);
      }
    }

    return updated;
  }

  // =========================================================================
  // GIOCASA ARENA — TOURNAMENT RESULTS & STANDINGS
  // =========================================================================

  async getTournamentResults(slugOrId: string): Promise<TournamentResult | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<TournamentResult>('tournament_results').findOne({
        $or: [{ tournamentId: slugOrId }, { tournamentSlug: slugOrId }],
      });
    }
    return (
      this.fileResults.find(
        (r) => r.tournamentId === slugOrId || r.tournamentSlug === slugOrId
      ) || null
    );
  }

  async saveTournamentResults(
    tournamentId: string,
    data: Partial<TournamentResult>
  ): Promise<TournamentResult> {
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const existing = await this.getTournamentResults(tournamentId);
    const nowIso = new Date().toISOString();

    const result: TournamentResult = {
      id: existing ? existing.id : `res-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      tournamentId: tournament.id,
      tournamentSlug: tournament.slug,
      isPublished: data.isPublished !== undefined ? data.isPublished : existing ? existing.isPublished : false,
      publishedAt: data.isPublished ? nowIso : existing?.publishedAt,
      summary: data.summary || existing?.summary || '',
      standings: data.standings || existing?.standings || [],
      createdAt: existing ? existing.createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = result as any;
      await this.db
        .collection<TournamentResult>('tournament_results')
        .updateOne({ tournamentId: tournament.id }, { $set: fieldsToSet }, { upsert: true });
    } else {
      const idx = this.fileResults.findIndex((r) => r.tournamentId === tournament.id);
      if (idx !== -1) {
        this.fileResults[idx] = result;
      } else {
        this.fileResults.push(result);
      }
      this.saveResultsToFile();
    }

    if (result.isPublished) {
      try {
        await this.processTournamentResultsFinalized(result);
      } catch (err) {
        console.warn('Error processing tournament placement loyalty bonuses:', err);
      }
    }

    return result;
  }

  async publishResultsToHallOfFame(tournamentId: string): Promise<HallOfFameEntry | null> {
    const results = await this.getTournamentResults(tournamentId);
    if (!results || !results.standings || results.standings.length === 0) {
      throw new Error('No standings recorded for this tournament.');
    }

    const championStanding = results.standings.find((s) => s.rank === 1) || results.standings[0];
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const entry: Partial<HallOfFameEntry> = {
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      tournamentSlug: tournament.slug,
      playerName: championStanding.participantName,
      teamName: championStanding.teamName,
      award: championStanding.awardLabel || 'Champion / 1st Place',
      gameTitle: tournament.gameTitle,
      gameCategory: tournament.gameCategory,
      season: `${tournament.startDate.slice(0, 4)} Season`,
      eventDate: tournament.startDate,
      scoreDescription: championStanding.scoreOrRecord || results.summary,
      photoUrl: championStanding.photoUrl || tournament.bannerImage,
      isFeatured: true,
      isPublished: true,
    };

    return await this.createHallOfFameEntry(entry);
  }

  // =========================================================================
  // GIOCASA ARENA — HALL OF FAME
  // =========================================================================

  async getHallOfFame(filter?: {
    publishedOnly?: boolean;
    gameCategory?: string;
    season?: string;
    featuredOnly?: boolean;
  }): Promise<HallOfFameEntry[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.publishedOnly !== false) {
        query.isPublished = true;
      }
      if (filter?.gameCategory && filter.gameCategory !== 'all') {
        query.gameCategory = filter.gameCategory;
      }
      if (filter?.season && filter.season !== 'all') {
        query.season = filter.season;
      }
      if (filter?.featuredOnly) {
        query.isFeatured = true;
      }

      return this.db.collection<HallOfFameEntry>('hall_of_fame').find(query).sort({ order: 1, eventDate: -1 }).toArray();
    }

    let list = [...this.fileHallOfFame];
    if (filter?.publishedOnly !== false) {
      list = list.filter((e) => e.isPublished);
    }
    if (filter?.gameCategory && filter.gameCategory !== 'all') {
      list = list.filter((e) => e.gameCategory === filter.gameCategory);
    }
    if (filter?.season && filter.season !== 'all') {
      list = list.filter((e) => e.season === filter.season);
    }
    if (filter?.featuredOnly) {
      list = list.filter((e) => e.isFeatured);
    }

    return list.sort((a, b) => a.order - b.order || b.eventDate.localeCompare(a.eventDate));
  }

  async getHallOfFameEntry(id: string): Promise<HallOfFameEntry | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<HallOfFameEntry>('hall_of_fame').findOne({ id });
    }
    return this.fileHallOfFame.find((e) => e.id === id) || null;
  }

  async createHallOfFameEntry(payload: Partial<HallOfFameEntry>): Promise<HallOfFameEntry> {
    const playerName = (payload.playerName || '').trim();
    if (!playerName) throw new Error('Winner / Player name is required.');
    if (!payload.gameTitle) throw new Error('Game title is required.');
    if (!payload.eventDate) throw new Error('Event date is required.');

    const nowIso = new Date().toISOString();
    const entry: HallOfFameEntry = {
      id: `hof-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      tournamentId: payload.tournamentId,
      tournamentTitle: payload.tournamentTitle || 'GioCasa Arena Championship',
      tournamentSlug: payload.tournamentSlug,
      playerName,
      teamName: payload.teamName,
      award: payload.award || 'Champion / 1st Place',
      gameTitle: payload.gameTitle,
      gameCategory: payload.gameCategory || 'ps5',
      season: payload.season || `${payload.eventDate.slice(0, 4)} Season`,
      eventDate: payload.eventDate,
      scoreDescription: payload.scoreDescription,
      photoUrl: payload.photoUrl || '/assets/real/ps5_setup.png',
      isFeatured: Boolean(payload.isFeatured),
      isPublished: payload.isPublished !== undefined ? Boolean(payload.isPublished) : true,
      order: Number(payload.order) || 99,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<HallOfFameEntry>('hall_of_fame').insertOne(entry);
    } else {
      this.fileHallOfFame.push(entry);
      this.saveHallOfFameToFile();
    }

    return entry;
  }

  async updateHallOfFameEntry(
    id: string,
    updates: Partial<HallOfFameEntry>
  ): Promise<HallOfFameEntry | null> {
    const existing = await this.getHallOfFameEntry(id);
    if (!existing) return null;

    // Defense-in-depth: explicitly extract and exclude database-managed/immutable fields
    const {
      _id: _ignoreId,
      id: _ignoreAppId,
      __v: _ignoreV,
      createdAt: _ignoreCreatedAt,
      updatedAt: _ignoreUpdatedAt,
      ...cleanUpdates
    } = updates as any;

    const nowIso = new Date().toISOString();

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
      'photoPublicId',
      'isFeatured',
      'isPublished',
      'order',
    ] as const;

    const fieldsToSet: Record<string, any> = {
      updatedAt: nowIso,
    };

    for (const key of allowedFields) {
      if (key in cleanUpdates && cleanUpdates[key] !== undefined) {
        fieldsToSet[key] = cleanUpdates[key];
      }
    }

    // Explicitly guarantee _id is NEVER in $set
    delete fieldsToSet._id;
    delete fieldsToSet.id;
    delete fieldsToSet.__v;
    delete fieldsToSet.createdAt;

    // Clean up replaced champion portrait from Cloudinary
    if (existing.photoPublicId && cleanUpdates.photoPublicId && existing.photoPublicId !== cleanUpdates.photoPublicId) {
      cloudinaryService.deleteImage(existing.photoPublicId).catch((err) => {
        console.warn('Failed to delete old champion photo from Cloudinary:', err);
      });
    }

    if (this.isMongoConnected && this.db) {
      await this.db.collection<HallOfFameEntry>('hall_of_fame').updateOne({ id }, { $set: fieldsToSet });
      const fresh = await this.db.collection<HallOfFameEntry>('hall_of_fame').findOne({ id });
      return fresh;
    } else {
      const updated: HallOfFameEntry = {
        ...existing,
        ...fieldsToSet,
        id: existing.id,
        createdAt: existing.createdAt,
      };
      delete (updated as any)._id; // Keep file store pure or let it have existing id
      const idx = this.fileHallOfFame.findIndex((e) => e.id === id);
      if (idx !== -1) {
        this.fileHallOfFame[idx] = updated;
        this.saveHallOfFameToFile();
      }
      return updated;
    }
  }

  async deleteHallOfFameEntry(id: string): Promise<boolean> {
    const existing = await this.getHallOfFameEntry(id);
    if (!existing) return false;

    if (this.isMongoConnected && this.db) {
      await this.db.collection<HallOfFameEntry>('hall_of_fame').deleteOne({ id });
    } else {
      this.fileHallOfFame = this.fileHallOfFame.filter((e) => e.id !== id);
      this.saveHallOfFameToFile();
    }

    if (existing.photoPublicId) {
      cloudinaryService.deleteImage(existing.photoPublicId).catch((err) => {
        console.warn('Failed to delete champion photo from Cloudinary:', err);
      });
    }

    return true;
  }

  // =========================================================================
  // GIOCASA PLAYER CRM IMPLEMENTATION
  // =========================================================================

  formatMaskedPhoneHint(phone?: string): string {
    return formatMaskedPhoneHint(phone);
  }

  normalizePhone(rawPhone?: string): string {
    if (!rawPhone) return '';
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.slice(1);
    }
    return digits;
  }

  calculateLoyaltyTier(lifetimePoints: number): MembershipTier {
    if (lifetimePoints >= 5000) return 'vip';
    if (lifetimePoints >= 2500) return 'gold';
    if (lifetimePoints >= 1000) return 'silver';
    if (lifetimePoints >= 500) return 'bronze';
    return 'standard';
  }

  async getPlayers(params: PlayerQueryParams = {}): Promise<{
    players: Player[];
    total: number;
    page: number;
    totalPages: number;
    segmentsSummary: Record<string, number>;
  }> {
    let allPlayers: Player[] = [];
    if (this.isMongoConnected && this.db) {
      allPlayers = await this.db.collection<Player>('players').find({}).toArray();
    } else {
      allPlayers = [...this.filePlayers];
    }

    const todayStr = getNowInKolkata().dateStr;
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Calculate segments summary across all non-archived players
    const activePool = allPlayers.filter((p) => p.status !== 'archived');
    
    // Check upcoming bookings across all bookings for segment calculation
    const allBookings = await this.getBookings();
    const upcomingBookingsMap = new Set<string>();
    for (const b of allBookings) {
      if (b.date >= todayStr && (b.status === 'confirmed' || b.status === 'active' || b.status === 'pending')) {
        const norm = this.normalizePhone(b.phone);
        if (norm) upcomingBookingsMap.add(norm);
      }
    }

    const segmentsSummary: Record<string, number> = {
      all: activePool.length,
      gaming_booking: activePool.filter((p) => (p.sources && p.sources.includes('gaming_booking')) || (p.stats.bookingsCount || 0) > 0).length,
      tournament_registration: activePool.filter((p) => (p.sources && p.sources.includes('tournament_registration')) || (p.stats.tournamentCount || 0) > 0).length,
      player_registration: activePool.filter((p) => (p.sources && p.sources.includes('player_registration')) || p.source === 'player_registration').length,
      upcoming_bookings: activePool.filter((p) => upcomingBookingsMap.has(p.normalizedPhone)).length,
      tournament_participants: activePool.filter((p) => (p.stats.tournamentCount || 0) > 0).length,
      new: activePool.filter((p) => (p.createdAt && p.createdAt.slice(0, 10) >= fourteenDaysAgo) || ((p.stats.bookingsCount || 0) <= 1 && (p.stats.tournamentCount || 0) <= 1)).length,
      frequent: activePool.filter((p) => (p.stats.bookingsCount || 0) >= 3 || (p.stats.totalHoursPlayed || 0) >= 5).length,
      tournament_regulars: activePool.filter((p) => (p.stats.tournamentCount || 0) >= 2).length,
      winners: activePool.filter((p) => (p.stats.tournamentWins || 0) > 0).length,
      vip: activePool.filter((p) => p.membershipTier === 'vip' || (p.stats.totalSpend || 0) >= 2000).length,
      inactive: activePool.filter((p) => p.status === 'inactive' || (p.stats.lastVisitDate && p.stats.lastVisitDate < thirtyDaysAgo)).length,
    };

    // Filter pipeline
    let filtered = allPlayers;

    // Status filter
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter((p) => p.status === params.status);
    } else if (params.segment !== 'inactive') {
      // Default: exclude archived players unless explicitly requested
      filtered = filtered.filter((p) => p.status !== 'archived');
    }

    // Tier filter
    if (params.tier && params.tier !== 'all') {
      filtered = filtered.filter((p) => p.membershipTier === params.tier);
    }

    // Segment filter
    if (params.segment && params.segment !== 'all') {
      switch (params.segment) {
        case 'gaming_booking':
          filtered = filtered.filter((p) => (p.sources && p.sources.includes('gaming_booking')) || (p.stats.bookingsCount || 0) > 0);
          break;
        case 'tournament_registration':
          filtered = filtered.filter((p) => (p.sources && p.sources.includes('tournament_registration')) || (p.stats.tournamentCount || 0) > 0);
          break;
        case 'player_registration':
          filtered = filtered.filter((p) => (p.sources && p.sources.includes('player_registration')) || p.source === 'player_registration');
          break;
        case 'upcoming_bookings':
          filtered = filtered.filter((p) => upcomingBookingsMap.has(p.normalizedPhone));
          break;
        case 'tournament_participants':
          filtered = filtered.filter((p) => (p.stats.tournamentCount || 0) > 0);
          break;
        case 'new':
          filtered = filtered.filter((p) => (p.createdAt && p.createdAt.slice(0, 10) >= fourteenDaysAgo) || ((p.stats.bookingsCount || 0) <= 1 && (p.stats.tournamentCount || 0) <= 1));
          break;
        case 'frequent':
          filtered = filtered.filter((p) => (p.stats.bookingsCount || 0) >= 3 || (p.stats.totalHoursPlayed || 0) >= 5);
          break;
        case 'tournament_regulars':
          filtered = filtered.filter((p) => (p.stats.tournamentCount || 0) >= 2);
          break;
        case 'winners':
          filtered = filtered.filter((p) => (p.stats.tournamentWins || 0) > 0);
          break;
        case 'vip':
          filtered = filtered.filter((p) => p.membershipTier === 'vip' || (p.stats.totalSpend || 0) >= 2000);
          break;
        case 'inactive':
          filtered = filtered.filter((p) => p.status === 'inactive' || (p.stats.lastVisitDate && p.stats.lastVisitDate < thirtyDaysAgo));
          break;
      }
    }

    // Search filter
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.gamerTag.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.normalizedPhone.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          (p.favoriteGame && p.favoriteGame.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    const factor = sortOrder === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortBy === 'lastVisit') {
        const dA = a.stats.lastVisitDate || '';
        const dB = b.stats.lastVisitDate || '';
        return factor * dA.localeCompare(dB);
      }
      if (sortBy === 'totalSpend') {
        return factor * ((a.stats.totalSpend || 0) - (b.stats.totalSpend || 0));
      }
      if (sortBy === 'tournaments') {
        return factor * ((a.stats.tournamentCount || 0) - (b.stats.tournamentCount || 0));
      }
      if (sortBy === 'name') {
        return factor * a.name.localeCompare(b.name);
      }
      return factor * a.createdAt.localeCompare(b.createdAt);
    });

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 15));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      players: paginated,
      total,
      page,
      totalPages,
      segmentsSummary,
    };
  }

  async generateUniqueGioId(): Promise<string> {
    const len = 6;
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < len; i++) {
        const idx = crypto.randomInt(0, GIO_ID_ALPHABET.length);
        code += GIO_ID_ALPHABET[idx];
      }
      const gioId = `GIO-${code}`;
      const existing = await this.getPlayerByGioId(gioId);
      if (!existing) return gioId;
    }
    return `GIO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  async generateUniqueReferralCode(): Promise<string> {
    const len = 6;
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < len; i++) {
        const idx = crypto.randomInt(0, GIO_ID_ALPHABET.length);
        code += GIO_ID_ALPHABET[idx];
      }
      const refCode = `REF-${code}`;
      const existing = await this.getPlayerByReferralCode(refCode);
      if (!existing) return refCode;
    }
    return `REF-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  async getPlayerById(id: string): Promise<Player | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Player>('players').findOne({ id });
    }
    return this.filePlayers.find((p) => p.id === id) || null;
  }

  validateCustomGioId(rawId: string): { valid: boolean; error?: string; normalized?: string } {
    if (!rawId || typeof rawId !== 'string') {
      return { valid: false, error: 'Gio ID is required.' };
    }
    const clean = rawId.trim().toUpperCase();
    if (!clean.startsWith('GIO')) {
      return { valid: false, error: 'Custom Player ID must start with GIO (e.g. GIOKING23, GIOPLAYER101).' };
    }
    if (clean.length < 6) {
      return { valid: false, error: 'Custom Player ID must be at least 6 characters long (e.g. GIOFC24).' };
    }
    if (clean.length > 20) {
      return { valid: false, error: 'Custom Player ID cannot exceed 20 characters.' };
    }
    const suffix = clean.slice(3);
    if (!/^[A-Z0-9]+$/.test(suffix)) {
      return { valid: false, error: 'Only uppercase letters and numbers are allowed after GIO (no spaces or special characters).' };
    }
    return { valid: true, normalized: clean };
  }

  async isGioIdAvailable(rawId: string): Promise<{ available: boolean; error?: string; normalized?: string }> {
    const val = this.validateCustomGioId(rawId);
    if (!val.valid) {
      return { available: false, error: val.error };
    }
    const normalized = val.normalized!;
    const existing = await this.getPlayerByGioId(normalized);
    if (existing) {
      return { available: false, error: 'This Gio ID is already taken. Please choose another.', normalized };
    }
    return { available: true, normalized };
  }

  async getPlayerByGioId(gioId: string): Promise<Player | null> {
    if (!gioId) return null;
    const clean = gioId.trim().toUpperCase();
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Player>('players').findOne({
        $or: [
          { gioId: clean },
          { normalizedGioId: clean },
          { gioId: clean.startsWith('GIO-') ? clean : `GIO-${clean}` },
          { gioId: { $regex: new RegExp(`^${clean.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } }
        ]
      });
    }
    return this.filePlayers.find((p) => {
      const pId = p.gioId?.toUpperCase();
      const pNorm = (p as any).normalizedGioId?.toUpperCase();
      return pId === clean || pNorm === clean || pId === (clean.startsWith('GIO-') ? clean : `GIO-${clean}`);
    }) || null;
  }

  async getPlayerByReferralCode(code: string): Promise<Player | null> {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Player>('players').findOne({
        $or: [{ referralCode: clean }, { referralCode: clean.startsWith('REF-') ? clean : `REF-${clean}` }]
      });
    }
    return this.filePlayers.find((p) => {
      const rCode = p.referralCode?.toUpperCase();
      return rCode === clean || rCode === (clean.startsWith('REF-') ? clean : `REF-${clean}`);
    }) || null;
  }

  async getPlayerByPhone(phone: string): Promise<Player | null> {
    const norm = this.normalizePhone(phone);
    if (!norm) return null;
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Player>('players').findOne({ normalizedPhone: norm });
    }
    return this.filePlayers.find((p) => p.normalizedPhone === norm) || null;
  }

  async getPlayerByEmail(email: string): Promise<Player | null> {
    if (!email || !email.includes('@')) return null;
    const clean = email.trim().toLowerCase();
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Player>('players').findOne({
        email: { $regex: new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }
    return this.filePlayers.find((p) => p.email && p.email.toLowerCase() === clean) || null;
  }

  async lookupPlayerPublic(gioId: string): Promise<{
    found: boolean;
    player?: {
      gioId: string;
      name: string;
      gamerTag: string;
      phoneMasked: string;
      emailMasked?: string;
      favoriteGame?: string;
      favoritePlatform?: string;
      membershipTier: MembershipTier;
    };
    challenge?: {
      type: 'phone_last_4';
      prompt: string;
    };
    error?: string;
  }> {
    if (!gioId || !gioId.trim()) {
      return { found: false, error: 'Please enter a valid GioCasa Player ID.' };
    }

    const player = await this.getPlayerByGioId(gioId);
    if (!player || player.status === 'archived') {
      return {
        found: false,
        error: `No player profile found for ID "${gioId.trim().toUpperCase()}". Check your ID or register once to get one.`,
      };
    }

    const phoneMasked = this.formatMaskedPhoneHint(player.phone);

    let emailMasked: string | undefined = undefined;
    if (player.email && player.email.includes('@')) {
      const [local, dom] = player.email.split('@');
      emailMasked = `${local[0]}***${local.length > 2 ? local.slice(-1) : ''}@${dom}`;
    }

    return {
      found: true,
      player: {
        gioId: player.gioId,
        name: player.name,
        gamerTag: player.gamerTag,
        phoneMasked,
        emailMasked,
        favoriteGame: player.favoriteGame,
        favoritePlatform: player.favoritePlatform,
        membershipTier: player.membershipTier,
      },
      challenge: {
        type: 'phone_last_4',
        prompt: `Confirm the last 4 digits of your registered mobile number (${phoneMasked}) to auto-fill your details.`,
      },
    };
  }

  async verifyPlayerIdentity(gioId: string, phoneLast4: string, fullPhone?: string): Promise<{
    verified: boolean;
    token?: string;
    player?: {
      id: string;
      gioId: string;
      referralCode: string;
      name: string;
      gamerTag: string;
      phone: string;
      email?: string;
      favoriteGame?: string;
      favoritePlatform?: string;
      membershipTier: MembershipTier;
      dateOfBirth?: string;
    };
    error?: string;
  }> {
    if (!gioId) {
      return { verified: false, error: 'Player ID is required.' };
    }

    const player = await this.getPlayerByGioId(gioId);
    if (!player || player.status === 'archived') {
      return { verified: false, error: 'Player profile not found.' };
    }

    const digits = (player.normalizedPhone || player.phone.replace(/\D/g, ''));
    let matched = false;

    if (phoneLast4 && phoneLast4.trim().length === 4) {
      matched = digits.endsWith(phoneLast4.trim());
    } else if (fullPhone) {
      matched = this.normalizePhone(fullPhone) === player.normalizedPhone;
    }

    if (!matched) {
      return {
        verified: false,
        error: 'The 4 digits entered do not match the registered phone number for this Player ID.',
      };
    }

    // Generate signed session verification token
    const tokenPayload = {
      playerId: player.id,
      gioId: player.gioId,
      iat: Date.now(),
      exp: Date.now() + 2 * 60 * 60 * 1000,
    };
    const secret = config.sessionSecret || config.adminPasscode || 'giocasa-secure-signing-seed-v1';
    const sig = crypto.createHmac('sha256', secret).update(JSON.stringify(tokenPayload)).digest('hex');
    const token = `gio_vtok_${Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')}.${sig.slice(0, 16)}`;

    return {
      verified: true,
      token,
      player: {
        id: player.id,
        gioId: player.gioId,
        referralCode: player.referralCode,
        name: player.name,
        gamerTag: player.gamerTag,
        phone: player.phone,
        email: player.email,
        favoriteGame: player.favoriteGame,
        favoritePlatform: player.favoritePlatform,
        membershipTier: player.membershipTier,
        dateOfBirth: player.dateOfBirth,
      },
    };
  }

  createRecoverySessionToken(playerId: string, isDummy: boolean, maskedContact: string): string {
    const payload = {
      playerId,
      isDummy,
      maskedContact,
      iat: Date.now(),
      exp: Date.now() + 15 * 60 * 1000, // 15 minutes validity
    };
    const secret = config.sessionSecret || config.adminPasscode || 'giocasa-secure-signing-seed-v1';
    const payloadStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
    return `gio_rec_${Buffer.from(payloadStr).toString('base64url')}.${sig.slice(0, 24)}`;
  }

  verifyRecoverySessionToken(token: string): {
    valid: boolean;
    playerId?: string;
    isDummy?: boolean;
    maskedContact?: string;
    error?: string;
  } {
    if (!token || !token.startsWith('gio_rec_')) {
      return { valid: false, error: 'Invalid recovery session token format.' };
    }

    try {
      const parts = token.slice('gio_rec_'.length).split('.');
      if (parts.length !== 2) {
        return { valid: false, error: 'Malformed recovery token.' };
      }

      const [encodedPayload, receivedSig] = parts;
      const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);

      const secret = config.sessionSecret || config.adminPasscode || 'giocasa-secure-signing-seed-v1';
      const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex').slice(0, 24);

      if (!timingSafeCompare(receivedSig, expectedSig)) {
        return { valid: false, error: 'Tampered or forged recovery session token.' };
      }

      if (payload.exp && Date.now() > payload.exp) {
        return { valid: false, error: 'Recovery session has expired. Please initiate recovery again.' };
      }

      return {
        valid: true,
        playerId: payload.playerId,
        isDummy: !!payload.isDummy,
        maskedContact: payload.maskedContact,
      };
    } catch (err) {
      return { valid: false, error: 'Failed to verify recovery session token.' };
    }
  }

  async recoverPlayerId(payloadOrPhone: {
    identifier?: string;
    phone?: string;
    email?: string;
    verificationName?: string;
    sessionToken?: string;
    phoneLast4?: string;
  } | string): Promise<{
    found: boolean;
    requiresVerification?: boolean;
    verified?: boolean;
    sessionToken?: string;
    maskedContact?: string;
    challengePrompt?: string;
    gioId?: string;
    name?: string;
    gamerTag?: string;
    token?: string;
    player?: any;
    message?: string;
    error?: string;
  }> {
    const payload = typeof payloadOrPhone === 'string' ? { phone: payloadOrPhone } : payloadOrPhone;
    const rawIdentifier = payload.identifier || payload.phone || payload.email || '';
    const verificationName = payload.verificationName?.trim();
    const sessionToken = payload.sessionToken?.trim();
    const phoneLast4Input = payload.phoneLast4?.trim();

    // Case 1: Verification step using existing session token
    if (sessionToken) {
      const sessionResult = this.verifyRecoverySessionToken(sessionToken);
      if (!sessionResult.valid) {
        return { found: false, error: sessionResult.error || 'Recovery session expired or invalid.' };
      }

      if (!phoneLast4Input && !verificationName) {
        return {
          found: true,
          requiresVerification: true,
          sessionToken,
          maskedContact: sessionResult.maskedContact,
          challengePrompt: `Please enter the last 4 digits of your registered mobile number (${sessionResult.maskedContact}) to complete verification.`,
          error: 'Please enter the last 4 digits of your registered mobile number.',
        };
      }

      // If it was a dummy session for non-existent contact (User Enumeration Protection)
      if (sessionResult.isDummy || !sessionResult.playerId || sessionResult.playerId === 'dummy') {
        return {
          found: false,
          verified: false,
          error: 'The verification details entered do not match our records. If you do not have an ID yet, you can register anytime.',
        };
      }

      const player = await this.getPlayerById(sessionResult.playerId);
      if (!player || player.status === 'archived') {
        return {
          found: false,
          verified: false,
          error: 'The verification details entered do not match an active player profile.',
        };
      }

      if (phoneLast4Input) {
        const playerDigits = player.phone.replace(/\D/g, '');
        const playerLast4 = playerDigits.slice(-4);
        if (phoneLast4Input !== playerLast4) {
          return {
            found: true,
            verified: false,
            error: 'The last 4 digits entered do not match our records. Please verify and try again.',
          };
        }
        return this.verifyAndReturnRecoveredPlayer(player, 'phone_verified');
      }

      if (verificationName) {
        return this.verifyAndReturnRecoveredPlayer(player, verificationName);
      }
    }

    // Case 2: Direct lookup or initiating recovery with identifier
    if (!rawIdentifier || !rawIdentifier.trim()) {
      return { found: false, error: 'Mobile number or email address is required to recover your Player ID.' };
    }

    const cleanInput = rawIdentifier.trim();
    const isEmail = cleanInput.includes('@');
    let normPhone = '';

    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanInput)) {
        return { found: false, error: 'Please enter a valid email address.' };
      }
    } else {
      normPhone = this.normalizePhone(cleanInput);
      if (!normPhone || normPhone.length !== 10) {
        return { found: false, error: 'Please enter a valid 10-digit mobile number.' };
      }
    }

    // Search player
    const player = isEmail ? await this.getPlayerByEmail(cleanInput) : await this.getPlayerByPhone(normPhone);

    // Compute masked contact string (strictly formatMaskedPhoneHint for phone to protect last 4 digits)
    let maskedContact = '';
    if (isEmail) {
      const [local, dom] = cleanInput.toLowerCase().split('@');
      maskedContact = `${local[0]}***${local.length > 2 ? local.slice(-1) : ''}@${dom}`;
    } else {
      maskedContact = this.formatMaskedPhoneHint(normPhone);
    }

    // If phoneLast4 was supplied in the initial request (Single-step recovery)
    if (phoneLast4Input) {
      if (!player || player.status === 'archived') {
        return {
          found: false,
          verified: false,
          error: 'The verification details entered do not match our records. If you do not have an ID yet, you can register anytime.',
        };
      }
      const playerDigits = player.phone.replace(/\D/g, '');
      const playerLast4 = playerDigits.slice(-4);
      if (phoneLast4Input !== playerLast4) {
        return {
          found: true,
          verified: false,
          error: 'The last 4 digits entered do not match our records. Please verify and try again.',
        };
      }
      return this.verifyAndReturnRecoveredPlayer(player, 'phone_verified');
    }

    // If verification name was supplied in the initial request (Single-step recovery)
    if (verificationName) {
      if (!player || player.status === 'archived') {
        return {
          found: false,
          verified: false,
          error: 'The verification details entered do not match our records. If you do not have an ID yet, you can register anytime.',
        };
      }
      return this.verifyAndReturnRecoveredPlayer(player, verificationName);
    }

    // Two-step recovery initiation: Return challenge (Uniform response whether player exists or not for privacy)
    const challengePrompt = `Please enter the last 4 digits of your registered mobile number (${maskedContact}) to verify your identity and recover your Player ID.`;

    if (player && player.status !== 'archived') {
      const token = this.createRecoverySessionToken(player.id, false, maskedContact);
      return {
        found: true,
        requiresVerification: true,
        sessionToken: token,
        maskedContact,
        challengePrompt,
      };
    } else {
      // Dummy session token for unknown contact
      const token = this.createRecoverySessionToken('dummy', true, maskedContact);
      return {
        found: true,
        requiresVerification: true,
        sessionToken: token,
        maskedContact,
        challengePrompt,
      };
    }
  }

  private async verifyAndReturnRecoveredPlayer(player: Player, verificationNameOrMode: string) {
    const isPhoneVerified = verificationNameOrMode === 'phone_verified';

    if (!isPhoneVerified) {
      const cleanVerification = verificationNameOrMode.trim().toLowerCase();
      const verificationWithoutAt = cleanVerification.replace(/^@/, '');
      const cleanName = player.name.trim().toLowerCase();
      const cleanGamerTag = (player.gamerTag || '').trim().toLowerCase();
      const gamerTagWithoutAt = cleanGamerTag.replace(/^@/, '');

      const nameParts = cleanName.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';

      const isMatch =
        cleanVerification === cleanName ||
        verificationWithoutAt === cleanName ||
        verificationWithoutAt === gamerTagWithoutAt ||
        cleanVerification === cleanGamerTag ||
        (verificationWithoutAt.length >= 2 && verificationWithoutAt === firstName) ||
        (verificationWithoutAt.length >= 3 && verificationWithoutAt === lastName) ||
        (verificationWithoutAt.length >= 3 && cleanName.includes(verificationWithoutAt));

      if (!isMatch) {
        return {
          found: true,
          verified: false,
          error: 'The name or gamer tag entered does not match the profile on record. Please check your spelling.',
        };
      }
    }

    // Identity verified! Generate authorization token
    const verifyResult = await this.verifyPlayerIdentity(player.gioId, player.phone.slice(-4));

    await this.recordAutomationEvent({
      eventType: 'player.id_recovered',
      entityId: player.id,
      entityType: 'player',
      payload: {
        gioId: player.gioId,
        name: player.name,
        verifiedBy: isPhoneVerified ? 'phone_last_4' : 'name_challenge',
      },
      idempotencyKey: `recovery_${player.id}_${Date.now()}`,
    });

    return {
      found: true,
      verified: true,
      gioId: player.gioId,
      name: player.name,
      gamerTag: player.gamerTag,
      token: verifyResult.token,
      player: verifyResult.player,
      message: `Identity verified! Welcome back, ${player.name}. Your GioCasa Player ID is ${player.gioId}.`,
    };
  }

  async createPlayer(data: Partial<Player>): Promise<Player> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Player full name is required.');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new Error('Player phone number is required.');
    }

    const normalizedPhone = this.normalizePhone(data.phone);
    if (normalizedPhone.length < 10) {
      throw new Error('Valid 10-digit mobile number is required.');
    }

    // Check for duplicate player with active status
    const existing = await this.getPlayerByPhone(normalizedPhone);
    if (existing && existing.status !== 'archived') {
      throw new Error(`A player profile already exists with mobile number ${data.phone} (${existing.name} • @${existing.gamerTag} • ID: ${existing.gioId}).`);
    }

    const nowIso = new Date().toISOString();
    const id = `ply-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const gamerTag = data.gamerTag && data.gamerTag.trim() ? data.gamerTag.trim() : data.name.trim().split(' ')[0] + '_' + Math.floor(100 + Math.random() * 900);
    
    let gioId: string;
    let normalizedGioId: string;

    if (data.gioId && data.gioId.trim()) {
      const val = this.validateCustomGioId(data.gioId.trim());
      if (!val.valid) {
        throw new Error(val.error || 'Invalid custom Gio ID.');
      }
      const cleanId = val.normalized!;
      // Lock on the specific Gio ID to prevent concurrent duplicate registrations
      const existingWithId = await this.getPlayerByGioId(cleanId);
      if (existingWithId && existingWithId.status !== 'archived') {
        throw new Error('This Gio ID is already taken. Please choose another.');
      }
      gioId = cleanId;
      normalizedGioId = cleanId;
    } else {
      gioId = await this.generateUniqueGioId();
      normalizedGioId = gioId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }

    const referralCode = data.referralCode || await this.generateUniqueReferralCode();

    const initialNotes: StaffNote[] = [];
    if (Array.isArray(data.notes)) {
      initialNotes.push(...data.notes);
    } else if (typeof (data as any).notes === 'string' && (data as any).notes.trim()) {
      initialNotes.push({
        id: `note-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        text: (data as any).notes.trim(),
        author: 'Staff Admin',
        createdAt: nowIso,
      });
    }

    const initialReminders: FollowUpReminder[] = Array.isArray(data.reminders) ? data.reminders : [];

    const player: Player = {
      id,
      gioId,
      normalizedGioId,
      referralCode,
      name: data.name.trim(),
      gamerTag,
      phone: data.phone.trim(),
      normalizedPhone,
      email: data.email ? data.email.trim().toLowerCase() : undefined,
      avatarUrl: data.avatarUrl || undefined,
      dateOfBirth: data.dateOfBirth,
      favoriteGame: data.favoriteGame || 'EA Sports FC 25',
      favoritePlatform: data.favoritePlatform || 'ps5',
      membershipTier: data.membershipTier || 'standard',
      status: 'active',
      source: data.source || 'player_registration',
      sources: data.sources || (data.source ? [data.source] : ['player_registration']),
      identityVerificationStatus: data.identityVerificationStatus || 'verified',
      notes: initialNotes,
      reminders: initialReminders,
      tags: data.tags || ['New Player'],
      consent: {
        whatsappUpdates: data.consent?.whatsappUpdates ?? true,
        emailUpdates: data.consent?.emailUpdates ?? true,
      },
      loyalty: {
        pointsBalance: data.loyalty?.pointsBalance || 0,
        lifetimePoints: data.loyalty?.lifetimePoints || 0,
        tier: data.membershipTier || 'standard',
      },
      stats: {
        tournamentCount: 0,
        tournamentWins: 0,
        bookingsCount: 0,
        completedBookingsCount: 0,
        totalHoursPlayed: 0,
        totalSpend: 0,
        firstVisitDate: nowIso.slice(0, 10),
        lastVisitDate: nowIso.slice(0, 10),
        lastActivityDate: nowIso,
        ...data.stats,
      },
      referralCount: 0,
      successfulReferralCount: 0,
      referredBy: data.referredBy ? data.referredBy.trim().toUpperCase() : undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<Player>('players').insertOne(player);
    } else {
      this.filePlayers.push(player);
      this.savePlayersToFile();
    }

    // Process referral linkage if referredBy was provided
    if (player.referredBy) {
      try {
        const refCode = player.referredBy;
        const referrer = (await this.getPlayerByReferralCode(refCode)) || (await this.getPlayerByGioId(refCode));
        if (referrer && referrer.id !== player.id) {
          const referralRecord: Referral = {
            id: `ref-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            referrerPlayerId: referrer.id,
            referrerGioId: referrer.gioId,
            referrerName: referrer.name,
            referredPlayerId: player.id,
            referredGioId: player.gioId,
            referredName: player.name,
            referralCode: refCode,
            status: 'pending',
            createdAt: nowIso,
            updatedAt: nowIso,
          };

          if (this.isMongoConnected && this.db) {
            await this.db.collection<Referral>('referrals').insertOne(referralRecord);
          } else {
            this.fileReferrals.push(referralRecord);
            this.saveReferralsToFile();
          }

          // Increment referrer's pending referral count
          await this.updatePlayer(referrer.id, {
            referralCount: (referrer.referralCount || 0) + 1,
          } as any);

          // If welcome bonus is configured for referred players
          const rules = await this.getLoyaltyRules();
          if (rules.rulesEnabled.referredWelcome && rules.referredWelcomeBonus > 0) {
            await this.adjustPlayerLoyalty(
              player.id,
              rules.referredWelcomeBonus,
              'bonus',
              `Welcome Bonus (Referred by ${referrer.name})`,
              referralRecord.id,
              `referred_welcome_${player.id}`
            );
          }
        }
      } catch (refErr) {
        console.warn('Error processing referral link for new player:', refErr);
      }
    }

    // Record registration automation event
    await this.recordAutomationEvent({
      eventType: 'player.registered',
      entityId: player.id,
      entityType: 'player',
      payload: {
        gioId: player.gioId,
        referralCode: player.referralCode,
        name: player.name,
        gamerTag: player.gamerTag,
        phone: player.phone,
      },
      idempotencyKey: `auto_player_registered_${player.id}`,
    });

    return player;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | null> {
    const existing = await this.getPlayerById(id);
    if (!existing) return null;

    let normalizedPhone = existing.normalizedPhone;
    if (updates.phone && updates.phone.trim() !== existing.phone) {
      normalizedPhone = this.normalizePhone(updates.phone);
      if (normalizedPhone.length < 10) {
        throw new Error('Valid 10-digit mobile number is required.');
      }
      const duplicate = await this.getPlayerByPhone(normalizedPhone);
      if (duplicate && duplicate.id !== id && duplicate.status !== 'archived') {
        throw new Error(`Mobile number ${updates.phone} is already linked to another player (${duplicate.name}).`);
      }
    }

    // Strict whitelisting - never allow _id or id modification
    const safeUpdates: Partial<Player> = {
      name: updates.name ? updates.name.trim() : existing.name,
      gamerTag: updates.gamerTag ? updates.gamerTag.trim() : existing.gamerTag,
      phone: updates.phone ? updates.phone.trim() : existing.phone,
      normalizedPhone,
      email: updates.email !== undefined ? (updates.email ? updates.email.trim().toLowerCase() : undefined) : existing.email,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl,
      dateOfBirth: updates.dateOfBirth !== undefined ? updates.dateOfBirth : existing.dateOfBirth,
      favoriteGame: updates.favoriteGame !== undefined ? updates.favoriteGame : existing.favoriteGame,
      favoritePlatform: updates.favoritePlatform !== undefined ? updates.favoritePlatform : existing.favoritePlatform,
      membershipTier: updates.membershipTier !== undefined ? updates.membershipTier : existing.membershipTier,
      status: updates.status !== undefined ? updates.status : existing.status,
      source: updates.source !== undefined ? updates.source : existing.source,
      sources: updates.sources !== undefined ? updates.sources : existing.sources,
      identityVerificationStatus: updates.identityVerificationStatus !== undefined ? updates.identityVerificationStatus : existing.identityVerificationStatus,
      tags: updates.tags !== undefined ? updates.tags : existing.tags,
      consent: updates.consent ? { ...existing.consent, ...updates.consent } : existing.consent,
      stats: updates.stats ? { ...existing.stats, ...updates.stats } : existing.stats,
      loyalty: updates.loyalty ? { ...existing.loyalty, ...updates.loyalty } : existing.loyalty,
      referralCount: updates.referralCount !== undefined ? updates.referralCount : existing.referralCount,
      successfulReferralCount: updates.successfulReferralCount !== undefined ? updates.successfulReferralCount : existing.successfulReferralCount,
      referredBy: updates.referredBy !== undefined ? updates.referredBy : existing.referredBy,
      notes: updates.notes !== undefined ? (Array.isArray(updates.notes) ? updates.notes : existing.notes) : existing.notes,
      reminders: updates.reminders !== undefined ? (Array.isArray(updates.reminders) ? updates.reminders : existing.reminders) : existing.reminders,
      updatedAt: new Date().toISOString(),
    };

    const merged: Player = {
      ...existing,
      ...safeUpdates,
      id: existing.id,
      gioId: existing.gioId,
      referralCode: existing.referralCode,
      createdAt: existing.createdAt,
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = merged as any;
      await this.db.collection<Player>('players').updateOne({ id }, { $set: fieldsToSet });
    } else {
      const idx = this.filePlayers.findIndex((p) => p.id === id);
      if (idx !== -1) {
        this.filePlayers[idx] = merged;
        this.savePlayersToFile();
      }
    }

    return merged;
  }

  async archivePlayer(id: string): Promise<Player | null> {
    return this.updatePlayer(id, { status: 'archived' });
  }

  async restorePlayer(id: string): Promise<Player | null> {
    return this.updatePlayer(id, { status: 'active' });
  }

  async addPlayerNote(id: string, text: string, author: string): Promise<StaffNote | null> {
    const player = await this.getPlayerById(id);
    if (!player) return null;

    const note: StaffNote = {
      id: `note-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      text: text.trim(),
      author: author.trim() || 'Staff Admin',
      createdAt: new Date().toISOString(),
    };

    const updatedNotes = [note, ...player.notes];
    await this.updatePlayer(id, { notes: updatedNotes } as any);
    return note;
  }

  async deletePlayerNote(id: string, noteId: string): Promise<boolean> {
    const player = await this.getPlayerById(id);
    if (!player) return false;

    const filtered = player.notes.filter((n) => n.id !== noteId);
    await this.updatePlayer(id, { notes: filtered } as any);
    return true;
  }

  async addPlayerReminder(id: string, title: string, dueDate: string): Promise<FollowUpReminder | null> {
    const player = await this.getPlayerById(id);
    if (!player) return null;

    const reminder: FollowUpReminder = {
      id: `rem-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      title: title.trim(),
      dueDate: dueDate.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [reminder, ...player.reminders];
    await this.updatePlayer(id, { reminders: updated } as any);
    return reminder;
  }

  async updatePlayerReminder(id: string, reminderId: string, isCompleted: boolean): Promise<FollowUpReminder | null> {
    const player = await this.getPlayerById(id);
    if (!player) return null;

    let target: FollowUpReminder | null = null;
    const updated = player.reminders.map((r) => {
      if (r.id === reminderId) {
        target = {
          ...r,
          isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : undefined,
        };
        return target;
      }
      return r;
    });

    if (!target) return null;
    await this.updatePlayer(id, { reminders: updated } as any);
    return target;
  }

  async adjustPlayerLoyalty(
    id: string,
    points: number,
    type: 'earn' | 'redeem' | 'adjustment' | 'bonus' | 'reversal',
    reason: string,
    referenceId?: string,
    idempotencyKey?: string,
    options?: {
      sourceActivityType?: any;
      paymentAmount?: number;
      adminActor?: string;
    }
  ): Promise<{ player: Player; ledgerEntry: LoyaltyLedgerEntry }> {
    const player = await this.getPlayerById(id);
    if (!player) throw new Error('Player not found.');

    // Idempotency check: if key already processed, return existing record
    if (idempotencyKey) {
      const existingEntry = this.isMongoConnected && this.db
        ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey })
        : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === idempotencyKey);

      if (existingEntry) {
        return { player, ledgerEntry: existingEntry };
      }
    }

    const previousBalance = player.loyalty.pointsBalance || 0;
    const newBalance = Math.max(0, previousBalance + points);
    const newLifetime = points > 0 ? (player.loyalty.lifetimePoints || 0) + points : (player.loyalty.lifetimePoints || 0);
    const newTier = this.calculateLoyaltyTier(newLifetime);

    const ledgerEntry: LoyaltyLedgerEntry = {
      id: `ledg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      playerId: id,
      gioId: player.gioId,
      points,
      type: type as any,
      reason: reason.trim() || 'Manual Staff Adjustment',
      referenceId,
      idempotencyKey,
      previousBalance,
      updatedBalance: newBalance,
      paymentAmount: options?.paymentAmount,
      sourceActivityType: options?.sourceActivityType || (type === 'reversal' ? 'manual_reversal' : 'staff_adjustment'),
      adminActor: options?.adminActor || 'Staff',
      createdAt: new Date().toISOString(),
    };

    // Save ledger entry
    if (this.isMongoConnected && this.db) {
      await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').insertOne(ledgerEntry);
    } else {
      this.fileLoyaltyLedger.unshift(ledgerEntry);
      this.saveLoyaltyToFile();
    }

    // Update player
    const updatedPlayer = await this.updatePlayer(id, {
      membershipTier: newTier,
      loyalty: {
        pointsBalance: newBalance,
        lifetimePoints: newLifetime,
        tier: newTier,
      },
    } as any);

    return { player: updatedPlayer || player, ledgerEntry };
  }

  async getPlayerLoyaltyLedger(playerId: string): Promise<LoyaltyLedgerEntry[]> {
    if (this.isMongoConnected && this.db) {
      return this.db
        .collection<LoyaltyLedgerEntry>('loyalty_ledger')
        .find({ playerId })
        .sort({ createdAt: -1 })
        .toArray();
    }
    return this.fileLoyaltyLedger
      .filter((l) => l.playerId === playerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAllLoyaltyLedger(limit = 100): Promise<LoyaltyLedgerEntry[]> {
    if (this.isMongoConnected && this.db) {
      return this.db
        .collection<LoyaltyLedgerEntry>('loyalty_ledger')
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    }
    return this.fileLoyaltyLedger
      .slice(0, limit)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getPlayerDetailedProfile(id: string): Promise<PlayerProfileDetails | null> {
    const player = await this.getPlayerById(id);
    if (!player) return null;

    const norm = player.normalizedPhone;

    // 1. Linked tournament registrations
    let registrations: TournamentRegistration[] = [];
    if (this.isMongoConnected && this.db) {
      registrations = await this.db
        .collection<TournamentRegistration>('tournament_registrations')
        .find({
          $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
        })
        .sort({ createdAt: -1 })
        .toArray();
    } else {
      registrations = this.fileRegistrations
        .filter((r) => r.playerId === player.id || r.phone === player.phone || this.normalizePhone(r.phone) === norm)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // 2. Linked bookings
    let bookings: Booking[] = [];
    if (this.isMongoConnected && this.db) {
      bookings = await this.db
        .collection<Booking>('bookings')
        .find({
          $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
        })
        .sort({ date: -1, startTime: -1 })
        .toArray();
    } else {
      bookings = this.fileBookings
        .filter((b) => b.playerId === player.id || b.phone === player.phone || this.normalizePhone(b.phone) === norm)
        .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    }

    // 2b. Linked dining reservations
    let diningReservations: DiningReservation[] = [];
    if (this.isMongoConnected && this.db) {
      diningReservations = await this.db
        .collection<DiningReservation>('dining_reservations')
        .find({
          $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
        })
        .sort({ date: -1, time: -1, createdAt: -1 })
        .toArray();
    } else {
      diningReservations = this.fileDiningReservations
        .filter((r) => r.playerId === player.id || r.phone === player.phone || this.normalizePhone(r.phone) === norm)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // 2c. Linked event enquiries/reservations
    let eventReservations: EventReservation[] = [];
    if (this.isMongoConnected && this.db) {
      eventReservations = await this.db
        .collection<EventReservation>('event_reservations')
        .find({
          $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
        })
        .sort({ date: -1, time: -1, createdAt: -1 })
        .toArray();
    } else {
      eventReservations = this.fileEventReservations
        .filter((r) => r.playerId === player.id || r.phone === player.phone || this.normalizePhone(r.phone) === norm)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // 3. Linked tournament results / wins
    const wins: Array<{
      id: string;
      tournamentTitle: string;
      award: string;
      gameTitle: string;
      season?: string;
      eventDate?: string;
      scoreDescription?: string;
    }> = [];

    // From hall of fame
    const hofEntries = this.isMongoConnected && this.db
      ? await this.db.collection<HallOfFameEntry>('hall_of_fame').find({}).toArray()
      : this.fileHallOfFame;

    for (const h of hofEntries) {
      const matchName = h.playerName.toLowerCase().includes(player.name.toLowerCase()) ||
        (player.gamerTag && h.playerName.toLowerCase().includes(player.gamerTag.toLowerCase()));
      if (matchName) {
        wins.push({
          id: h.id,
          tournamentTitle: h.tournamentTitle,
          award: h.award,
          gameTitle: h.gameTitle,
          season: h.season,
          eventDate: h.eventDate,
          scoreDescription: h.scoreDescription,
        });
      }
    }

    // From tournament results standings
    const allResults = this.isMongoConnected && this.db
      ? await this.db.collection<TournamentResult>('tournament_results').find({}).toArray()
      : this.fileResults;

    for (const res of allResults) {
      for (const st of res.standings) {
        const matchParticipant = st.participantName.toLowerCase().includes(player.name.toLowerCase()) ||
          (player.gamerTag && (st.participantName.toLowerCase().includes(player.gamerTag.toLowerCase()) || (st.inGameId && st.inGameId.toLowerCase().includes(player.gamerTag.toLowerCase()))));
        if (matchParticipant) {
          const already = wins.find((w) => w.id === res.id);
          if (!already) {
            wins.push({
              id: `${res.id}-${st.rank}`,
              tournamentTitle: res.tournamentSlug.replace(/-/g, ' ').toUpperCase(),
              award: st.awardLabel,
              gameTitle: 'GioCasa Arena Tournament',
              eventDate: res.publishedAt ? res.publishedAt.slice(0, 10) : undefined,
              scoreDescription: st.scoreOrRecord || st.notes,
            });
          }
        }
      }
    }

    // 4. Loyalty Ledger
    const loyaltyLedger = await this.getPlayerLoyaltyLedger(player.id);

    // 5. Activity Timeline aggregation
    const activityTimeline: PlayerTimelineEvent[] = [];

    // Add bookings
    for (const b of bookings) {
      activityTimeline.push({
        id: `act-bk-${b.id}`,
        type: 'booking',
        title: `Gaming Session: ${b.resourceName}`,
        description: `${b.durationMinutes} mins • ₹${b.totalAmount} • Status: ${b.status} (${b.paymentStatus})`,
        date: `${b.date}T${b.startTime}:00.000Z`,
        badge: b.status.toUpperCase(),
        metadata: { bookingId: b.id, amount: b.totalAmount },
      });
    }

    // Add tournament registrations
    for (const r of registrations) {
      activityTimeline.push({
        id: `act-reg-${r.id}`,
        type: 'tournament',
        title: `Tournament Entry: ${r.tournamentSlug.replace(/-/g, ' ').toUpperCase()}`,
        description: `Ref: ${r.registrationReference} • Status: ${r.status} • Payment: ${r.paymentStatus}`,
        date: r.createdAt,
        badge: r.status.toUpperCase(),
        metadata: { registrationId: r.id, reference: r.registrationReference },
      });
    }

    // Add wins
    for (const w of wins) {
      activityTimeline.push({
        id: `act-win-${w.id}`,
        type: 'win',
        title: `🏆 ${w.award} — ${w.tournamentTitle}`,
        description: w.scoreDescription || w.gameTitle,
        date: w.eventDate ? `${w.eventDate}T20:00:00.000Z` : player.createdAt,
        badge: 'CHAMPION',
      });
    }

    // Add staff notes
    for (const n of (player.notes || [])) {
      if (!n || !n.id) continue;
      activityTimeline.push({
        id: `act-note-${n.id}`,
        type: 'note',
        title: `Internal Note by ${n.author || 'Staff Admin'}`,
        description: n.text || '',
        date: n.createdAt || player.createdAt || new Date().toISOString(),
        badge: 'STAFF',
      });
    }

    // Add follow-up reminders
    for (const rem of (player.reminders || [])) {
      if (!rem || !rem.id) continue;
      activityTimeline.push({
        id: `act-rem-${rem.id}`,
        type: 'reminder',
        title: `Reminder: ${rem.title || 'Follow up'}`,
        description: `Target Date: ${rem.dueDate || 'N/A'} • Status: ${rem.isCompleted ? 'Completed' : 'Pending'}`,
        date: rem.completedAt || rem.createdAt || player.createdAt || new Date().toISOString(),
        badge: rem.isCompleted ? 'COMPLETED' : 'REMINDER',
      });
    }

    // Add loyalty ledger entries
    for (const ledg of loyaltyLedger) {
      activityTimeline.push({
        id: `act-loy-${ledg.id}`,
        type: 'loyalty',
        title: `Loyalty Points: ${ledg.points > 0 ? '+' : ''}${ledg.points} pts`,
        description: `${ledg.reason} (${ledg.type.toUpperCase()})`,
        date: ledg.createdAt || new Date().toISOString(),
        badge: ledg.type.toUpperCase(),
      });
    }

    // Add communication logs
    const commLogs = await this.getCommunicationLogs(player.id);
    for (const comm of commLogs) {
      activityTimeline.push({
        id: `act-comm-${comm.id}`,
        type: 'communication',
        title: `Outreach: ${comm.channel.toUpperCase()} (${comm.templateId || 'Direct'})`,
        description: `${comm.messagePreview} • Status: ${comm.status === 'prepared' ? 'WhatsApp link opened by staff' : comm.status}`,
        date: comm.createdAt || new Date().toISOString(),
        badge: comm.channel.toUpperCase(),
      });
    }

    // 6. Linked referrals
    const referrals = await this.getReferralsForPlayer(player.id);

    // Add booking extensions to activity timeline
    for (const b of bookings) {
      if (Array.isArray(b.extensions)) {
        for (const ext of b.extensions) {
          activityTimeline.push({
            id: `act-ext-${ext.id}`,
            type: 'booking',
            title: `Session Extended: +${ext.extensionMinutes} mins (${b.resourceName || 'Station'})`,
            description: `Ref #${b.id} • Extra ₹${ext.amount} • Payment: ${ext.paymentStatus.toUpperCase()}`,
            date: ext.paidAt || ext.createdAt || `${b.date}T${b.startTime}:00.000Z`,
            badge: `+${ext.extensionMinutes}M EXT`,
            metadata: { bookingId: b.id, extensionId: ext.id, amount: ext.amount, paymentStatus: ext.paymentStatus },
          });
        }
      }
    }

    // Add referrals to activity timeline
    for (const ref of referrals) {
      const isReferrer = ref.referrerPlayerId === player.id;
      activityTimeline.push({
        id: `act-ref-${ref.id}`,
        type: 'referral',
        title: isReferrer
          ? `Referral: Invited @${ref.referredGioId} (${ref.referredPlayerName || ref.referredName})`
          : `Signed up via Referral Code: ${ref.referralCode || ref.referralCodeUsed}`,
        description: `Status: ${ref.status.toUpperCase()} ${ref.status === 'qualified' ? `• +${ref.pointsAwarded || 200} pts awarded` : '• Awaiting first qualifying activity'}`,
        date: ref.qualifiedAt || ref.createdAt || player.createdAt,
        badge: ref.status.toUpperCase(),
        metadata: { referralId: ref.id, status: ref.status },
      });
    }

    // Add dining reservations to activity timeline
    for (const d of diningReservations) {
      activityTimeline.push({
        id: `act-din-${d.id}`,
        type: 'dining' as any,
        title: `🍽️ Dining Table: #${d.reference} (1st Floor)`,
        description: `${d.guests} Guests • ${d.date} at ${d.time} • Status: ${d.status.toUpperCase()}`,
        date: d.createdAt,
        badge: 'DINING',
        metadata: { reservationId: d.id, reference: d.reference, guests: d.guests, status: d.status },
      });
    }

    // Add event enquiries to activity timeline
    for (const ev of eventReservations) {
      activityTimeline.push({
        id: `act-ev-${ev.id}`,
        type: 'event' as any,
        title: `🎉 ${ev.eventType}: #${ev.reference}`,
        description: `${ev.expectedGuests} Guests • ${ev.date} at ${ev.time} • Status: ${ev.status.toUpperCase()}`,
        date: ev.createdAt,
        badge: 'EVENT',
        metadata: { reservationId: ev.id, reference: ev.reference, eventType: ev.eventType, status: ev.status },
      });
    }

    // Sort timeline descending by date safely
    activityTimeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Compute paymentSummary from actual MongoDB booking & extension records
    const validBookings = bookings.filter((b) => b.status !== 'cancelled');
    let originalBookingsSpend = 0;
    let extensionsSpend = 0;
    let confirmedExtensionsCount = 0;

    for (const b of validBookings) {
      if (b.paymentStatus === 'paid') {
        const orig = b.originalAmount !== undefined ? b.originalAmount : b.totalAmount;
        originalBookingsSpend += (orig || 0);
      }
      if (Array.isArray(b.extensions)) {
        for (const ext of b.extensions) {
          if (ext.paymentStatus === 'paid') {
            extensionsSpend += (ext.amount || 0);
            confirmedExtensionsCount++;
          }
        }
      }
    }

    const lifetimeSpend = originalBookingsSpend + extensionsSpend;

    const paymentSummary: PlayerPaymentSummary = {
      lifetimeSpend,
      originalBookingsSpend,
      extensionsSpend,
      confirmedBookingsCount: validBookings.filter((b) => b.paymentStatus === 'paid').length,
      confirmedExtensionsCount,
    };

    return {
      player,
      registrations,
      bookings,
      diningReservations,
      eventReservations,
      diningCount: diningReservations.length,
      eventCount: eventReservations.length,
      wins,
      loyaltyLedger,
      referrals,
      paymentSummary,
      activityTimeline,
    };
  }

  async recalculatePlayerStats(playerId: string): Promise<Player | null> {
    const player = await this.getPlayerById(playerId);
    if (!player) return null;

    const norm = player.normalizedPhone;

    // 1. All bookings for this player
    let playerBookings: Booking[] = [];
    if (this.isMongoConnected && this.db) {
      playerBookings = await this.db.collection<Booking>('bookings').find({
        $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
      }).toArray();
    } else {
      playerBookings = this.fileBookings.filter(
        (b) => b.playerId === player.id || b.phone === player.phone || (norm && this.normalizePhone(b.phone) === norm)
      );
    }

    // 2. All tournament registrations for this player
    let playerRegistrations: TournamentRegistration[] = [];
    if (this.isMongoConnected && this.db) {
      playerRegistrations = await this.db.collection<TournamentRegistration>('tournament_registrations').find({
        $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
      }).toArray();
    } else {
      playerRegistrations = this.fileRegistrations.filter(
        (r) => r.playerId === player.id || r.phone === player.phone || (norm && this.normalizePhone(r.phone) === norm)
      );
    }

    // Deduplicate bookings by ID
    const uniqueBookingsMap = new Map<string, Booking>();
    for (const b of playerBookings) {
      uniqueBookingsMap.set(b.id, b);
    }
    const uniqueBookings = Array.from(uniqueBookingsMap.values());

    // Deduplicate registrations by ID
    const uniqueRegsMap = new Map<string, TournamentRegistration>();
    for (const r of playerRegistrations) {
      uniqueRegsMap.set(r.id, r);
    }
    const uniqueRegs = Array.from(uniqueRegsMap.values());

    // Compute counts
    const bookingsCount = uniqueBookings.length;
    const completedBookingsCount = uniqueBookings.filter((b) => b.status === 'completed').length;
    const tournamentCount = uniqueRegs.length;

    // Compute spend and hours from non-cancelled bookings with confirmed payment tracking
    const validBookings = uniqueBookings.filter((b) => b.status !== 'cancelled');

    let originalBookingSpend = 0;
    let extensionSpend = 0;

    for (const b of validBookings) {
      if (b.paymentStatus === 'paid') {
        const orig = b.originalAmount !== undefined ? b.originalAmount : b.totalAmount;
        originalBookingSpend += (orig || 0);
      }
      if (Array.isArray(b.extensions)) {
        for (const ext of b.extensions) {
          if (ext.paymentStatus === 'paid') {
            extensionSpend += (ext.amount || 0);
          }
        }
      }
    }

    const totalSpend = originalBookingSpend + extensionSpend;
    const totalHoursPlayed = Number(
      validBookings.reduce((sum, b) => sum + (b.durationMinutes || 60) / 60, 0).toFixed(1)
    );

    // Compute dates
    const dates: string[] = [];
    for (const b of uniqueBookings) {
      if (b.date) dates.push(b.date);
    }
    for (const r of uniqueRegs) {
      if (r.createdAt) dates.push(r.createdAt.slice(0, 10));
    }
    if (player.createdAt) dates.push(player.createdAt.slice(0, 10));
    dates.sort();

    const firstVisitDate = dates[0] || player.createdAt.slice(0, 10);
    const lastVisitDate = dates[dates.length - 1] || player.createdAt.slice(0, 10);

    // Activity timestamps
    const activityTimestamps: string[] = [];
    for (const b of uniqueBookings) {
      if (b.updatedAt) activityTimestamps.push(b.updatedAt);
      else if (b.createdAt) activityTimestamps.push(b.createdAt);
    }
    for (const r of uniqueRegs) {
      if (r.updatedAt) activityTimestamps.push(r.updatedAt);
      else if (r.createdAt) activityTimestamps.push(r.createdAt);
    }
    if (player.updatedAt) activityTimestamps.push(player.updatedAt);
    activityTimestamps.sort();
    const lastActivityDate = activityTimestamps[activityTimestamps.length - 1] || player.updatedAt || new Date().toISOString();

    // Determine sources
    const sourcesSet = new Set<PlayerAcquisitionSource>(
      player.sources || (player.source ? [player.source] : ['player_registration'])
    );
    if (bookingsCount > 0) sourcesSet.add('gaming_booking');
    if (tournamentCount > 0) sourcesSet.add('tournament_registration');

    // Count dining and event reservations
    let diningCount = 0;
    let eventCount = 0;
    if (this.isMongoConnected && this.db) {
      diningCount = await this.db.collection('dining_reservations').countDocuments({
        $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
      });
      eventCount = await this.db.collection('event_reservations').countDocuments({
        $or: [{ playerId: player.id }, { phone: player.phone }, { phone: norm }],
      });
    } else {
      diningCount = this.fileDiningReservations.filter(
        (r) => r.playerId === player.id || r.phone === player.phone || (norm && this.normalizePhone(r.phone) === norm)
      ).length;
      eventCount = this.fileEventReservations.filter(
        (r) => r.playerId === player.id || r.phone === player.phone || (norm && this.normalizePhone(r.phone) === norm)
      ).length;
    }

    if (diningCount > 0) sourcesSet.add('dining_reservation' as any);
    if (eventCount > 0) sourcesSet.add('event_reservation' as any);
    const sources = Array.from(sourcesSet);

    // Update tags
    const tagsSet = new Set<string>(player.tags || []);
    if (bookingsCount >= 3) tagsSet.add('Frequent Visitor');
    if (bookingsCount > 0) tagsSet.add('Station Guest');
    if (tournamentCount >= 2) tagsSet.add('Tournament Regular');
    else if (tournamentCount > 0) tagsSet.add('Tournament Registrant');
    if (diningCount > 0) tagsSet.add('Dining Guest');
    if (eventCount > 0) tagsSet.add('Event Host');
    const tags = Array.from(tagsSet);

    const updated = await this.updatePlayer(player.id, {
      stats: {
        ...player.stats,
        bookingsCount,
        completedBookingsCount,
        tournamentCount,
        totalHoursPlayed,
        totalSpend,
        originalBookingSpend,
        extensionSpend,
        diningCount,
        eventCount,
        firstVisitDate,
        lastVisitDate,
        lastActivityDate,
      },
      sources,
      tags,
    } as any);

    return updated;
  }

  async linkPlayerToRegistration(registration: TournamentRegistration): Promise<Player> {
    const norm = this.normalizePhone(registration.phone);
    if (!norm) return null as any;

    let player: Player | null = null;
    if (registration.playerId) {
      player = await this.getPlayerById(registration.playerId);
    }
    if (!player) {
      player = await this.getPlayerByPhone(norm);
    }

    const nowIso = new Date().toISOString();
    const eventDate = registration.createdAt ? registration.createdAt.slice(0, 10) : nowIso.slice(0, 10);

    if (!player) {
      // Create new player profile automatically
      player = await this.createPlayer({
        name: registration.participantName.trim(),
        gamerTag: registration.inGameId?.trim() || registration.participantName.split(' ')[0] + '_' + Math.floor(100 + Math.random() * 900),
        phone: registration.phone.trim(),
        email: registration.email ? registration.email.trim().toLowerCase() : undefined,
        source: 'tournament_registration',
        sources: ['tournament_registration'],
        favoriteGame: 'EA Sports FC 25',
        favoritePlatform: 'ps5',
        membershipTier: 'standard',
        tags: ['Tournament Registrant'],
        stats: {
          tournamentCount: 1,
          tournamentWins: 0,
          bookingsCount: 0,
          completedBookingsCount: 0,
          totalHoursPlayed: 0,
          totalSpend: 0,
          firstVisitDate: eventDate,
          lastVisitDate: eventDate,
          lastActivityDate: nowIso,
        },
      });
    } else {
      const sourcesSet = new Set(player.sources || (player.source ? [player.source] : ['player_registration']));
      sourcesSet.add('tournament_registration');

      const updatePayload: any = {
        sources: Array.from(sourcesSet),
      };
      if (!player.email && registration.email) {
        updatePayload.email = registration.email.trim().toLowerCase();
      }
      if (registration.inGameId && (!player.gamerTag || player.gamerTag.includes('_'))) {
        updatePayload.gamerTag = registration.inGameId.trim();
      }
      await this.updatePlayer(player.id, updatePayload);
    }

    // Attach playerId to registration
    if (player) {
      registration.playerId = player.id;
      if (this.isMongoConnected && this.db) {
        await this.db
          .collection<TournamentRegistration>('tournament_registrations')
          .updateOne({ id: registration.id }, { $set: { playerId: player.id } });
      } else {
        const idx = this.fileRegistrations.findIndex((r) => r.id === registration.id);
        if (idx !== -1) {
          this.fileRegistrations[idx].playerId = player.id;
        } else {
          this.fileRegistrations.push(registration);
        }
        this.saveRegistrationsToFile();
      }

      // Handle team registration teammates
      if (registration.teammates && registration.teammates.length > 0) {
        for (const tm of registration.teammates) {
          if (tm.phone) {
            const tmNorm = this.normalizePhone(tm.phone);
            if (tmNorm && tmNorm.length >= 10) {
              try {
                let tmPlayer = await this.getPlayerByPhone(tmNorm);
                if (!tmPlayer) {
                  tmPlayer = await this.createPlayer({
                    name: tm.name.trim(),
                    gamerTag: tm.inGameId?.trim() || tm.name.split(' ')[0] + '_' + Math.floor(100 + Math.random() * 900),
                    phone: tm.phone.trim(),
                    source: 'tournament_registration',
                    sources: ['tournament_registration'],
                    tags: ['Tournament Teammate'],
                    stats: {
                      tournamentCount: 1,
                      tournamentWins: 0,
                      bookingsCount: 0,
                      completedBookingsCount: 0,
                      totalHoursPlayed: 0,
                      totalSpend: 0,
                      firstVisitDate: eventDate,
                      lastVisitDate: eventDate,
                      lastActivityDate: nowIso,
                    },
                  });
                } else {
                  const tmSources = new Set(tmPlayer.sources || (tmPlayer.source ? [tmPlayer.source] : ['player_registration']));
                  tmSources.add('tournament_registration');
                  await this.updatePlayer(tmPlayer.id, { sources: Array.from(tmSources) } as any);
                }
                (tm as any).playerId = tmPlayer.id;
                await this.recalculatePlayerStats(tmPlayer.id);
              } catch (tmErr) {
                console.warn('Could not auto-link teammate:', tm.name, tmErr);
              }
            }
          }
        }
        if (this.isMongoConnected && this.db) {
          await this.db.collection('tournament_registrations').updateOne(
            { id: registration.id },
            { $set: { teammates: registration.teammates } }
          );
        } else {
          this.saveRegistrationsToFile();
        }
      }

      // Recalculate stats idempotently
      const recalculated = await this.recalculatePlayerStats(player.id);
      if (recalculated) player = recalculated;
    }

    return player;
  }

  async linkPlayerToBooking(booking: Booking): Promise<Player> {
    const norm = this.normalizePhone(booking.phone);
    if (!norm) return null as any;

    let player: Player | null = null;
    if (booking.playerId) {
      player = await this.getPlayerById(booking.playerId);
    }
    if (!player) {
      player = await this.getPlayerByPhone(norm);
    }

    const nowIso = new Date().toISOString();
    const eventDate = booking.date || nowIso.slice(0, 10);
    const spendPaise = booking.status !== 'cancelled' ? booking.totalAmount : 0;
    const hours = (booking.durationMinutes || 60) / 60;

    if (!player) {
      player = await this.createPlayer({
        name: booking.customerName.trim(),
        phone: booking.phone.trim(),
        email: booking.email ? booking.email.trim().toLowerCase() : undefined,
        source: 'gaming_booking',
        sources: ['gaming_booking'],
        favoritePlatform: booking.category || 'ps5',
        membershipTier: 'standard',
        tags: ['Gamer', 'Station Guest'],
        stats: {
          tournamentCount: 0,
          tournamentWins: 0,
          bookingsCount: 1,
          completedBookingsCount: booking.status === 'completed' ? 1 : 0,
          totalHoursPlayed: hours,
          totalSpend: spendPaise,
          firstVisitDate: eventDate,
          lastVisitDate: eventDate,
          lastActivityDate: nowIso,
        },
      });
    } else {
      const sourcesSet = new Set(player.sources || (player.source ? [player.source] : ['player_registration']));
      sourcesSet.add('gaming_booking');

      const updatePayload: any = {
        sources: Array.from(sourcesSet),
      };
      if (!player.email && booking.email) {
        updatePayload.email = booking.email.trim().toLowerCase();
      }
      await this.updatePlayer(player.id, updatePayload);
    }

    // Attach playerId to booking
    if (player) {
      booking.playerId = player.id;
      if (this.isMongoConnected && this.db) {
        await this.db.collection<Booking>('bookings').updateOne({ id: booking.id }, { $set: { playerId: player.id } });
      } else {
        const idx = this.fileBookings.findIndex((b) => b.id === booking.id);
        if (idx !== -1) {
          this.fileBookings[idx].playerId = player.id;
        } else {
          this.fileBookings.push(booking);
        }
        this.saveBookingsToFile();
      }

      // Recalculate stats idempotently
      const recalculated = await this.recalculatePlayerStats(player.id);
      if (recalculated) player = recalculated;
    }

    return player;
  }

  // ======================== LOYALTY RULES & POINTS ENGINE ========================

  async getLoyaltyRules(): Promise<LoyaltyRules> {
    if (this.isMongoConnected && this.db) {
      const doc = await this.db.collection<LoyaltyRules>('loyalty_rules').findOne({});
      if (doc) return doc;
    }
    return { ...this.fileLoyaltyRules };
  }

  async updateLoyaltyRules(updates: Partial<LoyaltyRules>, updatedBy = 'Staff Admin'): Promise<LoyaltyRules> {
    const existing = await this.getLoyaltyRules();
    const merged: LoyaltyRules = {
      ...existing,
      ...updates,
      rulesEnabled: {
        ...existing.rulesEnabled,
        ...(updates.rulesEnabled || {}),
      },
      tournamentPlacementBonus: {
        ...existing.tournamentPlacementBonus,
        ...(updates.tournamentPlacementBonus || {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = merged as any;
      await this.db.collection('loyalty_rules').updateOne(
        {},
        { $set: fieldsToSet },
        { upsert: true }
      );
    } else {
      this.fileLoyaltyRules = merged;
      this.saveLoyaltyRulesToFile();
    }

    return merged;
  }

  async processGamingSessionCompleted(booking: Booking): Promise<void> {
    if (!booking) return;
    // Strict requirement: Never award points for cancelled, unpaid, or incomplete activities.
    if (booking.status !== 'completed' || booking.paymentStatus !== 'paid') {
      return;
    }
    const rules = await this.getLoyaltyRules();
    if (!rules.rulesEnabled.gamingSession) return;

    let player: Player | null = null;
    if (booking.playerId) {
      player = await this.getPlayerById(booking.playerId);
    }
    if (!player) {
      const norm = this.normalizePhone(booking.phone);
      if (norm) player = await this.getPlayerByPhone(norm);
    }
    if (!player) return;

    const points = rules.gamingSessionPoints;
    if (points > 0) {
      const idempotencyKey = `gaming_session_${booking.id}`;
      await this.adjustPlayerLoyalty(
        player.id,
        points,
        'earn',
        `Gaming Session #${booking.id} (${booking.resourceName || 'Station'})`,
        booking.id,
        idempotencyKey
      );
    }

    // Qualify referral if player has pending referral
    await this.qualifyReferral(player.id);
    await this.recalculatePlayerStats(player.id);

    // Record automation event
    await this.recordAutomationEvent({
      eventType: 'booking.completed',
      entityId: booking.id,
      entityType: 'booking',
      payload: {
        bookingId: booking.id,
        playerId: player.id,
        gioId: player.gioId,
        pointsAwarded: points,
      },
      idempotencyKey: `auto_booking_completed_${booking.id}`,
    });
  }

  async processTournamentParticipation(registration: TournamentRegistration): Promise<void> {
    if (!registration) return;
    // Strict requirement: Never award points for cancelled, unpaid, or incomplete activities.
    if (registration.status === 'cancelled' || registration.status === 'rejected' || registration.status === 'waitlisted') {
      return;
    }
    const isQualifying = registration.status === 'checked_in' && registration.paymentStatus !== 'unpaid';
    if (!isQualifying) return;

    const rules = await this.getLoyaltyRules();
    if (!rules.rulesEnabled.tournamentParticipation) return;

    let player: Player | null = null;
    if (registration.playerId) {
      player = await this.getPlayerById(registration.playerId);
    }
    if (!player) {
      const norm = this.normalizePhone(registration.phone);
      if (norm) player = await this.getPlayerByPhone(norm);
    }
    if (!player) return;

    const points = rules.tournamentParticipationPoints;
    if (points > 0) {
      const idempotencyKey = `tournament_participation_${registration.id}`;
      await this.adjustPlayerLoyalty(
        player.id,
        points,
        'earn',
        `Tournament Check-In (${registration.tournamentSlug || 'GioCasa Arena'})`,
        registration.id,
        idempotencyKey
      );
    }

    // Qualify referral
    await this.qualifyReferral(player.id);
    await this.recalculatePlayerStats(player.id);

    // Record automation event
    await this.recordAutomationEvent({
      eventType: 'tournament.checked_in',
      entityId: registration.id,
      entityType: 'registration',
      payload: {
        registrationId: registration.id,
        playerId: player.id,
        gioId: player.gioId,
        tournamentSlug: registration.tournamentSlug,
        pointsAwarded: points,
      },
      idempotencyKey: `auto_tourn_checkin_${registration.id}`,
    });
  }

  async processTournamentRegistrationCancelled(registration: TournamentRegistration): Promise<void> {
    if (!registration) return;
    const origKey = `tournament_participation_${registration.id}`;
    const reversalKey = `reversal_tourn_part_${registration.id}`;

    const origLedger = this.isMongoConnected && this.db
      ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey: origKey })
      : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === origKey);

    if (origLedger && origLedger.points > 0) {
      const existingReversal = this.isMongoConnected && this.db
        ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey: reversalKey })
        : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === reversalKey);

      if (!existingReversal) {
        await this.adjustPlayerLoyalty(
          origLedger.playerId,
          -origLedger.points,
          'adjustment',
          `Reversal: Tournament registration #${registration.id} cancelled/rejected`,
          registration.id,
          reversalKey
        );
      }
    }
  }

  async processTournamentResultsFinalized(result: TournamentResult): Promise<void> {
    if (!result || !result.standings || !result.standings.length) return;
    const rules = await this.getLoyaltyRules();
    if (!rules.rulesEnabled.tournamentPlacement) return;

    const allPlayers = this.isMongoConnected && this.db
      ? await this.db.collection<Player>('players').find({}).toArray()
      : this.filePlayers;

    for (const standing of result.standings) {
      let bonus = 0;
      if (standing.rank === 1) bonus = rules.tournamentPlacementBonus.first;
      else if (standing.rank === 2) bonus = rules.tournamentPlacementBonus.second;
      else if (standing.rank === 3) bonus = rules.tournamentPlacementBonus.third;

      if (bonus <= 0) continue;

      let player: Player | null = null;
      if (standing.playerId) {
        player = await this.getPlayerById(standing.playerId);
      }
      if (!player && standing.participantName) {
        const regs = await this.getTournamentRegistrations(result.tournamentId);
        const matchReg = regs.find(
          (r) =>
            r.participantName.toLowerCase() === standing.participantName.toLowerCase() ||
            (standing.inGameId && r.inGameId && r.inGameId.toLowerCase() === standing.inGameId.toLowerCase())
        );
        if (matchReg && matchReg.playerId) {
          player = await this.getPlayerById(matchReg.playerId);
        }
      }
      if (!player && standing.participantName) {
        player = allPlayers.find((p) =>
          p.gamerTag.toLowerCase() === standing.participantName.toLowerCase() ||
          p.name.toLowerCase() === standing.participantName.toLowerCase() ||
          (standing.inGameId && p.gamerTag.toLowerCase() === standing.inGameId.toLowerCase())
        ) || null;
      }

      if (player) {
        const idempotencyKey = `tournament_placement_${result.tournamentId}_rank_${standing.rank}_${player.id}`;
        await this.adjustPlayerLoyalty(
          player.id,
          bonus,
          'bonus',
          `Tournament Rank #${standing.rank} Placement (${standing.awardLabel || 'Prize'})`,
          result.tournamentId,
          idempotencyKey
        );
      }
    }

    await this.recordAutomationEvent({
      eventType: 'tournament.results_finalized',
      entityId: result.tournamentId,
      entityType: 'tournament',
      payload: {
        tournamentId: result.tournamentId,
        tournamentSlug: result.tournamentSlug,
        standingsCount: result.standings.length,
      },
      idempotencyKey: `auto_tourn_results_${result.tournamentId}`,
    });
  }

  async processBookingCancelledOrRefunded(booking: Booking): Promise<void> {
    if (!booking) return;
    const origKey = `gaming_session_${booking.id}`;
    const reversalKey = `reversal_gaming_session_${booking.id}`;

    const origLedger = this.isMongoConnected && this.db
      ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey: origKey })
      : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === origKey);

    if (origLedger && origLedger.points > 0) {
      const existingReversal = this.isMongoConnected && this.db
        ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey: reversalKey })
        : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === reversalKey);

      if (!existingReversal) {
        await this.adjustPlayerLoyalty(
          origLedger.playerId,
          -origLedger.points,
          'adjustment',
          `Reversal: Gaming Session #${booking.id} cancelled/refunded`,
          booking.id,
          reversalKey
        );
      }
    }

    await this.recordAutomationEvent({
      eventType: 'booking.cancelled',
      entityId: booking.id,
      entityType: 'booking',
      payload: {
        bookingId: booking.id,
      },
      idempotencyKey: `auto_booking_cancelled_${booking.id}`,
    });
  }

  // ======================== REFERRALS ========================

  async qualifyReferral(referredPlayerId: string): Promise<Referral | null> {
    if (!referredPlayerId) return null;

    let pendingReferral: Referral | null = null;
    if (this.isMongoConnected && this.db) {
      pendingReferral = await this.db.collection<Referral>('referrals').findOne({
        referredPlayerId,
        status: 'pending',
      });
    } else {
      pendingReferral = this.fileReferrals.find(
        (r) => r.referredPlayerId === referredPlayerId && r.status === 'pending'
      ) || null;
    }

    if (!pendingReferral) return null;

    const rules = await this.getLoyaltyRules();
    const nowIso = new Date().toISOString();

    const updatedReferral: Referral = {
      ...pendingReferral,
      status: 'qualified',
      qualifiedAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updatedReferral as any;
      await this.db.collection<Referral>('referrals').updateOne(
        { id: pendingReferral.id },
        { $set: fieldsToSet }
      );
    } else {
      const idx = this.fileReferrals.findIndex((r) => r.id === pendingReferral.id);
      if (idx !== -1) {
        this.fileReferrals[idx] = updatedReferral;
        this.saveReferralsToFile();
      }
    }

    // Award referrer bonus points if enabled
    if (rules.rulesEnabled.referral && rules.referralPoints > 0) {
      const referrerKey = `referral_reward_referrer_${pendingReferral.id}`;
      await this.adjustPlayerLoyalty(
        pendingReferral.referrerPlayerId,
        rules.referralPoints,
        'bonus',
        `Referral Reward (Player @${pendingReferral.referredGioId} completed 1st activity)`,
        pendingReferral.id,
        referrerKey
      );
    }

    // Update referrer's successfulReferralCount
    const referrer = await this.getPlayerById(pendingReferral.referrerPlayerId);
    if (referrer) {
      await this.updatePlayer(referrer.id, {
        successfulReferralCount: (referrer.successfulReferralCount || 0) + 1,
      } as any);
    }

    // Record automation event
    await this.recordAutomationEvent({
      eventType: 'referral.qualified',
      entityId: pendingReferral.id,
      entityType: 'referral',
      payload: {
        referralId: pendingReferral.id,
        referrerId: pendingReferral.referrerPlayerId,
        referredId: pendingReferral.referredPlayerId,
        referrerGioId: pendingReferral.referrerGioId,
        referredGioId: pendingReferral.referredGioId,
      },
      idempotencyKey: `auto_ref_qual_${pendingReferral.id}`,
    });

    return updatedReferral;
  }

  async getReferrals(params: { referrerPlayerId?: string; referredPlayerId?: string; status?: string; limit?: number } = {}): Promise<Referral[]> {
    let list: Referral[] = [];
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (params.referrerPlayerId) query.referrerPlayerId = params.referrerPlayerId;
      if (params.referredPlayerId) query.referredPlayerId = params.referredPlayerId;
      if (params.status && params.status !== 'all') query.status = params.status;
      list = await this.db.collection<Referral>('referrals').find(query).sort({ createdAt: -1 }).limit(params.limit || 100).toArray();
    } else {
      list = [...this.fileReferrals];
      if (params.referrerPlayerId) list = list.filter((r) => r.referrerPlayerId === params.referrerPlayerId);
      if (params.referredPlayerId) list = list.filter((r) => r.referredPlayerId === params.referredPlayerId);
      if (params.status && params.status !== 'all') list = list.filter((r) => r.status === params.status);
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (params.limit) list = list.slice(0, params.limit);
    }
    return list;
  }

  async getReferralLeaderboard(limit = 10): Promise<Array<{
    playerId: string;
    gioId: string;
    name: string;
    gamerTag: string;
    totalReferrals: number;
    successfulReferrals: number;
    pointsEarned: number;
  }>> {
    const allReferrals = await this.getReferrals({ limit: 10000 });
    const rules = await this.getLoyaltyRules();
    const statsByReferrer = new Map<string, { total: number; qualified: number }>();

    for (const r of allReferrals) {
      const existing = statsByReferrer.get(r.referrerPlayerId) || { total: 0, qualified: 0 };
      existing.total++;
      if (r.status === 'qualified') existing.qualified++;
      statsByReferrer.set(r.referrerPlayerId, existing);
    }

    const leaderboard: Array<{
      playerId: string;
      gioId: string;
      name: string;
      gamerTag: string;
      totalReferrals: number;
      successfulReferrals: number;
      pointsEarned: number;
    }> = [];

    for (const [playerId, s] of statsByReferrer.entries()) {
      const player = await this.getPlayerById(playerId);
      if (player) {
        leaderboard.push({
          playerId: player.id,
          gioId: player.gioId,
          name: player.name,
          gamerTag: player.gamerTag,
          totalReferrals: s.total,
          successfulReferrals: s.qualified,
          pointsEarned: s.qualified * rules.referralPoints,
        });
      }
    }

    leaderboard.sort((a, b) => b.successfulReferrals - a.successfulReferrals || b.totalReferrals - a.totalReferrals);
    return leaderboard.slice(0, limit);
  }

  async updateReferralStatus(id: string, status: any, notes?: string): Promise<Referral | null> {
    const existing = (this.isMongoConnected && this.db)
      ? await this.db.collection<Referral>('referrals').findOne({ id })
      : this.fileReferrals.find((r) => r.id === id);

    if (!existing) return null;

    const updated: Referral = {
      ...existing,
      status,
      notes: notes || existing.notes,
      qualifiedAt: status === 'qualified' ? (existing.qualifiedAt || new Date().toISOString()) : existing.qualifiedAt,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db.collection<Referral>('referrals').updateOne({ id }, { $set: fieldsToSet });
    } else {
      const idx = this.fileReferrals.findIndex((r) => r.id === id);
      if (idx !== -1) {
        this.fileReferrals[idx] = updated;
        this.saveReferralsToFile();
      }
    }

    // Award referrer bonus points when referral is verified/qualified
    if (status === 'qualified' && existing.status !== 'qualified') {
      const rules = await this.getLoyaltyRules();
      if (rules.rulesEnabled.referral && rules.referralPoints > 0) {
        const referrerKey = `referral_reward_referrer_${existing.id}`;
        await this.adjustPlayerLoyalty(
          existing.referrerPlayerId,
          rules.referralPoints,
          'bonus',
          `Referral Reward (Verified referral for Player @${existing.referredGioId})`,
          existing.id,
          referrerKey
        );
      }
      const referrer = await this.getPlayerById(existing.referrerPlayerId);
      if (referrer) {
        await this.updatePlayer(referrer.id, {
          successfulReferralCount: (referrer.successfulReferralCount || 0) + 1,
        } as any);
      }
    }

    // Reversal if verified referral is cancelled/reversed
    if ((status === 'reversed' || status === 'rejected') && existing.status === 'qualified') {
      const origKey = `referral_reward_referrer_${existing.id}`;
      const revKey = `reversal_ref_reward_${existing.id}`;
      const origLedger = this.isMongoConnected && this.db
        ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey: origKey })
        : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === origKey);

      if (origLedger && origLedger.points > 0) {
        const existingRev = this.isMongoConnected && this.db
          ? await this.db.collection<LoyaltyLedgerEntry>('loyalty_ledger').findOne({ idempotencyKey: revKey })
          : this.fileLoyaltyLedger.find((l) => l.idempotencyKey === revKey);

        if (!existingRev) {
          await this.adjustPlayerLoyalty(
            existing.referrerPlayerId,
            -origLedger.points,
            'adjustment',
            `Reversal: Referral #${existing.id} rejected/reversed`,
            existing.id,
            revKey
          );
        }
      }
    }

    return updated;
  }

  async getReferralsForPlayer(playerId: string): Promise<Referral[]> {
    if (!playerId) return [];
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Referral>('referrals').find({
        $or: [{ referrerPlayerId: playerId }, { referredPlayerId: playerId }],
      }).sort({ createdAt: -1 }).toArray();
    }
    return this.fileReferrals
      .filter((r) => r.referrerPlayerId === playerId || r.referredPlayerId === playerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ======================== AUTOMATION EVENTS ========================

  async recordAutomationEvent(data: Partial<AutomationEvent> & { idempotencyKey?: string }): Promise<AutomationEvent> {
    const nowIso = new Date().toISOString();

    if (data.idempotencyKey) {
      const existing = (this.isMongoConnected && this.db)
        ? await this.db.collection<AutomationEvent>('automation_events').findOne({ idempotencyKey: data.idempotencyKey })
        : this.fileAutomationEvents.find((e) => e.idempotencyKey === data.idempotencyKey);

      if (existing) return existing;
    }

    const event: AutomationEvent = {
      id: `evt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      eventType: data.eventType || 'unknown',
      entityId: data.entityId || '',
      entityType: data.entityType || 'system',
      payload: data.payload || {},
      status: data.status || 'processed',
      retryCount: 0,
      idempotencyKey: data.idempotencyKey,
      errorMessage: data.errorMessage,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<AutomationEvent>('automation_events').insertOne(event);
    } else {
      this.fileAutomationEvents.unshift(event);
      this.saveAutomationEventsToFile();
    }

    return event;
  }

  async getAutomationEvents(params: { status?: string; limit?: number } = {}): Promise<AutomationEvent[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (params.status && params.status !== 'all') query.status = params.status;
      return this.db.collection<AutomationEvent>('automation_events').find(query).sort({ createdAt: -1 }).limit(params.limit || 50).toArray();
    }
    let list = [...this.fileAutomationEvents];
    if (params.status && params.status !== 'all') list = list.filter((e) => e.status === params.status);
    return list.slice(0, params.limit || 50);
  }

  async retryAutomationEvent(id: string): Promise<AutomationEvent | null> {
    const existing = (this.isMongoConnected && this.db)
      ? await this.db.collection<AutomationEvent>('automation_events').findOne({ id })
      : this.fileAutomationEvents.find((e) => e.id === id);

    if (!existing) return null;

    const updated: AutomationEvent = {
      ...existing,
      status: 'processed',
      retryCount: (existing.retryCount || 0) + 1,
      errorMessage: undefined,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db.collection<AutomationEvent>('automation_events').updateOne({ id }, { $set: fieldsToSet });
    } else {
      const idx = this.fileAutomationEvents.findIndex((e) => e.id === id);
      if (idx !== -1) {
        this.fileAutomationEvents[idx] = updated;
        this.saveAutomationEventsToFile();
      }
    }

    return updated;
  }

  // ======================== ADMIN REMINDERS ========================

  async getAdminReminders(params: { status?: string; playerId?: string } = {}): Promise<AdminReminder[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (params.status && params.status !== 'all') query.status = params.status;
      if (params.playerId) query.playerId = params.playerId;
      return this.db.collection<AdminReminder>('crm_reminders').find(query).sort({ dueDate: 1 }).toArray();
    }
    let list = [...this.fileCrmReminders];
    if (params.status && params.status !== 'all') list = list.filter((r) => r.status === params.status);
    if (params.playerId) list = list.filter((r) => r.playerId === params.playerId);
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async createAdminReminder(data: Partial<AdminReminder>): Promise<AdminReminder> {
    const nowIso = new Date().toISOString();
    const reminder: AdminReminder = {
      id: `rem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      playerId: data.playerId || '',
      playerName: data.playerName || 'Customer',
      playerPhone: data.playerPhone || '',
      title: data.title || 'Follow up',
      description: data.description,
      dueDate: data.dueDate || nowIso.slice(0, 10),
      priority: data.priority || 'medium',
      status: 'pending',
      assignedTo: data.assignedTo || 'Staff Admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<AdminReminder>('crm_reminders').insertOne(reminder);
    } else {
      this.fileCrmReminders.unshift(reminder);
      this.saveCrmRemindersToFile();
    }

    return reminder;
  }

  async updateAdminReminder(id: string, updates: Partial<AdminReminder>): Promise<AdminReminder | null> {
    const existing = (this.isMongoConnected && this.db)
      ? await this.db.collection<AdminReminder>('crm_reminders').findOne({ id })
      : this.fileCrmReminders.find((r) => r.id === id);

    if (!existing) return null;

    const updated: AdminReminder = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db.collection<AdminReminder>('crm_reminders').updateOne({ id }, { $set: fieldsToSet });
    } else {
      const idx = this.fileCrmReminders.findIndex((r) => r.id === id);
      if (idx !== -1) {
        this.fileCrmReminders[idx] = updated;
        this.saveCrmRemindersToFile();
      }
    }

    return updated;
  }

  async deleteAdminReminder(id: string): Promise<boolean> {
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection('crm_reminders').deleteOne({ id });
      return (res.deletedCount || 0) > 0;
    }
    const init = this.fileCrmReminders.length;
    this.fileCrmReminders = this.fileCrmReminders.filter((r) => r.id !== id);
    if (this.fileCrmReminders.length !== init) {
      this.saveCrmRemindersToFile();
      return true;
    }
    return false;
  }

  // ======================== COMMUNICATION LOGS ========================

  async logCommunication(data: Omit<CommunicationLog, 'id' | 'createdAt'>): Promise<CommunicationLog> {
    const nowIso = new Date().toISOString();
    const log: CommunicationLog = {
      id: `comm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      ...data,
      createdAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<CommunicationLog>('communication_logs').insertOne(log);
    } else {
      this.fileCommunicationLogs.unshift(log);
      this.saveCommunicationLogsToFile();
    }

    await this.recordAutomationEvent({
      eventType: 'communication.prepared',
      entityId: log.id,
      entityType: 'communication',
      payload: {
        channel: log.channel,
        playerId: log.playerId,
        templateName: log.templateName,
      },
    });

    return log;
  }

  async getCommunicationLogs(playerId?: string, limit = 50): Promise<CommunicationLog[]> {
    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (playerId) query.playerId = playerId;
      return this.db.collection<CommunicationLog>('communication_logs').find(query).sort({ createdAt: -1 }).limit(limit).toArray();
    }
    let list = [...this.fileCommunicationLogs];
    if (playerId) list = list.filter((c) => c.playerId === playerId);
    return list.slice(0, limit);
  }

  async reconcileHistoricalData(): Promise<HistoricalReconciliationReport> {
    console.log('🔄 Performing comprehensive safe historical reconciliation of CRM profiles...');
    const affectedPlayerIds = new Set<string>();
    const ambiguousRecordsFlagged: Array<{
      type: 'booking' | 'tournament_registration';
      id: string;
      name: string;
      phone: string;
      reason: string;
    }> = [];

    let bookingsLinked = 0;
    let bookingsCreatedProfiles = 0;
    let bookingsSkipped = 0;

    let tournamentsLinked = 0;
    let tournamentsCreatedProfiles = 0;
    let tournamentsSkipped = 0;

    // 1. Process all bookings
    const bks = this.isMongoConnected && this.db
      ? await this.db.collection<Booking>('bookings').find({}).toArray()
      : this.fileBookings;

    for (const b of bks) {
      try {
        const norm = this.normalizePhone(b.phone);
        const hasValidName = !!(b.customerName && b.customerName.trim().length > 0);
        const hasValidPhone = !!(norm && norm.length === 10);

        if (!hasValidName || !hasValidPhone) {
          ambiguousRecordsFlagged.push({
            type: 'booking',
            id: b.id,
            name: b.customerName || 'Missing Name',
            phone: b.phone || 'Missing Phone',
            reason: !hasValidPhone
              ? 'Invalid or missing 10-digit phone number'
              : 'Missing customer name',
          });
          bookingsSkipped++;
          continue;
        }

        // Check if already linked
        let existingPlayer: Player | null = null;
        if (b.playerId) {
          existingPlayer = await this.getPlayerById(b.playerId);
        }
        if (!existingPlayer) {
          existingPlayer = await this.getPlayerByPhone(norm);
        }

        if (existingPlayer) {
          if (b.playerId !== existingPlayer.id) {
            b.playerId = existingPlayer.id;
            if (this.isMongoConnected && this.db) {
              await this.db.collection('bookings').updateOne({ id: b.id }, { $set: { playerId: existingPlayer.id } });
            } else {
              const idx = this.fileBookings.findIndex((item) => item.id === b.id);
              if (idx !== -1) this.fileBookings[idx].playerId = existingPlayer.id;
            }
          }
          const sourcesSet = new Set(existingPlayer.sources || (existingPlayer.source ? [existingPlayer.source] : ['player_registration']));
          sourcesSet.add('gaming_booking');
          const updatePayload: any = { sources: Array.from(sourcesSet) };
          if (!existingPlayer.email && b.email) {
            updatePayload.email = b.email.trim().toLowerCase();
          }
          await this.updatePlayer(existingPlayer.id, updatePayload);
          bookingsLinked++;
          affectedPlayerIds.add(existingPlayer.id);
        } else {
          // Create new player profile
          const newPlayer = await this.createPlayer({
            name: b.customerName.trim(),
            phone: norm,
            email: b.email ? b.email.trim().toLowerCase() : undefined,
            source: 'gaming_booking',
            sources: ['gaming_booking'],
            favoritePlatform: b.category || 'ps5',
            membershipTier: 'standard',
            tags: ['Gamer', 'Station Guest'],
            stats: {
              tournamentCount: 0,
              tournamentWins: 0,
              bookingsCount: 1,
              completedBookingsCount: b.status === 'completed' ? 1 : 0,
              totalHoursPlayed: (b.durationMinutes || 60) / 60,
              totalSpend: b.status !== 'cancelled' ? (b.totalAmount || 0) : 0,
              firstVisitDate: b.date || (b.createdAt ? b.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
              lastVisitDate: b.date || (b.createdAt ? b.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
              lastActivityDate: b.updatedAt || b.createdAt || new Date().toISOString(),
            },
          });
          b.playerId = newPlayer.id;
          if (this.isMongoConnected && this.db) {
            await this.db.collection('bookings').updateOne({ id: b.id }, { $set: { playerId: newPlayer.id } });
          } else {
            const idx = this.fileBookings.findIndex((item) => item.id === b.id);
            if (idx !== -1) this.fileBookings[idx].playerId = newPlayer.id;
          }
          bookingsCreatedProfiles++;
          affectedPlayerIds.add(newPlayer.id);
        }
      } catch (err) {
        console.warn('Reconciliation skipped booking:', b.id, err);
        bookingsSkipped++;
      }
    }

    // 2. Process all tournament registrations
    const regs = this.isMongoConnected && this.db
      ? await this.db.collection<TournamentRegistration>('tournament_registrations').find({}).toArray()
      : this.fileRegistrations;

    for (const r of regs) {
      try {
        const norm = this.normalizePhone(r.phone);
        const hasValidName = !!(r.participantName && r.participantName.trim().length > 0);
        const hasValidPhone = !!(norm && norm.length === 10);

        if (!hasValidName || !hasValidPhone) {
          ambiguousRecordsFlagged.push({
            type: 'tournament_registration',
            id: r.id,
            name: r.participantName || 'Missing Name',
            phone: r.phone || 'Missing Phone',
            reason: !hasValidPhone
              ? 'Invalid or missing 10-digit phone number'
              : 'Missing participant name',
          });
          tournamentsSkipped++;
          continue;
        }

        let existingPlayer: Player | null = null;
        if (r.playerId) {
          existingPlayer = await this.getPlayerById(r.playerId);
        }
        if (!existingPlayer) {
          existingPlayer = await this.getPlayerByPhone(norm);
        }

        if (existingPlayer) {
          if (r.playerId !== existingPlayer.id) {
            r.playerId = existingPlayer.id;
            if (this.isMongoConnected && this.db) {
              await this.db.collection('tournament_registrations').updateOne({ id: r.id }, { $set: { playerId: existingPlayer.id } });
            } else {
              const idx = this.fileRegistrations.findIndex((item) => item.id === r.id);
              if (idx !== -1) this.fileRegistrations[idx].playerId = existingPlayer.id;
            }
          }
          const sourcesSet = new Set(existingPlayer.sources || (existingPlayer.source ? [existingPlayer.source] : ['player_registration']));
          sourcesSet.add('tournament_registration');
          const updatePayload: any = { sources: Array.from(sourcesSet) };
          if (!existingPlayer.email && r.email) {
            updatePayload.email = r.email.trim().toLowerCase();
          }
          if (r.inGameId && (!existingPlayer.gamerTag || existingPlayer.gamerTag.includes('_'))) {
            updatePayload.gamerTag = r.inGameId.trim();
          }
          await this.updatePlayer(existingPlayer.id, updatePayload);
          tournamentsLinked++;
          affectedPlayerIds.add(existingPlayer.id);
        } else {
          // Create new player profile
          const newPlayer = await this.createPlayer({
            name: r.participantName.trim(),
            gamerTag: r.inGameId?.trim() || r.participantName.split(' ')[0] + '_' + Math.floor(100 + Math.random() * 900),
            phone: norm,
            email: r.email ? r.email.trim().toLowerCase() : undefined,
            source: 'tournament_registration',
            sources: ['tournament_registration'],
            favoriteGame: 'EA Sports FC 25',
            favoritePlatform: 'ps5',
            membershipTier: 'standard',
            tags: ['Tournament Registrant'],
            stats: {
              tournamentCount: 1,
              tournamentWins: 0,
              bookingsCount: 0,
              completedBookingsCount: 0,
              totalHoursPlayed: 0,
              totalSpend: 0,
              firstVisitDate: r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
              lastVisitDate: r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
              lastActivityDate: r.updatedAt || r.createdAt || new Date().toISOString(),
            },
          });
          r.playerId = newPlayer.id;
          if (this.isMongoConnected && this.db) {
            await this.db.collection('tournament_registrations').updateOne({ id: r.id }, { $set: { playerId: newPlayer.id } });
          } else {
            const idx = this.fileRegistrations.findIndex((item) => item.id === r.id);
            if (idx !== -1) this.fileRegistrations[idx].playerId = newPlayer.id;
          }
          tournamentsCreatedProfiles++;
          affectedPlayerIds.add(newPlayer.id);
        }

        // Also check teammates
        if (r.teammates && r.teammates.length > 0) {
          let teammatesChanged = false;
          for (const tm of r.teammates) {
            if (tm.phone && tm.name) {
              const tmNorm = this.normalizePhone(tm.phone);
              if (tmNorm && tmNorm.length === 10) {
                let tmPlayer = await this.getPlayerByPhone(tmNorm);
                if (!tmPlayer) {
                  tmPlayer = await this.createPlayer({
                    name: tm.name.trim(),
                    gamerTag: tm.inGameId?.trim() || tm.name.split(' ')[0] + '_' + Math.floor(100 + Math.random() * 900),
                    phone: tmNorm,
                    source: 'tournament_registration',
                    sources: ['tournament_registration'],
                    tags: ['Tournament Teammate'],
                    stats: {
                      tournamentCount: 1,
                      tournamentWins: 0,
                      bookingsCount: 0,
                      completedBookingsCount: 0,
                      totalHoursPlayed: 0,
                      totalSpend: 0,
                      firstVisitDate: r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
                      lastVisitDate: r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
                      lastActivityDate: r.updatedAt || r.createdAt || new Date().toISOString(),
                    },
                  });
                } else {
                  const tmSources = new Set(tmPlayer.sources || (tmPlayer.source ? [tmPlayer.source] : ['player_registration']));
                  tmSources.add('tournament_registration');
                  await this.updatePlayer(tmPlayer.id, { sources: Array.from(tmSources) } as any);
                }
                (tm as any).playerId = tmPlayer.id;
                teammatesChanged = true;
                affectedPlayerIds.add(tmPlayer.id);
              }
            }
          }
          if (teammatesChanged) {
            if (this.isMongoConnected && this.db) {
              await this.db.collection('tournament_registrations').updateOne(
                { id: r.id },
                { $set: { teammates: r.teammates } }
              );
            } else {
              this.saveRegistrationsToFile();
            }
          }
        }
      } catch (err) {
        console.warn('Reconciliation skipped registration:', r.id, err);
        tournamentsSkipped++;
      }
    }

    // 3. Recalculate stats for all affected players and ensure gioId & referralCode
    for (const pid of affectedPlayerIds) {
      await this.recalculatePlayerStats(pid);
      const p = await this.getPlayerById(pid);
      if (p) {
        let needsSave = false;
        const updates: any = {};
        if (!p.gioId) {
          updates.gioId = await this.generateUniqueGioId();
          p.gioId = updates.gioId;
          needsSave = true;
        }
        if (!p.referralCode) {
          updates.referralCode = await this.generateUniqueReferralCode();
          p.referralCode = updates.referralCode;
          needsSave = true;
        }
        if (needsSave) {
          await this.updatePlayer(p.id, updates);
        }
      }
    }

    if (!this.isMongoConnected) {
      this.saveRegistrationsToFile();
      this.saveBookingsToFile();
      this.savePlayersToFile();
    }

    const report: HistoricalReconciliationReport = {
      bookingsProcessed: bks.length,
      bookingsLinked,
      bookingsCreatedProfiles,
      bookingsSkipped,
      tournamentsProcessed: regs.length,
      tournamentsLinked,
      tournamentsCreatedProfiles,
      tournamentsSkipped,
      ambiguousRecordsFlagged,
      totalSyncedPlayers: affectedPlayerIds.size,
    };

    console.log(`✅ Historical reconciliation complete:`, report);
    return report;
  }

  // =========================================================================
  // 4-DIGIT GUEST VERIFICATION & LOYALTY PAYMENT RECONCILIATION
  // =========================================================================

  async generateUniqueGuestCode(): Promise<string> {
    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      const candidate = String(crypto.randomInt(1000, 10000));
      let isColliding = false;
      if (this.isMongoConnected && this.db) {
        const [b, d, e, t] = await Promise.all([
          this.db.collection('bookings').findOne({ guestCode: candidate, status: { $ne: 'cancelled' }, checkInStatus: { $ne: 'checked_in' } }),
          this.db.collection('dining_reservations').findOne({ guestCode: candidate, status: { $ne: 'cancelled' }, checkInStatus: { $ne: 'checked_in' } }),
          this.db.collection('event_reservations').findOne({ guestCode: candidate, status: { $ne: 'cancelled' }, checkInStatus: { $ne: 'checked_in' } }),
          this.db.collection('tournament_registrations').findOne({ guestCode: candidate, status: { $ne: 'cancelled' }, checkInStatus: { $ne: 'checked_in' } }),
        ]);
        if (b || d || e || t) isColliding = true;
      } else {
        const inB = this.fileBookings.some((b) => b.guestCode === candidate && b.status !== 'cancelled' && b.checkInStatus !== 'checked_in');
        const inD = this.fileDiningReservations.some((d) => d.guestCode === candidate && d.status !== 'cancelled' && d.checkInStatus !== 'checked_in');
        const inE = this.fileEventReservations.some((e) => e.guestCode === candidate && e.status !== 'cancelled' && e.checkInStatus !== 'checked_in');
        const inT = this.fileRegistrations.some((t) => t.guestCode === candidate && t.status !== 'cancelled' && t.checkInStatus !== 'checked_in');
        if (inB || inD || inE || inT) isColliding = true;
      }
      if (!isColliding) return candidate;
    }
    return String(crypto.randomInt(1000, 10000));
  }

  calculatePointsForSpend(amount: number, rules?: LoyaltyRules): number {
    if (!amount || amount <= 0) return 0;
    const activeRules = rules || this.fileLoyaltyRules;
    if (activeRules?.rulesEnabled && activeRules.rulesEnabled.paymentSpend === false) {
      return 0;
    }
    const rate = activeRules?.pointsPerHundredRupees ?? 10;
    return Math.floor((amount * rate) / 100);
  }

  async findBookingByGuestCode(rawCode: string): Promise<any | null> {
    const code = (rawCode || '').trim();
    if (!code) return null;

    // 1. Gaming Bookings
    let gaming: Booking | null = null;
    if (this.isMongoConnected && this.db) {
      gaming = await this.db.collection<Booking>('bookings').findOne({ guestCode: code });
    } else {
      gaming = this.fileBookings.find((b) => b.guestCode === code) || null;
    }

    if (gaming) {
      const resource = await this.getResourceById(gaming.resourceId);
      return {
        id: gaming.id,
        bookingType: 'gaming',
        guestCode: gaming.guestCode,
        customerName: gaming.customerName,
        guestName: gaming.customerName,
        phone: gaming.phone,
        email: gaming.email,
        checkInStatus: gaming.checkInStatus || 'pending',
        checkedInAt: gaming.checkedInAt,
        checkedInBy: gaming.checkedInBy,
        paymentStatus: gaming.paymentStatus || 'unpaid',
        paymentMethod: gaming.paymentMethod,
        paymentReference: gaming.paymentReference,
        paymentVerifiedBy: gaming.paymentVerifiedBy,
        totalAmount: gaming.totalAmount,
        paidAmount: gaming.paidAmount !== undefined ? gaming.paidAmount : (gaming.paymentStatus === 'paid' ? gaming.totalAmount : 0),
        remainingBalance: gaming.remainingBalance !== undefined ? gaming.remainingBalance : (gaming.paymentStatus === 'paid' ? 0 : gaming.totalAmount),
        resourceName: resource?.name || gaming.resourceId,
        equipmentName: resource?.name || gaming.resourceId,
        location: gaming.location || (gaming.category === 'ps5' || gaming.category === 'racing' ? 'Basement' : '1st Floor'),
        date: gaming.date,
        timeSlot: `${gaming.startTime} - ${gaming.endTime}`,
        durationMinutes: gaming.durationMinutes,
        numberOfGuests: gaming.numberOfPeople || 1,
        numberOfPeople: gaming.numberOfPeople || 1,
        status: gaming.status,
        specialRequests: gaming.notes || undefined,
        notes: gaming.notes,
        payments: gaming.payments || [],
        auditLogs: gaming.auditLogs || [],
      };
    }

    // 2. Dining Reservations
    let dining: DiningReservation | null = null;
    if (this.isMongoConnected && this.db) {
      dining = await this.db.collection<DiningReservation>('dining_reservations').findOne({ guestCode: code });
    } else {
      dining = this.fileDiningReservations.find((d) => d.guestCode === code) || null;
    }

    if (dining) {
      return {
        id: dining.id,
        bookingType: 'dining',
        guestCode: dining.guestCode,
        customerName: dining.customerName,
        guestName: dining.customerName,
        phone: dining.phone,
        email: dining.email,
        checkInStatus: dining.checkInStatus || 'pending',
        checkedInAt: dining.checkedInAt,
        checkedInBy: dining.checkedInBy,
        paymentStatus: dining.paymentStatus || 'unpaid',
        paymentMethod: dining.paymentMethod,
        paymentReference: dining.paymentReference,
        paymentVerifiedBy: dining.paymentVerifiedBy,
        totalAmount: 0,
        paidAmount: 0,
        remainingBalance: 0,
        location: 'GioCasa Dine-in Restaurant — 1st Floor',
        date: dining.date,
        timeSlot: dining.time,
        numberOfGuests: dining.guests,
        numberOfPeople: dining.guests,
        status: dining.status,
        specialRequests: dining.specialRequests,
        notes: dining.additionalRequirements,
        auditLogs: dining.auditLogs || [],
      };
    }

    // 3. Event Reservations
    let eventRes: EventReservation | null = null;
    if (this.isMongoConnected && this.db) {
      eventRes = await this.db.collection<EventReservation>('event_reservations').findOne({ guestCode: code });
    } else {
      eventRes = this.fileEventReservations.find((e) => e.guestCode === code) || null;
    }

    if (eventRes) {
      return {
        id: eventRes.id,
        bookingType: 'event',
        guestCode: eventRes.guestCode,
        customerName: eventRes.customerName,
        guestName: eventRes.customerName,
        phone: eventRes.phone,
        email: eventRes.email,
        checkInStatus: eventRes.checkInStatus || 'pending',
        checkedInAt: eventRes.checkedInAt,
        checkedInBy: eventRes.checkedInBy,
        paymentStatus: eventRes.paymentStatus || 'unpaid',
        paymentMethod: eventRes.paymentMethod,
        paymentReference: eventRes.paymentReference,
        paymentVerifiedBy: eventRes.paymentVerifiedBy,
        totalAmount: Number(eventRes.estimatedBudget) || 0,
        paidAmount: 0,
        remainingBalance: Number(eventRes.estimatedBudget) || 0,
        location: 'GioCasa 1st Floor & Lounge',
        date: eventRes.date,
        timeSlot: eventRes.time,
        numberOfGuests: eventRes.expectedGuests,
        numberOfPeople: eventRes.expectedGuests,
        status: eventRes.status,
        specialRequests: eventRes.foodRequirements,
        notes: eventRes.additionalMessage,
        auditLogs: eventRes.auditLogs || [],
      };
    }

    // 4. Tournament Registrations
    let tourney: TournamentRegistration | null = null;
    if (this.isMongoConnected && this.db) {
      tourney = await this.db.collection<TournamentRegistration>('tournament_registrations').findOne({ guestCode: code });
    } else {
      tourney = this.fileRegistrations.find((t) => t.guestCode === code) || null;
    }

    if (tourney) {
      return {
        id: tourney.id,
        bookingType: 'tournament',
        guestCode: tourney.guestCode,
        customerName: tourney.participantName,
        guestName: tourney.participantName,
        participantName: tourney.participantName,
        phone: tourney.phone,
        email: tourney.email,
        checkInStatus: tourney.checkInStatus || 'pending',
        checkedInAt: tourney.checkedInAt,
        checkedInBy: tourney.checkedInBy,
        paymentStatus: tourney.paymentStatus || 'unpaid',
        paymentMethod: tourney.paymentMethod,
        paymentReference: tourney.paymentReference,
        paymentVerifiedBy: tourney.paymentVerifiedBy,
        totalAmount: 0,
        paidAmount: 0,
        remainingBalance: 0,
        location: 'GioCasa Arena — Basement Arena',
        date: tourney.createdAt ? tourney.createdAt.split('T')[0] : '',
        timeSlot: 'Tournament Matchday',
        numberOfGuests: 1,
        numberOfPeople: 1,
        status: tourney.status,
        auditLogs: tourney.auditLogs || [],
      };
    }

    return null;
  }

  async checkInGuest(bookingType: string, id: string, staffName: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const nowIso = new Date().toISOString();
    const staff = staffName.trim() || 'Front Desk Staff';

    if (bookingType === 'gaming') {
      const booking = await this.getBookingById(id);
      if (!booking) return { success: false, error: 'Booking not found.' };
      if (booking.status === 'cancelled') return { success: false, error: 'Booking has been cancelled. Cannot check in.' };
      if (booking.checkInStatus === 'checked_in') return { success: false, error: 'Guest has already been checked in.' };

      const auditLogs = Array.isArray(booking.auditLogs) ? [...booking.auditLogs] : [];
      auditLogs.push({
        action: 'check_in',
        timestamp: nowIso,
        performedBy: staff,
        details: `Guest checked in by ${staff}`,
      });

      const updatedBooking: Booking = {
        ...booking,
        checkInStatus: 'checked_in',
        checkedInAt: nowIso,
        checkedInBy: staff,
        auditLogs,
        updatedAt: nowIso,
      };

      if (this.isMongoConnected && this.db) {
        await this.db.collection('bookings').updateOne({ id: booking.id }, { $set: updatedBooking });
      } else {
        const idx = this.fileBookings.findIndex((b) => b.id === booking.id);
        if (idx !== -1) {
          this.fileBookings[idx] = updatedBooking;
          this.saveBookingsToFile();
        }
      }

      return { success: true, data: updatedBooking };
    }

    if (bookingType === 'dining') {
      let dining: DiningReservation | null = null;
      if (this.isMongoConnected && this.db) {
        dining = await this.db.collection<DiningReservation>('dining_reservations').findOne({ id });
      } else {
        dining = this.fileDiningReservations.find((d) => d.id === id) || null;
      }
      if (!dining) return { success: false, error: 'Dining reservation not found.' };
      if (dining.status === 'cancelled') return { success: false, error: 'Reservation has been cancelled. Cannot check in.' };
      if (dining.checkInStatus === 'checked_in') return { success: false, error: 'Guest has already been checked in.' };

      const auditLogs = Array.isArray(dining.auditLogs) ? [...dining.auditLogs] : [];
      auditLogs.push({
        action: 'check_in',
        timestamp: nowIso,
        performedBy: staff,
        details: `Dining guest checked in by ${staff}`,
      });

      const updated = {
        ...dining,
        checkInStatus: 'checked_in',
        checkedInAt: nowIso,
        checkedInBy: staff,
        auditLogs,
        updatedAt: nowIso,
      };

      if (this.isMongoConnected && this.db) {
        await this.db.collection('dining_reservations').updateOne({ id }, { $set: updated });
      } else {
        const idx = this.fileDiningReservations.findIndex((d) => d.id === id);
        if (idx !== -1) {
          this.fileDiningReservations[idx] = updated as any;
          this.saveDiningReservationsToFile();
        }
      }
      return { success: true, data: updated };
    }

    if (bookingType === 'event') {
      let eventRes: EventReservation | null = null;
      if (this.isMongoConnected && this.db) {
        eventRes = await this.db.collection<EventReservation>('event_reservations').findOne({ id });
      } else {
        eventRes = this.fileEventReservations.find((e) => e.id === id) || null;
      }
      if (!eventRes) return { success: false, error: 'Event reservation not found.' };
      if (eventRes.status === 'cancelled') return { success: false, error: 'Event reservation has been cancelled. Cannot check in.' };
      if (eventRes.checkInStatus === 'checked_in') return { success: false, error: 'Guest has already been checked in.' };

      const auditLogs = Array.isArray(eventRes.auditLogs) ? [...eventRes.auditLogs] : [];
      auditLogs.push({
        action: 'check_in',
        timestamp: nowIso,
        performedBy: staff,
        details: `Event host checked in by ${staff}`,
      });

      const updated = {
        ...eventRes,
        checkInStatus: 'checked_in',
        checkedInAt: nowIso,
        checkedInBy: staff,
        auditLogs,
        updatedAt: nowIso,
      };

      if (this.isMongoConnected && this.db) {
        await this.db.collection('event_reservations').updateOne({ id }, { $set: updated });
      } else {
        const idx = this.fileEventReservations.findIndex((e) => e.id === id);
        if (idx !== -1) {
          this.fileEventReservations[idx] = updated as any;
          this.saveEventReservationsToFile();
        }
      }
      return { success: true, data: updated };
    }

    return { success: false, error: 'Unsupported booking type.' };
  }

  async processBookingPayment(params: {
    bookingId: string;
    amount: number;
    paymentStatus: PaymentStatus;
    paymentMethod?: PaymentMethod;
    paymentReference?: string;
    staffName?: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; data?: Booking; pointsAwarded: number; playerLoyaltyBalance?: number; error?: string }> {
    const booking = await this.getBookingById(params.bookingId);
    if (!booking) return { success: false, error: 'Booking not found.', pointsAwarded: 0 };

    const nowIso = new Date().toISOString();
    const payments = Array.isArray(booking.payments) ? [...booking.payments] : [];
    const staff = params.staffName || 'Staff';

    // Idempotency check: if payment with this idempotencyKey exists, return 0 points to prevent double award
    if (params.idempotencyKey) {
      const existingPay = payments.find((p) => p.idempotencyKey === params.idempotencyKey);
      if (existingPay) {
        return { success: true, data: booking, pointsAwarded: 0 };
      }
    }

    let pointsAwarded = 0;
    if (params.paymentStatus === 'paid' && params.amount > 0) {
      const rules = await this.getLoyaltyRules();
      pointsAwarded = this.calculatePointsForSpend(params.amount, rules);
    }

    const paymentRecord = {
      id: `pay-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      amount: params.amount,
      paymentMethod: params.paymentMethod || 'cash',
      paymentReference: params.paymentReference,
      paymentStatus: params.paymentStatus,
      paidAt: params.paymentStatus === 'paid' ? nowIso : undefined,
      staffName: staff,
      idempotencyKey: params.idempotencyKey,
      pointsAwarded,
      createdAt: nowIso,
    };
    payments.push(paymentRecord);

    const paidAmount = payments
      .filter((p) => p.paymentStatus === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingBalance = Math.max(0, (booking.totalAmount || 0) - paidAmount);
    const overallPaymentStatus: PaymentStatus =
      remainingBalance === 0 && paidAmount > 0 ? 'paid' : paidAmount > 0 ? 'pending' : params.paymentStatus;

    const auditLogs = Array.isArray(booking.auditLogs) ? [...booking.auditLogs] : [];
    auditLogs.push({
      action: 'payment_update',
      timestamp: nowIso,
      performedBy: staff,
      details: `Payment of ₹${params.amount} marked as ${params.paymentStatus.toUpperCase()} via ${params.paymentMethod || 'cash'} (${pointsAwarded} pts awarded)`,
    });

    const updatedBooking: Booking = {
      ...booking,
      payments,
      paidAmount,
      remainingBalance,
      paymentStatus: overallPaymentStatus,
      paymentMethod: params.paymentMethod || booking.paymentMethod,
      paymentReference: params.paymentReference || booking.paymentReference,
      paymentVerifiedBy: staff,
      paymentVerifiedAt: nowIso,
      auditLogs,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection('bookings').updateOne({ id: booking.id }, { $set: updatedBooking });
    } else {
      const idx = this.fileBookings.findIndex((b) => b.id === booking.id);
      if (idx !== -1) {
        this.fileBookings[idx] = updatedBooking;
        this.saveBookingsToFile();
      }
    }

    // Award loyalty points to player if linked
    let playerLoyaltyBalance = 0;
    let playerId = booking.playerId;
    if (!playerId) {
      const norm = this.normalizePhone(booking.phone);
      if (norm) {
        const pl = await this.getPlayerByPhone(norm);
        if (pl) playerId = pl.id;
      }
    }

    if (playerId) {
      if (pointsAwarded > 0) {
        const adj = await this.adjustPlayerLoyalty(
          playerId,
          pointsAwarded,
          'earn',
          `Payment of ₹${params.amount} for Booking #${booking.id}`,
          booking.id,
          params.idempotencyKey || `pay_points_${booking.id}_${paymentRecord.id}`,
          {
            sourceActivityType: 'booking_payment' as any,
            paymentAmount: params.amount,
            adminActor: staff,
          }
        );
        playerLoyaltyBalance = adj.player.loyalty.pointsBalance;
      } else {
        const pl = await this.getPlayerById(playerId);
        playerLoyaltyBalance = pl?.loyalty.pointsBalance || 0;
      }
      await this.recalculatePlayerStats(playerId);
    }

    return {
      success: true,
      data: updatedBooking,
      pointsAwarded,
      playerLoyaltyBalance,
    };
  }

  async verifyGuestPayment(
    bookingType: string,
    id: string,
    paymentStatus: PaymentStatus,
    paymentMethod?: PaymentMethod,
    paymentReference?: string,
    staffName?: string,
    amount?: number
  ): Promise<{ success: boolean; data?: any; pointsAwarded?: number; playerLoyaltyBalance?: number; error?: string }> {
    const nowIso = new Date().toISOString();
    const staff = staffName?.trim() || 'Front Desk Staff';

    if (bookingType === 'gaming') {
      const booking = await this.getBookingById(id);
      if (!booking) return { success: false, error: 'Booking not found.' };

      // Refund / Reversal Flow
      if (paymentStatus === 'refunded') {
        let playerId = booking.playerId;
        if (!playerId) {
          const norm = this.normalizePhone(booking.phone);
          if (norm) {
            const pl = await this.getPlayerByPhone(norm);
            if (pl) playerId = pl.id;
          }
        }

        let pointsReversed = 0;
        let playerLoyaltyBalance = 0;

        if (playerId) {
          const ledger = await this.getPlayerLoyaltyLedger(playerId);
          const earnEntries = ledger.filter(
            (l) => l.referenceId === booking.id && l.type === 'earn' && l.points > 0
          );
          const totalEarnedOnBooking = earnEntries.reduce((sum, e) => sum + e.points, 0);

          if (totalEarnedOnBooking > 0) {
            const reversalKey = `rev_pay_${booking.id}_${Date.now()}`;
            const adj = await this.adjustPlayerLoyalty(
              playerId,
              -totalEarnedOnBooking,
              'reversal' as any,
              `Refund: Payment of ₹${booking.paidAmount || booking.totalAmount} reversed for Booking #${booking.id}`,
              booking.id,
              reversalKey,
              {
                sourceActivityType: 'manual_reversal' as any,
                paymentAmount: booking.paidAmount || booking.totalAmount,
                adminActor: staff,
              }
            );
            pointsReversed = -totalEarnedOnBooking;
            playerLoyaltyBalance = adj.player.loyalty.pointsBalance;
          }
          await this.recalculatePlayerStats(playerId);
        }

        const auditLogs = Array.isArray(booking.auditLogs) ? [...booking.auditLogs] : [];
        auditLogs.push({
          action: 'payment_update',
          timestamp: nowIso,
          performedBy: staff,
          details: `Payment marked as REFUNDED. Points reversed: ${pointsReversed}`,
        });

        const updatedBooking: Booking = {
          ...booking,
          paymentStatus: 'refunded',
          paidAmount: 0,
          remainingBalance: booking.totalAmount || 0,
          paymentVerifiedBy: staff,
          paymentVerifiedAt: nowIso,
          auditLogs,
          updatedAt: nowIso,
        };

        if (this.isMongoConnected && this.db) {
          await this.db.collection('bookings').updateOne({ id: booking.id }, { $set: updatedBooking });
        } else {
          const idx = this.fileBookings.findIndex((b) => b.id === booking.id);
          if (idx !== -1) {
            this.fileBookings[idx] = updatedBooking;
            this.saveBookingsToFile();
          }
        }

        return {
          success: true,
          data: updatedBooking,
          pointsAwarded: pointsReversed,
          playerLoyaltyBalance,
        };
      }

      // Normal or Partial Payment
      const paymentAmount =
        amount !== undefined && amount !== null && amount > 0
          ? amount
          : booking.remainingBalance !== undefined && booking.remainingBalance > 0
          ? booking.remainingBalance
          : booking.totalAmount || 0;

      return await this.processBookingPayment({
        bookingId: id,
        amount: paymentAmount,
        paymentStatus,
        paymentMethod,
        paymentReference,
        staffName: staff,
      });
    }

    if (bookingType === 'dining') {
      let dining: DiningReservation | null = null;
      if (this.isMongoConnected && this.db) {
        dining = await this.db.collection<DiningReservation>('dining_reservations').findOne({ id });
      } else {
        dining = this.fileDiningReservations.find((d) => d.id === id) || null;
      }
      if (!dining) return { success: false, error: 'Dining reservation not found.' };

      const auditLogs = Array.isArray(dining.auditLogs) ? [...dining.auditLogs] : [];
      auditLogs.push({
        action: 'payment_update',
        timestamp: nowIso,
        performedBy: staff,
        details: `Dining payment updated to ${paymentStatus.toUpperCase()} via ${paymentMethod || 'cash'}`,
      });

      const updated = {
        ...dining,
        paymentStatus,
        paymentMethod: paymentMethod || dining.paymentMethod,
        paymentReference: paymentReference || dining.paymentReference,
        paymentVerifiedBy: staff,
        paymentVerifiedAt: nowIso,
        auditLogs,
        updatedAt: nowIso,
      };

      if (this.isMongoConnected && this.db) {
        await this.db.collection('dining_reservations').updateOne({ id }, { $set: updated });
      } else {
        const idx = this.fileDiningReservations.findIndex((d) => d.id === id);
        if (idx !== -1) {
          this.fileDiningReservations[idx] = updated as any;
          this.saveDiningReservationsToFile();
        }
      }
      return { success: true, data: updated };
    }

    if (bookingType === 'event') {
      let eventRes: EventReservation | null = null;
      if (this.isMongoConnected && this.db) {
        eventRes = await this.db.collection<EventReservation>('event_reservations').findOne({ id });
      } else {
        eventRes = this.fileEventReservations.find((e) => e.id === id) || null;
      }
      if (!eventRes) return { success: false, error: 'Event reservation not found.' };

      const auditLogs = Array.isArray(eventRes.auditLogs) ? [...eventRes.auditLogs] : [];
      auditLogs.push({
        action: 'payment_update',
        timestamp: nowIso,
        performedBy: staff,
        details: `Event payment updated to ${paymentStatus.toUpperCase()} via ${paymentMethod || 'cash'}`,
      });

      const updated = {
        ...eventRes,
        paymentStatus,
        paymentMethod: paymentMethod || eventRes.paymentMethod,
        paymentReference: paymentReference || eventRes.paymentReference,
        paymentVerifiedBy: staff,
        paymentVerifiedAt: nowIso,
        auditLogs,
        updatedAt: nowIso,
      };

      if (this.isMongoConnected && this.db) {
        await this.db.collection('event_reservations').updateOne({ id }, { $set: updated });
      } else {
        const idx = this.fileEventReservations.findIndex((e) => e.id === id);
        if (idx !== -1) {
          this.fileEventReservations[idx] = updated as any;
          this.saveEventReservationsToFile();
        }
      }
      return { success: true, data: updated };
    }

    return { success: false, error: 'Unsupported booking type.' };
  }

  async getRecentVerifiedBookings(limit = 20): Promise<any[]> {
    const list: any[] = [];
    if (this.isMongoConnected && this.db) {
      const [bks, dins, evts] = await Promise.all([
        this.db.collection<Booking>('bookings').find({
          $or: [{ checkInStatus: 'checked_in' }, { paymentStatus: 'paid' }],
        }).sort({ updatedAt: -1 }).limit(limit).toArray(),
        this.db.collection<DiningReservation>('dining_reservations').find({
          $or: [{ checkInStatus: 'checked_in' }, { paymentStatus: 'paid' }],
        }).sort({ updatedAt: -1 }).limit(limit).toArray(),
        this.db.collection<EventReservation>('event_reservations').find({
          $or: [{ checkInStatus: 'checked_in' }, { paymentStatus: 'paid' }],
        }).sort({ updatedAt: -1 }).limit(limit).toArray(),
      ]);

      bks.forEach((b) => list.push({
        id: b.id,
        bookingType: 'gaming',
        guestCode: b.guestCode,
        guestName: b.customerName,
        phone: b.phone,
        checkInStatus: b.checkInStatus || 'pending',
        checkedInAt: b.checkedInAt,
        paymentStatus: b.paymentStatus || 'unpaid',
        paymentVerifiedAt: b.paymentVerifiedAt,
        totalAmount: b.totalAmount,
        updatedAt: b.updatedAt,
      }));

      dins.forEach((d) => list.push({
        id: d.id,
        bookingType: 'dining',
        guestCode: d.guestCode,
        guestName: d.customerName,
        phone: d.phone,
        checkInStatus: d.checkInStatus || 'pending',
        checkedInAt: d.checkedInAt,
        paymentStatus: d.paymentStatus || 'unpaid',
        paymentVerifiedAt: d.paymentVerifiedAt,
        totalAmount: 0,
        updatedAt: d.updatedAt,
      }));

      evts.forEach((e) => list.push({
        id: e.id,
        bookingType: 'event',
        guestCode: e.guestCode,
        guestName: e.customerName,
        phone: e.phone,
        checkInStatus: e.checkInStatus || 'pending',
        checkedInAt: e.checkedInAt,
        paymentStatus: e.paymentStatus || 'unpaid',
        paymentVerifiedAt: e.paymentVerifiedAt,
        totalAmount: Number(e.estimatedBudget) || 0,
        updatedAt: e.updatedAt,
      }));
    } else {
      this.fileBookings
        .filter((b) => b.checkInStatus === 'checked_in' || b.paymentStatus === 'paid')
        .forEach((b) => list.push({
          id: b.id,
          bookingType: 'gaming',
          guestCode: b.guestCode,
          guestName: b.customerName,
          phone: b.phone,
          checkInStatus: b.checkInStatus || 'pending',
          checkedInAt: b.checkedInAt,
          paymentStatus: b.paymentStatus || 'unpaid',
          paymentVerifiedAt: b.paymentVerifiedAt,
          totalAmount: b.totalAmount,
          updatedAt: b.updatedAt,
        }));

      this.fileDiningReservations
        .filter((d) => d.checkInStatus === 'checked_in' || d.paymentStatus === 'paid')
        .forEach((d) => list.push({
          id: d.id,
          bookingType: 'dining',
          guestCode: d.guestCode,
          guestName: d.customerName,
          phone: d.phone,
          checkInStatus: d.checkInStatus || 'pending',
          checkedInAt: d.checkedInAt,
          paymentStatus: d.paymentStatus || 'unpaid',
          paymentVerifiedAt: d.paymentVerifiedAt,
          totalAmount: 0,
          updatedAt: d.updatedAt,
        }));

      this.fileEventReservations
        .filter((e) => e.checkInStatus === 'checked_in' || e.paymentStatus === 'paid')
        .forEach((e) => list.push({
          id: e.id,
          bookingType: 'event',
          guestCode: e.guestCode,
          guestName: e.customerName,
          phone: e.phone,
          checkInStatus: e.checkInStatus || 'pending',
          checkedInAt: e.checkedInAt,
          paymentStatus: e.paymentStatus || 'unpaid',
          paymentVerifiedAt: e.paymentVerifiedAt,
          totalAmount: Number(e.estimatedBudget) || 0,
          updatedAt: e.updatedAt,
        }));
    }

    list.sort((a, b) => (b.checkedInAt || b.paymentVerifiedAt || b.updatedAt).localeCompare(a.checkedInAt || a.paymentVerifiedAt || a.updatedAt));
    return list.slice(0, limit);
  }

  // =========================================================================
  // VAPID PUSH KEYS
  // =========================================================================

  async getVapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
    if (this.isMongoConnected && this.db) {
      const doc = await this.db.collection('settings').findOne({ id: 'vapid_keys' });
      if (doc && doc.publicKey && doc.privateKey) {
        return { publicKey: doc.publicKey, privateKey: doc.privateKey };
      }
    }
    const vapidPath = path.join(DATA_DIR, 'vapid.json');
    if (fs.existsSync(vapidPath)) {
      try {
        const raw = fs.readFileSync(vapidPath, 'utf8');
        return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  async saveVapidKeys(keys: { publicKey: string; privateKey: string }): Promise<void> {
    if (this.isMongoConnected && this.db) {
      await this.db.collection('settings').updateOne(
        { id: 'vapid_keys' },
        { $set: { id: 'vapid_keys', publicKey: keys.publicKey, privateKey: keys.privateKey, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
    const vapidPath = path.join(DATA_DIR, 'vapid.json');
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(vapidPath, JSON.stringify(keys, null, 2), 'utf8');
    } catch {}
  }

  // =========================================================================
  // MENU CUSTOMIZATIONS & FEATURED DISHES (CLOUDINARY POWERED)
  // =========================================================================

  async getMenuCustomizations(): Promise<MenuCustomization[]> {
    if (this.isMongoConnected && this.db) {
      return await this.db.collection<MenuCustomization>('menu_customizations').find({}).toArray();
    }
    return [...this.fileMenuCustomizations];
  }

  async getMenuCustomization(menuItemId: string): Promise<MenuCustomization | null> {
    const cleanId = (menuItemId || '').trim().toLowerCase();
    if (this.isMongoConnected && this.db) {
      return await this.db.collection<MenuCustomization>('menu_customizations').findOne({ menuItemId: cleanId });
    }
    return this.fileMenuCustomizations.find((m) => m.menuItemId.toLowerCase() === cleanId) || null;
  }

  async setMenuCustomization(menuItemId: string, data: Partial<MenuCustomization>): Promise<MenuCustomization> {
    const cleanId = (menuItemId || '').trim().toLowerCase();
    const existing = await this.getMenuCustomization(cleanId);
    const nowIso = new Date().toISOString();

    // If an image is being replaced with a new Cloudinary asset, delete old Cloudinary asset
    if (existing?.imagePublicId && data.imagePublicId && existing.imagePublicId !== data.imagePublicId) {
      cloudinaryService.deleteImage(existing.imagePublicId).catch((err) => {
        console.warn('Failed to delete replaced menu image from Cloudinary:', err);
      });
    }

    const updated: MenuCustomization = {
      id: cleanId,
      menuItemId: cleanId,
      name: data.name !== undefined ? data.name : existing?.name,
      category: data.category !== undefined ? data.category : existing?.category,
      price: data.price !== undefined ? data.price : existing?.price,
      description: data.description !== undefined ? data.description : existing?.description,
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing?.imageUrl,
      imagePublicId: data.imagePublicId !== undefined ? data.imagePublicId : existing?.imagePublicId,
      isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : existing?.isFeatured,
      featuredTitle: data.featuredTitle !== undefined ? data.featuredTitle : existing?.featuredTitle,
      featuredDescription: data.featuredDescription !== undefined ? data.featuredDescription : existing?.featuredDescription,
      badge: data.badge !== undefined ? data.badge : existing?.badge,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db
        .collection<MenuCustomization>('menu_customizations')
        .updateOne({ menuItemId: cleanId }, { $set: fieldsToSet }, { upsert: true });
    } else {
      const idx = this.fileMenuCustomizations.findIndex((m) => m.menuItemId.toLowerCase() === cleanId);
      if (idx !== -1) {
        this.fileMenuCustomizations[idx] = updated;
      } else {
        this.fileMenuCustomizations.push(updated);
      }
      this.saveMenuCustomizationsToFile();
    }

    return updated;
  }

  async deleteMenuCustomization(menuItemId: string): Promise<boolean> {
    const cleanId = (menuItemId || '').trim().toLowerCase();
    const existing = await this.getMenuCustomization(cleanId);
    if (!existing) return false;

    if (existing.imagePublicId) {
      cloudinaryService.deleteImage(existing.imagePublicId).catch((err) => {
        console.warn('Failed to delete menu image from Cloudinary:', err);
      });
    }

    if (this.isMongoConnected && this.db) {
      await this.db.collection<MenuCustomization>('menu_customizations').deleteOne({ menuItemId: cleanId });
    } else {
      this.fileMenuCustomizations = this.fileMenuCustomizations.filter((m) => m.menuItemId.toLowerCase() !== cleanId);
      this.saveMenuCustomizationsToFile();
    }

    return true;
  }

  // =========================================================================
  // MEDIA GALLERY (CAFE, FOOD, GAMING & TOURNAMENTS)
  // =========================================================================

  async getGalleryItems(filter?: { category?: string; featuredOnly?: boolean }): Promise<GalleryItem[]> {
    let items: GalleryItem[] = [];

    if (this.isMongoConnected && this.db) {
      const query: any = {};
      if (filter?.category && filter.category !== 'all') {
        query.category = filter.category;
      }
      if (filter?.featuredOnly) {
        query.isFeatured = true;
      }
      items = await this.db
        .collection<GalleryItem>('gallery_items')
        .find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .toArray();
    } else {
      items = [...this.fileGalleryItems];
      if (filter?.category && filter.category !== 'all') {
        items = items.filter((g) => g.category === filter.category);
      }
      if (filter?.featuredOnly) {
        items = items.filter((g) => g.isFeatured);
      }
      items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }

    return items;
  }

  async getGalleryItem(id: string): Promise<GalleryItem | null> {
    if (this.isMongoConnected && this.db) {
      return await this.db.collection<GalleryItem>('gallery_items').findOne({ id });
    }
    return this.fileGalleryItems.find((g) => g.id === id) || null;
  }

  async createGalleryItem(data: Omit<GalleryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<GalleryItem> {
    const nowIso = new Date().toISOString();
    const id = `gal_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const newItem: GalleryItem = {
      ...data,
      id,
      title: data.title || 'GioCasa Moment',
      category: data.category || 'ambiance',
      imageUrl: data.imageUrl,
      imagePublicId: data.imagePublicId,
      thumbnailUrl: data.thumbnailUrl || data.imageUrl,
      description: data.description || '',
      isFeatured: Boolean(data.isFeatured),
      displayOrder: Number(data.displayOrder) || 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (this.isMongoConnected && this.db) {
      await this.db.collection<GalleryItem>('gallery_items').insertOne(newItem);
    } else {
      this.fileGalleryItems.push(newItem);
      this.saveGalleryItemsToFile();
    }

    return newItem;
  }

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<GalleryItem | null> {
    const existing = await this.getGalleryItem(id);
    if (!existing) return null;

    // Clean up replaced Cloudinary asset
    if (existing.imagePublicId && updates.imagePublicId && existing.imagePublicId !== updates.imagePublicId) {
      cloudinaryService.deleteImage(existing.imagePublicId).catch((err) => {
        console.warn('Failed to delete old gallery image from Cloudinary:', err);
      });
    }

    const updated: GalleryItem = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    if (this.isMongoConnected && this.db) {
      const { _id, ...fieldsToSet } = updated as any;
      await this.db.collection<GalleryItem>('gallery_items').updateOne({ id }, { $set: fieldsToSet });
    } else {
      const idx = this.fileGalleryItems.findIndex((g) => g.id === id);
      if (idx !== -1) {
        this.fileGalleryItems[idx] = updated;
        this.saveGalleryItemsToFile();
      }
    }

    return updated;
  }

  async deleteGalleryItem(id: string): Promise<boolean> {
    const existing = await this.getGalleryItem(id);
    if (!existing) return false;

    // Permanently delete asset from Cloudinary
    if (existing.imagePublicId) {
      cloudinaryService.deleteImage(existing.imagePublicId).catch((err) => {
        console.warn('Failed to delete gallery image from Cloudinary:', err);
      });
    }

    if (this.isMongoConnected && this.db) {
      await this.db.collection<GalleryItem>('gallery_items').deleteOne({ id });
    } else {
      this.fileGalleryItems = this.fileGalleryItems.filter((g) => g.id !== id);
      this.saveGalleryItemsToFile();
    }

    return true;
  }

  async backfillHistoricalData(): Promise<{ syncedPlayersCount: number }> {
    console.log('🔄 Performing Player CRM historical backfill check...');
    const report = await this.reconcileHistoricalData();
    return { syncedPlayersCount: report.totalSyncedPlayers };
  }
}

export const dbService = new DatabaseService();
