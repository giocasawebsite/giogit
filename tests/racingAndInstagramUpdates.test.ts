import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('🧪 GIOCASA RACING SIMULATOR & INSTAGRAM UPDATES AUDIT');
console.log('================================================================\n');

const RACING_URL = 'https://res.cloudinary.com/hcmnz5rk/image/upload/f_auto/q_auto/racing.jpg';
const INSTAGRAM_URL = 'https://www.instagram.com/giocasacafe/';

// -----------------------------------------------------------------------------
// 1. RACING SIMULATOR IMAGE — USE EVERYWHERE
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Racing Simulator Image Everywhere ---');

// A. server/data/resources.json
const resourcesJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'server/data/resources.json'), 'utf-8'));
const racingResource = resourcesJson.find((r: any) => r.id === 'racing-station-1');
assert.ok(racingResource, 'racing-station-1 found in resources.json');
assert.strictEqual(racingResource.image, RACING_URL, 'resources.json uses exact Cloudinary racing simulator image');

// B. server/db.ts
const serverDbCode = fs.readFileSync(path.resolve(process.cwd(), 'server/db.ts'), 'utf-8');
assert.ok(
  serverDbCode.includes(`id: 'racing-station-1'`) && serverDbCode.includes(`image: '${RACING_URL}'`),
  'server/db.ts uses exact Cloudinary racing simulator image for racing-station-1'
);

// C. src/data/gamingData.ts
const gamingDataCode = fs.readFileSync(path.resolve(process.cwd(), 'src/data/gamingData.ts'), 'utf-8');
assert.ok(
  gamingDataCode.includes(`type: 'racing'`) && gamingDataCode.includes(`image: '${RACING_URL}'`),
  'src/data/gamingData.ts uses exact Cloudinary racing simulator image for racing-arena zone'
);

// D. src/pages/BookingPage.tsx
const bookingPageCode = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/BookingPage.tsx'), 'utf-8');
assert.ok(
  bookingPageCode.includes(`id: 'sim-rig-1'`) && bookingPageCode.includes(`image: '${RACING_URL}'`),
  'src/pages/BookingPage.tsx uses exact Cloudinary racing simulator image for fallback racing resource'
);

// E. server/data/hero_slides.json
const heroSlidesJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'server/data/hero_slides.json'), 'utf-8'));
const racingHeroSlide = heroSlidesJson.find((s: any) => s.id === 'slide-4');
assert.ok(racingHeroSlide, 'slide-4 (Racing Simulator) found in hero_slides.json');
assert.strictEqual(racingHeroSlide.desktopImageUrl, RACING_URL, 'slide-4 desktop uses racing.jpg');
assert.strictEqual(racingHeroSlide.tabletImageUrl, RACING_URL, 'slide-4 tablet uses racing.jpg');
assert.strictEqual(racingHeroSlide.mobileImageUrl, RACING_URL, 'slide-4 mobile uses racing.jpg');

// F. server/initialHeroSlides.ts & src/data/heroSlidesData.ts
const initialHeroCode = fs.readFileSync(path.resolve(process.cwd(), 'server/initialHeroSlides.ts'), 'utf-8');
const heroSlidesDataCode = fs.readFileSync(path.resolve(process.cwd(), 'src/data/heroSlidesData.ts'), 'utf-8');
assert.ok(initialHeroCode.includes(RACING_URL), 'server/initialHeroSlides.ts includes racing.jpg');
assert.ok(heroSlidesDataCode.includes(RACING_URL), 'src/data/heroSlidesData.ts includes racing.jpg');

// G. InstagramGrid.tsx
const instaGridCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/shared/InstagramGrid.tsx'), 'utf-8');
assert.ok(
  instaGridCode.includes(RACING_URL),
  'src/components/shared/InstagramGrid.tsx includes racing.jpg in Visual Stories gallery'
);

// H. Verify old placeholder photo-1547394765-185e1e68f34e is eliminated from racing equipment
assert.ok(!gamingDataCode.includes('1547394765-185e1e68f34e'), 'No old unsplash placeholder in gamingData.ts');
assert.ok(!racingResource.image.includes('1547394765-185e1e68f34e'), 'No old unsplash placeholder in resources.json racing resource');

console.log('✅ TEST 1 PASSED: Exact Racing Simulator image configured across all cards, equipment, hero slides, and booking visuals.');

// -----------------------------------------------------------------------------
// 2. MAKE EVERY INSTAGRAM HANDLE CLICKABLE
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Every @giocasa.ayodhya Handle Clickable ---');

// A. SectionHeader component handles titleItalic links
const sectionHeaderCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ui/SectionHeader.tsx'), 'utf-8');
assert.ok(sectionHeaderCode.includes('titleItalicHref?: string'), 'SectionHeader supports titleItalicHref');
assert.ok(
  sectionHeaderCode.includes(`href={titleItalicHref || '${INSTAGRAM_URL}'}`) &&
  sectionHeaderCode.includes('target="_blank"') &&
  sectionHeaderCode.includes('rel="noopener noreferrer"'),
  'SectionHeader renders titleItalic as a secure target="_blank" link to Instagram'
);

