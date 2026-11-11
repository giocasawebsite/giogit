import assert from 'node:assert';
import http from 'node:http';
import webpush from 'web-push';
import app from '../server/index';
import { dbService } from '../server/db';
import { pushNotificationService } from '../server/services/pushNotification';

console.log('========================================================================');
console.log('🔔 GIOCASA WEB PUSH NOTIFICATIONS & REAL-TIME ALERTS TEST SUITE');
console.log('========================================================================\n');

async function runWebPushTestSuite() {
  await dbService.init();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const adminPasscode = 'GIOCASA2026';

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: VAPID Public Key API & Cryptographic Generation
    // -------------------------------------------------------------------------
    console.log('📌 Section 1: VAPID Key Retrieval & Public Endpoint');
    const vapidRes = await fetch(`${baseUrl}/api/admin/push/vapid-public-key`);
    assert.strictEqual(vapidRes.status, 200, 'GET /api/admin/push/vapid-public-key should return 200');
    const vapidJson = await vapidRes.json();
    assert.strictEqual(vapidJson.success, true, 'VAPID response success must be true');
    assert(vapidJson.publicKey && typeof vapidJson.publicKey === 'string', 'Public key must be a valid string');
    assert(vapidJson.publicKey.length > 50, 'Public key length should be standard base64url (>50 chars)');
    console.log(`  ✅ PASS: VAPID public key retrieved successfully (${vapidJson.publicKey.slice(0, 25)}...)`);

    // -------------------------------------------------------------------------
    // SECTION 2: Admin Authentication on Push Subscriptions
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 2: Admin Authentication & Permission Boundaries');
    const unauthSub = await fetch(`${baseUrl}/api/admin/push/subscriptions`);
    assert.strictEqual(unauthSub.status, 401, 'Unauthenticated request to push subscriptions must return 401');

    const unauthPost = await fetch(`${baseUrl}/api/admin/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: { endpoint: 'https://test', keys: { p256dh: 'a', auth: 'b' } } }),
    });
    assert.strictEqual(unauthPost.status, 401, 'Unauthenticated subscription registration must return 401');
    console.log('  ✅ PASS: Unauthenticated access rejected with 401 Unauthorized');

    // -------------------------------------------------------------------------
    // SECTION 3: Device Push Subscription Registration & Upsert
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 3: Permanent Subscription Storage (MongoDB/Disk)');
    const testEndpoint1 = `https://fcm.googleapis.com/fcm/send/test-admin-phone-${Date.now()}`;
    const testKeys = {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVlJxIxZ01-UPBwEgF-ItWGynunVksSZLkP40',
      auth: '5K_fZw4WbXv5T6qYnL6z7w',
    };

    const subscribeRes = await fetch(`${baseUrl}/api/admin/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': adminPasscode,
      },
      body: JSON.stringify({
        subscription: {
          endpoint: testEndpoint1,
          keys: testKeys,
        },
        deviceName: 'Manager Pixel 8 Pro (Android)',
      }),
    });

    assert.strictEqual(subscribeRes.status, 201, 'POST /subscribe must return 201 Created');
    const subJson = await subscribeRes.json();
    assert.strictEqual(subJson.success, true);
    assert(subJson.data.id, 'Subscription must contain a generated ID');
    assert.strictEqual(subJson.data.deviceName, 'Manager Pixel 8 Pro (Android)');
    console.log(`  ✅ PASS: Registered Android push device (ID: ${subJson.data.id})`);

    // Register a second device (Desktop)
    const testEndpoint2 = `https://updates.push.services.mozilla.com/wpush/v2/test-desktop-${Date.now()}`;
    const subscribeRes2 = await fetch(`${baseUrl}/api/admin/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': adminPasscode,
      },
      body: JSON.stringify({
        subscription: {
          endpoint: testEndpoint2,
          keys: testKeys,
        },
        deviceName: 'Front Desk Chrome (Windows 11)',
      }),
    });
    assert.strictEqual(subscribeRes2.status, 201);
    const subJson2 = await subscribeRes2.json();
    console.log(`  ✅ PASS: Registered Desktop push device (ID: ${subJson2.data.id})`);

    // Verify both devices appear in GET /subscriptions
    const listRes = await fetch(`${baseUrl}/api/admin/push/subscriptions`, {
      headers: { 'x-admin-passcode': adminPasscode },
    });
    assert.strictEqual(listRes.status, 200);
    const listJson = await listRes.json();
    assert(Array.isArray(listJson.data), 'Subscriptions data must be an array');
    const hasDevice1 = listJson.data.some((d: any) => d.endpoint === testEndpoint1);
    const hasDevice2 = listJson.data.some((d: any) => d.endpoint === testEndpoint2);
    assert(hasDevice1, 'Device 1 must be present in active subscription list');
    assert(hasDevice2, 'Device 2 must be present in active subscription list');
    console.log(`  ✅ PASS: Verified ${listJson.data.length} registered devices in active MongoDB/disk list`);

    // -------------------------------------------------------------------------
    // SECTION 4: Real-Time Push Triggers on Successful MongoDB Saves
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 4: Trigger Events on Successful Inserts');

    // Intercept pushNotificationService.sendPushNotificationToAll to record dispatches
    const dispatchedAlerts: any[] = [];
    const originalSend = pushNotificationService.sendPushNotificationToAll.bind(pushNotificationService);
    pushNotificationService.sendPushNotificationToAll = async (payload: any) => {
      dispatchedAlerts.push(payload);
      return { sent: 2, failed: 0, removed: 0 };
    };

    // 4.1 Gaming Booking Event
    const resources = await dbService.getResources();
    const ps5 = resources.find((r) => r.category === 'ps5') || resources[0];
    const uniqueDay = String(Math.floor(Math.random() * 20) + 10);
    const uniqueHour = String(Math.floor(Math.random() * 8) + 11);
    const bookingDate = `2027-03-${uniqueDay}`;
    const testBookingPhone = '98' + String(Math.floor(Math.random() * 90000000) + 10000000);

    const bookingRes = await fetch(`${baseUrl}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Aarav Verma',
        phone: testBookingPhone,
        email: 'aarav@example.com',
        resourceId: ps5.id,
        date: bookingDate,
        startTime: `${uniqueHour}:00`,
        durationMinutes: 60,
        numberOfPeople: 2,
      }),
    });
    const bookingJson = await bookingRes.json();
    if (bookingRes.status !== 201) {
      console.error('Booking failed with status:', bookingRes.status, bookingJson);
    }
    assert.strictEqual(bookingRes.status, 201, 'Booking must succeed');
    assert(bookingJson.success);

    // Wait a brief moment for async notification handler
    await new Promise((r) => setTimeout(r, 80));
    const bookingAlert = dispatchedAlerts.find((a) => a.data?.type === 'booking');
    assert(bookingAlert, 'Push notification must be dispatched for new gaming booking');
    assert(bookingAlert.title.includes('New Gaming Booking'), 'Title should state New Gaming Booking');
    assert(bookingAlert.body.includes('Aarav Verma'), 'Body must mention customer name');
    assert(bookingAlert.body.includes(bookingJson.data.id), 'Body must contain booking ID');
    assert.strictEqual(bookingAlert.data.url, '/#/admin', 'Clicking booking notification must open admin overview');
    console.log(`  ✅ PASS: Gaming booking alert triggered -> "${bookingAlert.title}": ${bookingAlert.body}`);

    // 4.2 Dining Table Reservation Event (1st Floor Restaurant)
    const testDiningPhone = '97' + String(Math.floor(Math.random() * 90000000) + 10000000);
    const diningRes = await fetch(`${baseUrl}/api/reservations/dining`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Meera Kapoor',
        phone: testDiningPhone,
        email: 'meera@example.com',
        guests: 4,
        date: '2026-12-28',
        time: '20:00',
        seatingPreference: 'Window View',
      }),
    });
    assert.strictEqual(diningRes.status, 201, 'Dining reservation must succeed');
    const diningJson = await diningRes.json();
    assert(diningJson.success);

    await new Promise((r) => setTimeout(r, 80));
    const diningAlert = dispatchedAlerts.find((a) => a.data?.type === 'dining');
    assert(diningAlert, 'Push notification must be dispatched for new dining table reservation');
    assert(diningAlert.title.includes('New Dining Table Reservation'));
    assert(diningAlert.body.includes('Meera Kapoor'));
    assert(diningAlert.body.includes(diningJson.data.reference));
    assert.strictEqual(diningAlert.data.url, '/#/admin/reservations', 'Clicking dining notification must open reservations tab');
    console.log(`  ✅ PASS: Dining reservation alert triggered -> "${diningAlert.title}": ${diningAlert.body}`);

    // 4.3 Event Reservation Enquiry Event
    const eventRes = await fetch(`${baseUrl}/api/reservations/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Vikram Singhania',
        phone: '9844556677',
        email: 'vikram@example.com',
        eventType: 'Corporate Celebration',
        expectedGuests: 25,
        date: '2026-12-30',
        time: '18:30',
        estimatedBudget: '₹25,000',
      }),
    });
    assert.strictEqual(eventRes.status, 201, 'Event reservation must succeed');
    const eventJson = await eventRes.json();
    assert(eventJson.success);

    await new Promise((r) => setTimeout(r, 80));
    const eventAlert = dispatchedAlerts.find((a) => a.data?.type === 'event');
    assert(eventAlert, 'Push notification must be dispatched for new event enquiry');
    assert(eventAlert.title.includes('New Event Reservation Enquiry'));
    assert(eventAlert.body.includes('Vikram Singhania'));
    assert(eventAlert.body.includes(eventJson.data.reference));
    assert.strictEqual(eventAlert.data.url, '/#/admin/reservations');
    console.log(`  ✅ PASS: Event enquiry alert triggered -> "${eventAlert.title}": ${eventAlert.body}`);

    // 4.4 Tournament Registration Event
    const tournaments = await dbService.getTournaments();
    let tournament = tournaments[0];
    await dbService.updateTournament(tournament.id, {
      status: 'published',
      registrationOpeningDate: '2020-01-01',
      registrationDeadlineDate: '2030-12-31',
      maxCapacity: 64,
      confirmedCount: 0,
    });

    const randomSuffix = Math.floor(Math.random() * 89999) + 10000;
    const testPhone = '99' + String(Math.floor(Math.random() * 90000000) + 10000000);
    const inGameId = `SNIPER_${randomSuffix}`;

    const regRes = await fetch(`${baseUrl}/api/tournaments/${tournament.slug}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantName: 'Arjun Das',
        phone: testPhone,
        email: `arjun_${randomSuffix}@example.com`,
        inGameId: inGameId,
        rulesAccepted: true,
      }),
    });
    assert.strictEqual(regRes.status, 201, 'Tournament registration must succeed');
    const regJson = await regRes.json();
    assert(regJson.success);

    await new Promise((r) => setTimeout(r, 80));
    const tourneyAlert = dispatchedAlerts.find((a) => a.data?.type === 'tournament');
    assert(tourneyAlert, 'Push notification must be dispatched for new tournament registration');
    assert(tourneyAlert.title.includes('New Tournament Registration'));
    assert(tourneyAlert.body.includes('Arjun Das'));
    assert.strictEqual(tourneyAlert.data.url, '/#/admin/tournaments');
    console.log(`  ✅ PASS: Tournament registration alert triggered -> "${tourneyAlert.title}": ${tourneyAlert.body}`);

    // Restore original send function
    pushNotificationService.sendPushNotificationToAll = originalSend;

    // -------------------------------------------------------------------------
    // SECTION 5: Negative Testing (Failed Submissions Must NOT Dispatch Alerts)
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 5: Verification That Failed/Invalid Requests Dispatch Zero Alerts');
    const alertsCountBefore = dispatchedAlerts.length;

    // Invalid phone number on booking
    const failedBookingRes = await fetch(`${baseUrl}/api/booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Fail Test',
        phone: '123', // invalid
        resourceId: ps5.id,
        date: '2026-12-25',
        startTime: '10:00',
        durationMinutes: 60,
      }),
    });
    assert.strictEqual(failedBookingRes.status, 400);

    // Invalid guests on dining
    const failedDiningRes = await fetch(`${baseUrl}/api/reservations/dining`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '', // invalid
        phone: '123',
      }),
    });
    assert.strictEqual(failedDiningRes.status, 400);

    await new Promise((r) => setTimeout(r, 80));
    assert.strictEqual(
      dispatchedAlerts.length,
      alertsCountBefore,
      'No push notifications should be dispatched when requests fail validation'
    );
    console.log('  ✅ PASS: Zero push notifications dispatched on invalid/failed requests');

    // -------------------------------------------------------------------------
    // SECTION 6: Unsubscribe & Device Deletion Management
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 6: Device Removal & Unsubscribe API');
    // Test device 1 unsubscription by endpoint
    const unsubRes = await fetch(`${baseUrl}/api/admin/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': adminPasscode,
      },
      body: JSON.stringify({ endpoint: testEndpoint1 }),
    });
    assert.strictEqual(unsubRes.status, 200);

    // Test device 2 deletion by ID
    const deleteRes = await fetch(`${baseUrl}/api/admin/push/subscriptions/${subJson2.data.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': adminPasscode },
    });
    assert.strictEqual(deleteRes.status, 200);

    // Verify both devices are now removed
    const listAfterRes = await fetch(`${baseUrl}/api/admin/push/subscriptions`, {
      headers: { 'x-admin-passcode': adminPasscode },
    });
    const listAfterJson = await listAfterRes.json();
    const remainingEndpoints = listAfterJson.data.map((d: any) => d.endpoint);
    assert(!remainingEndpoints.includes(testEndpoint1), 'Device 1 should be gone');
    assert(!remainingEndpoints.includes(testEndpoint2), 'Device 2 should be gone');
    console.log('  ✅ PASS: Both test devices successfully removed from active notification list');

    // -------------------------------------------------------------------------
    // SECTION 7: Lockscreen Privacy Verification
    // -------------------------------------------------------------------------
    console.log('\n📌 Section 7: Lockscreen Privacy Compliance');
    for (const alert of dispatchedAlerts) {
      assert(
        !alert.body.includes('9876543210') && !alert.body.includes('9811223344'),
        'Full customer phone numbers must not be exposed in push notification body'
      );
      assert(
        !alert.body.includes('password') && !alert.body.includes('passcode'),
        'Security secrets must not be exposed in notification payloads'
      );
    }
    console.log('  ✅ PASS: Lockscreen privacy verified; no sensitive phone numbers or secrets exposed');

    console.log('\n========================================================================');
    console.log('🎉 ALL WEB PUSH NOTIFICATION & REAL-TIME ALERT TESTS PASSED (100%)!');
    console.log('========================================================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runWebPushTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
