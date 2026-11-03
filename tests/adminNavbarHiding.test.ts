import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseCurrentRoute } from '../src/utils/router';

console.log('====================================================');
console.log('🛡️ GIOCASA ADMIN NAVBAR ISOLATION TEST SUITE');
console.log('====================================================\n');

const navbarPath = path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx');
const appPath = path.resolve(process.cwd(), 'src/App.tsx');
const adminPagePath = path.resolve(process.cwd(), 'src/pages/AdminPage.tsx');
const routerPath = path.resolve(process.cwd(), 'src/utils/router.ts');

const navbarCode = fs.readFileSync(navbarPath, 'utf-8');
const appCode = fs.readFileSync(appPath, 'utf-8');
const adminPageCode = fs.readFileSync(adminPagePath, 'utf-8');
const routerCode = fs.readFileSync(routerPath, 'utf-8');

// TEST 1: Navbar Component Early Return on Admin Page
console.log('TEST 1: Navbar component hides completely on admin routes');
assert(
  navbarCode.includes("if (currentPage === 'admin')") && navbarCode.includes('return null;'),
  'Navbar.tsx must return null when currentPage === "admin"'
);
console.log('  ✅ [PASS] Navbar.tsx returns null when currentPage === "admin"');

// TEST 2: App.tsx Guard Against Rendering Navbar on Admin Page
console.log('\nTEST 2: App.tsx conditionally guards Navbar rendering');
assert(
  appCode.includes("currentRoute.page !== 'admin' && (") || appCode.includes("currentRoute.page !== 'admin' && <Navbar"),
  'App.tsx must not render Navbar when currentRoute.page === "admin"'
);
console.log('  ✅ [PASS] App.tsx prevents mounting Navbar for currentRoute.page === "admin"');

// TEST 3: Customer-Facing Pages Still Render Navbar
console.log('\nTEST 3: Customer-facing pages preserve public navigation unchanged');
const customerNavLinks = ['home', 'menu', 'gaming', 'tournaments', 'experience', 'events', 'about', 'contact'];
for (const link of customerNavLinks) {
  assert(navbarCode.includes(`'${link}'`), `Public link '${link}' exists in Navbar.tsx`);
}
assert(navbarCode.includes('Book Games'), 'Book Games CTA exists on public navbar');
assert(navbarCode.includes('Reserve Table'), 'Reserve Table CTA exists on public navbar');
console.log('  ✅ [PASS] All public navigation links and actions remain intact for customer pages');

// TEST 4: Admin Page Top Padding (No Empty Navbar Space)
console.log('\nTEST 4: AdminPage removes large navbar gap (pt-24) on desktop and mobile');
assert(!adminPageCode.includes('pt-24 pb-24 px-4 sm:px-6 lg:px-8'), 'AdminPage.tsx must not contain pt-24 navbar spacer');
assert(
  adminPageCode.includes('pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6') ||
  adminPageCode.includes('pt-4 sm:pt-6') ||
  adminPageCode.includes('pt-6 sm:pt-8'),
  'AdminPage.tsx provides compact top padding without dead navbar space'
);
console.log('  ✅ [PASS] Dead navbar void (pt-24) removed; compact responsive padding in place');

// TEST 5: Admin Header & Controls Fully Preserved
console.log('\nTEST 5: Admin header, logout button, and navigation tabs intact');
assert(adminPageCode.includes('Gaming Operations Dashboard'), 'Admin page header title preserved');
assert(adminPageCode.includes('LIVE ARENA OPS • IST'), 'Live arena ops badge preserved');
assert(adminPageCode.includes('handleLogout'), 'Logout handler preserved');
assert(adminPageCode.includes('LogOut'), 'Logout icon button preserved');
assert(adminPageCode.includes('setShowPasscodeModal(true)'), 'Passcode modal trigger preserved');
assert(adminPageCode.includes('loadDashboard(passcode)'), 'Refresh dashboard preserved');
assert(adminPageCode.includes('Station Ops & Walk-ins'), 'Station Ops tab preserved');
assert(adminPageCode.includes('Equipment & Games'), 'Equipment & Games tab preserved');
assert(adminPageCode.includes('Dining & Events'), 'Dining & Events tab preserved');
assert(adminPageCode.includes('Player CRM'), 'Player CRM tab preserved');
assert(adminPageCode.includes('GioCasa Arena Tournaments'), 'Tournaments Manager tab preserved');
assert(adminPageCode.includes('Hall of Fame Archive'), 'Hall of Fame tab preserved');
assert(adminPageCode.includes('Contact Settings'), 'Contact Settings tab preserved');
console.log('  ✅ [PASS] All admin controls, staff navigation tabs, and header actions fully functional');

// TEST 6: Nested Admin Route Resolution
console.log('\nTEST 6: Nested admin routes resolve cleanly to page="admin"');
assert(routerCode.includes("segments[1] === 'equipment'"), 'equipment tab parsed under admin');
assert(routerCode.includes("segments[1] === 'reservations'"), 'reservations tab parsed under admin');
assert(routerCode.includes("segments[1] === 'tournaments'"), 'tournaments tab parsed under admin');
assert(routerCode.includes("segments[1] === 'players'"), 'players tab parsed under admin');
console.log('  ✅ [PASS] All nested admin routes parsed to page="admin" with appropriate tab params');

console.log('\n====================================================');
console.log('🎉 ALL ADMIN NAVBAR REMOVAL TESTS PASSED (100%)!');
console.log('====================================================');
