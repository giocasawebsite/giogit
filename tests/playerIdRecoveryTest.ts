import express from 'express';
import playersRouter from '../server/routes/players';
import { dbService } from '../server/db';
import http from 'http';

async function runRecoveryTests() {
  console.log('🧪 Starting GioCasa Player ID Recovery Test Suite...\n');
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

  // Set up ephemeral Express test server
  const app = express();
  app.use(express.json());
  app.use('/api/players', playersRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/players`;

  try {
    // ----------------------------------------------------
    // SETUP: Ensure a test player exists
    // ----------------------------------------------------
    const testPhone = '9876501234';
    const testEmail = 'recovery.tester@example.com';
    const testName = 'Kabir Mehta';
    const testGamerTag = 'ShadowNinja';

    let testPlayer = await dbService.getPlayerByPhone(testPhone);
    if (!testPlayer) {
      testPlayer = await dbService.createPlayer({
        name: testName,
        gamerTag: testGamerTag,
        phone: testPhone,
        email: testEmail,
        source: 'player_registration',
        favoriteGame: 'Tekken 8',
        favoritePlatform: 'ps5',
      });
    }

    // ----------------------------------------------------
    // TEST 1: GET /api/players/recover-id returns 200 OK (no 404)
    // ----------------------------------------------------
    console.log('📌 Test 1: GET /api/players/recover-id returns 200 OK');
    const getRes = await fetch(`${baseUrl}/recover-id`);
    assert(getRes.status === 200, 'GET /recover-id returns HTTP 200', `Got ${getRes.status}`);
    const getJson = await getRes.json();
    assert(getJson.success === true, 'GET /recover-id returns success: true');
    assert(getJson.supportedMethods?.includes('POST'), 'Reports POST method supported');

    // ----------------------------------------------------
    // TEST 2: POST /api/players/recover-id with empty payload returns 400 (not 404)
    // ----------------------------------------------------
    console.log('\n📌 Test 2: Empty request returns 400 Bad Request');
    const emptyRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(emptyRes.status === 400, 'Empty POST returns HTTP 400', `Got ${emptyRes.status}`);
    const emptyJson = await emptyRes.json();
    assert(emptyJson.success === false, 'Empty POST returns success: false');

    // ----------------------------------------------------
    // TEST 3: Step 1 Recovery by Phone - Returns Verification Challenge
    // ----------------------------------------------------
    console.log('\n📌 Test 3: Step 1 Recovery by Phone');
    const phoneRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    assert(phoneRes.status === 200, 'Phone recovery returns HTTP 200', `Got ${phoneRes.status}`);
    const phoneJson = await phoneRes.json();
    assert(phoneJson.success === true, 'Phone recovery returns success: true');
    assert(phoneJson.data.requiresVerification === true, 'Requires identity challenge verification');
    assert(!!phoneJson.data.sessionToken, 'Signed HMAC session token returned');
    assert(phoneJson.data.maskedContact?.includes('••••'), 'Contact is securely masked', phoneJson.data.maskedContact);
    assert(phoneJson.data.gioId === undefined, 'GioCasa Player ID is NOT leaked prior to verification');

    const validSessionToken = phoneJson.data.sessionToken;

    // ----------------------------------------------------
    // TEST 4: Step 1 Recovery by Email - Dual Identifier Support
    // ----------------------------------------------------
    console.log('\n📌 Test 4: Step 1 Recovery by Email');
    const emailRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert(emailRes.status === 200, 'Email recovery returns HTTP 200', `Got ${emailRes.status}`);
    const emailJson = await emailRes.json();
    assert(emailJson.success === true, 'Email recovery returns success: true');
    assert(emailJson.data.requiresVerification === true, 'Requires identity verification');
    assert(emailJson.data.maskedContact?.includes('@'), 'Masked email format returned', emailJson.data.maskedContact);

    // ----------------------------------------------------
    // TEST 5: Anti-Enumeration Protection for Non-Existent Users
    // ----------------------------------------------------
    console.log('\n📌 Test 5: Anti-Enumeration for Non-Existent Contact');
    const nonExistentPhone = '9999988888';
    const fakeRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: nonExistentPhone }),
    });
    assert(fakeRes.status === 200, 'Non-existent user returns HTTP 200 (not 404)', `Got ${fakeRes.status}`);
    const fakeJson = await fakeRes.json();
    assert(fakeJson.success === true, 'Non-existent user returns uniform success: true');
    assert(fakeJson.data.requiresVerification === true, 'Non-existent user returns identical challenge structure');
    assert(!!fakeJson.data.sessionToken, 'Dummy session token returned without disclosing non-existence');

    const dummySessionToken = fakeJson.data.sessionToken;

    // ----------------------------------------------------
    // TEST 6: Step 2 Challenge Verification with Wrong Name on Dummy Token
    // ----------------------------------------------------
    console.log('\n📌 Test 6: Challenge with Dummy Token fails safely');
    const dummyVerifyRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: dummySessionToken,
        verificationName: 'Random Person',
      }),
    });
    assert(dummyVerifyRes.status === 200, 'Dummy verification returns HTTP 200', `Got ${dummyVerifyRes.status}`);
    const dummyVerifyJson = await dummyVerifyRes.json();
    assert(dummyVerifyJson.success === false, 'Dummy verification returns success: false');
    assert(dummyVerifyJson.data === undefined, 'No player data returned for dummy token');

    // ----------------------------------------------------
    // TEST 7: Step 2 Challenge Verification with Incorrect Name on Valid Token
    // ----------------------------------------------------
    console.log('\n📌 Test 7: Challenge with Incorrect Name on Valid Token');
    const wrongNameRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: validSessionToken,
        verificationName: 'Wrong Name',
      }),
    });
    assert(wrongNameRes.status === 200, 'Wrong name returns HTTP 200', `Got ${wrongNameRes.status}`);
    const wrongNameJson = await wrongNameRes.json();
    assert(wrongNameJson.success === false || wrongNameJson.data?.verified === false, 'Wrong name verification rejected');

    // ----------------------------------------------------
    // TEST 8: Step 2 Challenge Verification Success with Full Name
    // ----------------------------------------------------
    console.log('\n📌 Test 8: Challenge Success with Full Name');
    const validVerifyRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: validSessionToken,
        verificationName: testName,
      }),
    });
    assert(validVerifyRes.status === 200, 'Valid verification returns HTTP 200');
    const validVerifyJson = await validVerifyRes.json();
    assert(validVerifyJson.success === true, 'Valid verification returns success: true');
    assert(validVerifyJson.data.verified === true, 'Player marked as verified');
    assert(validVerifyJson.data.gioId === testPlayer.gioId, 'Recovered correct GioCasa Player ID', validVerifyJson.data.gioId);
    assert(!!validVerifyJson.data.token, 'Generated verification token for instant autofill');
    assert(!!validVerifyJson.data.player, 'Returned player profile for seamless form population');

    // ----------------------------------------------------
    // TEST 9: Step 2 Challenge Verification Success with GamerTag
    // ----------------------------------------------------
    console.log('\n📌 Test 9: Challenge Success with GamerTag');
    // Request a new session token
    const step1Res = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testPhone }),
    });
    const step1Json = await step1Res.json();
    const tagVerifyRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: step1Json.data.sessionToken,
        verificationName: `@${testGamerTag}`,
      }),
    });
    const tagVerifyJson = await tagVerifyRes.json();
    assert(tagVerifyJson.success === true && tagVerifyJson.data.verified === true, 'Verification succeeds with GamerTag');
    assert(tagVerifyJson.data.gioId === testPlayer.gioId, 'GamerTag verification recovered correct ID');

    // ----------------------------------------------------
    // TEST 10: Single-step recovery (Identifier + VerificationName in 1 call)
    // ----------------------------------------------------
    console.log('\n📌 Test 10: Single-Step Recovery (Direct Verification)');
    const directRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        verificationName: testName,
      }),
    });
    const directJson = await directRes.json();
    assert(directJson.success === true && directJson.data.verified === true, 'Single-step recovery verified successfully');
    assert(directJson.data.gioId === testPlayer.gioId, 'Single-step recovery returned correct Player ID');

    // ----------------------------------------------------
    // TEST 11: Rate Limiting
    // ----------------------------------------------------
    console.log('\n📌 Test 11: IP Rate Limiting Verification');
    let hitRateLimit = false;
    for (let i = 0; i < 20; i++) {
      const rlRes = await fetch(`${baseUrl}/recover-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.100.50',
        },
        body: JSON.stringify({ phone: testPhone }),
      });
      if (rlRes.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit === true, 'Excessive requests trigger HTTP 429 Too Many Requests');

  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRecoveryTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
