import assert from 'node:assert';
import { dbService } from '../server/db';
import { config } from '../server/config';

const BASE_URL = `http://127.0.0.1:${config.port}`;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'GIOCASA2025';

async function runReservationsAndFloorLocationsSuite() {
  console.log('========================================================================');
  console.log('🏛️ GIOCASA RESERVATIONS, FLOOR LOCATIONS & CRM TEST SUITE');
  console.log('========================================================================\n');

  await dbService.init();

  let testIpCounter = 100;
  const request = async (path: string, options: RequestInit = {}) => {
    testIpCounter++;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-forwarded-for': `192.168.10.${testIpCounter}`,
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
    // Section 1: Facility Floor Locations
    // ----------------------------------------------------
    console.log('📌 Section 1: Facility Floor Locations');

    const resList = await request('/api/booking/resources');
    assert.strictEqual(resList.status, 200, 'GET /api/booking/resources returns 200');
    assert.ok(Array.isArray(resList.data.data), 'Resources returned as array');

    const resources = resList.data.data;
    const ps5Resources = resources.filter((r: any) => r.category === 'ps5');
    const racingResources = resources.filter((r: any) => r.category === 'racing');
    const poolResources = resources.filter((r: any) => r.category === 'pool');

    assert.ok(ps5Resources.length > 0, 'Found PS5 resources');
    assert.ok(racingResources.length > 0, 'Found Racing resources');
    assert.ok(poolResources.length > 0, 'Found Pool resources');

    for (const ps5 of ps5Resources) {
      assert.strictEqual(ps5.floorLocation, 'Basement', `PS5 station "${ps5.name}" must be in Basement`);
    }
    console.log(`  ✅ PASS: All ${ps5Resources.length} PS5 stations mapped to Basement`);

    for (const r of racingResources) {
      assert.strictEqual(r.floorLocation, 'Basement', `Racing Sim "${r.name}" must be in Basement`);
    }
    console.log(`  ✅ PASS: All ${racingResources.length} Racing Simulator stations mapped to Basement`);

    for (const p of poolResources) {
      assert.strictEqual(p.floorLocation, '1st Floor', `Pool Table "${p.name}" must be on 1st Floor`);
    }
    console.log(`  ✅ PASS: All ${poolResources.length} Pool Tables mapped to 1st Floor`);

    // ----------------------------------------------------
    // Section 2: Dining Reservation Submission & CRM
    // ----------------------------------------------------
    console.log('\n📌 Section 2: Dining Table Reservation Submission & Loyalty Points Check');

    const uniquePhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const diningPayload = {
      customerName: 'Ananya Sharma',
      phone: uniquePhone,
      email: 'ananya.sharma@example.com',
      guests: 4,
      date: '2026-11-20',
      time: '07:30 PM',
      seatingPreference: 'Window View',
      specialRequests: 'Celebrating 5th anniversary. Please reserve a quiet booth.'
    };

    const diningRes = await request('/api/reservations/dining', {
      method: 'POST',
      body: JSON.stringify(diningPayload)
    });

    assert.strictEqual(diningRes.status, 201, 'POST /api/reservations/dining returns 201');
    assert.ok(diningRes.data.success, 'Dining reservation created successfully');
    assert.ok(diningRes.data.data.id, 'Dining reservation has unique ID');
    const diningRef = diningRes.data.data.referenceCode || diningRes.data.data.reference;
    assert.ok(diningRef && diningRef.startsWith('GDR-'), 'Reference code has #GDR- prefix');
    assert.strictEqual(diningRes.data.data.status, 'confirmed', 'Dining table default status is confirmed');

    const createdDining = { ...diningRes.data.data, referenceCode: diningRef };
    console.log(`  ✅ PASS: Dining reservation created with Ref #${createdDining.referenceCode}`);

    // Verify CRM player was created/linked and has ZERO loyalty points
    const playerCrmRes = await request(`/api/admin/players?search=${uniquePhone}`, {
      headers: adminHeaders
    });
    assert.strictEqual(playerCrmRes.status, 200, 'GET /api/admin/players returns 200');
    assert.ok(playerCrmRes.data.data.players.length > 0, 'Found player in CRM');
    const playerRecord = playerCrmRes.data.data.players[0];
    assert.strictEqual(playerRecord.phone, uniquePhone, 'Player phone matches in CRM');
    assert.ok(playerRecord.gioId.startsWith('GIO-'), 'Auto-generated Gio ID for customer');
    assert.strictEqual(playerRecord.loyalty.pointsBalance, 0, 'STRICT: ZERO loyalty points awarded for dining reservation');
    assert.strictEqual(playerRecord.stats.diningCount, 1, 'Player stats reflect 1 dining reservation');
    console.log(`  ✅ PASS: Player CRM linked (${playerRecord.gioId}). Loyalty points balance is strictly 0.`);

    // ----------------------------------------------------
    // Section 3: Event Reservation Submission & CRM
    // ----------------------------------------------------
    console.log('\n📌 Section 3: Event Reservation Enquiry Submission');

    const eventPayload = {
      customerName: 'Ananya Sharma',
      phone: uniquePhone,
      email: 'ananya.sharma@example.com',
      eventType: 'Birthday Party',
      date: '2026-12-15',
      time: '06:00 PM',
      expectedGuests: 20,
      estimatedBudget: '₹10,000 - ₹25,000',
      foodRequirements: 'Wood-fired pizzas, mocktails and custom cake',
      decorationRequirements: 'Neon gamer backdrop with birthday banner',
      additionalMessage: 'Please call us on WhatsApp to discuss setup.'
    };

    const eventRes = await request('/api/reservations/event', {
      method: 'POST',
      body: JSON.stringify(eventPayload)
    });

    assert.strictEqual(eventRes.status, 201, 'POST /api/reservations/event returns 201');
    assert.ok(eventRes.data.success, 'Event enquiry created successfully');
    assert.ok(eventRes.data.data.id, 'Event enquiry has unique ID');
    const eventRef = eventRes.data.data.referenceCode || eventRes.data.data.reference;
    assert.ok(eventRef && eventRef.startsWith('GER-'), 'Reference code has #GER- prefix');
    assert.strictEqual(eventRes.data.data.status, 'pending', 'Event enquiry status is pending confirmation');

    const createdEvent = { ...eventRes.data.data, referenceCode: eventRef };
    console.log(`  ✅ PASS: Event enquiry created with Ref #${createdEvent.referenceCode} (Pending)`);

    // Verify detailed player CRM profile contains both dining and event reservations
    const detailedProfileRes = await request(`/api/admin/players/${playerRecord.id}`, {
      headers: adminHeaders
    });
    assert.strictEqual(detailedProfileRes.status, 200, 'GET player detailed profile returns 200');
    const profile = detailedProfileRes.data.data;
    assert.strictEqual(profile.diningReservations.length, 1, 'Detailed profile contains dining reservation');
    assert.strictEqual(profile.eventReservations.length, 1, 'Detailed profile contains event enquiry');
    assert.strictEqual(profile.player.loyalty.pointsBalance, 0, 'Loyalty points remain 0 after event creation');
    console.log('  ✅ PASS: Player detailed profile aggregates both dining and event records.');

    // ----------------------------------------------------
    // Section 4: Public Lookup by Reference
    // ----------------------------------------------------
    console.log('\n📌 Section 4: Public Reference Code Lookup');

    const lookupDining = await request(`/api/reservations/lookup/${createdDining.referenceCode}`);
    assert.strictEqual(lookupDining.status, 200, 'Lookup dining by reference returns 200');
    assert.strictEqual(lookupDining.data.data.type, 'dining', 'Lookup identifies type as dining');
    assert.strictEqual(lookupDining.data.data.customerName, 'Ananya Sharma');

    const lookupEvent = await request(`/api/reservations/lookup/${createdEvent.referenceCode}`);
    assert.strictEqual(lookupEvent.status, 200, 'Lookup event by reference returns 200');
    assert.strictEqual(lookupEvent.data.data.type, 'event', 'Lookup identifies type as event');
    assert.strictEqual(lookupEvent.data.data.customerName, 'Ananya Sharma');
    console.log('  ✅ PASS: Public lookup correctly resolves both dining and event references.');

    // ----------------------------------------------------
    // Section 5: Admin Management & Status Transitions
    // ----------------------------------------------------
    console.log('\n📌 Section 5: Admin Reservations Management');

    // Authentication check
    const unauthDining = await request('/api/admin/reservations/dining');
    assert.strictEqual(unauthDining.status, 401, 'Reject unauthenticated access with 401');

    // Admin list dining
    const adminDining = await request('/api/admin/reservations/dining', { headers: adminHeaders });
    assert.strictEqual(adminDining.status, 200, 'Admin can list dining reservations');
    assert.ok(adminDining.data.data.metrics.total >= 1, 'Metrics total count >= 1');

    // Update status and admin notes
    const updateDining = await request(`/api/admin/reservations/dining/${createdDining.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'completed',
        adminNotes: 'VIP table 4 seated and served by head chef.'
      })
    });
    assert.strictEqual(updateDining.status, 200, 'Admin can update dining reservation');
    assert.strictEqual(updateDining.data.data.status, 'completed', 'Status updated to completed');
    assert.strictEqual(updateDining.data.data.adminNotes, 'VIP table 4 seated and served by head chef.');
    console.log('  ✅ PASS: Admin successfully updated dining reservation status and internal notes.');

    // Admin list events
    const adminEvents = await request('/api/admin/reservations/events', { headers: adminHeaders });
    assert.strictEqual(adminEvents.status, 200, 'Admin can list event enquiries');
    assert.ok(adminEvents.data.data.metrics.pending >= 1, 'Metrics pending count >= 1');

    // Confirm event enquiry
    const updateEvent = await request(`/api/admin/reservations/events/${createdEvent.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'confirmed',
        adminNotes: 'Package finalized with customer via WhatsApp.'
      })
    });
    assert.strictEqual(updateEvent.status, 200, 'Admin can confirm event enquiry');
    assert.strictEqual(updateEvent.data.data.status, 'confirmed', 'Status updated to confirmed');
    console.log('  ✅ PASS: Admin successfully confirmed event enquiry and recorded manager notes.');

    // ----------------------------------------------------
    // Section 6: Deletion
    // ----------------------------------------------------
    console.log('\n📌 Section 6: Permanent Deletion');

    const deleteDining = await request(`/api/admin/reservations/dining/${createdDining.id}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert.strictEqual(deleteDining.status, 200, 'Admin can delete dining reservation');
    assert.ok(deleteDining.data.success, 'Delete returned success');

    const deleteEvent = await request(`/api/admin/reservations/events/${createdEvent.id}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert.strictEqual(deleteEvent.status, 200, 'Admin can delete event reservation');
    assert.ok(deleteEvent.data.success, 'Delete returned success');
    console.log('  ✅ PASS: Both records permanently deleted.');

    // ----------------------------------------------------
    // Section 7: Validation
    // ----------------------------------------------------
    console.log('\n📌 Section 7: Validation Enforcement');

    const badPhone = await request('/api/reservations/dining', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Test',
        phone: '123',
        guests: 2,
        date: '2026-11-20',
        time: '07:30 PM'
      })
    });
    assert.strictEqual(badPhone.status, 400, 'Reject invalid phone with 400');

    const badEvent = await request('/api/reservations/event', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Test',
        phone: '9876543210',
        eventType: 'Birthday Party',
        // missing email
        expectedGuests: 15,
        date: '2026-11-20',
        time: '07:30 PM'
      })
    });
    assert.strictEqual(badEvent.status, 400, 'Reject event without email with 400');
    console.log('  ✅ PASS: Validation properly rejects invalid phone numbers and missing email.');

    console.log('\n========================================================================');
    console.log('🎉 ALL RESERVATIONS & FLOOR LOCATION TESTS PASSED PERFECTLY!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runReservationsAndFloorLocationsSuite().catch(console.error);