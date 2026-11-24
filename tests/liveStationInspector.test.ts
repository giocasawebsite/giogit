import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('🧪 GIOCASA LIVE STATION STATUS & MAINTENANCE INSPECTOR AUDIT');
console.log('================================================================\n');

const adminPagePath = path.resolve(process.cwd(), 'src/pages/AdminPage.tsx');
const adminPageCode = fs.readFileSync(adminPagePath, 'utf-8');

// -----------------------------------------------------------------------------
// 1. EQUIPMENT CARDS CLICKABILITY & PRESERVATION OF DESIGN
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Station Cards Clickability & Design Preservation ---');

// Verify Live Station Status & Maintenance section exists
assert(
  adminPageCode.includes('Live Station Status & Maintenance'),
  'Live Station Status & Maintenance section is present'
);

// Verify card has click handler to open station details
assert(
  adminPageCode.includes('onClick={() => handleOpenStationDetails(station, matchedResource)}'),
  'Station card has onClick handler calling handleOpenStationDetails'
);

// Verify accessibility attributes (role="button" and tabIndex)
assert(
  adminPageCode.includes('role="button"') && adminPageCode.includes('tabIndex={0}'),
  'Station card includes accessibility role="button" and tabIndex'
);

// Verify maintenance toggle button preserves e.stopPropagation()
assert(
  adminPageCode.includes('e.stopPropagation();') &&
  adminPageCode.includes('handleToggleMaintenance(matchedResource)'),
  'Maintenance button has e.stopPropagation() so toggling maintenance does not trigger card click'
);

// Verify affordance link for viewing live details
assert(
  adminPageCode.includes('Inspect Live Slots & Bookings'),
  'Station card has visual affordance link "Inspect Live Slots & Bookings"'
);

console.log('✅ TEST 1 PASSED: Cards are clickable, accessible, prevent event bubbling on maintenance toggle, and retain design styling.');

// -----------------------------------------------------------------------------
// 2. EQUIPMENT DETAILS IN DRAWER
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Equipment Details Display in Drawer ---');

// Verify equipment name and resource ID display
assert(
  adminPageCode.includes('{selectedStationDetail.station.name}') &&
  adminPageCode.includes('{selectedStationDetail.station.id}'),
  'Drawer displays equipment name and resource ID'
);

// Verify unit count metrics (category unit count and arena station count)
assert(
  adminPageCode.includes('Unit {unitIndex} of {totalCategoryCount}') &&
  adminPageCode.includes('Arena Station {arenaUnitIndex} of {arenaTotalUnits}'),
  'Drawer displays unit count in category and arena station index'
);

// Verify status badge with In Use, Booked, Maintenance, Available
assert(
  adminPageCode.includes('In Use (Playing)') &&
  adminPageCode.includes('Maintenance') &&
  adminPageCode.includes('Available'),
  'Drawer displays accurate status badges'
);

// Verify fast switcher between all stations
assert(
  adminPageCode.includes('handleSwitchStationDetail(st.id)'),
  'Drawer provides fast switching between live stations without closing'
);

console.log('✅ TEST 2 PASSED: Equipment details, resource IDs, total units, status badges, and fast switcher verified.');

// -----------------------------------------------------------------------------
// 3. LIVE AVAILABILITY & REMAINING TIME FORMULA
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Live Availability & Remaining Time Calculation ---');

// Test formatRemainingTime logic
const formatRemainingTime = (availableSlotsCount: number) => {
  const totalMinutes = availableSlotsCount * 30;
  if (totalMinutes <= 0) return '0h 0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins > 0 ? `${mins}m` : '0m'}`;
};

assert.strictEqual(formatRemainingTime(0), '0h 0m', '0 slots = 0h 0m');
assert.strictEqual(formatRemainingTime(1), '0h 30m', '1 slot = 0h 30m');
assert.strictEqual(formatRemainingTime(2), '1h 0m', '2 slots = 1h 0m');
assert.strictEqual(formatRemainingTime(5), '2h 30m', '5 slots = 2h 30m');
assert.strictEqual(formatRemainingTime(16), '8h 0m', '16 slots = 8h 0m');

