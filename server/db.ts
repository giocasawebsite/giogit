import { MongoClient, Db, Collection } from 'mongodb';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from './config';
import {
  Booking,
  GamingResource,
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
} from './types';
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
  rulesEnabled: {
    gamingSession: true,
    tournamentParticipation: true,
    tournamentPlacement: true,
    referral: true,
    referredWelcome: false,
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
    ratePerHour: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    specs: ['PlayStation 5 Console', '55" 4K HDR 120Hz Display', '2 DualSense Controllers', 'EA FC 25, Tekken 8, MK1'],
    image: '/assets/real/ps5_setup.png',
    order: 1,
  },
  {
    id: 'ps5-station-2',
    name: 'PS5 Pro Station 2 (4K 120Hz)',
    category: 'ps5',
    zoneId: 'ps5-arena',
    ratePerHour: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    specs: ['PlayStation 5 Console', '55" 4K HDR 120Hz Display', '2 DualSense Controllers', 'Spider-Man 2, Gran Turismo 7, GTA V'],
    image: '/assets/real/ps5_setup.png',
    order: 2,
  },
  {
    id: 'ps5-station-3',
    name: 'PS5 Pro Station 3 (Squad Lounge)',
    category: 'ps5',
    zoneId: 'ps5-arena',
    ratePerHour: 150,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    specs: ['PlayStation 5 Console', '55" 4K HDR 120Hz Display', '4 DualSense Controllers', 'It Takes Two, WWE 2K24, Co-op Vault'],
    image: '/assets/real/ps5_setup.png',
    order: 3,
  },
  {
    id: 'pool-table-1',
    name: 'Hot-Shot 8-Ball Slate Championship Pool',
    category: 'pool',
    zoneId: 'hotshot-pool',
    ratePerHour: 200,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 2, max: 6 },
    active: true,
    isMaintenance: false,
    specs: ['Italian Slate Bed', 'Aramith Pro Ball Set', 'Precision Ash Cues', 'Spectator Lounge Seating'],
    image: '/assets/real/pool_table.png',
    order: 4,
  },
  {
    id: 'racing-station-1',
    name: 'Pro Racing Simulator Rig (Force Feedback)',
    category: 'racing',
    zoneId: 'racing-arena',
    ratePerHour: 200,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
    playersCapacity: { min: 1, max: 4 },
    active: true,
    isMaintenance: false,
    specs: ['Logitech G-Series Force Feedback Wheel & Pedals', 'Ergonomic GT Bucket Racing Seat', 'Curved Ultra-wide Cockpit Display', 'Forza, Gran Turismo 7, F1 24, Assetto Corsa'],
    image: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=800&q=80',
    order: 5,
  },
];

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

  private bookingsFilePath = path.join(DATA_DIR, 'bookings.json');
  private resourcesFilePath = path.join(DATA_DIR, 'resources.json');
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
  private settingsFilePath = path.join(DATA_DIR, 'settings.json');
  private cachedAdminPasscode: string | null = null;

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
          for (const res of INITIAL_RESOURCES) {
            await resourcesCol.updateOne({ id: res.id }, { $set: res }, { upsert: true });
          }
          const validIds = INITIAL_RESOURCES.map((r) => r.id);
          await resourcesCol.updateMany({ id: { $nin: validIds } }, { $set: { active: false } });
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
        const validIds = new Set(INITIAL_RESOURCES.map((r) => r.id));
        this.fileResources = [
          ...INITIAL_RESOURCES,
          ...parsed.filter((p) => !validIds.has(p.id)).map((p) => ({ ...p, active: false }))
        ];
        this.saveResourcesToFile();
      } else {
        this.fileResources = [...INITIAL_RESOURCES];
        this.saveResourcesToFile();
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
    }
  }

  private saveResourcesToFile(): void {
    try {
      fs.writeFileSync(this.resourcesFilePath, JSON.stringify(this.fileResources, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving resources to file:', err);
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

  // ======================== RESOURCES ========================

  async getResources(): Promise<GamingResource[]> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<GamingResource>('resources').find({ active: true }).sort({ order: 1 }).toArray();
    }
    return this.fileResources.filter((r) => r.active).sort((a, b) => a.order - b.order);
  }

  async getResourceById(id: string): Promise<GamingResource | null> {
    if (this.isMongoConnected && this.db) {
      return this.db.collection<GamingResource>('resources').findOne({ id });
    }
    return this.fileResources.find((r) => r.id === id) || null;
  }

  async updateResource(id: string, updates: Partial<GamingResource>): Promise<GamingResource | null> {
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<GamingResource>('resources').findOneAndUpdate(
        { id },
        { $set: updates },
        { returnDocument: 'after' }
      );
      return res || null;
    }
    const idx = this.fileResources.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.fileResources[idx] = { ...this.fileResources[idx], ...updates };
    this.saveResourcesToFile();
    return this.fileResources[idx];
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
    const cleanId = id.trim().toUpperCase();
    let booking: Booking | null = null;

    if (this.isMongoConnected && this.db) {
      booking = await this.db.collection<Booking>('bookings').findOne({ id: cleanId });
    } else {
      booking = this.fileBookings.find((b) => b.id === cleanId) || null;
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

      // 2. Insert booking
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
   * Extends an active or upcoming booking if no overlapping booking exists
   */
  async extendBooking(
    id: string,
    additionalMinutes: number
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    const booking = await this.getBookingById(id);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return { success: false, error: `Cannot extend a ${booking.status} booking.` };
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

      const updatedBooking: Booking = {
        ...booking,
        endTime: newEndTime,
        durationMinutes: newDuration,
        totalAmount: newTotal,
        updatedAt: new Date().toISOString(),
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

      return { success: true, booking: updatedBooking };
    });
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    const cleanId = id.trim().toUpperCase();
    const existing = await this.getBookingById(cleanId);
    const payload = { ...updates, updatedAt: new Date().toISOString() };

    let updated: Booking | null = null;
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').findOneAndUpdate(
        { id: cleanId },
        { $set: payload },
        { returnDocument: 'after' }
      );
      updated = res || null;
    } else {
      const idx = this.fileBookings.findIndex((b) => b.id === cleanId);
      if (idx !== -1) {
        this.fileBookings[idx] = { ...this.fileBookings[idx], ...payload };
        this.saveBookingsToFile();
        updated = this.fileBookings[idx];
      }
    }

    if (updated) {
      if (updates.status === 'completed' && existing?.status !== 'completed') {
        try {
          await this.processGamingSessionCompleted(updated);
        } catch (e) {
          console.warn('Error processing gaming session completed loyalty:', e);
        }
      }
      if (updates.status === 'cancelled' && existing?.status === 'completed') {
        try {
          await this.processBookingCancelledOrRefunded(updated);
        } catch (e) {
          console.warn('Error reversing loyalty for cancelled booking:', e);
        }
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
    const cleanId = id.trim().toUpperCase();
    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').deleteOne({ id: cleanId });
      return (res.deletedCount || 0) > 0;
    } else {
      const initialLen = this.fileBookings.length;
      this.fileBookings = this.fileBookings.filter((b) => b.id !== cleanId);
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
        if (doc && doc.value) {
          this.cachedAdminPasscode = doc.value;
          return doc.value;
        }
      } catch (err) {
        console.error('Error fetching admin passcode from Mongo:', err);
      }
    } else {
      try {
        if (fs.existsSync(this.settingsFilePath)) {
          const raw = fs.readFileSync(this.settingsFilePath, 'utf-8');
          const data = JSON.parse(raw);
          if (data.admin_passcode) {
            this.cachedAdminPasscode = data.admin_passcode;
            return data.admin_passcode;
          }
        }
      } catch (err) {
        console.error('Error reading settings file:', err);
      }
    }

    this.cachedAdminPasscode = config.adminPasscode;
    return config.adminPasscode;
  }

  async setAdminPasscode(newPasscode: string): Promise<void> {
    this.cachedAdminPasscode = newPasscode;

    if (this.isMongoConnected && this.db) {
      try {
        await this.db.collection('settings').updateOne(
          { key: 'admin_passcode' },
          { $set: { value: newPasscode, updatedAt: new Date().toISOString() } },
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
      data.admin_passcode = newPasscode;
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving settings to file:', err);
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

    // Award loyalty points on verified check-in
    if (newStatus === 'checked_in' && oldStatus !== 'checked_in') {
      try {
        await this.processTournamentParticipation(updated);
      } catch (err) {
        console.warn('Error processing tournament participation loyalty:', err);
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
    return true;
  }

  // =========================================================================
  // GIOCASA PLAYER CRM IMPLEMENTATION
  // =========================================================================

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

  async getPlayerByGioId(gioId: string): Promise<Player | null> {
    if (!gioId) return null;
    const clean = gioId.trim().toUpperCase();
    if (this.isMongoConnected && this.db) {
      return this.db.collection<Player>('players').findOne({
        $or: [{ gioId: clean }, { gioId: clean.startsWith('GIO-') ? clean : `GIO-${clean}` }]
      });
    }
    return this.filePlayers.find((p) => {
      const pId = p.gioId?.toUpperCase();
      return pId === clean || pId === (clean.startsWith('GIO-') ? clean : `GIO-${clean}`);
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

    const digits = player.phone.replace(/\D/g, '');
    const last4 = digits.length >= 4 ? digits.slice(-4) : '••••';
    const phoneMasked = `+91 ••••• ••${last4}`;

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
        prompt: `Confirm the last 4 digits of your registered mobile number ending in ••${last4} to auto-fill your details.`,
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
    const secret = config.adminPasscode || 'giocasa-secret';
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
    const secret = config.adminPasscode || 'giocasa-secret';
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

      const secret = config.adminPasscode || 'giocasa-secret';
      const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex').slice(0, 24);

      if (receivedSig !== expectedSig) {
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

    // Case 1: Verification step using existing session token
    if (sessionToken) {
      const sessionResult = this.verifyRecoverySessionToken(sessionToken);
      if (!sessionResult.valid) {
        return { found: false, error: sessionResult.error || 'Recovery session expired or invalid.' };
      }

      if (!verificationName) {
        return {
          found: true,
          requiresVerification: true,
          sessionToken,
          maskedContact: sessionResult.maskedContact,
          challengePrompt: 'Please enter your registered Full Name or Gamer Tag to complete verification.',
          error: 'Please enter your Full Name or Gamer Tag to confirm your identity.',
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

      return this.verifyAndReturnRecoveredPlayer(player, verificationName);
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

    // Compute masked contact string
    let maskedContact = '';
    if (isEmail) {
      const [local, dom] = cleanInput.toLowerCase().split('@');
      maskedContact = `${local[0]}***${local.length > 2 ? local.slice(-1) : ''}@${dom}`;
    } else {
      maskedContact = `+91 ••••• ••${normPhone.slice(-4)}`;
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
    if (player && player.status !== 'archived') {
      const token = this.createRecoverySessionToken(player.id, false, maskedContact);
      return {
        found: true,
        requiresVerification: true,
        sessionToken: token,
        maskedContact,
        challengePrompt: `To protect your identity, please enter your registered Full Name or Gamer Tag associated with ${maskedContact}.`,
      };
    } else {
      // Dummy session token for unknown contact
      const token = this.createRecoverySessionToken('dummy', true, maskedContact);
      return {
        found: true,
        requiresVerification: true,
        sessionToken: token,
        maskedContact,
        challengePrompt: `To protect your identity, please enter your registered Full Name or Gamer Tag associated with ${maskedContact}.`,
      };
    }
  }

  private async verifyAndReturnRecoveredPlayer(player: Player, verificationName: string) {
    const cleanVerification = verificationName.trim().toLowerCase();
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

    // Identity verified! Generate authorization token
    const verifyResult = await this.verifyPlayerIdentity(player.gioId, player.phone.slice(-4));

    await this.recordAutomationEvent({
      eventType: 'player.id_recovered',
      entityId: player.id,
      entityType: 'player',
      payload: {
        gioId: player.gioId,
        name: player.name,
        verifiedBy: 'name_challenge',
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
    const gioId = data.gioId || await this.generateUniqueGioId();
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
    type: 'earn' | 'redeem' | 'adjustment' | 'bonus',
    reason: string,
    referenceId?: string,
    idempotencyKey?: string
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

    const newBalance = Math.max(0, player.loyalty.pointsBalance + points);
    const newLifetime = points > 0 ? player.loyalty.lifetimePoints + points : player.loyalty.lifetimePoints;
    const newTier = this.calculateLoyaltyTier(newLifetime);

    const ledgerEntry: LoyaltyLedgerEntry = {
      id: `ledg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      playerId: id,
      points,
      type,
      reason: reason.trim() || 'Manual Staff Adjustment',
      referenceId,
      idempotencyKey,
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

    // Sort timeline descending by date safely
    activityTimeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return {
      player,
      registrations,
      bookings,
      wins,
      loyaltyLedger,
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

    // Compute spend and hours from non-cancelled bookings
    const validBookings = uniqueBookings.filter((b) => b.status !== 'cancelled');
    const totalSpend = validBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
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
    const sources = Array.from(sourcesSet);

    // Update tags
    const tagsSet = new Set<string>(player.tags || []);
    if (bookingsCount >= 3) tagsSet.add('Frequent Visitor');
    if (bookingsCount > 0) tagsSet.add('Station Guest');
    if (tournamentCount >= 2) tagsSet.add('Tournament Regular');
    else if (tournamentCount > 0) tagsSet.add('Tournament Registrant');
    const tags = Array.from(tagsSet);

    const updated = await this.updatePlayer(player.id, {
      stats: {
        ...player.stats,
        bookingsCount,
        completedBookingsCount,
        tournamentCount,
        totalHoursPlayed,
        totalSpend,
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

    return updated;
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

  async backfillHistoricalData(): Promise<{ syncedPlayersCount: number }> {
    console.log('🔄 Performing Player CRM historical backfill check...');
    const report = await this.reconcileHistoricalData();
    return { syncedPlayersCount: report.totalSyncedPlayers };
  }
}

export const dbService = new DatabaseService();
