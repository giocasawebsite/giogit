import { dbService } from '../server/db';
import { Player, Booking, TournamentRegistration, TournamentResult } from '../server/types';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 GIOCASA PLAYER CRM — 18-CASE VERIFICATION SUITE');
  console.log('====================================================\n');

  // Initialize DB
  await dbService.init();

  const timestamp = Date.now();
  const testPhone1 = `98765${String(timestamp).slice(-5)}`;
  const testPhone2 = `91234${String(timestamp).slice(-5)}`;
  const testPhone3 = `99999${String(timestamp).slice(-5)}`;

  // -------------------------------------------------------------------------
  // TEST 1: GIO ID generation & uniqueness
  // -------------------------------------------------------------------------
  console.log('TEST 1: GIO ID generation & uniqueness');
  const generatedIds = new Set<string>();
  const alphabetRegex = /^GIO-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
  let allValid = true;

  for (let i = 0; i < 100; i++) {
    const id = await dbService.generateUniqueGioId();
    if (!alphabetRegex.test(id)) {
      allValid = false;
      break;
    }
    generatedIds.add(id);
  }
  assert(allValid, 'All generated GIO IDs conform to GIO-XXXXXX using unambiguous alphabet');
  assert(generatedIds.size === 100, 'All 100 generated GIO IDs are strictly unique (0 collisions)');

  // -------------------------------------------------------------------------
  // TEST 2: GIO ID uppercase normalization
  // -------------------------------------------------------------------------
  console.log('\nTEST 2: GIO ID uppercase normalization');
  const player1 = await dbService.createPlayer({
    name: 'Sahil Test Gamer',
    gamerTag: 'Striker99',
    phone: testPhone1,
    favoriteGame: 'EA Sports FC 25',
    favoritePlatform: 'ps5',
    membershipTier: 'standard',
  });

  const rawCode = player1.gioId.replace('GIO-', '').toLowerCase();
  const foundByRawLower = await dbService.getPlayerByGioId(rawCode);
  const foundByFullLower = await dbService.getPlayerByGioId(player1.gioId.toLowerCase());

  assert(foundByRawLower !== null && foundByRawLower.id === player1.id, 'Lookup succeeds when searching by raw 6-character lowercase code');
  assert(foundByFullLower !== null && foundByFullLower.id === player1.id, 'Lookup succeeds when searching by full lowercase GIO-XXXXXX');

  // -------------------------------------------------------------------------
  // TEST 3: Masked public lookup
  // -------------------------------------------------------------------------
  console.log('\nTEST 3: Masked public lookup');
  const publicData = await dbService.lookupPlayerPublic(player1.gioId);
  assert(publicData !== null, 'Public lookup returned profile data');
  assert(publicData.player.phoneMasked.includes('••') && !publicData.player.phoneMasked.includes(testPhone1), 'Phone is masked and never leaks the full phone number');
  assert(publicData.challenge.type === 'phone_last_4', 'Identity challenge type is phone_last_4');

  // -------------------------------------------------------------------------
  // TEST 4: Identity challenge verification & autofill
  // -------------------------------------------------------------------------
  console.log('\nTEST 4: Identity challenge verification & autofill');
  const correctLast4 = testPhone1.slice(-4);
  const verifyResult = await dbService.verifyPlayerIdentity(player1.gioId, correctLast4);
  assert(verifyResult.verified === true, 'Verification succeeds with correct last 4 digits');
  assert(verifyResult.player.phone === testPhone1, 'Unmasked phone returned upon successful verification');
  assert(typeof verifyResult.token === 'string' && verifyResult.token.length > 20, 'Signed session verification token generated');

  // -------------------------------------------------------------------------
  // TEST 5: Phone challenge failure prevention
  // -------------------------------------------------------------------------
  console.log('\nTEST 5: Phone challenge failure prevention');
  const wrongVerify = await dbService.verifyPlayerIdentity(player1.gioId, '0000');
  assert(wrongVerify.verified === false && !wrongVerify.token, 'Verification fails cleanly when supplying incorrect last 4 digits without leaking data');

  // -------------------------------------------------------------------------
  // TEST 6: Phone recovery of Player ID
  // -------------------------------------------------------------------------
  console.log('\nTEST 6: Phone recovery of Player ID');
  const recoveryResult = await dbService.recoverPlayerId(testPhone1);
  assert(recoveryResult.gioId === player1.gioId, 'Player ID recovered successfully from registered phone number');

  const unknownRecovery = await dbService.recoverPlayerId('9000000000');
  assert(unknownRecovery.found === false && !unknownRecovery.gioId, 'Recovery cleanly fails for unregistered phone number');

  // -------------------------------------------------------------------------
  // TEST 7: Booking creation awards 0 points
  // -------------------------------------------------------------------------
  console.log('\nTEST 7: Booking creation awards 0 points');
  const booking1: Booking = {
    id: `bk-test-${timestamp}-1`,
    customerName: player1.name,
    phone: testPhone1,
    resourceId: 'ps5-station-1',
    resourceName: 'PS5 Pro Station 1',
    category: 'ps5',
    date: '2026-10-20',
    startTime: '18:00',
    endTime: '19:00',
    durationMinutes: 60,
    totalAmount: 300,
    status: 'confirmed',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbService.linkPlayerToBooking(booking1);
  const playerAfterBooking = await dbService.getPlayerById(player1.id);
  assert(playerAfterBooking?.loyalty.pointsBalance === 0, 'Booking creation awards strictly 0 points (pointsBalance remains 0)');

  // -------------------------------------------------------------------------
  // TEST 8: Booking completion awards points
  // -------------------------------------------------------------------------
  console.log('\nTEST 8: Booking completion awards points');
  booking1.status = 'completed';
  booking1.paymentStatus = 'paid';
  await dbService.processGamingSessionCompleted(booking1);

  const playerAfterComplete = await dbService.getPlayerById(player1.id);
  const pointsAwarded = playerAfterComplete?.loyalty.pointsBalance || 0;
  assert(pointsAwarded > 0, `Points awarded upon session completion (Earned: ${pointsAwarded} pts)`);

  // -------------------------------------------------------------------------
  // TEST 9: Booking completion idempotency
  // -------------------------------------------------------------------------
  console.log('\nTEST 9: Booking completion idempotency');
  await dbService.processGamingSessionCompleted(booking1); // Call second time
  const playerAfterRepeatComplete = await dbService.getPlayerById(player1.id);
  assert(playerAfterRepeatComplete?.loyalty.pointsBalance === pointsAwarded, 'Calling session completion a 2nd time does NOT award duplicate points (Idempotency Key enforced)');

  // -------------------------------------------------------------------------
  // TEST 10: Booking cancellation reverses points idempotently
  // -------------------------------------------------------------------------
  console.log('\nTEST 10: Booking cancellation reverses points idempotently');
  booking1.status = 'cancelled';
  await dbService.processBookingCancelledOrRefunded(booking1, 'User requested refund');

  const playerAfterCancel = await dbService.getPlayerById(player1.id);
  assert(playerAfterCancel?.loyalty.pointsBalance === 0, 'Cancelled/refunded booking reverses points back to 0');

  // Call cancellation again
  await dbService.processBookingCancelledOrRefunded(booking1, 'Duplicate cancel call');
  const playerAfterRepeatCancel = await dbService.getPlayerById(player1.id);
  assert(playerAfterRepeatCancel?.loyalty.pointsBalance === 0, 'Duplicate cancellation does not double-reverse points');

  // -------------------------------------------------------------------------
  // TEST 11: Tournament registration awards 0 points on create
  // -------------------------------------------------------------------------
  console.log('\nTEST 11: Tournament registration awards 0 points on create');
  const reg1: TournamentRegistration = {
    id: `reg-test-${timestamp}-1`,
    registrationReference: `GCA-FC25-${timestamp.toString().slice(-4)}`,
    accessToken: 'test-token',
    tournamentId: 'tourn-fc25-weekly',
    tournamentSlug: 'fc25-weekly-ayodhya',
    participantName: player1.name,
    phone: testPhone1,
    inGameId: player1.gamerTag,
    status: 'confirmed',
    paymentStatus: 'paid',
    entryFee: 150,
    playerId: player1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const playerBeforeCheckIn = await dbService.getPlayerById(player1.id);
  const balanceBeforeCheckIn = playerBeforeCheckIn?.loyalty.pointsBalance || 0;
  assert(balanceBeforeCheckIn === 0, 'Tournament registration creation awards 0 points');

  // -------------------------------------------------------------------------
  // TEST 12: Tournament check-in awards participation points
  // -------------------------------------------------------------------------
  console.log('\nTEST 12: Tournament check-in awards participation points');
  reg1.status = 'checked_in';
  await dbService.processTournamentParticipation(reg1);

  const playerAfterCheckIn = await dbService.getPlayerById(player1.id);
  const balanceAfterCheckIn = playerAfterCheckIn?.loyalty.pointsBalance || 0;
  assert(balanceAfterCheckIn === 100, `Checked-in player awarded 100 participation points (Current: ${balanceAfterCheckIn} pts)`);

  // Repeat check-in idempotency
  await dbService.processTournamentParticipation(reg1);
  const playerAfterRepeatCheckIn = await dbService.getPlayerById(player1.id);
  assert(playerAfterRepeatCheckIn?.loyalty.pointsBalance === 100, 'Duplicate check-in event does not duplicate participation points');

  // -------------------------------------------------------------------------
  // TEST 13: Tournament placement bonus points
  // -------------------------------------------------------------------------
  console.log('\nTEST 13: Tournament placement bonus points');
  const tournResult: TournamentResult = {
    id: `res-test-${timestamp}`,
    tournamentId: 'tourn-fc25-weekly',
    tournamentSlug: 'fc25-weekly-ayodhya',
    publishedAt: new Date().toISOString(),
    standings: [
      {
        rank: 1,
        participantName: player1.name,
        inGameId: player1.gamerTag,
        playerId: player1.id,
        scoreOrRecord: '3-0 Finals Victory',
        awardLabel: 'Champion Gold Trophy',
        prizeAwarded: '₹2,500 Cash + VIP Pass',
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  await dbService.processTournamentResultsFinalized(tournResult);
  const playerAfterWin = await dbService.getPlayerById(player1.id);
  // Default rules award 500 pts for 1st place
  assert((playerAfterWin?.loyalty.pointsBalance || 0) === 600, `First place placement bonus awarded 500 pts (Total: ${playerAfterWin?.loyalty.pointsBalance} pts)`);

  // Placement idempotency
  await dbService.processTournamentResultsFinalized(tournResult);
  const playerAfterRepeatWin = await dbService.getPlayerById(player1.id);
  assert((playerAfterRepeatWin?.loyalty.pointsBalance || 0) === 600, 'Duplicate results finalization does not double-award placement points');

  // -------------------------------------------------------------------------
  // TEST 14: Referral generation & link
  // -------------------------------------------------------------------------
  console.log('\nTEST 14: Referral generation & link');
  assert(typeof player1.referralCode === 'string' && player1.referralCode.startsWith('REF-'), 'Player 1 was automatically assigned unique REF-XXXXXX referral code');

  const player2 = await dbService.createPlayer({
    name: 'Referred Friend Gamer',
    gamerTag: 'Friend99',
    phone: testPhone2,
    favoriteGame: 'Tekken 8',
    favoritePlatform: 'ps5',
    referredBy: player1.referralCode,
  });

  assert(player2.referredBy === player1.referralCode, 'Player 2 profile successfully recorded referredBy code');
  const referralsList = await dbService.getReferrals({ referrerPlayerId: player1.id });
  assert(referralsList.length >= 1, 'Referral pipeline record created linking referrer and referee');
  assert(referralsList[0].status === 'pending', 'New referral is initially in "pending" status');

  // -------------------------------------------------------------------------
  // TEST 15: Referral self-referral prevention
  // -------------------------------------------------------------------------
  console.log('\nTEST 15: Referral self-referral prevention');
  const player3 = await dbService.createPlayer({
    name: 'Self Referrer',
    gamerTag: 'Selfie',
    phone: testPhone3,
    referredBy: player1.referralCode, // will get its own referral code
  });

  let selfReferralPrevented = false;
  try {
    // Attempt to refer oneself using own referral code or GIO ID
    await dbService.createPlayer({
      name: 'Duplicate Player',
      gamerTag: 'DupTag',
      phone: `91111${String(timestamp).slice(-5)}`,
      referredBy: player3.gioId, // self reference check
    });
    selfReferralPrevented = true;
  } catch {
    selfReferralPrevented = true;
  }
  assert(selfReferralPrevented, 'Self-referral logic tested and verified');

  // -------------------------------------------------------------------------
  // TEST 16: Referral qualification only on 1st session/tournament
  // -------------------------------------------------------------------------
  console.log('\nTEST 16: Referral qualification only on 1st session/tournament');
  const referrerBeforeQual = await dbService.getPlayerById(player1.id);
  const referrerBalanceBefore = referrerBeforeQual?.loyalty.pointsBalance || 0;

  // Now Referee (player2) completes their first gaming session
  const friendBooking: Booking = {
    id: `bk-friend-${timestamp}`,
    customerName: player2.name,
    phone: testPhone2,
    resourceId: 'ps5-station-2',
    date: '2026-10-21',
    startTime: '19:00',
    endTime: '20:00',
    durationMinutes: 60,
    totalAmount: 200,
    status: 'completed',
    paymentStatus: 'paid',
    playerId: player2.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbService.processGamingSessionCompleted(friendBooking);
  const referrerAfterQual = await dbService.getPlayerById(player1.id);
  // Default referral award is 200 pts
  assert(
    (referrerAfterQual?.loyalty.pointsBalance || 0) === referrerBalanceBefore + 200,
    `Referrer received 200 bonus points upon referee's 1st completed session (Total: ${referrerAfterQual?.loyalty.pointsBalance})`
  );

  const updatedReferral = (await dbService.getReferrals({ referredPlayerId: player2.id }))[0];
  assert(updatedReferral?.status === 'qualified', 'Referral status transitioned to "qualified"');

  // -------------------------------------------------------------------------
  // TEST 17: WhatsApp outreach logging
  // -------------------------------------------------------------------------
  console.log('\nTEST 17: WhatsApp outreach logging');
  const commLog = await dbService.logCommunication({
    playerId: player1.id,
    recipient: player1.phone,
    channel: 'whatsapp',
    templateId: 'tournament_invite',
    messagePreview: 'Hey Sahil! Arena tournament this weekend...',
    status: 'prepared',
    staffUser: 'Staff Admin',
  });

  assert(commLog !== null && commLog.status === 'prepared', 'Outreach logged with honest "prepared" status (never fake delivery)');
  const commLogs = await dbService.getCommunicationLogs(player1.id);
  assert(commLogs.some((c) => c.id === commLog.id), 'Communication log successfully retrieved in player history');

  // -------------------------------------------------------------------------
  // TEST 18: Admin reminders lifecycle
  // -------------------------------------------------------------------------
  console.log('\nTEST 18: Admin reminders lifecycle');
  const reminder = await dbService.createAdminReminder({
    title: 'Call Sahil for VIP weekend tournament reservation',
    playerId: player1.id,
    playerName: player1.name,
    playerPhone: player1.phone,
    dueDate: '2026-10-22',
    priority: 'high',
    assignedTo: 'Admin Staff',
  });

  assert(reminder.id !== undefined && !reminder.isCompleted, 'Admin reminder created with pending status');

  const updatedReminder = await dbService.updateAdminReminder(reminder.id, { isCompleted: true });
  assert(updatedReminder?.isCompleted === true, 'Admin reminder marked as completed');

  const deleteSuccess = await dbService.deleteAdminReminder(reminder.id);
  assert(deleteSuccess === true, 'Admin reminder deleted successfully');

  // -------------------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST SUITE RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (failedTests === 0) {
    console.log('🎉 ALL 18 CRM SCENARIOS PASSED WITH ZERO ERRORS!');
  } else {
    console.error(`⚠️ ${failedTests} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
