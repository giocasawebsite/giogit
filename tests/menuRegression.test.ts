/**
 * GioCasa Official Menu Implementation - Regression Test Suite
 * Validates:
 * 1. Category taxonomy and exact ordering
 * 2. Every menu item presence, category assignment, and price accuracy (INR ₹)
 * 3. Dedicated Brick Oven Pizza specifications (6 pizzas, 3 sizes each, spice labels, 100% vegetarian)
 * 4. Special variants: Chilli Paneer (Half ₹149, Full ₹249), Ice Tea (4 flavours @ ₹79)
 * 5. Serving notes integrity: Sandwiches (all served with fries) vs Burgers (only Classic Burger)
 * 6. Search and category filter behavior
 * 7. Asset paths and original menu archive verification
 */

import fs from 'fs';
import path from 'path';
import { menuCategories, menuData } from '../src/data/menuData';

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

console.log('\n======================================================');
console.log('🧪 GIOCASA MENU REGRESSION & INTEGRITY SUITE');
console.log('======================================================\n');

// ---------------------------------------------------------------------------
// TEST GROUP 1: Category Navigation & Ordering
// ---------------------------------------------------------------------------
console.log('👉 Test Group 1: Category Navigation & Ordering');

const expectedCategories = [
  'all',
  'chinese',
  'tea',
  'hot-coffee',
  'cold-coffee',
  'smoothies-shakes',
  'mocktails',
  'sides-extras',
  'wraps',
  'pizza',
  'sandwiches',
  'burgers',
];

assert(
  menuCategories.length === expectedCategories.length,
  `Category count is exactly ${expectedCategories.length} (received ${menuCategories.length})`
);

const receivedCategoryIds = menuCategories.map(c => c.id);
assert(
  JSON.stringify(receivedCategoryIds) === JSON.stringify(expectedCategories),
  `Categories match exact required sequence: ${expectedCategories.join(' -> ')}`
);

// ---------------------------------------------------------------------------
// TEST GROUP 2: Chinese Section
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 2: Chinese Section');

const chineseItems = menuData.filter(i => i.category === 'chinese');
assert(chineseItems.length === 9, `Chinese category contains 9 items (received ${chineseItems.length})`);

const expectedChinesePrices: Record<string, number> = {
  'Honey Chilli Potato': 139,
  'Chilli Garlic Noodles': 249,
  'Veg Noodles': 179,
  'Paneer Noodles': 199,
  'Hakka Noodles': 219,
  'Veg Fried Rice': 199,
  'Paneer Fried Rice': 249,
  'Chilli Potato': 129,
};

for (const [name, expectedPrice] of Object.entries(expectedChinesePrices)) {
  const item = chineseItems.find(i => i.name === name);
  assert(!!item && item.price === expectedPrice, `${name} exists with price ₹${expectedPrice}`);
}

const chilliPaneer = chineseItems.find(i => i.name === 'Chilli Paneer');
assert(!!chilliPaneer, 'Chilli Paneer exists');
assert(
  !!chilliPaneer?.portions &&
  chilliPaneer.portions.length === 2 &&
  chilliPaneer.portions[0].name === 'Half' &&
  chilliPaneer.portions[0].price === 149 &&
  chilliPaneer.portions[1].name === 'Full' &&
  chilliPaneer.portions[1].price === 249,
  'Chilli Paneer displays distinct variants: Half ₹149 and Full ₹249'
);

// ---------------------------------------------------------------------------
// TEST GROUP 3: Tea Section & Ice Tea Variants
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 3: Tea Section & Ice Tea Variants');

const teaItems = menuData.filter(i => i.category === 'tea');
assert(teaItems.length === 4, `Tea category contains 4 base items (received ${teaItems.length})`);

const expectedTeaPrices: Record<string, number> = {
  'Adrak Tea': 29,
  'Elaichi Tea': 29,
  'Green Tea': 49,
  'Ice Tea': 79,
};

for (const [name, expectedPrice] of Object.entries(expectedTeaPrices)) {
  const item = teaItems.find(i => i.name === name);
  assert(!!item && item.price === expectedPrice, `${name} exists with base price ₹${expectedPrice}`);
}

const iceTea = teaItems.find(i => i.name === 'Ice Tea');
assert(!!iceTea, 'Ice Tea item exists');
assert(
  !!iceTea?.flavors && iceTea.flavors.length === 4,
  'Ice Tea has exactly 4 distinct flavour variants'
);
const flavorNames = iceTea?.flavors?.map(f => f.name).sort();
const expectedFlavors = ['Kiwi', 'Lemon', 'Peach', 'Strawberry'].sort();
assert(
  JSON.stringify(flavorNames) === JSON.stringify(expectedFlavors),
  'Ice Tea flavours are Lemon, Kiwi, Peach, and Strawberry'
);
const allFlavors79 = iceTea?.flavors?.every(f => f.price === 79);
assert(!!allFlavors79, 'All 4 Ice Tea flavours are priced at ₹79 each');

