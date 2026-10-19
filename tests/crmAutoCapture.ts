import { dbService } from '../server/db';
import { Booking, TournamentRegistration, Tournament } from '../server/types';

async function runTests() {
  console.log('🧪 Starting GioCasa CRM Auto-Capture Acceptance Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: New customer books gaming slot without existing profile
    // ----------------------------------------------------
    console.log('📌 Test 1: New customer books gaming slot');
    const phone1 = '9876543210';
    const booking1: Booking = {
      id: `bk-test-1-${Date.now()}`,
      customerName: 'Aarav Sharma',
      phone: phone1,
      email: 'aarav@example.com',
      resourceId: 'station-ps5-1',
      resourceName: 'PS5 Station Alpha',
      category: 'ps5',
      date: '2026-10-25',
      startTime: '16:00',
      endTime: '18:00',
      durationMinutes: 120,
      numberOfPeople: 2,
      totalAmount: 500,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const player1 = await dbService.linkPlayerToBooking(booking1);
    assert(!!player1, 'Profile created automatically from booking');
    assert(player1.name === 'Aarav Sharma', 'Customer name recorded accurately');
    assert(player1.phone === phone1, 'Phone recorded accurately');
    assert(player1.email === 'aarav@example.com', 'Email recorded accurately');
    assert(player1.gioId && player1.gioId.startsWith('GIO-'), 'Public GioCasa Player ID assigned', player1.gioId);
    assert(player1.source === 'gaming_booking', 'Acquisition source is gaming_booking');
    assert(player1.stats.bookingsCount === 1, 'Booking count is 1', String(player1.stats.bookingsCount));
    assert(booking1.playerId === player1.id, 'Booking is linked to player profile');

    // ----------------------------------------------------
    // TEST 2: Existing customer books another gaming slot
    // ----------------------------------------------------
    console.log('\n📌 Test 2: Existing customer books second slot');
    const booking2: Booking = {
      id: `bk-test-2-${Date.now()}`,
      customerName: 'Aarav Sharma',
      phone: phone1,
      resourceId: 'station-ps5-2',
      resourceName: 'PS5 Station Beta',
      category: 'ps5',
      date: '2026-10-28',
      startTime: '18:00',
      endTime: '19:00',
      durationMinutes: 60,
      numberOfPeople: 1,
      totalAmount: 300,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const player1Updated = await dbService.linkPlayerToBooking(booking2);
    assert(player1Updated.id === player1.id, 'No duplicate profile created for same phone');
    assert(player1Updated.stats.bookingsCount === 2, 'Booking count incremented to 2', String(player1Updated.stats.bookingsCount));
    assert(booking2.playerId === player1.id, 'Second booking linked to existing profile');

    // ----------------------------------------------------
    // TEST 3: New customer registers for tournament without profile
    // ----------------------------------------------------
    console.log('\n📌 Test 3: New customer registers for tournament');
    const phone2 = '9812345678';
    const reg1: TournamentRegistration = {
      id: `reg-test-1-${Date.now()}`,
      registrationReference: 'GCA-FIFA-9988',
      accessToken: 'token-abc',
      tournamentId: 'tourn-1',
      tournamentSlug: 'fc25-ayodhya-cup',
      participantName: 'Rohan Verma',
      phone: phone2,
      email: 'rohan@example.com',
      inGameId: 'RohanStriker',
      status: 'confirmed',
      paymentStatus: 'paid',
      rulesAccepted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const player2 = await dbService.linkPlayerToRegistration(reg1);
    assert(!!player2, 'Profile created automatically from tournament registration');
    assert(player2.name === 'Rohan Verma', 'Participant name recorded accurately');
    assert(player2.source === 'tournament_registration', 'Acquisition source is tournament_registration');
    assert(player2.stats.tournamentCount === 1, 'Tournament count is 1', String(player2.stats.tournamentCount));
    assert(reg1.playerId === player2.id, 'Tournament registration linked to player profile');

    // ----------------------------------------------------
    // TEST 4: Existing gaming customer registers for tournament
    // ----------------------------------------------------
    console.log('\n📌 Test 4: Existing customer who booked gaming registers for tournament');
    const regForPlayer1: TournamentRegistration = {
      id: `reg-test-player1-${Date.now()}`,
      registrationReference: 'GCA-FIFA-1122',
      accessToken: 'token-xyz',
      tournamentId: 'tourn-1',
      tournamentSlug: 'fc25-ayodhya-cup',
      participantName: 'Aarav Sharma',
      phone: phone1,
      inGameId: 'AaravGamer',
      status: 'confirmed',
      paymentStatus: 'paid',
      rulesAccepted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const player1Multi = await dbService.linkPlayerToRegistration(regForPlayer1);
    assert(player1Multi.id === player1.id, 'No duplicate profile created when existing gamer registers for tournament');
    assert(player1Multi.stats.bookingsCount === 2, 'Gaming booking history preserved');
    assert(player1Multi.stats.tournamentCount === 1, 'Tournament count recorded under same profile');
    assert(
      player1Multi.sources?.includes('gaming_booking') && player1Multi.sources?.includes('tournament_registration'),
      'Profile reflects both acquisition sources (gaming_booking and tournament_registration)',
      JSON.stringify(player1Multi.sources)
    );

    // ----------------------------------------------------
    // TEST 5: Customer enters multiple tournaments
    // ----------------------------------------------------
    console.log('\n📌 Test 5: Customer enters multiple tournaments');
    const reg2ForPlayer2: TournamentRegistration = {
      id: `reg-test-2-${Date.now()}`,
      registrationReference: 'GCA-TEKK-3344',
      accessToken: 'token-def',
      tournamentId: 'tourn-2',
      tournamentSlug: 'tekken8-clash',
      participantName: 'Rohan Verma',
      phone: phone2,
      inGameId: 'RohanStriker',
      status: 'confirmed',
      paymentStatus: 'paid',
      rulesAccepted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const player2Updated = await dbService.linkPlayerToRegistration(reg2ForPlayer2);
    assert(player2Updated.id === player2.id, 'Single profile retained across multiple tournaments');
    assert(player2Updated.stats.tournamentCount === 2, 'Tournament count incremented to 2', String(player2Updated.stats.tournamentCount));

    // ----------------------------------------------------
    // TEST 6: Retries / server restarts do not inflate counts
    // ----------------------------------------------------
    console.log('\n📌 Test 6: Idempotent recalculation prevents count inflation');
    await dbService.recalculatePlayerStats(player1.id);
    await dbService.recalculatePlayerStats(player1.id);
    const player1AfterRetries = await dbService.getPlayerById(player1.id);
    assert(player1AfterRetries?.stats.bookingsCount === 2, 'Bookings count remained exactly 2 after retries');
    assert(player1AfterRetries?.stats.tournamentCount === 1, 'Tournament count remained exactly 1 after retries');

    // ----------------------------------------------------
    // TEST 7: Incomplete / invalid booking handling
    // ----------------------------------------------------
    console.log('\n📌 Test 7: Incomplete or invalid records');
    const normInvalid = dbService.normalizePhone('123');
    assert(normInvalid === null || normInvalid.length !== 10, 'Invalid phone number rejected by normalizer');

    // ----------------------------------------------------
    // TEST 8: Cancelled bookings do not count as completed
    // ----------------------------------------------------
    console.log('\n📌 Test 8: Cancelled booking statistics');
    const bookingCancelled: Booking = {
      id: `bk-test-cancel-${Date.now()}`,
      customerName: 'Aarav Sharma',
      phone: phone1,
      resourceId: 'station-ps5-1',
      resourceName: 'PS5 Station Alpha',
      category: 'ps5',
      date: '2026-10-30',
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      numberOfPeople: 1,
      totalAmount: 250,
      status: 'cancelled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dbService.linkPlayerToBooking(bookingCancelled);
    const player1WithCancel = await dbService.getPlayerById(player1.id);
    assert(
      player1WithCancel?.stats.completedBookingsCount === 0,
      'Cancelled booking is not counted as completed',
      `completedBookingsCount = ${player1WithCancel?.stats.completedBookingsCount}`
    );

    // ----------------------------------------------------
    // TEST 9: Historical reconciliation
    // ----------------------------------------------------
    console.log('\n📌 Test 9: Safe idempotent historical reconciliation');
    const report1 = await dbService.reconcileHistoricalData();
    assert(report1.bookingsProcessed >= 2, 'Reconciliation processed bookings', `Processed: ${report1.bookingsProcessed}`);
    assert(report1.tournamentsProcessed >= 2, 'Reconciliation processed tournament registrations', `Processed: ${report1.tournamentsProcessed}`);

    // Run reconciliation again to ensure idempotence
    const report2 = await dbService.reconcileHistoricalData();
    assert(report2.bookingsCreatedProfiles === 0, 'Second run creates 0 duplicate booking profiles', `Created: ${report2.bookingsCreatedProfiles}`);
    assert(report2.tournamentsCreatedProfiles === 0, 'Second run creates 0 duplicate tournament profiles', `Created: ${report2.tournamentsCreatedProfiles}`);

    // ----------------------------------------------------
    // TEST 10: Missing optional fields handled cleanly
    // ----------------------------------------------------
    console.log('\n📌 Test 10: Missing optional fields');
    const phone3 = '9855512345';
    const bookingNoEmail: Booking = {
      id: `bk-test-noemail-${Date.now()}`,
      customerName: 'Priya Singh',
      phone: phone3,
      resourceId: 'pool-table-1',
      resourceName: 'Signature Slate Pool',
      category: 'pool',
      date: '2026-11-01',
      startTime: '17:00',
      endTime: '18:00',
      durationMinutes: 60,
      numberOfPeople: 2,
      totalAmount: 400,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const player3 = await dbService.linkPlayerToBooking(bookingNoEmail);
    assert(player3.email === undefined, 'Missing email remains undefined internally');
    assert(player3.name === 'Priya Singh', 'Profile created cleanly without email');

    // ----------------------------------------------------
    // TEST 11: Segment queries in CRM Directory
    // ----------------------------------------------------
    console.log('\n📌 Test 11: CRM Directory segment filtering');
    const { players: gamingPlayers } = await dbService.getPlayers({ segment: 'gaming_booking' });
    assert(gamingPlayers.some((p) => p.id === player1.id), 'Gamer appears in gaming_booking segment');

    const { players: tournPlayers } = await dbService.getPlayers({ segment: 'tournament_registration' });
    assert(tournPlayers.some((p) => p.id === player2.id), 'Tournament registrant appears in tournament_registration segment');
    assert(tournPlayers.some((p) => p.id === player1.id), 'Multi-source customer appears in tournament_registration segment');

    // ----------------------------------------------------
    // TEST 12: Public lookup vs private data protection
    // ----------------------------------------------------
    console.log('\n📌 Test 12: Data protection on public lookup');
    const publicData = await dbService.lookupPlayerPublic(player1.gioId);
    assert(!('phone' in (publicData.player || {})) || (publicData.player as any).phone === undefined, 'Full phone number NOT exposed in public lookup');
    assert(!('email' in (publicData.player || {})) || (publicData.player as any).email === undefined, 'Email NOT exposed in public lookup');
    assert(publicData.player?.phoneMasked?.endsWith(phone1.slice(-4)) === true, 'Masked phone number ending in last 4 digits returned for verification');

    // Summary
    console.log('\n========================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  }
}

runTests();
