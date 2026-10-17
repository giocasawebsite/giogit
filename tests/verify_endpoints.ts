async function main() {
  const BASE = 'http://localhost:5173/api';
  console.log('Testing Vite Proxy endpoints on ' + BASE + '...\n');

  let allPassed = true;

  // 1. GET /api/booking/resources
  try {
    const res = await fetch(BASE + '/booking/resources');
    const json = await res.json();
    const resources = Array.isArray(json) ? json : json.data;
    if (res.status === 200 && Array.isArray(resources) && resources.length > 0) {
      console.log('✅ 1. GET /api/booking/resources -> 200 OK, count:', resources.length);
      console.log('   Resource types:', resources.map((r: any) => r.name || r.id).join(', '));
    } else {
      console.error('❌ 1. GET /api/booking/resources -> Unexpected response:', res.status, json);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ 1. GET /api/booking/resources -> Error:', err.message);
    allPassed = false;
  }

  // 2. GET /api/admin/overview
  try {
    const res = await fetch(BASE + '/admin/overview', {
      headers: { 'x-admin-passcode': 'GIOCASA2026' }
    });
    const json = await res.json();
    if (res.status === 200 && json.success && json.data) {
      console.log('✅ 2. GET /api/admin/overview -> 200 OK');
      console.log('   Overview data:', JSON.stringify(json.data.metrics));
    } else {
      console.error('❌ 2. GET /api/admin/overview -> Unexpected response:', res.status, json);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ 2. GET /api/admin/overview -> Error:', err.message);
    allPassed = false;
  }

  // 3. GET /api/admin/bookings
  try {
    const res = await fetch(BASE + '/admin/bookings', {
      headers: { 'x-admin-passcode': 'GIOCASA2026' }
    });
    const json = await res.json();
    const bookings = Array.isArray(json) ? json : (json.data || json.bookings);
    if (res.status === 200 && Array.isArray(bookings)) {
      console.log('✅ 3. GET /api/admin/bookings -> 200 OK, bookings count:', bookings.length);
    } else {
      console.error('❌ 3. GET /api/admin/bookings -> Unexpected response:', res.status, json);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ 3. GET /api/admin/bookings -> Error:', err.message);
    allPassed = false;
  }

  // 4. POST /api/players/register
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const testPhone = `+919876${randomSuffix}`;
  const testGamerTag = `TestPlayer${randomSuffix}`;
  try {
    const regPayload = {
      name: 'Test Player ' + randomSuffix,
      gamerTag: testGamerTag,
      phone: testPhone,
      email: `test_${randomSuffix}@giocasa.in`,
      favoriteGame: 'EA Sports FC 25',
      favoritePlatform: 'ps5',
      consent: { whatsappUpdates: true, emailUpdates: true }
    };
    const res = await fetch(BASE + '/players/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const json = await res.json();
    if (res.status === 201 && json.success && json.data?.player?.gioId) {
      console.log('✅ 4. POST /api/players/register -> 201 Created');
      console.log('   Registered Player GIO ID:', json.data.player.gioId, 'GamerTag:', json.data.player.gamerTag);
      console.log('   Verification Token issued:', json.data.token ? 'Yes' : 'No');
    } else {
      console.error('❌ 4. POST /api/players/register -> Unexpected response:', res.status, json);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ 4. POST /api/players/register -> Error:', err.message);
    allPassed = false;
  }

  console.log('\n----------------------------------------');
  if (allPassed) {
    console.log('🎉 ALL 4 PREVIOUSLY FAILING ENDPOINTS ARE FULLY OPERATIONAL AND RETURNING 200/201 VIA VITE PROXY!');
  } else {
    console.log('⚠️ Some endpoints encountered issues.');
  }
}

main().catch(console.error);
