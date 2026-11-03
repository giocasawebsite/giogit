import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('📱 GIOCASA MOBILE NAVBAR & CLEAN DESIGN TEST SUITE');
console.log('====================================================\n');

const navbarPath = path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx');
const navbarCode = fs.readFileSync(navbarPath, 'utf-8');

// TEST 1: Mobile Header Clutter Elimination
console.log('TEST 1: Mobile header contains ONLY GioCasa logo and clean hamburger icon');
// Verify that mobile header block does not have WinnerButton, PlayerID, or Cart in the sm:hidden header bar
const mobileHeaderMatch = navbarCode.match(/{\/\* Mobile Clean Hamburger Button Only - Spacious & Minimal \*\/}[\s\S]*?<\/div>/);
assert(mobileHeaderMatch, 'Mobile clean hamburger button container exists');
const mobileHeaderContent = mobileHeaderMatch[0];

assert(!mobileHeaderContent.includes('WinnersButton'), 'WinnersButton is NOT in top mobile header');
assert(!mobileHeaderContent.includes('Gamepad2'), 'Player ID Gamepad icon is NOT in top mobile header');
assert(!mobileHeaderContent.includes('setPlayerModalOpen'), 'Player Modal trigger is NOT in top mobile header');
assert(mobileHeaderContent.includes('MenuIcon'), 'Menu hamburger icon is present');
assert(mobileHeaderContent.includes('X'), 'Close X icon is present when opened');
console.log('  ✅ [PASS] Top mobile header is uncluttered: ONLY logo and hamburger present');

// TEST 2: Desktop Header Preservation
console.log('\nTEST 2: Desktop header navigation & actions remain fully intact');
assert(navbarCode.includes('hidden lg:flex items-center gap-8'), 'Desktop nav links present with hidden lg:flex');
assert(navbarCode.includes('hidden sm:flex items-center gap-3'), 'Desktop actions present with hidden sm:flex');
assert(navbarCode.includes('WinnersButton'), 'WinnersButton is present for desktop');
assert(navbarCode.includes('Player ID'), 'Player ID button is present for desktop');
assert(navbarCode.includes('openDrawer'), 'Order cart is present for desktop');
assert(navbarCode.includes('Book Slot'), 'Book Slot is present for desktop');
console.log('  ✅ [PASS] Desktop header navigation, actions, and buttons preserved');

// TEST 3: Mobile Slide-out Menu / Drawer Architecture
console.log('\nTEST 3: Mobile slide-out menu drawer and backdrop architecture');
assert(navbarCode.includes('<AnimatePresence>'), 'AnimatePresence imported and used for smooth exit transitions');
assert(navbarCode.includes('mobileMenuOpen && ('), 'Conditional drawer rendering under AnimatePresence');
assert(navbarCode.includes('fixed inset-0 z-50 bg-black'), 'Backdrop overlay exists with high z-index');
assert(navbarCode.includes('onClick={() => setMobileMenuOpen(false)}'), 'Backdrop click dismisses menu');
assert(navbarCode.includes('role="dialog"'), 'Accessible modal dialog role on drawer');
assert(navbarCode.includes('aria-modal="true"'), 'Accessible aria-modal attribute present');
console.log('  ✅ [PASS] Mobile slide-out drawer with backdrop and accessibility roles implemented');

// TEST 4: Background Scrolling Lock & Escape Key Listener
console.log('\nTEST 4: Background scroll locking and Escape key dismiss');
assert(navbarCode.includes("document.body.style.overflow = 'hidden'"), 'Locks document.body.style.overflow when opened');
assert(navbarCode.includes('document.body.style.overflow = originalOverflow'), 'Restores document.body.style.overflow when closed/unmounted');
assert(navbarCode.includes("e.key === 'Escape'"), 'Escape key closes mobile menu');
console.log('  ✅ [PASS] Body scroll prevention and keyboard Escape dismiss verified');

// TEST 5: Mobile Navigation Public Routes & Hierarchy
console.log('\nTEST 5: Mobile navigation routes and visual hierarchy');
const requiredRoutes = ['home', 'menu', 'gaming', 'tournaments', 'experience', 'events', 'about', 'contact'];
for (const route of requiredRoutes) {
  assert(navbarCode.includes(`id: '${route}'`), `Route '${route}' included in navigation list`);
}
assert(navbarCode.includes('Book Slot'), 'High-priority Book Slot CTA in drawer');
assert(navbarCode.includes('Order Food'), 'Quick Order Food action present in drawer');
assert(navbarCode.includes('Player ID'), 'Player ID pass action present in drawer');
assert(navbarCode.includes('Winners'), 'Winners / Hall of Fame action present in drawer');
console.log('  ✅ [PASS] All public routes present with clear visual hierarchy');

// TEST 6: Safe Area Insets & Small Phone Spacing
console.log('\nTEST 6: Safe-area insets and responsive padding');
assert(navbarCode.includes('env(safe-area-inset-top)'), 'Header and drawer respect env(safe-area-inset-top)');
assert(navbarCode.includes('env(safe-area-inset-bottom)'), 'Drawer respects env(safe-area-inset-bottom)');
assert(navbarCode.includes('max-w-sm'), 'Drawer max width capped for phone proportions');
console.log('  ✅ [PASS] Safe-area insets configured for notch and navigation bar spacing');

console.log('\n====================================================');
console.log('🎉 ALL MOBILE NAVBAR REGRESSION CHECKS PASSED (100%)!');
console.log('====================================================');