// ---------------------------------------------------------------------------
// TEST GROUP 4: Coffee & Shakes
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 4: Coffee & Shakes');

const hotCoffeeItems = menuData.filter(i => i.category === 'hot-coffee');
assert(hotCoffeeItems.length === 2, `Hot Coffee has 2 items`);
assert(hotCoffeeItems.find(i => i.name === 'Plain Coffee')?.price === 99, 'Plain Coffee is ₹99');
assert(hotCoffeeItems.find(i => i.name === 'Hazelnut Coffee')?.price === 129, 'Hazelnut Coffee is ₹129');
assert(
  hotCoffeeItems.find(i => i.name === 'Hazelnut Coffee')?.flaggedForVerification === true,
  'Hazelnut Coffee is flagged for owner verification regarding ₹129 vs printed ₹149'
);

const coldCoffeeItems = menuData.filter(i => i.category === 'cold-coffee');
assert(coldCoffeeItems.length === 6, `Cold Coffee has 6 items`);
const expectedColdCoffee: Record<string, number> = {
  'Signature Cold Coffee': 99,
  'Classic Cold Coffee': 109,
  'Coffee Frappe': 129,
  'Vanilla Frappe': 129,
  'Mocha Frappe': 129,
  'Brownie Frappe': 139,
};
for (const [name, price] of Object.entries(expectedColdCoffee)) {
  assert(coldCoffeeItems.find(i => i.name === name)?.price === price, `${name} is ₹${price}`);
}

const shakeItems = menuData.filter(i => i.category === 'smoothies-shakes');
assert(shakeItems.length === 6, `Smoothies & Shakes has 6 items`);
const expectedShakes: Record<string, number> = {
  'Chocolate Shake': 129,
  'Oreo Shake': 129,
  'Kiwi Smoothie': 169,
  'Fresh Fruit Smoothie': 169,
  'Strawberry Smoothie': 179,
  'Mixberry Smoothie': 179,
};
for (const [name, price] of Object.entries(expectedShakes)) {
  assert(shakeItems.find(i => i.name === name)?.price === price, `${name} is ₹${price}`);
}

// ---------------------------------------------------------------------------
// TEST GROUP 5: Mocktails, Sides & Wraps
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 5: Mocktails, Sides & Wraps');

const mocktailItems = menuData.filter(i => i.category === 'mocktails');
assert(mocktailItems.length === 5, `Mocktails has 5 items`);
const allMocktails99 = mocktailItems.every(i => i.price === 99);
assert(allMocktails99, 'All mocktails are priced at ₹99');

const sideItems = menuData.filter(i => i.category === 'sides-extras');
assert(sideItems.length === 7, `Sides & Extras has 7 items`);
const expectedSides: Record<string, number> = {
  'Plain Nachos': 99,
  'Potato Wedges': 109,
  'Loaded Mexican Nachos': 149,
  'Veg Maggie': 89,
  'Cheese Maggie': 99,
  'Fingerchips': 89,
  'Peri Peri Fingerchips': 99,
};
for (const [name, price] of Object.entries(expectedSides)) {
  assert(sideItems.find(i => i.name === name)?.price === price, `${name} is ₹${price}`);
}

const wrapItems = menuData.filter(i => i.category === 'wraps');
assert(wrapItems.length === 3, `Wraps has 3 items`);
assert(wrapItems.find(i => i.name === 'Mexican Wrap')?.price === 99, 'Mexican Wrap is ₹99');
assert(wrapItems.find(i => i.name === 'Cheese Potato Wrap')?.price === 119, 'Cheese Potato Wrap is ₹119');
assert(wrapItems.find(i => i.name === 'Paneer Wrap')?.price === 149, 'Paneer Wrap is ₹149');

// ---------------------------------------------------------------------------
// TEST GROUP 6: Wood & Brick Fired Brick Oven Pizzas (100% Vegetarian)
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 6: Wood & Brick Fired Pizzas (100% Vegetarian)');

const pizzaItems = menuData.filter(i => i.category === 'pizza');
assert(pizzaItems.length === 6, `Pizza category has exactly 6 pizzas (received ${pizzaItems.length})`);

const expectedPizzas: Record<string, { sizes: Record<string, number>; spice: string; flagged?: boolean }> = {
  'Tandoori Mushroom': {
    sizes: { '8-inch': 330, '10-inch': 370, '12-inch': 399 },
    spice: 'Medium Spice',
  },
  'Peri Peri Paneer Pataka': {
    sizes: { '8-inch': 330, '10-inch': 380, '12-inch': 399 },
    spice: 'Hot',
  },
  'Neapolitan Basil': {
    sizes: { '8-inch': 310, '10-inch': 350, '12-inch': 399 },
    spice: 'Classic',
  },
  'Green Garden Seprheem*': {
    sizes: { '8-inch': 320, '10-inch': 360, '12-inch': 399 },
    spice: 'Fresh & Herby',
    flagged: true,
  },
  'Tandoori Corn Cheese Pizza': {
    sizes: { '8-inch': 310, '10-inch': 350, '12-inch': 399 },
    spice: 'Medium Spice',
  },
  'Four Cheese Fista': {
    sizes: { '8-inch': 340, '10-inch': 380, '12-inch': 399 },
    spice: 'Rich & Creamy',
  },
};

