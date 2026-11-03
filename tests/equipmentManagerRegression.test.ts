import assert from 'node:assert';
import { dbService } from '../server/db';
import { config } from '../server/config';
import app from '../server/index';

const BASE_URL = `http://127.0.0.1:${config.port}`;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'GIOCASA2025';

async function runEquipmentManagerSuite() {
  console.log('======================================================');
  console.log('🎮 GIOCASA GAMING EQUIPMENT & GAMES MANAGER TEST SUITE');
  console.log('======================================================\n');

  await dbService.init();

  // Helper for requests
  const request = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  };

  const adminHeaders = {
    'x-admin-passcode': ADMIN_PASSCODE,
    'Authorization': `Bearer ${ADMIN_PASSCODE}`,
  };

  try {
    // ----------------------------------------------------
    // Section 1: Security & Authentication Enforcement
    // ----------------------------------------------------
    console.log('📌 Section 1: Admin Authentication Enforcement');

    const unauthEq = await request('/api/admin/equipment');
    assert.strictEqual(unauthEq.status, 401, 'Reject unauthenticated GET /api/admin/equipment with 401');
    console.log('  ✅ PASS: Reject unauthenticated GET /api/admin/equipment with 401');

    const unauthGames = await request('/api/admin/games');
    assert.strictEqual(unauthGames.status, 401, 'Reject unauthenticated GET /api/admin/games with 401');
    console.log('  ✅ PASS: Reject unauthenticated GET /api/admin/games with 401');

    const unauthCreate = await request('/api/admin/equipment', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hacker Rig', category: 'pc' }),
    });
    assert.strictEqual(unauthCreate.status, 401, 'Reject unauthenticated equipment creation with 401');
    console.log('  ✅ PASS: Reject unauthenticated POST /api/admin/equipment with 401');

    // ----------------------------------------------------
    // Section 2: Equipment Summary & Live Machine Status
    // ----------------------------------------------------
    console.log('\n📌 Section 2: Equipment Summary & Metrics Computation');

    const eqRes = await request('/api/admin/equipment', { headers: adminHeaders });
    assert.strictEqual(eqRes.status, 200, 'GET /api/admin/equipment returns 200');
    assert(eqRes.data.success, 'Success is true');
    assert(Array.isArray(eqRes.data.data.summary), 'Summary is an array');
    assert(Array.isArray(eqRes.data.data.resources), 'Resources is an array');

    const ps5Summary = eqRes.data.data.summary.find((s: any) => s.category === 'ps5');
    assert(ps5Summary, 'PS5 category summary found');
    assert(ps5Summary.totalMachines >= 3, `PS5 totalMachines >= 3 (found ${ps5Summary.totalMachines})`);
    assert(typeof ps5Summary.availableMachines === 'number', 'Available machines is numeric');
    assert(typeof ps5Summary.bookedMachines === 'number', 'Booked machines is numeric');
    assert(typeof ps5Summary.maintenanceMachines === 'number', 'Maintenance machines is numeric');
    console.log(`  ✅ PASS: PS5 summary reports total: ${ps5Summary.totalMachines}, ready: ${ps5Summary.availableMachines}, booked: ${ps5Summary.bookedMachines}`);

    // ----------------------------------------------------
    // Section 3: Add New Equipment / Machine
    // ----------------------------------------------------
    console.log('\n📌 Section 3: Add New Equipment Station');

    const testStationId = `test-ps5-station-${Date.now().toString().slice(-4)}`;
    const addStationRes = await request('/api/admin/equipment', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        id: testStationId,
        name: 'PS5 Test Tournament Rig',
        category: 'ps5',
        machineIdentifier: 'PS5-TEST',
        ratePerHour: 160,
        playersCapacity: { min: 1, max: 4 },
        specs: ['PlayStation 5 Console', '240Hz OLED Display', 'DualSense Edge'],
      }),
    });

    assert.strictEqual(addStationRes.status, 201, 'Create station returns HTTP 201');
    assert.strictEqual(addStationRes.data.data.id, testStationId, 'Created station has correct ID');
    assert.strictEqual(addStationRes.data.data.machineIdentifier, 'PS5-TEST', 'Machine tag saved');
    console.log('  ✅ PASS: Added new machine station successfully with custom tag');

    // Verify it shows up in public /api/booking/resources
    const publicRes = await request('/api/booking/resources');
    assert(publicRes.ok, 'Public resources endpoint returns 200');
    const foundInPublic = publicRes.data.data.find((r: any) => r.id === testStationId);
    assert(foundInPublic, 'New machine appears immediately in public booking resources');
    assert.strictEqual(foundInPublic.ratePerHour, 160, 'Public rate matches saved rate');
    console.log('  ✅ PASS: Changes appear automatically in public booking API without redeployment');

    // ----------------------------------------------------
    // Section 4: Machine Quantity Increase & Decrease
    // ----------------------------------------------------
    console.log('\n📌 Section 4: Machine Quantity Adjustment');

    // Initial count
    const beforeEq = await request('/api/admin/equipment', { headers: adminHeaders });
    const beforeCount = beforeEq.data.data.resources.filter((r: any) => r.category === 'ps5' && r.active).length;

    // Increase quantity (+1)
    const incRes = await request('/api/admin/equipment/quantity', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ category: 'ps5', delta: 1 }),
    });
    assert(incRes.ok, 'Quantity increase succeeds');
    assert(incRes.data.data.id, 'New machine ID returned');

    const afterIncEq = await request('/api/admin/equipment', { headers: adminHeaders });
    const afterIncCount = afterIncEq.data.data.resources.filter((r: any) => r.category === 'ps5' && r.active).length;
    assert.strictEqual(afterIncCount, beforeCount + 1, 'Machine count increased by 1');
    console.log(`  ✅ PASS: Quantity increased from ${beforeCount} to ${afterIncCount}`);

    // Decrease quantity (-1) on unused machine
    const decRes = await request('/api/admin/equipment/quantity', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ category: 'ps5', delta: -1 }),
    });
    assert(decRes.ok, 'Quantity decrease succeeds for unused machine');
    console.log('  ✅ PASS: Quantity decreased safely on unused machine');

    // ----------------------------------------------------
    // Section 5: Active Booking Safety & Deletion Protection
    // ----------------------------------------------------
    console.log('\n📌 Section 5: Active Booking Protection on Reduction & Deletion');

    // Create a dedicated station specifically to test active booking protection
    const protectedStationId = `test-protected-station-${Date.now().toString().slice(-4)}`;
    await request('/api/admin/equipment', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        id: protectedStationId,
        name: 'Protected Tournament Station',
        category: 'ps5',
        machineIdentifier: 'PS5-PROT',
        ratePerHour: 150,
        playersCapacity: { min: 1, max: 4 },
        specs: ['PlayStation 5 Console', 'VIP Stage'],
      }),
    });

    // Create an active future booking on our protected station
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const bookingRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Rohit Sharma',
        phone: '9876543210',
        email: 'rohit@test.com',
        resourceId: protectedStationId,
        date: today,
        startTime: '16:00',
        durationMinutes: 60,
        numberOfPeople: 2,
      }),
    });
    if (!bookingRes.ok) {
      console.log('bookingRes failed:', bookingRes.status, bookingRes.data);
    }
    assert(bookingRes.ok, `Customer booking created on test station: ${JSON.stringify(bookingRes.data)}`);
    const createdBookingId = bookingRes.data.data.id;
    console.log(`  ✅ PASS: Created active test booking #${createdBookingId} on station ${protectedStationId}`);

    // Now attempt to DELETE the station with an active booking
    const deleteAttempt = await request(`/api/admin/equipment/${protectedStationId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.strictEqual(deleteAttempt.status, 400, 'DELETE rejects station with active bookings (HTTP 400)');
    assert(deleteAttempt.data.error.includes('active or scheduled booking'), 'Error message warns about active bookings');
    console.log('  ✅ PASS: System blocked deletion of machine with active booking');

    // Clean up booking via HTTP API so station can be safely deleted
    const cancelRes = await request(`/api/bookings/${createdBookingId}/cancel`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'Test teardown', phone: '9876543210' }),
    });
    assert(cancelRes.ok, `Booking cancelled via API: ${JSON.stringify(cancelRes.data)}`);

    const safeDeleteRes = await request(`/api/admin/equipment/${protectedStationId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    if (!safeDeleteRes.ok) {
      console.log('safeDeleteRes failed:', safeDeleteRes.status, safeDeleteRes.data);
    }
    assert.strictEqual(safeDeleteRes.status, 200, `DELETE succeeds once bookings are cleared: ${JSON.stringify(safeDeleteRes.data)}`);
    console.log('  ✅ PASS: Safely deleted station once bookings were cleared');

    // ----------------------------------------------------
    // Section 6: Maintenance Toggling & Availability Blocking
    // ----------------------------------------------------
    console.log('\n📌 Section 6: Maintenance Toggling & Availability Blocking');

    // Mark ps5-station-1 as maintenance
    const maintOnRes = await request('/api/admin/resources/ps5-station-1', {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        isMaintenance: true,
        maintenanceReason: 'Screen calibration & controller replacement',
      }),
    });
    assert(maintOnRes.ok, 'Maintenance PATCH returns 200');
    assert.strictEqual(maintOnRes.data.data.isMaintenance, true, 'isMaintenance is true');

    // Verify booking attempt is rejected because of maintenance
    const blockedBooking = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Virat Kohli',
        phone: '9988776655',
        resourceId: 'ps5-station-1',
        date: today,
        startTime: '18:00',
        durationMinutes: 60,
        numberOfPeople: 1,
      }),
    });
    assert.strictEqual(blockedBooking.status, 400, 'Booking rejected when station is under maintenance');
    assert(blockedBooking.data.error.includes('maintenance'), 'Error explains station is under maintenance');
    console.log('  ✅ PASS: Booking rejected for equipment marked under maintenance');

    // Clear maintenance
    const maintOffRes = await request('/api/admin/resources/ps5-station-1', {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        isMaintenance: false,
        maintenanceReason: '',
      }),
    });
    assert(maintOffRes.ok, 'Maintenance cleared');
    assert.strictEqual(maintOffRes.data.data.isMaintenance, false, 'isMaintenance is false');
    console.log('  ✅ PASS: Station reactivated and cleared from maintenance');

    // ----------------------------------------------------
    // Section 7: Games Library CRUD
    // ----------------------------------------------------
    console.log('\n📌 Section 7: Games Library Management (CRUD)');

    // 1. List games
    const gamesListRes = await request('/api/admin/games', { headers: adminHeaders });
    assert(gamesListRes.ok, 'GET /api/admin/games returns 200');
    assert(Array.isArray(gamesListRes.data.data), 'Games is an array');
    assert(gamesListRes.data.data.length >= 10, 'Default seed games library loaded');
    console.log(`  ✅ PASS: Admin games list loaded (${gamesListRes.data.data.length} games in library)`);

    // 2. Add a new game
    const testGameTitle = `EA Sports FC 26 Ultra-${Date.now().toString().slice(-4)}`;
    const addGameRes = await request('/api/admin/games', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: testGameTitle,
        category: 'ps5',
        genre: 'Sports',
        description: 'Exclusive preview edition of EA FC next generation.',
        image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
        minPlayers: 1,
        maxPlayers: 4,
        isAvailable: true,
      }),
    });
    assert.strictEqual(addGameRes.status, 201, 'Create game returns HTTP 201');
    const createdGame = addGameRes.data.data;
    assert.strictEqual(createdGame.title, testGameTitle, 'Game title matches');
    console.log(`  ✅ PASS: Added new game "${testGameTitle}" to library`);

    // 3. Edit game
    const editGameRes = await request(`/api/admin/games/${createdGame.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        description: 'Updated description for tournament play.',
        genre: 'Competitive Sports',
      }),
    });
    assert(editGameRes.ok, 'Edit game returns 200');
    assert.strictEqual(editGameRes.data.data.genre, 'Competitive Sports', 'Game genre updated');
    console.log('  ✅ PASS: Updated game details successfully');

    // 4. Verify in public games endpoint
    const publicGames = await request('/api/games');
    assert(publicGames.ok, 'GET /api/games returns 200');
    const foundGameInPublic = publicGames.data.data.find((g: any) => g.id === createdGame.id);
    assert(foundGameInPublic, 'Created game is returned by public games API');
    console.log('  ✅ PASS: New game appears in public games API');

    // 5. Delete game
    const deleteGameRes = await request(`/api/admin/games/${createdGame.id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.strictEqual(deleteGameRes.status, 200, 'DELETE game returns 200');
    console.log('  ✅ PASS: Deleted test game successfully with confirmation');

    console.log('\n======================================================');
    console.log('🎉 ALL EQUIPMENT & GAMES MANAGER TESTS PASSED (100%)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runEquipmentManagerSuite();
