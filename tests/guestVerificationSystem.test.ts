import http from 'http';
import express from 'express';
import { dbService } from '../server/db';
import adminVerifyRouter from '../server/routes/adminVerify';
import bookingsRouter from '../server/routes/bookings';
import reservationsRouter from '../server/routes/reservations';
import { Booking, DiningReservation, EventReservation } from '../server/types';

// Standalone test server
const app = express();
app.use(express.json());
app.use('/api/bookings', bookingsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/admin/verify', adminVerifyRouter);

let server: http.Server;
let port: number;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'giocasa2026';

function request(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting 4-Digit Guest Booking Verification System Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    } else {
      passed++;
      console.log(`✅ PASSED: ${msg}`);
    }
  }

  try {
    // Start test server on random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        port = addr.port;
        console.log(`📡 Test server running on http://127.0.0.1:${port}\n`);
        resolve();
      });
    });

    // =========================================================================
    // 1. AUTOMATIC 4-DIGIT CODE GENERATION
    // =========================================================================
    console.log('\n--- 1. Testing Automatic 4-Digit Code Generation ---');

    // A. Gaming Booking
    const bookingRes = await request('POST', '/api/bookings', {
      customerName: 'Marco Polo',
      phone: '9876543210',
      email: 'marco@example.com',
      resourceId: 'ps5-station-1',
      date: '2026-11-20',
      startTime: '14:00',
      durationMinutes: 60,
      numberOfPeople: 2,
    });

    assert(bookingRes.status === 201, 'POST /api/bookings returns 201 Created');
    const gamingBooking = bookingRes.body.data;
    assert(!!gamingBooking.guestCode, `Gaming booking has guestCode: ${gamingBooking.guestCode}`);
    assert(/^\d{4}$/.test(gamingBooking.guestCode), `Gaming guestCode is strictly 4 digits: ${gamingBooking.guestCode}`);
    assert(gamingBooking.checkInStatus === 'pending', 'Gaming booking default checkInStatus is "pending"');
    assert(gamingBooking.paymentStatus === 'unpaid', 'Gaming booking default paymentStatus is "unpaid"');
    assert(gamingBooking.location === 'Basement', `Gaming PS5 floorLocation correctly set to "Basement": ${gamingBooking.location}`);

    // B. Dining Reservation
    const diningRes = await request('POST', '/api/reservations/dining', {
      customerName: 'Elena Rossi',
      phone: '9812345678',
      email: 'elena@example.com',
      guests: 4,
      date: '2026-11-21',
      time: '19:30',
      seatingPreference: 'Window View',
      specialRequests: 'High chair required',
    });

    assert(diningRes.status === 201, 'POST /api/reservations/dining returns 201 Created');
    const diningReservation = diningRes.body.data;
    assert(!!diningReservation.guestCode, `Dining reservation has guestCode: ${diningReservation.guestCode}`);
    assert(/^\d{4}$/.test(diningReservation.guestCode), `Dining guestCode is 4 digits: ${diningReservation.guestCode}`);
    assert(diningReservation.checkInStatus === 'pending', 'Dining reservation default checkInStatus is "pending"');

    // C. Event Reservation
    const eventRes = await request('POST', '/api/reservations/events', {
      customerName: 'Sanjay Sharma',
      phone: '9822334455',
      email: 'sanjay@example.com',
      eventType: 'Birthday Party',
      date: '2026-11-25',
      time: '18:00',
      expectedGuests: 25,
      estimatedBudget: '₹25,000',
      foodRequirements: 'Wood-fired pizzas and mocktails',
    });

    assert(eventRes.status === 201, 'POST /api/reservations/events returns 201 Created');
    const eventReservation = eventRes.body.data;
    assert(!!eventReservation.guestCode, `Event reservation has guestCode: ${eventReservation.guestCode}`);
    assert(/^\d{4}$/.test(eventReservation.guestCode), `Event guestCode is 4 digits: ${eventReservation.guestCode}`);

    // =========================================================================
    // 2. SECURITY & AUTHENTICATION
    // =========================================================================
    console.log('\n--- 2. Testing Security & Authentication ---');

    const unauthLookup = await request('GET', `/api/admin/verify/code/${gamingBooking.guestCode}`);
    assert(unauthLookup.status === 401, 'Unauthenticated GET /code/:code is rejected with 401 Unauthorized');

    const unauthCheckIn = await request('POST', '/api/admin/verify/check-in', {
      bookingType: 'gaming',
      id: gamingBooking.id,
    });
    assert(unauthCheckIn.status === 401, 'Unauthenticated POST /check-in is rejected with 401 Unauthorized');

    const unauthPayment = await request('POST', '/api/admin/verify/payment', {
      bookingType: 'gaming',
      id: gamingBooking.id,
      paymentStatus: 'paid',
    });
    assert(unauthPayment.status === 401, 'Unauthenticated POST /payment is rejected with 401 Unauthorized');

    // =========================================================================
    // 3. ADMIN CODE LOOKUP & DATA INTEGRITY
    // =========================================================================
    console.log('\n--- 3. Testing Admin 4-Digit Code Lookup ---');

    const adminHeaders = {
      'x-admin-passcode': ADMIN_PASSCODE,
    };

    // Invalid format lookup
    const badCodeRes = await request('GET', '/api/admin/verify/code/12', undefined, adminHeaders);
    assert(badCodeRes.status === 400, 'Non-4-digit code returns 400 Bad Request');

    // Non-existent code lookup
    const missingCodeRes = await request('GET', '/api/admin/verify/code/0000', undefined, adminHeaders);
    assert(missingCodeRes.status === 404, 'Non-existent code returns 404 Not Found without leaking data');

    // Valid Gaming Booking Lookup
    const lookupGaming = await request('GET', `/api/admin/verify/code/${gamingBooking.guestCode}`, undefined, adminHeaders);
    assert(lookupGaming.status === 200, 'Valid code returns 200 OK');
    const verifiedGaming = lookupGaming.body.data;
    assert(verifiedGaming.customerName === 'Marco Polo', `Guest name matches: ${verifiedGaming.customerName}`);
    assert(verifiedGaming.bookingType === 'gaming', 'Booking type is "gaming"');
    assert(verifiedGaming.location === 'Basement', `Facility location is "Basement": ${verifiedGaming.location}`);
    assert(verifiedGaming.checkInStatus === 'pending', 'checkInStatus is "pending"');
    assert(verifiedGaming.paymentStatus === 'unpaid', 'Payment status is "unpaid" - lookup never marks paid automatically');

    // Valid Dining Booking Lookup
    const lookupDining = await request('GET', `/api/admin/verify/code/${diningReservation.guestCode}`, undefined, adminHeaders);
    assert(lookupDining.status === 200, 'Dining code returns 200 OK');
    const verifiedDining = lookupDining.body.data;
    assert(verifiedDining.customerName === 'Elena Rossi', `Dining guest name matches: ${verifiedDining.customerName}`);
    assert(verifiedDining.bookingType === 'dining', 'Booking type is "dining"');
    assert(verifiedDining.location.includes('1st Floor'), `Dining location is 1st Floor: ${verifiedDining.location}`);

    // =========================================================================
    // 4. BUTTON 1: CONFIRM BOOKING / GUEST ARRIVED (CHECK-IN)
    // =========================================================================
    console.log('\n--- 4. Testing Button 1 (Check-In) ---');

    // Confirm check-in
    const checkInRes = await request(
      'POST',
      '/api/admin/verify/check-in',
      {
        bookingType: 'gaming',
        id: gamingBooking.id,
        staffName: 'Desk Agent Rahul',
      },
      adminHeaders
    );

    assert(checkInRes.status === 200, 'POST /check-in returns 200 OK');
    const checkedInRecord = checkInRes.body.data;
    assert(checkedInRecord.checkInStatus === 'checked_in', 'checkInStatus is now "checked_in"');
    assert(!!checkedInRecord.checkedInAt, `checkedInAt timestamp is recorded: ${checkedInRecord.checkedInAt}`);
    assert(checkedInRecord.checkedInBy === 'Desk Agent Rahul', `checkedInBy is recorded: ${checkedInRecord.checkedInBy}`);
    assert(
      checkedInRecord.auditLogs.some((l: any) => l.action === 'check_in'),
      'Audit log contains check_in event'
    );

    // Prevent accidental duplicate check-in
    const duplicateCheckInRes = await request(
      'POST',
      '/api/admin/verify/check-in',
      {
        bookingType: 'gaming',
        id: gamingBooking.id,
        staffName: 'Desk Agent Rahul',
      },
      adminHeaders
    );
    assert(duplicateCheckInRes.status === 409, 'Duplicate check-in returns 409 Conflict');
    assert(
      duplicateCheckInRes.body.error.toLowerCase().includes('already'),
      `Error explains duplicate check-in: ${duplicateCheckInRes.body.error}`
    );

    // Block cancelled bookings from check-in
    await dbService.cancelBooking(gamingBooking.id, 'Test cancellation');
    const cancelledCheckInRes = await request(
      'POST',
      '/api/admin/verify/check-in',
      {
        bookingType: 'dining',
        id: diningReservation.id,
      },
      adminHeaders
    );
    // Let's cancel dining first to test
    if (dbService.isMongoConnected && dbService['db']) {
      await dbService['db'].collection('dining_reservations').updateOne({ id: diningReservation.id }, { $set: { status: 'cancelled' } });
    } else {
      const dIdx = dbService['fileDiningReservations'].findIndex((d) => d.id === diningReservation.id);
      if (dIdx >= 0) dbService['fileDiningReservations'][dIdx].status = 'cancelled';
    }

    const cancelDiningCheckIn = await request(
      'POST',
      '/api/admin/verify/check-in',
      {
        bookingType: 'dining',
        id: diningReservation.id,
      },
      adminHeaders
    );
    assert(cancelDiningCheckIn.status === 400, 'Checking in a cancelled booking is rejected with 400 Bad Request');
    assert(
      cancelDiningCheckIn.body.error.toLowerCase().includes('cancelled'),
      `Error states booking is cancelled: ${cancelDiningCheckIn.body.error}`
    );

    // =========================================================================
    // 5. BUTTON 2: VERIFY PAYMENT
    // =========================================================================
    console.log('\n--- 5. Testing Button 2 (Verify Payment) ---');

    // Create another fresh booking to test payment update
    const freshBookingRes = await request('POST', '/api/bookings', {
      customerName: 'Priya Verma',
      phone: '9988776655',
      resourceId: 'pool-table-1',
      date: '2026-11-22',
      startTime: '16:00',
      durationMinutes: 60,
      numberOfPeople: 2,
    });
    const freshBooking = freshBookingRes.body.data;

    // Verify payment: mark as paid with UPI and reference
    const paymentUpdateRes = await request(
      'POST',
      '/api/admin/verify/payment',
      {
        bookingType: 'gaming',
        id: freshBooking.id,
        paymentStatus: 'paid',
        paymentMethod: 'upi',
        paymentReference: 'UPI-REF-987654',
        staffName: 'Staff Priya',
      },
      adminHeaders
    );

    assert(paymentUpdateRes.status === 200, 'POST /payment returns 200 OK');
    const paidBooking = paymentUpdateRes.body.data;
    assert(paidBooking.paymentStatus === 'paid', 'paymentStatus is now "paid"');
    assert(paidBooking.paymentMethod === 'upi', 'paymentMethod is "upi"');
    assert(paidBooking.paymentReference === 'UPI-REF-987654', 'paymentReference recorded');
    assert(paidBooking.paymentVerifiedBy === 'Staff Priya', 'paymentVerifiedBy recorded');
    assert(
      paidBooking.auditLogs.some((l: any) => l.action === 'payment_update'),
      'Audit log contains payment_update event'
    );

    // Check recent verifications feed
    const recentRes = await request('GET', '/api/admin/verify/recent', undefined, adminHeaders);
    assert(recentRes.status === 200, 'GET /recent returns 200 OK');
    const recentList = recentRes.body.data;
    assert(Array.isArray(recentList), 'recent feed returns an array');
    assert(
      recentList.some((r: any) => r.id === freshBooking.id || r.id === gamingBooking.id),
      'Recently verified records appear in the recent feed'
    );

    console.log(`\n🎉 ALL ${passed}/${total} TESTS PASSED PERFECTLY!\n`);
  } catch (err: any) {
    console.error('❌ Test suite execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runTests();