for (const [name, spec] of Object.entries(expectedPizzas)) {
  const pizza = pizzaItems.find(p => p.name === name);
  assert(!!pizza, `Pizza "${name}" exists`);
  assert(pizza?.isVegetarian === true, `Pizza "${name}" is 100% vegetarian`);
  assert(pizza?.isWoodFired === true, `Pizza "${name}" is marked as wood-fired`);
  assert(pizza?.spiceLabel === spec.spice, `Pizza "${name}" has spice label "${spec.spice}"`);

  if (spec.flagged) {
    assert(
      pizza?.flaggedForVerification === true,
      `Pizza "${name}" is flagged for owner verification without renaming`
    );
  }

  assert(pizza?.sizes?.length === 3, `Pizza "${name}" has 3 explicit sizes`);
  for (const [sz, expPrice] of Object.entries(spec.sizes)) {
    const sizeObj = pizza?.sizes?.find(s => s.size === sz);
    assert(
      sizeObj?.price === expPrice,
      `Pizza "${name}" ${sz} is priced at ₹${expPrice} (found ₹${sizeObj?.price})`
    );
  }
}

// ---------------------------------------------------------------------------
// TEST GROUP 7: Sandwiches & Fries Serving Note
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 7: Sandwiches & Fries Serving Note');

const sandwichItems = menuData.filter(i => i.category === 'sandwiches');
assert(sandwichItems.length === 5, `Sandwiches category has 5 items`);

const expectedSandwiches: Record<string, number> = {
  'Cheese Grill Sandwich': 119,
  'Sweet Corn Sandwich': 149,
  'Paneer Cheese Grill Sandwich': 189,
  'Veg Club Sandwich': 199,
  'Mushroom Cheese Sandwich': 209,
};

for (const [name, price] of Object.entries(expectedSandwiches)) {
  const item = sandwichItems.find(i => i.name === name);
  assert(item?.price === price, `${name} is ₹${price}`);
  assert(
    item?.servingNote?.toLowerCase().includes('served with fries') === true,
    `${name} has serving note "Served with fries"`
  );
}

// ---------------------------------------------------------------------------
// TEST GROUP 8: Burgers & Selective Fries Note
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 8: Burgers & Selective Fries Note');

const burgerItems = menuData.filter(i => i.category === 'burgers');
assert(burgerItems.length === 4, `Burgers category has 4 items`);

const classicBurger = burgerItems.find(b => b.name === 'Classic Burger');
assert(classicBurger?.price === 180, 'Classic Burger is ₹180');
assert(
  classicBurger?.servingNote?.toLowerCase().includes('served with fries') === true,
  'Classic Burger explicitly has serving note "Served with fries"'
);

const otherBurgers = burgerItems.filter(b => b.name !== 'Classic Burger');
for (const b of otherBurgers) {
  assert(
    !b.servingNote,
    `Burger "${b.name}" does NOT specify fries serving note (preserves printed menu specification)`
  );
}

// ---------------------------------------------------------------------------
// TEST GROUP 9: Global Uniqueness & Search Simulation
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 9: Global Uniqueness & Search Simulation');

const allIds = menuData.map(i => i.id);
const uniqueIds = new Set(allIds);
assert(allIds.length === uniqueIds.size, `All ${allIds.length} menu items have distinct stable IDs`);

// Test search logic
const pizzaQuery = 'tandoori';
const pizzaMatches = menuData.filter(
  i => i.name.toLowerCase().includes(pizzaQuery) || (i.description && i.description.toLowerCase().includes(pizzaQuery))
);
assert(pizzaMatches.length >= 2, `Search for "${pizzaQuery}" returned ${pizzaMatches.length} matching items`);

const emptyQuery = 'xyznonexistentdish';
const emptyMatches = menuData.filter(i => i.name.toLowerCase().includes(emptyQuery));
assert(emptyMatches.length === 0, 'Non-existent dish returns 0 items for empty-state triggering');

// ---------------------------------------------------------------------------
// TEST GROUP 10: Original Menu Scan Asset Verification
// ---------------------------------------------------------------------------
console.log('\n👉 Test Group 10: Original Menu Scan Asset Verification');

const menuImage1Path = path.resolve('public/assets/menu/original-menu-page-1.jpg');
const image1Exists = fs.existsSync(menuImage1Path);
assert(image1Exists, 'Original menu page 1 asset exists at public/assets/menu/original-menu-page-1.jpg');
if (image1Exists) {
  const stats = fs.statSync(menuImage1Path);
  assert(stats.size > 100000, `Original menu page 1 image is high-resolution (${Math.round(stats.size / 1024)} KB)`);
}

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL MENU REGRESSION CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
}