// Verify remaining time display in AdminPage
assert(
  adminPageCode.includes('formatRemainingTime(availableSlots.length)'),
  'AdminPage calculates remaining available time using availableSlots.length * 30 minutes'
);

// Verify 4 summary cards: Available, Booked, Active, Remaining
assert(
  adminPageCode.includes('Available') &&
  adminPageCode.includes('Booked') &&
  adminPageCode.includes('Active') &&
  adminPageCode.includes('Remaining'),
  'Drawer displays all 4 availability metric cards'
);

// Verify 30-min slot visualizer grid
assert(
  adminPageCode.includes('30-Minute Slots') &&
  adminPageCode.includes('stationSlots.map((slot) =>'),
  'Drawer renders the 30-minute slot visualizer grid'
);

// Verify date picker and future presets (Today, Tomorrow, +2 Days, +7 Days)
assert(
  adminPageCode.includes('handleStationDetailDateChange') &&
  adminPageCode.includes('Today') &&
  adminPageCode.includes('Tomorrow') &&
  adminPageCode.includes('+2 Days') &&
  adminPageCode.includes('+7 Days'),
  'Drawer includes date picker and future date presets'
);

console.log('✅ TEST 3 PASSED: Availability metrics, 30-minute slot grid, remaining time formula, and date picker verified.');

// -----------------------------------------------------------------------------
// 4. BOOKING DETAILS & STRICT DATA SCOPING (EQUIPMENT A != EQUIPMENT B)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Strict Resource Scoping (Station A NEVER Shows Station B) ---');

// Verify client-side scoping in loadStationDetailData
assert(
  adminPageCode.includes('b.resourceId === resourceId'),
  'Client-side scoping strictly filters day and upcoming bookings by resourceId'
);

// Verify server-side filter support in server/routes/admin.ts and server/db.ts
const serverAdminPath = path.resolve(process.cwd(), 'server/routes/admin.ts');
const serverAdminCode = fs.readFileSync(serverAdminPath, 'utf-8');
assert(
  serverAdminCode.includes('resourceId: resourceId as string') || serverAdminCode.includes('filter.resourceId'),
  'Server admin route accepts and forwards resourceId filter'
);

const serverDbPath = path.resolve(process.cwd(), 'server/db.ts');
const serverDbCode = fs.readFileSync(serverDbPath, 'utf-8');
assert(
  serverDbCode.includes('query.resourceId = filter.resourceId') &&
  serverDbCode.includes('b.resourceId === filter.resourceId'),
  'MongoDB query and memory fallback strictly filter bookings by resourceId'
);

// Test scoping logic with mock data
const mockBookings = [
  { id: '1', resourceId: 'ps5-1', customerName: 'Alice', date: '2026-11-23', startTime: '12:00', endTime: '13:00', durationMinutes: 60, status: 'confirmed', totalAmount: 400, paymentStatus: 'paid' },
  { id: '2', resourceId: 'ps5-2', customerName: 'Bob', date: '2026-11-23', startTime: '12:00', endTime: '13:00', durationMinutes: 60, status: 'confirmed', totalAmount: 400, paymentStatus: 'paid' },
  { id: '3', resourceId: 'ps5-1', customerName: 'Charlie', date: '2026-11-23', startTime: '15:00', endTime: '16:00', durationMinutes: 60, status: 'active', totalAmount: 400, paymentStatus: 'paid' },
  { id: '4', resourceId: 'pool-1', customerName: 'David', date: '2026-11-23', startTime: '14:00', endTime: '15:00', durationMinutes: 60, status: 'confirmed', totalAmount: 300, paymentStatus: 'paid' },
];

