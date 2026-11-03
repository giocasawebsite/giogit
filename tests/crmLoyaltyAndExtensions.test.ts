import assert from 'node:assert';
import { dbService } from '../server/db';
import { config } from '../server/config';
import app from '../server/index';

const BASE_URL = `http://127.0.0.1:${config.port}`;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'GIOCASA2025';

async function runCrmLoyaltyAndExtensionsSuite() {
  console.log('======================================================');
  console.log('🏆 GIOCASA CRM — LOYALTY, EXTENSIONS & CUSTOM GIO ID');
  console.log('======================================================\n');

  await dbService.init();

  const testIp = `10.99.${Math.floor(1 + Math.random() * 250)}.${Math.floor(1 + Math.random() * 250)}`;

  const request = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-forwarded-for': testIp,
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

  const randSuffix = Math.floor(1000 + Math.random() * 9000);

  try {
    // ----------------------------------------------------
    // Section 1: Custom Gio ID Validation & Uniqueness
    // ----------------------------------------------------
    console.log('📌 Section 1: Customer-Created Custom Gio ID Rules & Validation');

    // 1.1 Format Validation
    const testCasesInvalid = [
      { id: 'KING23', reason: 'Does not start with GIO' },
      { id: 'GIO 101', reason: 'Contains space' },
      { id: 'GIO#123', reason: 'Contains special characters' },
      { id: 'GIO-VIP', reason: 'Contains hyphen in custom input' },
      { id: 'GIO1', reason: 'Too short (<6 chars)' },
      { id: 'GIOVERYLONGIDENTIFIEREXCEEDINGTWENTYCHARS', reason: 'Too long (>20 chars)' },
    ];

    for (const tc of testCasesInvalid) {
      const checkRes = await request(`/api/players/check-id/${encodeURIComponent(tc.id)}`);
      assert.strictEqual(checkRes.data.available, false, `ID "${tc.id}" should be rejected: ${tc.reason}`);
    }
    console.log('  ✅ PASS: Strict format validation rejects spaces, special characters, and invalid lengths');

    // 1.2 Check Availability on Available ID
    const customId1 = `GIOKING${randSuffix}`;
    const checkAvail = await request(`/api/players/check-id/${customId1}`);
    assert.strictEqual(checkAvail.status, 200);
    assert.strictEqual(checkAvail.data.available, true, 'Custom ID should be available');
    assert.strictEqual(checkAvail.data.gioId, customId1);
    console.log(`  ✅ PASS: Verified availability for unused ID: ${customId1}`);

    // 1.3 Register player with Custom Gio ID (case-insensitive input 'gioking...')
    const playerPhone1 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes1 = await request('/api/players/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Arjun Verma',
        gamerTag: 'ApexStriker',
        phone: playerPhone1,
        email: `arjun${randSuffix}@example.com`,
        customGioId: customId1.toLowerCase(), // testing case-insensitive input
        favoriteGame: 'EA Sports FC 25',
      }),
    });

    assert.strictEqual(regRes1.status, 201, 'Player registration succeeds with custom ID');
    assert.strictEqual(regRes1.data.data.player.gioId, customId1, 'Saved in uppercase');
    const player1 = regRes1.data.data.player;
    console.log(`  ✅ PASS: Player registered with custom Gio ID: ${player1.gioId} (saved in uppercase)`);

    // 1.4 Check availability now reports taken
    const checkTaken = await request(`/api/players/check-id/${customId1}`);
    assert.strictEqual(checkTaken.data.available, false, 'ID should now report not available');
    assert(
      checkTaken.data.error.includes('already taken'),
      'Must contain: "This Gio ID is already taken. Please choose another."'
    );
    console.log('  ✅ PASS: Availability check returns "This Gio ID is already taken. Please choose another."');

    // 1.5 Duplicate registration attempt with same ID (case-insensitive) is rejected
    const playerPhoneDup = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regDup = await request('/api/players/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Copycat Gamer',
        phone: playerPhoneDup,
        customGioId: customId1.toLowerCase(),
      }),
    });
    assert.strictEqual(regDup.status, 409, 'Registration fails with 409 Conflict for taken ID');
    assert(regDup.data.error.includes('already taken'), 'Error indicates ID is already taken');
    console.log('  ✅ PASS: Backend prevents claiming already taken ID (409 Conflict)');

    // 1.6 Blank custom ID retains existing automatic Gio ID generation
    const playerPhoneAuto = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regAuto = await request('/api/players/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Rohan Sharma',
        phone: playerPhoneAuto,
        customGioId: '', // left blank
      }),
    });
    assert.strictEqual(regAuto.status, 201);
    assert(regAuto.data.data.player.gioId.startsWith('GIO-'), 'Auto-generated ID starts with GIO-');
    console.log(`  ✅ PASS: Blank custom ID generates automatic ID: ${regAuto.data.data.player.gioId}`);

    // ----------------------------------------------------
    // Section 2: Extra Paid Time — CRM Payment Tracking
    // ----------------------------------------------------
    console.log('\n📌 Section 2: Extra Paid Time & Extension Payment Tracking');

    // 2.1 Create a paid booking for player 1
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 50 + Math.floor(Math.random() * 50));
    const dateStr = testDate.toISOString().slice(0, 10);

    const bookingRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customerName: player1.name,
        phone: player1.phone,
        email: player1.email,
        resourceId: 'ps5-station-1',
        date: dateStr,
        startTime: '16:00',
        durationMinutes: 60,
        numberOfPeople: 1,
        paymentStatus: 'paid',
      }),
    });
    assert.strictEqual(bookingRes.status, 201, 'Booking created');
    const booking = bookingRes.data.data;
    const initialAmount = booking.totalAmount;
    assert(initialAmount > 0, 'Booking has positive base amount');
    console.log(`  ✅ PASS: Created initial paid booking #${booking.id} for ₹${initialAmount} (60 mins)`);

    // Verify initial player spend
    let profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    assert.strictEqual(profile1.paymentSummary.originalBookingsSpend, initialAmount);
    assert.strictEqual(profile1.paymentSummary.extensionsSpend, 0);
    assert.strictEqual(profile1.paymentSummary.lifetimeSpend, initialAmount);
    console.log(`  ✅ PASS: Initial CRM spend: Base=₹${initialAmount}, Extensions=₹0, Total=₹${initialAmount}`);

    // 2.2 Extend session by 30 minutes with confirmed payment
    const extIdempotencyKey = `test_ext_${booking.id}_1`;
    const extendRes1 = await request(`/api/bookings/${booking.id}/extend`, {
      method: 'POST',
      body: JSON.stringify({
        additionalMinutes: 30,
        paymentStatus: 'paid',
        idempotencyKey: extIdempotencyKey,
      }),
    });
    assert.strictEqual(extendRes1.status, 200, 'Extension succeeds');
    const extendedBooking1 = extendRes1.data.data;
    assert.strictEqual(extendedBooking1.durationMinutes, 90, 'Duration is 90 mins');
    assert.strictEqual(extendedBooking1.extensions.length, 1, '1 extension recorded');
    const ext1 = extendedBooking1.extensions[0];
    assert.strictEqual(ext1.extensionMinutes, 30);
    assert.strictEqual(ext1.paymentStatus, 'paid');
    assert(ext1.amount > 0, 'Extension has calculated extra amount');
    const extraPaidAmount1 = ext1.amount;
    console.log(`  ✅ PASS: Extended session by 30 mins (+₹${extraPaidAmount1}, status: paid)`);

    // Verify player profile reflects extra extension spend
    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    assert.strictEqual(profile1.paymentSummary.originalBookingsSpend, initialAmount, 'Original booking spend intact');
    assert.strictEqual(profile1.paymentSummary.extensionsSpend, extraPaidAmount1, 'Extension spend matches extra amount');
    assert.strictEqual(profile1.paymentSummary.lifetimeSpend, initialAmount + extraPaidAmount1, 'Total lifetime spend matches sum');
    console.log(`  ✅ PASS: CRM Profile updated: Base=₹${initialAmount}, Extensions=₹${extraPaidAmount1}, Total=₹${initialAmount + extraPaidAmount1}`);

    // 2.3 Retry extension with same idempotency key (idempotency protection)
    const extendRetry = await request(`/api/bookings/${booking.id}/extend`, {
      method: 'POST',
      body: JSON.stringify({
        additionalMinutes: 30,
        paymentStatus: 'paid',
        idempotencyKey: extIdempotencyKey,
      }),
    });
    assert.strictEqual(extendRetry.status, 200);
    const retryBooking = extendRetry.data.data;
    assert.strictEqual(retryBooking.extensions.length, 1, 'Extensions count unchanged (no duplicate charges)');
    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    assert.strictEqual(profile1.paymentSummary.extensionsSpend, extraPaidAmount1, 'Spending not duplicated');
    console.log('  ✅ PASS: Idempotency prevents duplicate extension charges on retry');

    // 2.4 Extend session with pending payment -> should NOT be counted in confirmed total spend
    const extendPending = await request(`/api/bookings/${booking.id}/extend`, {
      method: 'POST',
      body: JSON.stringify({
        additionalMinutes: 30,
        paymentStatus: 'pending',
      }),
    });
    assert.strictEqual(extendPending.status, 200);
    const pendingBooking = extendPending.data.data;
    assert.strictEqual(pendingBooking.extensions.length, 2);
    const ext2 = pendingBooking.extensions[1];
    assert.strictEqual(ext2.paymentStatus, 'pending');

    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    assert.strictEqual(
      profile1.paymentSummary.extensionsSpend,
      extraPaidAmount1,
      'Pending extension NOT added to confirmed spend'
    );
    console.log('  ✅ PASS: Pending extension is tracked but NOT added to confirmed spending');

    // ----------------------------------------------------
    // Section 3: Automatic Loyalty Points
    // ----------------------------------------------------
    console.log('\n📌 Section 3: Automatic Loyalty Points Engine');

    const rules = await dbService.getLoyaltyRules();
    const sessionPoints = rules.gamingSessionPoints || 50;

    // 3.1 Marking booking completed when paid awards session points
    const initialPoints = profile1.player.loyalty?.pointsBalance || 0;
    const completeRes = await request(`/api/admin/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'completed',
        paymentStatus: 'paid',
      }),
    });
    assert.strictEqual(completeRes.status, 200, 'Booking completed');

    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    const expectedPoints = initialPoints + sessionPoints;
    assert.strictEqual(
      profile1.player.loyalty.pointsBalance,
      expectedPoints,
      `Loyalty points increased by ${sessionPoints} pts`
    );
    console.log(`  ✅ PASS: Awarded ${sessionPoints} loyalty points upon session completion (Balance: ${profile1.player.loyalty.pointsBalance})`);

    // Verify entry in loyalty ledger
    const sessionLedger = profile1.loyaltyLedger.find((l: any) => l.referenceId === booking.id);
    assert(sessionLedger, 'Loyalty ledger has entry for session completion');
    assert.strictEqual(sessionLedger.points, sessionPoints);
    console.log(`  ✅ PASS: Loyalty ledger records transaction: ${sessionLedger.reason}`);

    // 3.2 Idempotent check: completing already completed booking does not duplicate points
    await request(`/api/admin/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'completed' }),
    });
    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    assert.strictEqual(profile1.player.loyalty.pointsBalance, expectedPoints, 'Points balance unchanged');
    console.log('  ✅ PASS: Re-triggering completed booking is idempotent (no duplicate points)');

    // 3.3 Unpaid booking marked completed must NEVER award points
    const unpaidBookingRes = await request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Unpaid Gamer',
        phone: `95${Math.floor(10000000 + Math.random() * 90000000)}`,
        resourceId: 'ps5-station-1',
        date: dateStr,
        startTime: '19:00',
        durationMinutes: 60,
        numberOfPeople: 1,
        paymentStatus: 'unpaid',
      }),
    });
    const unpaidBooking = unpaidBookingRes.data.data;
    const unpaidPlayerId = unpaidBooking.playerId;

    await request(`/api/admin/bookings/${unpaidBooking.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'completed' }), // completed but unpaid
    });
    const unpaidProfile = (await request(`/api/admin/players/${unpaidPlayerId}`, { headers: adminHeaders })).data.data;
    assert.strictEqual(unpaidProfile.player.loyalty?.pointsBalance || 0, 0, 'No points awarded for unpaid session');
    console.log('  ✅ PASS: Never awards loyalty points for unpaid sessions');

    // 3.4 Tournament Participation Points on Check-In
    const createTournRes = await request('/api/admin/tournaments', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: `FC 25 Championship ${Date.now()}`,
        gameTitle: 'EA Sports FC 25',
        startDate: '2026-12-01',
        startTime: '14:00',
        status: 'published',
        registrationOpeningDate: '2020-01-01',
        registrationDeadlineDate: '2030-12-31',
        registrationOpeningTime: '00:00',
        registrationDeadlineTime: '23:59',
        maxCapacity: 32,
        entryFeePaise: 0,
      }),
    });
    assert.strictEqual(createTournRes.status, 201, 'Tournament created via API');
    const activeTourn = createTournRes.data.data;
    assert(activeTourn, 'Active tournament created');

    const regTournRes = await request(`/api/tournaments/${activeTourn.slug}/register`, {
      method: 'POST',
      body: JSON.stringify({
        participantName: player1.name,
        phone: player1.phone,
        email: player1.email,
        inGameId: player1.gamerTag,
        rulesAccepted: true,
      }),
    });
    assert.strictEqual(regTournRes.status, 201, 'Tournament registration created');
    const tournReg = regTournRes.data.data.registration;

    // Check-in participant -> should award tournament participation points (100 pts)
    const pointsBeforeCheckin = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data.player.loyalty.pointsBalance;
    const checkinRes = await request(`/api/admin/tournaments/${activeTourn.id}/registrations/${tournReg.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'checked_in',
      }),
    });
    assert.strictEqual(checkinRes.status, 200, 'Check-in participant succeeded');

    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    const tournPoints = rules.tournamentParticipationPoints || 100;
    assert.strictEqual(
      profile1.player.loyalty.pointsBalance,
      pointsBeforeCheckin + tournPoints,
      `Points increased by ${tournPoints} for tournament check-in`
    );
    console.log(`  ✅ PASS: Awarded ${tournPoints} tournament check-in points automatically`);

    // 3.5 Referral Verification & Points
    // Register player 2 using player 1's referral code
    const playerPhone2 = `94${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes2 = await request('/api/players/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Kabir Patel',
        gamerTag: 'KabirPro',
        phone: playerPhone2,
        referredBy: player1.referralCode,
      }),
    });
    assert.strictEqual(regRes2.status, 201);
    const player2 = regRes2.data.data.player;

    // Referrer's profile should have pending referral
    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    const linkedRef = profile1.referrals.find((r: any) => r.referredPlayerId === player2.id);
    assert(linkedRef, 'Referral record exists in player profile');
    assert.strictEqual(linkedRef.status, 'pending', 'Referral starts as pending');
    console.log('  ✅ PASS: Referral link established between referrer and referred player');

    // Admin verifies / qualifies referral
    const ptsBeforeRef = profile1.player.loyalty.pointsBalance;
    const verifyRefRes = await request(`/api/admin/players/referrals/${linkedRef.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'qualified',
      }),
    });
    assert.strictEqual(verifyRefRes.status, 200);

    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;
    const refBonus = rules.referralPoints || 200;
    assert.strictEqual(
      profile1.player.loyalty.pointsBalance,
      ptsBeforeRef + refBonus,
      `Referrer received ${refBonus} bonus points on referral qualification`
    );
    console.log(`  ✅ PASS: Awarded ${refBonus} referral bonus points upon referral verification`);

    // ----------------------------------------------------
    // Section 4: CRM Detailed Profile Integration
    // ----------------------------------------------------
    console.log('\n📌 Section 4: CRM Complete Integration Verification');

    profile1 = (await request(`/api/admin/players/${player1.id}`, { headers: adminHeaders })).data.data;

    // 1. Custom Player ID
    assert.strictEqual(profile1.player.gioId, customId1);
    // 2. Loyalty Points
    assert(profile1.player.loyalty.pointsBalance > 0);
    // 3. Lifetime Spending & Breakdown
    assert.strictEqual(profile1.paymentSummary.lifetimeSpend, profile1.paymentSummary.originalBookingsSpend + profile1.paymentSummary.extensionsSpend);
    // 4. Tournaments
    assert(profile1.registrations.length >= 1);
    // 5. Referrals
    assert(profile1.referrals.length >= 1);
    // 6. Complete Transaction & Activity History
    assert(profile1.loyaltyLedger.length >= 3);
    assert(profile1.activityTimeline.length >= 5);

    console.log('  ✅ PASS: CRM Profile returns complete figures calculated from actual database records:');
    console.log(`     - Player ID: ${profile1.player.gioId}`);
    console.log(`     - Loyalty Balance: ${profile1.player.loyalty.pointsBalance} pts`);
    console.log(`     - Lifetime Spend: ₹${profile1.paymentSummary.lifetimeSpend} (Base: ₹${profile1.paymentSummary.originalBookingsSpend}, Extensions: ₹${profile1.paymentSummary.extensionsSpend})`);
    console.log(`     - Tournaments Entered: ${profile1.registrations.length}`);
    console.log(`     - Referrals: ${profile1.referrals.length}`);
    console.log(`     - Loyalty Ledger Transactions: ${profile1.loyaltyLedger.length}`);
    console.log(`     - Activity Timeline Events: ${profile1.activityTimeline.length}`);

    console.log('\n======================================================');
    console.log('🎉 ALL CRM LOYALTY, EXTENSIONS & GIO ID TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ CRM TEST SUITE FAILED:', err);
    process.exit(1);
  }
}

runCrmLoyaltyAndExtensionsSuite();
