import assert from 'assert';
import { INITIAL_GAMES, dbService } from '../server/db';
import { parseCurrentRoute, buildRoutePath } from '../src/utils/router';
import { GameItem } from '../src/types';

console.log('🧪 Starting GioCasa Gaming Wall Comprehensive Test Suite...\n');

const REQUIRED_14_GAMES = [
  'GTA 5',
  'GTA 6',
  'WWE',
  'TEKKEN 8',
  'MORTAL KOMBAT',
  'The Last of Us',
  'FIFA 2K26',
  'Call of Duty',
  'Spider-Man',
  'Forza',
  'F1',
  'Asphalt',
  'God of War',
  'Minecraft',
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`, err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test Suite 1: All 14 Flagship Games Presence & Exact Naming
  // -------------------------------------------------------------
  console.log('📌 Test Suite 1: Flagship 14 Games Presence & Exact Naming');

  test('All 14 specified games exist in INITIAL_GAMES', () => {
    const titles = INITIAL_GAMES.map((g) => g.title);
    for (const required of REQUIRED_14_GAMES) {
      assert.ok(
        titles.includes(required),
        `Required game "${required}" is missing from INITIAL_GAMES. Found: ${titles.join(', ')}`
      );
    }
  });

  test('No silent renaming or removal of required games', () => {
    assert.strictEqual(
      REQUIRED_14_GAMES.length,
      14,
      'There must be exactly 14 required flagship games'
    );
    for (const req of REQUIRED_14_GAMES) {
      const match = INITIAL_GAMES.find((g) => g.title === req);
      assert.ok(match, `Exact title match failed for "${req}"`);
      assert.ok(match.description.length > 20, `Game "${req}" has empty or insufficient description`);
      assert.ok(match.image.startsWith('http') || match.image.startsWith('/'), `Game "${req}" lacks valid artwork URL`);
    }
  });

  // -------------------------------------------------------------
  // Test Suite 2: Genre Diversity & Honest Availability Mapping
  // -------------------------------------------------------------
  console.log('\n📌 Test Suite 2: Genre Categorization & Honest Availability');

  test('Genres cover Action, Racing, Fighting, Sports, Adventure, Sandbox', () => {
    const genres = new Set(INITIAL_GAMES.map((g) => g.genre));
    assert.ok(genres.has('Action'), 'Missing Action genre');
    assert.ok(genres.has('Racing'), 'Missing Racing genre');
    assert.ok(genres.has('Fighting'), 'Missing Fighting genre');
    assert.ok(genres.has('Sports'), 'Missing Sports genre');
    assert.ok(genres.has('Adventure'), 'Missing Adventure genre');
    assert.ok(genres.has('Sandbox'), 'Missing Sandbox genre');
  });

  test('GTA 6 has honest coming_soon status and does not fake current playability', () => {
    const gta6 = INITIAL_GAMES.find((g) => g.title === 'GTA 6');
    assert.ok(gta6, 'GTA 6 must exist');
    assert.strictEqual(gta6.availabilityStatus, 'coming_soon', 'GTA 6 must be marked coming_soon');
    assert.strictEqual(gta6.isAvailable, false, 'GTA 6 isAvailable must be false');
    assert.strictEqual(gta6.badge, 'Coming Soon');
  });

  test('Equipment mappings point to valid GioCasa stations with no invented IDs', () => {
    const validStationIds = [
      'ps5-station-1',
      'ps5-station-2',
      'ps5-station-3',
      'racing-station-1',
      'pool-table-1',
      '',
    ];

    for (const g of INITIAL_GAMES) {
      if (g.resourceId) {
        assert.ok(
          validStationIds.includes(g.resourceId),
          `Game "${g.title}" has unknown/fake station ID: "${g.resourceId}"`
        );
      }
    }
  });

  // -------------------------------------------------------------
  // Test Suite 3: Database & Public API Service Methods
  // -------------------------------------------------------------
  console.log('\n📌 Test Suite 3: Database & API Retrieval');

  await (async () => {
    try {
      await dbService.init();
    } catch {
      // Ignored if Atlas TLS fails; disk store handles it
    }

    test('dbService.getGames() returns all 14 flagship games without filtering out coming_soon', async () => {
      const allGames = await dbService.getGames();
      const titles = allGames.map((g) => g.title);
      for (const required of REQUIRED_14_GAMES) {
        assert.ok(
          titles.includes(required),
          `dbService.getGames() did not return required game "${required}"`
        );
      }
      assert.ok(allGames.length >= 14, `Expected at least 14 games, got ${allGames.length}`);
    });

    test('dbService.createGame and updateGame preserve availabilityStatus and playOptions', async () => {
      const testGame = await dbService.createGame({
        title: 'Cyberpunk 2077 Phantom Liberty',
        category: 'ps5',
        genre: 'Action',
        description: 'Night City spy thriller DLC with ray tracing overdrive.',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        availabilityStatus: 'available',
        isFeatured: false,
        resourceId: 'ps5-station-2',
        resourceName: 'PS5 Pro Station 2',
        playOptions: ['Ray Tracing Overdrive', '4K 60FPS', 'DualSense Triggers'],
        badge: 'Night City',
      });

      assert.strictEqual(testGame.title, 'Cyberpunk 2077 Phantom Liberty');
      assert.strictEqual(testGame.availabilityStatus, 'available');
      assert.strictEqual(testGame.playOptions?.length, 3);

      const updated = await dbService.updateGame(testGame.id, {
        badge: 'Staff Pick 2026',
        availabilityStatus: 'coming_soon',
      });

      assert.ok(updated);
      assert.strictEqual(updated.badge, 'Staff Pick 2026');
      assert.strictEqual(updated.availabilityStatus, 'coming_soon');
      assert.strictEqual(updated.isAvailable, false);

      // Cleanup
      await dbService.deleteGame(testGame.id);
    });
  })();

  // -------------------------------------------------------------
  // Test Suite 4: Client Route Building & Navigation
  // -------------------------------------------------------------
  console.log('\n📌 Test Suite 4: Client Router & Deep Links');

  test('buildRoutePath("games") produces "/games"', () => {
    const path = buildRoutePath('games');
    assert.strictEqual(path, '/games');
  });

  test('buildRoutePath("book", { resourceId: "ps5-station-2" }) carries resourceId query', () => {
    const path = buildRoutePath('book', { resourceId: 'ps5-station-2' });
    assert.strictEqual(path, '/book?resourceId=ps5-station-2');
  });

  test('buildRoutePath("admin", { adminTab: "games" }) produces "/admin/games"', () => {
    const path = buildRoutePath('admin', { adminTab: 'games' });
    assert.strictEqual(path, '/admin/games');
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n========================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