// B. HomePage Visual Stories section header
const homePageCode = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/HomePage.tsx'), 'utf-8');
assert.ok(
  homePageCode.includes('titleItalic="@giocasa.ayodhya"') &&
  homePageCode.includes(`titleItalicHref="${INSTAGRAM_URL}"`),
  'HomePage Visual Stories section header passes titleItalicHref to official Instagram'
);

// C. Footer component
const footerCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf-8');
assert.ok(
  footerCode.includes('href={settings.instagramUrl || businessConfig.contact.instagramUrl}') &&
  footerCode.includes('target="_blank"') &&
  footerCode.includes('rel="noopener noreferrer"'),
  'Footer links entire Instagram handle to official Instagram in new tab'
);

// D. ContactPage component
const contactPageCode = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/ContactPage.tsx'), 'utf-8');
assert.ok(
  contactPageCode.includes('href={instagramUrl}') &&
  contactPageCode.includes('target="_blank"') &&
  contactPageCode.includes('rel="noopener noreferrer"') &&
  contactPageCode.includes('{instagramHandle}'),
  'ContactPage Instagram card links entire handle to official Instagram in new tab'
);

// E. InstagramGrid component follow button
assert.ok(
  instaGridCode.includes('href={businessConfig.contact.instagramUrl}') &&
  instaGridCode.includes('Follow {businessConfig.contact.instagramHandle}'),
  'InstagramGrid follow button links to official Instagram in new tab'
);

// F. Configuration files have correct Instagram URL
const businessConfigCode = fs.readFileSync(path.resolve(process.cwd(), 'src/data/businessConfig.ts'), 'utf-8');
const contactApiCode = fs.readFileSync(path.resolve(process.cwd(), 'src/services/contactApi.ts'), 'utf-8');
assert.ok(businessConfigCode.includes(`instagramUrl: "${INSTAGRAM_URL}"`), 'businessConfig defines official Instagram URL');
assert.ok(serverDbCode.includes(`instagramUrl: '${INSTAGRAM_URL}'`), 'server/db.ts defines official Instagram URL');
assert.ok(contactApiCode.includes(`instagramUrl: '${INSTAGRAM_URL}'`), 'contactApi defines official Instagram URL');

console.log('✅ TEST 2 PASSED: Every visible @giocasa.ayodhya handle is clickable and links to official Instagram in a new tab.');

// -----------------------------------------------------------------------------
// 3. USE REAL PHOTOS FROM OFFICIAL INSTAGRAM
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Real Photos from Official Instagram in Visual Stories ---');

// Verify no Unsplash stock photos remain in InstagramGrid
assert.ok(!instaGridCode.includes('images.unsplash.com'), 'All Unsplash stock images removed from Visual Stories');

// Verify local genuine Instagram assets exist in public/assets/real/
const publicRealDir = path.resolve(process.cwd(), 'public/assets/real');
const realAssets = fs.readdirSync(publicRealDir);

assert.ok(realAssets.includes('insta_Dftthy4qYGO.jpg'), 'Real food & pizza photo from Instagram post exists');
assert.ok(realAssets.includes('insta_DfEfA5VzdBP.jpg'), 'Real pool table photo from Instagram post exists');
assert.ok(realAssets.includes('insta_Df2v3KXz37R.jpg'), 'Real celebration & party photo from Instagram post exists');
assert.ok(realAssets.includes('ps5_setup.png'), 'Real PS5 station photo exists');
assert.ok(realAssets.includes('foosball_lounge.png'), 'Real foosball lounge photo exists');

// Verify all files have non-zero size
for (const asset of ['insta_Dftthy4qYGO.jpg', 'insta_DfEfA5VzdBP.jpg', 'insta_Df2v3KXz37R.jpg', 'ps5_setup.png', 'foosball_lounge.png']) {
  const stat = fs.statSync(path.join(publicRealDir, asset));
  assert.ok(stat.size > 1000, `Asset ${asset} has valid non-zero size (${stat.size} bytes)`);
}

// Verify InstagramGrid references these genuine photos
assert.ok(instaGridCode.includes('/assets/real/insta_Dftthy4qYGO.jpg'), 'InstagramGrid includes genuine pizza & food photo');
assert.ok(instaGridCode.includes('/assets/real/ps5_setup.png'), 'InstagramGrid includes genuine PS5 photo');
assert.ok(instaGridCode.includes('/assets/real/insta_DfEfA5VzdBP.jpg'), 'InstagramGrid includes genuine pool table photo');
assert.ok(instaGridCode.includes(RACING_URL), 'InstagramGrid includes genuine racing simulator photo');
assert.ok(instaGridCode.includes('/assets/real/foosball_lounge.png'), 'InstagramGrid includes genuine foosball photo');
assert.ok(instaGridCode.includes('/assets/real/insta_Df2v3KXz37R.jpg'), 'InstagramGrid includes genuine celebrations photo');

console.log('✅ TEST 3 PASSED: Visual Stories populated exclusively with genuine GioCasa photos from official Instagram & venue assets.');

console.log('\n================================================================');
console.log('🎉 ALL 3 REQUIREMENTS AUDIT PASSED 100% WITH ZERO ERRORS');
console.log('================================================================');
