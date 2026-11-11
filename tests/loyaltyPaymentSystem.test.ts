import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from '../server/db';
import { Booking, Player, LoyaltyRules } from '../server/types';

describe('GioCasa Loyalty Points System - Payment Integration', () => {
  const testPhone = '9876543210';
  let createdPlayer: Player;

  it('1. Connects to CRM and ensures a player profile exists for testing', async () => {
    // Clean up or find player
    const existing = await dbService.getPlayerByPhone(testPhone);
    if (existing) {
      createdPlayer = existing;
    } else {
      createdPlayer = await dbService.createPlayer({
        name: 'Arjun Verma',
        phone: testPhone,
        gamerTag: 'ArjunV',
        preferredCategory: 'ps5',
      });
    }

    assert.ok(createdPlayer.id);
    assert.equal(createdPlayer.normalizedPhone, testPhone);
  });

  it('2. Configured conversion rate calculates points based on actual amount received', async () => {
    const rules = await dbService.getLoyaltyRules();
    assert.ok(rules.rulesEnabled.paymentSpend);
    assert.equal(rules.pointsPerHundredRupees, 10);

    // ₹200 spend at 10 pts per ₹100 => 20 points
    const points200 = dbService.calculatePointsForSpend(200, rules);
    assert.equal(points200, 20);

    // ₹75 spend at 10 pts per ₹100 => 7 points (floored)
    const points75 = dbService.calculatePointsForSpend(75, rules);
    assert.equal(points75, 7);

    // Zero or negative spend => 0 points
    assert.equal(dbService.calculatePointsForSpend(0, rules), 0);
    assert.equal(dbService.calculatePointsForSpend(-50, rules), 0);
  });

  it('3. Full payment on booking verification automatically calculates and awards loyalty points', async () => {
    // Create a new gaming booking of ₹300
    const bkRes = await dbService.createBooking({
      id: `bk-test-${Date.now()}-1`,
      resourceId: 'ps5-station-1',
      date: '2026-11-20',
      startTime: '16:00',
      endTime: '17:00',
      durationMinutes: 60,
      customerName: 'Arjun Verma',
      phone: testPhone,
      email: 'arjun@example.com',
      totalAmount: 300,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      category: 'ps5',
      numberOfPeople: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(bkRes.success, true);
    const booking = bkRes.booking!;
    assert.ok(booking.id);
    assert.ok(booking.guestCode);
    const initialPlayer = await dbService.getPlayerById(createdPlayer.id);
    const startBalance = initialPlayer?.loyalty?.pointsBalance || 0;

    // Admin verifies payment as PAID (full ₹300)
    const result = await dbService.verifyGuestPayment(
      'gaming',
      booking.id,
      'paid',
      'upi',
      'UPI-TEST-001',
      'Staff Arjun'
    );

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.paymentStatus, 'paid');
    assert.equal(result.pointsAwarded, 30); // ₹300 -> 30 pts

    // Verify player loyalty balance in CRM
    const updatedPlayer = await dbService.getPlayerById(createdPlayer.id);
    assert.ok(updatedPlayer);
    assert.equal(updatedPlayer.loyalty.pointsBalance, startBalance + 30);

    // Verify ledger record contains payment amount, previous balance, updated balance
    const ledger = await dbService.getPlayerLoyaltyLedger(createdPlayer.id);
    const latestTx = ledger[0];
    assert.ok(latestTx);
    assert.equal(latestTx.paymentAmount, 300);
    assert.equal(latestTx.points, 30);
    assert.equal(latestTx.previousBalance, startBalance);
    assert.equal(latestTx.updatedBalance, startBalance + 30);
    assert.equal(latestTx.sourceActivityType, 'booking_payment');
  });

  it('4. Partial payment awards points ONLY on amount received, not total booking value', async () => {
    // Create a booking of ₹500
    const bkRes = await dbService.createBooking({
      id: `bk-test-${Date.now()}-2`,
      resourceId: 'racing-sim-1',
      date: '2026-11-21',
      startTime: '18:00',
      endTime: '19:00',
      durationMinutes: 60,
      customerName: 'Arjun Verma',
      phone: testPhone,
      totalAmount: 500,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      category: 'racing',
      numberOfPeople: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(bkRes.success, true);
    const booking = bkRes.booking!;

    const playerBefore = await dbService.getPlayerById(createdPlayer.id);
    const balanceBefore = playerBefore?.loyalty?.pointsBalance || 0;

    // Guest makes partial advance payment of ₹200
    const partialResult = await dbService.verifyGuestPayment(
      'gaming',
      booking.id,
      'paid',
      'cash',
      'CASH-ADVANCE',
      'Staff Front Desk',
      200 // Only ₹200 received
    );

    assert.equal(partialResult.success, true);
    assert.equal(partialResult.pointsAwarded, 20); // 20 pts for ₹200, NOT 50 pts
    assert.equal(partialResult.data?.paidAmount, 200);
    assert.equal(partialResult.data?.remainingBalance, 300);

    const playerAfterPartial = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterPartial?.loyalty.pointsBalance, balanceBefore + 20);

    // Verify ledger entry
    const ledger = await dbService.getPlayerLoyaltyLedger(createdPlayer.id);
    assert.equal(ledger[0].paymentAmount, 200);
    assert.equal(ledger[0].points, 20);
    assert.equal(ledger[0].previousBalance, balanceBefore);
    assert.equal(ledger[0].updatedBalance, balanceBefore + 20);

    // 5. Subsequent remaining payment awards points ONLY on newly received amount
    const remainingResult = await dbService.verifyGuestPayment(
      'gaming',
      booking.id,
      'paid',
      'card',
      'CARD-REMAINING',
      'Staff Front Desk',
      300 // Remaining ₹300 received
    );

    assert.equal(remainingResult.success, true);
    assert.equal(remainingResult.pointsAwarded, 30); // 30 pts for newly received ₹300
    assert.equal(remainingResult.data?.paidAmount, 500);
    assert.equal(remainingResult.data?.remainingBalance, 0);

    const playerAfterFull = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterFull?.loyalty.pointsBalance, balanceBefore + 20 + 30);
  });

  it('6. Booking extensions calculate and award points ONLY on newly received extension cost', async () => {
    // Create an initial booking for 60 mins (₹150)
    const bkRes = await dbService.createBooking({
      id: `bk-test-${Date.now()}-3`,
      resourceId: 'pool-table-1',
      date: '2026-11-22',
      startTime: '14:00',
      endTime: '15:00',
      durationMinutes: 60,
      customerName: 'Arjun Verma',
      phone: testPhone,
      totalAmount: 150,
      status: 'confirmed',
      paymentStatus: 'paid',
      category: 'pool',
      numberOfPeople: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(bkRes.success, true);
    const booking = bkRes.booking!;

    const playerBefore = await dbService.getPlayerById(createdPlayer.id);
    const balanceBefore = playerBefore?.loyalty?.pointsBalance || 0;

    // Extend booking by 60 mins with paid status
    const extResult = await dbService.extendBooking(booking.id, 60, {
      paymentStatus: 'paid',
      notes: 'Customer extended by 1 hour',
    });

    assert.equal(extResult.success, true);
    assert.ok(extResult.booking);
    assert.equal(extResult.booking.durationMinutes, 120);

    // Check extension cost
    const extension = extResult.booking.extensions?.[0];
    assert.ok(extension);
    const extensionCost = extension.amount || 0;
    assert.ok(extensionCost > 0);

    // Points earned should be exactly on extensionCost (1 pt per ₹10)
    const expectedExtensionPoints = Math.floor(extensionCost / 10);

    const playerAfter = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfter?.loyalty.pointsBalance, balanceBefore + expectedExtensionPoints);

    // Ledger should reflect extension payment amount
    const ledger = await dbService.getPlayerLoyaltyLedger(createdPlayer.id);
    assert.equal(ledger[0].paymentAmount, extensionCost);
    assert.equal(ledger[0].points, expectedExtensionPoints);
    assert.equal(ledger[0].sourceActivityType, 'booking_payment');
  });

  it('7. Prevents duplicate point awards if same payment is verified again (idempotency check)', async () => {
    const bkRes = await dbService.createBooking({
      id: `bk-test-${Date.now()}-4`,
      resourceId: 'ps5-station-1',
      date: '2026-11-23',
      startTime: '19:00',
      endTime: '20:00',
      durationMinutes: 60,
      customerName: 'Arjun Verma',
      phone: testPhone,
      totalAmount: 200,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      category: 'ps5',
      numberOfPeople: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(bkRes.success, true);
    const booking = bkRes.booking!;

    const playerBefore = await dbService.getPlayerById(createdPlayer.id);
    const balanceBefore = playerBefore?.loyalty?.pointsBalance || 0;

    // First verification
    const res1 = await dbService.processBookingPayment({
      bookingId: booking.id,
      amount: 200,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      idempotencyKey: `idemp_test_${booking.id}`,
    });

    assert.equal(res1.success, true);
    assert.equal(res1.pointsAwarded, 20);

    const playerAfterFirst = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterFirst?.loyalty.pointsBalance, balanceBefore + 20);

    // Duplicate call with same idempotencyKey or re-verification of already paid booking
    const res2 = await dbService.processBookingPayment({
      bookingId: booking.id,
      amount: 200,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      idempotencyKey: `idemp_test_${booking.id}`,
    });

    assert.equal(res2.success, true);
    assert.equal(res2.pointsAwarded, 0); // MUST be 0 - NO duplicate points!

    const playerAfterDuplicate = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterDuplicate?.loyalty.pointsBalance, balanceBefore + 20);
  });

  it('8. If payment is refunded or reversed, reverses points without deleting history', async () => {
    const bkRes = await dbService.createBooking({
      id: `bk-test-${Date.now()}-5`,
      resourceId: 'racing-sim-1',
      date: '2026-11-24',
      startTime: '15:00',
      endTime: '16:00',
      durationMinutes: 60,
      customerName: 'Arjun Verma',
      phone: testPhone,
      totalAmount: 400,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      category: 'racing',
      numberOfPeople: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(bkRes.success, true);
    const booking = bkRes.booking!;

    // 1. Pay ₹400 (+40 points)
    await dbService.verifyGuestPayment('gaming', booking.id, 'paid', 'upi', 'UPI-REFUND-TEST', 'Staff', 400);

    const playerAfterPaid = await dbService.getPlayerById(createdPlayer.id);
    const balanceWithPayment = playerAfterPaid?.loyalty?.pointsBalance || 0;

    // 2. Refund payment
    const refundResult = await dbService.verifyGuestPayment(
      'gaming',
      booking.id,
      'refunded',
      'upi',
      'REFUND-001',
      'Staff'
    );

    assert.equal(refundResult.success, true);
    assert.equal(refundResult.pointsAwarded, -40); // 40 points reversed

    const playerAfterRefund = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterRefund?.loyalty.pointsBalance, balanceWithPayment - 40);

    // 3. Verify history is NOT deleted - reversal entry exists in ledger
    const ledger = await dbService.getPlayerLoyaltyLedger(createdPlayer.id);
    const reversalEntry = ledger.find(
      (l) => l.referenceId === booking.id && l.type === 'reversal' && l.points === -40
    );
    assert.ok(reversalEntry);
    assert.equal(reversalEntry.points, -40);
    assert.equal(reversalEntry.type, 'reversal');
    assert.equal(reversalEntry.paymentAmount, 400);
    assert.equal(reversalEntry.previousBalance, balanceWithPayment);
    assert.equal(reversalEntry.updatedBalance, balanceWithPayment - 40);

    // Original earn entry should still be in the ledger (history preserved)
    const earnEntry = ledger.find(
      (l) => l.referenceId === booking.id && l.type === 'earn' && l.points === 40
    );
    assert.ok(earnEntry);
  });

  it('9. Gaming completion bonus (50 pts) works independently and does not award points twice', async () => {
    const bkRes = await dbService.createBooking({
      id: `bk-test-${Date.now()}-6`,
      resourceId: 'ps5-station-2',
      date: '2026-11-25',
      startTime: '11:00',
      endTime: '12:00',
      durationMinutes: 60,
      customerName: 'Arjun Verma',
      phone: testPhone,
      totalAmount: 200,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      category: 'ps5',
      numberOfPeople: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(bkRes.success, true);
    const booking = bkRes.booking!;

    const playerBefore = await dbService.getPlayerById(createdPlayer.id);
    const balanceBefore = playerBefore?.loyalty?.pointsBalance || 0;

    // Step A: Payment verified (awards +20 pts for ₹200 spend)
    await dbService.verifyGuestPayment('gaming', booking.id, 'paid', 'cash', undefined, 'Staff', 200);

    const playerAfterPay = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterPay?.loyalty.pointsBalance, balanceBefore + 20);

    // Step B: Mark booking completed (awards +50 pts gaming session bonus as configured)
    await dbService.updateBooking(booking.id, { status: 'completed' });

    const playerAfterComplete = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterComplete?.loyalty.pointsBalance, balanceBefore + 20 + 50);

    // Step C: Subsequent redundant complete call does NOT duplicate the completion bonus
    const updatedBooking = await dbService.getBookingById(booking.id);
    if (updatedBooking) {
      await dbService.processGamingSessionCompleted(updatedBooking);
    }

    const playerAfterRedundant = await dbService.getPlayerById(createdPlayer.id);
    assert.equal(playerAfterRedundant?.loyalty.pointsBalance, balanceBefore + 20 + 50);
  });

  it('10. CRM detailed profile exposes payment amount, points, previous & updated balance', async () => {
    const profile = await dbService.getPlayerDetailedProfile(createdPlayer.id);
    assert.ok(profile);
    assert.ok(profile.loyaltyLedger.length > 0);

    // Look for our payment transactions in the profile's loyaltyLedger
    const paymentTx = profile.loyaltyLedger.find((tx) => tx.sourceActivityType === 'booking_payment');
    assert.ok(paymentTx);
    assert.ok(paymentTx.paymentAmount !== undefined);
    assert.ok(paymentTx.previousBalance !== undefined);
    assert.ok(paymentTx.updatedBalance !== undefined);

    // Activity timeline should also contain enriched loyalty events
    const timelineLoyalty = profile.activityTimeline.find((item) => item.type === 'loyalty');
    assert.ok(timelineLoyalty);
    assert.ok(timelineLoyalty.title.includes('Loyalty Points'));
  });
});
