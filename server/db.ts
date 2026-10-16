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
} from './types';
import { timeToMinutes, doIntervalsOverlap, getNowInKolkata } from './utils/timezone';
import { calculateBookingPrice } from './utils/pricing';
import { INITIAL_TOURNAMENTS, INITIAL_TOURNAMENT_RESULTS, INITIAL_HALL_OF_FAME } from './initialTournaments';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

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
  private mutexLock = new Map<string, Promise<any>>();

  // Fallback in-memory and file store
  private fileBookings: Booking[] = [];
  private fileResources: GamingResource[] = [...INITIAL_RESOURCES];
  private fileTournaments: Tournament[] = [...INITIAL_TOURNAMENTS];
  private fileRegistrations: TournamentRegistration[] = [];
  private fileResults: TournamentResult[] = [...INITIAL_TOURNAMENT_RESULTS];
  private fileHallOfFame: HallOfFameEntry[] = [...INITIAL_HALL_OF_FAME];

  private bookingsFilePath = path.join(DATA_DIR, 'bookings.json');
  private resourcesFilePath = path.join(DATA_DIR, 'resources.json');
  private tournamentsFilePath = path.join(DATA_DIR, 'tournaments.json');
  private registrationsFilePath = path.join(DATA_DIR, 'tournament_registrations.json');
  private resultsFilePath = path.join(DATA_DIR, 'tournament_results.json');
  private hallOfFameFilePath = path.join(DATA_DIR, 'hall_of_fame.json');
  private settingsFilePath = path.join(DATA_DIR, 'settings.json');
  private cachedAdminPasscode: string | null = null;

  async init(): Promise<void> {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load file-backed stores
    this.loadFileStores();

    // Try connecting to MongoDB Atlas if URI is provided
    if (config.mongoUri) {
      try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        this.client = new MongoClient(config.mongoUri, {
          serverSelectionTimeoutMS: 5000,
        });
        await this.client.connect();
        this.db = this.client.db(config.dbName);
        this.isMongoConnected = true;
        console.log(`✅ Successfully connected to MongoDB Atlas (DB: ${config.dbName})`);

        // Create indexes
        const bookingsCol = this.db.collection<Booking>('bookings');
        await bookingsCol.createIndex({ id: 1 }, { unique: true });
        await bookingsCol.createIndex({ resourceId: 1, date: 1, startTime: 1, endTime: 1 });
        await bookingsCol.createIndex({ phone: 1 });
        await bookingsCol.createIndex({ status: 1 });

        const resourcesCol = this.db.collection<GamingResource>('resources');
        await resourcesCol.createIndex({ id: 1 }, { unique: true });

        // Seed or sync active resources
        for (const res of INITIAL_RESOURCES) {
          await resourcesCol.updateOne(
            { id: res.id },
            { $set: res },
            { upsert: true }
          );
        }
        const validIds = INITIAL_RESOURCES.map((r) => r.id);
        await resourcesCol.updateMany(
          { id: { $nin: validIds } },
          { $set: { active: false } }
        );
        console.log(`🌱 Synced ${INITIAL_RESOURCES.length} active gaming resources in MongoDB Atlas.`);

        // Tournaments collection & indexes
        const tournamentsCol = this.db.collection<Tournament>('tournaments');
        await tournamentsCol.createIndex({ id: 1 }, { unique: true });
        await tournamentsCol.createIndex({ slug: 1 }, { unique: true });
        await tournamentsCol.createIndex({ status: 1 });
        await tournamentsCol.createIndex({ isFeatured: 1 });

        const countTourn = await tournamentsCol.countDocuments();
        if (countTourn === 0) {
          await tournamentsCol.insertMany(INITIAL_TOURNAMENTS);
          console.log(`🌱 Seeded ${INITIAL_TOURNAMENTS.length} initial tournaments in MongoDB Atlas.`);
        }

        // Tournament registrations collection & indexes
        const regCol = this.db.collection<TournamentRegistration>('tournament_registrations');
        await regCol.createIndex({ id: 1 }, { unique: true });
        await regCol.createIndex({ registrationReference: 1 }, { unique: true });
        await regCol.createIndex({ tournamentId: 1 });
        await regCol.createIndex({ accessToken: 1 });
        await regCol.createIndex({ tournamentId: 1, phone: 1 });

        // Tournament results collection & indexes
        const resultsCol = this.db.collection<TournamentResult>('tournament_results');
        await resultsCol.createIndex({ id: 1 }, { unique: true });
        await resultsCol.createIndex({ tournamentId: 1 }, { unique: true });
        await resultsCol.createIndex({ tournamentSlug: 1 });

        const countResults = await resultsCol.countDocuments();
        if (countResults === 0) {
          await resultsCol.insertMany(INITIAL_TOURNAMENT_RESULTS);
          console.log(`🌱 Seeded ${INITIAL_TOURNAMENT_RESULTS.length} tournament results in MongoDB Atlas.`);
        }

        // Hall of Fame collection & indexes
        const hofCol = this.db.collection<HallOfFameEntry>('hall_of_fame');
        await hofCol.createIndex({ id: 1 }, { unique: true });
        await hofCol.createIndex({ isPublished: 1 });
        await hofCol.createIndex({ order: 1 });

        const countHof = await hofCol.countDocuments();
        if (countHof === 0) {
          await hofCol.insertMany(INITIAL_HALL_OF_FAME);
          console.log(`🌱 Seeded ${INITIAL_HALL_OF_FAME.length} Hall of Fame champions in MongoDB Atlas.`);
        }
      } catch (err) {
        console.warn('⚠️ MongoDB Atlas connection failed or timed out. Falling back to persistent disk store.', err);
        this.isMongoConnected = false;
      }
    } else {
      console.log('ℹ️ MONGODB_URI not provided. Operating in robust local persistent file-store mode.');
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
    } catch (err) {
      console.error('Error reading fallback JSON stores:', err);
      this.fileResources = [...INITIAL_RESOURCES];
      this.fileBookings = [];
      this.fileTournaments = [...INITIAL_TOURNAMENTS];
      this.fileRegistrations = [];
      this.fileResults = [...INITIAL_TOURNAMENT_RESULTS];
      this.fileHallOfFame = [...INITIAL_HALL_OF_FAME];
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
    const payload = { ...updates, updatedAt: new Date().toISOString() };

    if (this.isMongoConnected && this.db) {
      const res = await this.db.collection<Booking>('bookings').findOneAndUpdate(
        { id: cleanId },
        { $set: payload },
        { returnDocument: 'after' }
      );
      return res || null;
    } else {
      const idx = this.fileBookings.findIndex((b) => b.id === cleanId);
      if (idx === -1) return null;
      this.fileBookings[idx] = { ...this.fileBookings[idx], ...payload };
      this.saveBookingsToFile();
      return this.fileBookings[idx];
    }
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

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
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
}

export const dbService = new DatabaseService();
