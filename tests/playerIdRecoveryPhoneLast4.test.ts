import { describe, it } from 'node:test';
import express from 'express';
import http from 'http';
import playersRouter from '../server/routes/players';
import { dbService, formatMaskedPhoneHint } from '../server/db';

async function runTests() {
  console.log('🧪 Starting GioCasa Player ID Recovery (Phone Last 4 Digits) Test Suite...\n');
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

  // ----------------------------------------------------
  // TEST SUITE 1: Phone Masking Format Unit Tests
  // ----------------------------------------------------
  console.log('📌 Test Suite 1: Phone Masking Format Verification');

  // Exact prompt example: 9876543210 -> "98** **43"
  const maskExample = formatMaskedPhoneHint('9876543210');
  assert(maskExample === '98** **43', '9876543210 formatted exactly as "98** **43"', maskExample);
  assert(!maskExample.includes('3210'), 'Masked hint does NOT contain last 4 digits (3210)', maskExample);

  // International format with +91
  const maskWithPlus91 = formatMaskedPhoneHint('+91 98765 43210');
  assert(maskWithPlus91 === '98** **43', '+91 98765 43210 formatted as "98** **43"', maskWithPlus91);

  // 10-digit number 9123456789 -> 91** **56
  const mask2 = formatMaskedPhoneHint('9123456789');
  assert(mask2 === '91** **56', '9123456789 formatted as "91** **56"', mask2);
  assert(!mask2.includes('6789'), 'Masked hint does NOT contain last 4 digits (6789)', mask2);

  // 10-digit number with leading zero 09988776655 -> 99** **76
  const mask3 = formatMaskedPhoneHint('09988776655');
  assert(mask3 === '99** **76', '09988776655 formatted as "99** **76"', mask3);
  assert(!mask3.includes('6655'), 'Masked hint does NOT contain last 4 digits (6655)', mask3);

  // 10-digit number 8012345678 -> 80** **45
  const mask4 = formatMaskedPhoneHint('8012345678');
  assert(mask4 === '80** **45', '8012345678 formatted as "80** **45"', mask4);
  assert(!mask4.includes('5678'), 'Masked hint does NOT contain last 4 digits (5678)', mask4);

  // Set up ephemeral Express test server for API endpoint verification
  const app = express();
  app.use(express.json());
  app.use('/api/players', playersRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/players`;

  try {
    // ----------------------------------------------------
    // SETUP: Create multiple players with different phone numbers
    // ----------------------------------------------------
    console.log('\n📌 Setup: Creating test players in database');
    const p1Phone = '9876543210';
    const p1 = await dbService.createPlayer({
      name: 'Aditya Sharma',
      gamerTag: 'ApexStriker',
      phone: p1Phone,
      email: 'aditya.sharma@example.com',
      source: 'player_registration',
    });

    const p2Phone = '9123456789';
    const p2 = await dbService.createPlayer({
      name: 'Pooja Iyer',
      gamerTag: 'CyberValkyrie',
      phone: p2Phone,
      email: 'pooja.iyer@example.com',
      source: 'player_registration',
    });

    // ----------------------------------------------------
    // TEST SUITE 2: Public Lookup (lookupPlayerPublic)
    // ----------------------------------------------------
    console.log('\n📌 Test Suite 2: Public Lookup Masking (lookupPlayerPublic)');
    const publicLookup = await dbService.lookupPlayerPublic(p1.gioId);
    assert(publicLookup.found === true, 'Public lookup found player profile');
    assert(publicLookup.player?.phoneMasked === '98** **43', 'Public lookup phoneMasked matches "98** **43"', publicLookup.player?.phoneMasked);
    assert(!publicLookup.player?.phoneMasked?.includes('3210'), 'Public lookup phoneMasked does NOT contain last 4 digits');
    assert(!publicLookup.challenge?.prompt?.includes('3210'), 'Public lookup challenge prompt does NOT reveal last 4 digits', publicLookup.challenge?.prompt);
    assert(publicLookup.challenge?.prompt?.includes('98** **43') === true, 'Public lookup challenge prompt contains masked hint (98** **43)');

    // ----------------------------------------------------
    // TEST SUITE 3: Step 1 Recovery Initiation via API (POST /api/players/recover-id)
    // ----------------------------------------------------
    console.log('\n📌 Test Suite 3: Step 1 Recovery Initiation (API)');
    const step1Res = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: p1Phone }),
    });

    assert(step1Res.status === 200, 'Step 1 recovery returns HTTP 200', `Got ${step1Res.status}`);
    const step1Json = await step1Res.json();
    assert(step1Json.success === true, 'Step 1 response success: true');
    assert(step1Json.data.requiresVerification === true, 'Step 1 requires verification');
    assert(step1Json.data.gioId === undefined, 'Player ID is strictly NOT leaked prior to verification');
    assert(step1Json.data.maskedContact === '98** **43', 'Masked contact is "98** **43"', step1Json.data.maskedContact);
    assert(!step1Json.data.maskedContact?.includes('3210'), 'Masked contact does NOT leak last 4 digits (3210)');
    assert(!step1Json.data.challengePrompt?.includes('3210'), 'Challenge prompt does NOT leak last 4 digits');
    assert(step1Json.data.challengePrompt?.includes('98** **43') === true, 'Challenge prompt displays masked hint');
    assert(!!step1Json.data.sessionToken, 'Valid session token returned for challenge');

    const sessionTokenP1 = step1Json.data.sessionToken;

    // ----------------------------------------------------
    // TEST SUITE 4: Step 2 Challenge with Incorrect Last 4 Digits
    // ----------------------------------------------------
    console.log('\n📌 Test Suite 4: Step 2 Challenge with Incorrect Last 4 Digits');
    const wrongDigitsRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: sessionTokenP1,
        phoneLast4: '9999', // Incorrect digits
      }),
    });

    assert(wrongDigitsRes.status === 200, 'Wrong digits returns HTTP 200', `Got ${wrongDigitsRes.status}`);
    const wrongDigitsJson = await wrongDigitsRes.json();
    assert(wrongDigitsJson.success === false, 'Wrong digits rejected with success: false');
    assert(wrongDigitsJson.data === undefined || wrongDigitsJson.data?.gioId === undefined, 'Player ID is strictly NOT revealed on wrong digits');
    assert(wrongDigitsJson.error?.includes('last 4 digits') === true, 'Returns user-friendly error message about last 4 digits mismatch', wrongDigitsJson.error);

    // ----------------------------------------------------
    // TEST SUITE 5: Step 2 Challenge with Valid Last 4 Digits
    // ----------------------------------------------------
    console.log('\n📌 Test Suite 5: Step 2 Challenge with Valid Last 4 Digits');
    const validDigitsRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: sessionTokenP1,
        phoneLast4: '3210', // Correct digits for 9876543210
      }),
    });

    assert(validDigitsRes.status === 200, 'Valid digits returns HTTP 200');
    const validDigitsJson = await validDigitsRes.json();
    assert(validDigitsJson.success === true, 'Valid digits verified with success: true');
    assert(validDigitsJson.data.verified === true, 'Marked as verified: true');
    assert(validDigitsJson.data.gioId === p1.gioId, `Correct Player ID revealed: ${p1.gioId}`, validDigitsJson.data.gioId);
    assert(validDigitsJson.data.name === 'Aditya Sharma', 'Customer name revealed accurately');
    assert(validDigitsJson.data.gamerTag === 'ApexStriker', 'Gamer tag revealed accurately');
    assert(!!validDigitsJson.data.token, 'Session verification token returned for instant autofill');

    // ----------------------------------------------------
    // TEST SUITE 6: Multi-Phone Recovery Verification for Player 2 (9123456789)
    // ----------------------------------------------------
    console.log('\n📌 Test Suite 6: Multi-Phone Recovery for Player 2 (9123456789)');
    const p2InitRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: p2Phone }),
    });

    const p2InitJson = await p2InitRes.json();
    assert(p2InitJson.data.maskedContact === '91** **56', 'Player 2 masked contact is "91** **56"', p2InitJson.data.maskedContact);
    assert(!p2InitJson.data.maskedContact?.includes('6789'), 'Player 2 last 4 digits (6789) NOT leaked');

    // Incorrect digits for P2
    const p2WrongRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: p2InitJson.data.sessionToken,
        phoneLast4: '0000',
      }),
    });
    const p2WrongJson = await p2WrongRes.json();
    assert(p2WrongJson.success === false, 'Player 2 incorrect digits rejected');
    assert(p2WrongJson.data?.gioId === undefined, 'Player 2 ID NOT leaked on incorrect digits');

    // Correct digits for P2 (6789)
    const p2ValidRes = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: p2InitJson.data.sessionToken,
        phoneLast4: '6789',
      }),
    });
    const p2ValidJson = await p2ValidRes.json();
    assert(p2ValidJson.success === true && p2ValidJson.data.verified === true, 'Player 2 verified successfully');
    assert(p2ValidJson.data.gioId === p2.gioId, `Player 2 correct ID revealed: ${p2.gioId}`);

    // ----------------------------------------------------
    // TEST SUITE 7: Single-Step Direct Recovery with phoneLast4
    // ----------------------------------------------------
    console.log('\n📌 Test Suite 7: Single-Step Recovery with phoneLast4');
    const directWrong = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: p1Phone,
        phoneLast4: '0000',
      }),
    });
    const directWrongJson = await directWrong.json();
    assert(directWrongJson.success === false && !directWrongJson.data?.gioId, 'Direct recovery with wrong last 4 digits fails safely');

    const directValid = await fetch(`${baseUrl}/recover-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: p1Phone,
        phoneLast4: '3210',
      }),
    });
    const directValidJson = await directValid.json();
    assert(directValidJson.success === true && directValidJson.data.verified === true, 'Direct recovery with correct last 4 digits succeeds');
    assert(directValidJson.data.gioId === p1.gioId, 'Direct recovery returns correct Player ID');

  } finally {
    server.close();
  }

  console.log(`\n========================================`);
  console.log(`Player ID Recovery Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