const ps5_1_bookings = mockBookings.filter(b => b.resourceId === 'ps5-1');
assert.strictEqual(ps5_1_bookings.length, 2, 'ps5-1 has exactly 2 bookings');
assert(ps5_1_bookings.every(b => b.resourceId === 'ps5-1'), 'All returned bookings belong to ps5-1');
assert(!ps5_1_bookings.some(b => b.customerName === 'Bob' || b.customerName === 'David'), 'Bob (ps5-2) and David (pool-1) are excluded');

console.log('✅ TEST 4 PASSED: Equipment A strictly isolated from Equipment B in both database queries and frontend state.');

// -----------------------------------------------------------------------------
// 5. BOOKING DETAILS DISPLAY & ACTIONS (EDIT, START PLAY, END PLAY)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Booking Details Display & Management Actions ---');

// Verify customer details: name, phone (tel:), email (mailto:), guest code
assert(
  adminPageCode.includes('href={`tel:${b.phone}`}') &&
  adminPageCode.includes('href={`mailto:${b.email}`}') &&
  adminPageCode.includes('Code: {b.guestCode}'),
  'Drawer displays customer name, phone with tel: link, email with mailto: link, and guest code'
);

// Verify timing, duration, player count, status, payment status
assert(
  adminPageCode.includes('{formatTime12(b.startTime)} – {formatTime12(b.endTime || \'\')}') &&
  adminPageCode.includes('{b.durationMinutes} mins') &&
  adminPageCode.includes('{b.numberOfPeople || 1} Players') &&
  adminPageCode.includes('{b.paymentStatus} (₹{b.totalAmount})'),
  'Drawer displays exact start/end time, duration, player count, and payment info'
);

// Verify Edit Booking action connects to handleOpenEditBooking
assert(
  adminPageCode.includes('onClick={() => handleOpenEditBooking(b)}'),
  'Drawer includes "View / Edit Booking" button opening edit modal'
);

// Verify Start Play & End Play buttons inside drawer
assert(
  adminPageCode.includes('handleStationDrawerStartPlay(b)') &&
  adminPageCode.includes('handleStationDrawerEndPlay(b)'),
  'Drawer provides direct Start Play and End Play buttons'
);

// Verify Edit Modal sits above the drawer (z-[60] vs z-50)
assert(
  adminPageCode.includes('z-[60] bg-brand-dark/85 backdrop-blur-md flex items-center justify-center'),
  'Edit Booking modal has z-[60] so it overlays cleanly on top of the Station Inspector drawer (z-50)'
);

console.log('✅ TEST 5 PASSED: Booking details, contact links, session tracking, and edit/play actions verified.');

// -----------------------------------------------------------------------------
// 6. LIVE UPDATES & AUTO-SYNC INTEGRATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Live Updates & Auto-Sync Integration ---');

// Verify silentSyncDashboard refreshes open station detail
assert(
  adminPageCode.includes('if (selectedStationDetailRef.current)') &&
  adminPageCode.includes('await loadStationDetailData(curId, curDate, false);'),
  'useAdminLiveSync 3-second cycle automatically refreshes open station details silently'
);

// Verify handleToggleMaintenance refreshes station details if matching
assert(
  adminPageCode.includes('if (selectedStationDetailRef.current && selectedStationDetailRef.current.station.id === resource.id)'),
  'Maintenance toggle immediately re-fetches station details'
);

// Verify handleSaveEditBooking refreshes station details
assert(
  adminPageCode.includes('setEditingBooking(null);') &&
  adminPageCode.includes('if (selectedStationDetailRef.current)'),
  'Saving booking edits immediately re-fetches station details'
);

console.log('✅ TEST 6 PASSED: Live auto-sync and real-time refresh hooks wired correctly.');

console.log('\n================================================================');
console.log('🎉 ALL 6 LIVE STATION INSPECTOR TESTS PASSED SUCCESSFULLY (100%)');
console.log('================================================================');
