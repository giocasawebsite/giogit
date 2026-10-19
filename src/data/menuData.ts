import { MenuItem } from '../types';

export interface MenuCategoryDef {
  id: string;
  label: string;
  highlight?: boolean;
}

export const menuCategories: MenuCategoryDef[] = [
  { id: 'all', label: 'All' },
  { id: 'chinese', label: 'Chinese' },
  { id: 'tea', label: 'Tea' },
  { id: 'hot-coffee', label: 'Hot Coffee' },
  { id: 'cold-coffee', label: 'Cold Coffee' },
  { id: 'smoothies-shakes', label: 'Smoothies & Shakes' },
  { id: 'mocktails', label: 'Mocktails' },
  { id: 'sides-extras', label: 'Sides & Extras' },
  { id: 'wraps', label: 'Wraps' },
  { id: 'pizza', label: 'Brick Oven Pizzas', highlight: true },
  { id: 'sandwiches', label: 'Sandwiches' },
  { id: 'burgers', label: 'Burgers' },
];

export const menuData: MenuItem[] = [
  // ==========================================
  // 1. CHINESE
  // ==========================================
  {
    id: 'chinese-honey-chilli-potato',
    name: 'Honey Chilli Potato',
    category: 'chinese',
    price: 139,
    isVegetarian: true,
  },
  {
    id: 'chinese-chilli-garlic-noodles',
    name: 'Chilli Garlic Noodles',
    category: 'chinese',
    price: 249,
    isVegetarian: true,
  },
  {
    id: 'chinese-veg-noodles',
    name: 'Veg Noodles',
    category: 'chinese',
    price: 179,
    isVegetarian: true,
  },
  {
    id: 'chinese-paneer-noodles',
    name: 'Paneer Noodles',
    category: 'chinese',
    price: 199,
    isVegetarian: true,
  },
  {
    id: 'chinese-hakka-noodles',
    name: 'Hakka Noodles',
    category: 'chinese',
    price: 219,
    isVegetarian: true,
  },
  {
    id: 'chinese-veg-fried-rice',
    name: 'Veg Fried Rice',
    category: 'chinese',
    price: 199,
    isVegetarian: true,
  },
  {
    id: 'chinese-paneer-fried-rice',
    name: 'Paneer Fried Rice',
    category: 'chinese',
    price: 249,
    isVegetarian: true,
  },
  {
    id: 'chinese-chilli-potato',
    name: 'Chilli Potato',
    category: 'chinese',
    price: 129,
    isVegetarian: true,
  },
  {
    id: 'chinese-chilli-paneer',
    name: 'Chilli Paneer',
    category: 'chinese',
    price: 149,
    isVegetarian: true,
    portions: [
      { name: 'Half', price: 149 },
      { name: 'Full', price: 249 },
    ],
  },

  // ==========================================
  // 2. TEA
  // ==========================================
  {
    id: 'tea-adrak',
    name: 'Adrak Tea',
    category: 'tea',
    price: 29,
    isVegetarian: true,
  },
  {
    id: 'tea-elaichi',
    name: 'Elaichi Tea',
    category: 'tea',
    price: 29,
    isVegetarian: true,
  },
  {
    id: 'tea-green',
    name: 'Green Tea',
    category: 'tea',
    price: 49,
    isVegetarian: true,
  },
  {
    id: 'tea-ice-tea',
    name: 'Ice Tea',
    category: 'tea',
    price: 79,
    isVegetarian: true,
    flavors: [
      { name: 'Lemon', price: 79 },
      { name: 'Kiwi', price: 79 },
      { name: 'Peach', price: 79 },
      { name: 'Strawberry', price: 79 },
    ],
  },

  // ==========================================
  // 3. HOT COFFEE
  // ==========================================
  {
    id: 'hot-coffee-plain',
    name: 'Plain Coffee',
    category: 'hot-coffee',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'hot-coffee-hazelnut',
    name: 'Hazelnut Coffee',
    category: 'hot-coffee',
    price: 129,
    isVegetarian: true,
    flaggedForVerification: true,
    verificationNote: 'Listed at ₹129 in master specification (printed menu shows ₹149); pending owner confirmation.',
  },

  // ==========================================
  // 4. COLD COFFEE
  // ==========================================
  {
    id: 'cold-coffee-signature',
    name: 'Signature Cold Coffee',
    category: 'cold-coffee',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'cold-coffee-classic',
    name: 'Classic Cold Coffee',
    category: 'cold-coffee',
    price: 109,
    isVegetarian: true,
  },
  {
    id: 'cold-coffee-frappe',
    name: 'Coffee Frappe',
    category: 'cold-coffee',
    price: 129,
    isVegetarian: true,
  },
  {
    id: 'cold-coffee-vanilla-frappe',
    name: 'Vanilla Frappe',
    category: 'cold-coffee',
    price: 129,
    isVegetarian: true,
  },
  {
    id: 'cold-coffee-mocha-frappe',
    name: 'Mocha Frappe',
    category: 'cold-coffee',
    price: 129,
    isVegetarian: true,
  },
  {
    id: 'cold-coffee-brownie-frappe',
    name: 'Brownie Frappe',
    category: 'cold-coffee',
    price: 139,
    isVegetarian: true,
  },

  // ==========================================
  // 5. SMOOTHIES & SHAKES
  // ==========================================
  {
    id: 'shake-chocolate',
    name: 'Chocolate Shake',
    category: 'smoothies-shakes',
    price: 129,
    isVegetarian: true,
  },
  {
    id: 'shake-oreo',
    name: 'Oreo Shake',
    category: 'smoothies-shakes',
    price: 129,
    isVegetarian: true,
  },
  {
    id: 'smoothie-kiwi',
    name: 'Kiwi Smoothie',
    category: 'smoothies-shakes',
    price: 169,
    isVegetarian: true,
  },
  {
    id: 'smoothie-fresh-fruit',
    name: 'Fresh Fruit Smoothie',
    category: 'smoothies-shakes',
    price: 169,
    isVegetarian: true,
  },
  {
    id: 'smoothie-strawberry',
    name: 'Strawberry Smoothie',
    category: 'smoothies-shakes',
    price: 179,
    isVegetarian: true,
  },
  {
    id: 'smoothie-mixberry',
    name: 'Mixberry Smoothie',
    category: 'smoothies-shakes',
    price: 179,
    isVegetarian: true,
  },

  // ==========================================
  // 6. MOCKTAILS
  // ==========================================
  {
    id: 'mocktail-fresh-lime-water',
    name: 'Fresh Lime Water',
    category: 'mocktails',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'mocktail-fresh-lime-soda',
    name: 'Fresh Lime Soda',
    category: 'mocktails',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'mocktail-mint-mojito',
    name: 'Mint Mojito',
    category: 'mocktails',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'mocktail-kalakhatta',
    name: 'Kalakhatta',
    category: 'mocktails',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'mocktail-spicy-mango',
    name: 'Spicy Mango',
    category: 'mocktails',
    price: 99,
    isVegetarian: true,
  },

  // ==========================================
  // 7. SIDES & EXTRAS
  // ==========================================
  {
    id: 'side-plain-nachos',
    name: 'Plain Nachos',
    category: 'sides-extras',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'side-potato-wedges',
    name: 'Potato Wedges',
    category: 'sides-extras',
    price: 109,
    isVegetarian: true,
  },
  {
    id: 'side-loaded-mexican-nachos',
    name: 'Loaded Mexican Nachos',
    category: 'sides-extras',
    price: 149,
    isVegetarian: true,
  },
  {
    id: 'side-veg-maggie',
    name: 'Veg Maggie',
    category: 'sides-extras',
    price: 89,
    isVegetarian: true,
  },
  {
    id: 'side-cheese-maggie',
    name: 'Cheese Maggie',
    category: 'sides-extras',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'side-fingerchips',
    name: 'Fingerchips',
    category: 'sides-extras',
    price: 89,
    isVegetarian: true,
  },
  {
    id: 'side-peri-peri-fingerchips',
    name: 'Peri Peri Fingerchips',
    category: 'sides-extras',
    price: 99,
    isVegetarian: true,
  },

  // ==========================================
  // 8. WRAPS
  // ==========================================
  {
    id: 'wrap-mexican',
    name: 'Mexican Wrap',
    category: 'wraps',
    price: 99,
    isVegetarian: true,
  },
  {
    id: 'wrap-cheese-potato',
    name: 'Cheese Potato Wrap',
    category: 'wraps',
    price: 119,
    isVegetarian: true,
  },
  {
    id: 'wrap-paneer',
    name: 'Paneer Wrap',
    category: 'wraps',
    price: 149,
    isVegetarian: true,
  },

  // ==========================================
  // 9. WOOD & BRICK FIRED BRICK OVEN PIZZAS
  // 100% Vegetarian Range
  // ==========================================
  {
    id: 'pizza-tandoori-mushroom',
    name: 'Tandoori Mushroom',
    category: 'pizza',
    price: 330,
    description: 'Tandoori sauce, roasted button mushrooms, mozzarella, fresh cheese, oregano and chilli flakes, kissed by the fire.',
    spiceLabel: 'Medium Spice',
    isVegetarian: true,
    isWoodFired: true,
    sizes: [
      { size: '8-inch', price: 330 },
      { size: '10-inch', price: 370 },
      { size: '12-inch', price: 399 },
    ],
  },
  {
    id: 'pizza-peri-peri-paneer',
    name: 'Peri Peri Paneer Pataka',
    category: 'pizza',
    price: 330,
    description: 'Peri peri sauce over tomato base, mozzarella, onion, jalapeño and paprika, finished with a dry drizzle.',
    spiceLabel: 'Hot',
    isVegetarian: true,
    isWoodFired: true,
    sizes: [
      { size: '8-inch', price: 330 },
      { size: '10-inch', price: 380 },
      { size: '12-inch', price: 399 },
    ],
  },
  {
    id: 'pizza-neapolitan-basil',
    name: 'Neapolitan Basil',
    category: 'pizza',
    price: 310,
    description: 'Slow-simmered San Marzano-style tomato sauce, mozzarella, basil leaf and extra virgin olive oil.',
    spiceLabel: 'Classic',
    isVegetarian: true,
    isWoodFired: true,
    sizes: [
      { size: '8-inch', price: 310 },
      { size: '10-inch', price: 350 },
      { size: '12-inch', price: 399 },
    ],
  },
  {
    id: 'pizza-green-garden-seprheem',
    name: 'Green Garden Seprheem*',
    category: 'pizza',
    price: 320,
    description: 'Pizza sauce, mozzarella, broccoli, capsicum, onion, mushroom, olives, mini chutney, oregano and chilli flakes.',
    spiceLabel: 'Fresh & Herby',
    isVegetarian: true,
    isWoodFired: true,
    flaggedForVerification: true,
    verificationNote: 'Name preserved as "Green Garden Seprheem*" as printed on menu; flagged for owner verification.',
    sizes: [
      { size: '8-inch', price: 320 },
      { size: '10-inch', price: 360 },
      { size: '12-inch', price: 399 },
    ],
  },
  {
    id: 'pizza-tandoori-corn-cheese',
    name: 'Tandoori Corn Cheese Pizza',
    category: 'pizza',
    price: 310,
    description: 'Tandoori sauce, sweet corn, mozzarella, oregano and chilli flakes, finished in the fire.',
    spiceLabel: 'Medium Spice',
    isVegetarian: true,
    isWoodFired: true,
    sizes: [
      { size: '8-inch', price: 310 },
      { size: '10-inch', price: 350 },
      { size: '12-inch', price: 399 },
    ],
  },
  {
    id: 'pizza-four-cheese-fista',
    name: 'Four Cheese Fista',
    category: 'pizza',
    price: 340,
    description: 'Fermented dough finished in the brick oven, garlic butter base with parmesan, mozzarella, feta, parmesan cream cheese and cheddar.',
    spiceLabel: 'Rich & Creamy',
    isVegetarian: true,
    isWoodFired: true,
    sizes: [
      { size: '8-inch', price: 340 },
      { size: '10-inch', price: 380 },
      { size: '12-inch', price: 399 },
    ],
  },

  // ==========================================
  // 10. SANDWICHES
  // (All served with fries)
  // ==========================================
  {
    id: 'sandwich-cheese-grill',
    name: 'Cheese Grill Sandwich',
    category: 'sandwiches',
    price: 119,
    isVegetarian: true,
    servingNote: 'Served with fries',
  },
  {
    id: 'sandwich-sweet-corn',
    name: 'Sweet Corn Sandwich',
    category: 'sandwiches',
    price: 149,
    isVegetarian: true,
    servingNote: 'Served with fries',
  },
  {
    id: 'sandwich-paneer-cheese-grill',
    name: 'Paneer Cheese Grill Sandwich',
    category: 'sandwiches',
    price: 189,
    isVegetarian: true,
    servingNote: 'Served with fries',
  },
  {
    id: 'sandwich-veg-club',
    name: 'Veg Club Sandwich',
    category: 'sandwiches',
    price: 199,
    isVegetarian: true,
    servingNote: 'Served with fries',
  },
  {
    id: 'sandwich-mushroom-cheese',
    name: 'Mushroom Cheese Sandwich',
    category: 'sandwiches',
    price: 209,
    isVegetarian: true,
    servingNote: 'Served with fries',
  },

  // ==========================================
  // 11. BURGERS
  // ==========================================
  {
    id: 'burger-aloo-tikki',
    name: 'Aloo Tikki Burger',
    category: 'burgers',
    price: 89,
    isVegetarian: true,
  },
  {
    id: 'burger-mexican',
    name: 'Mexican Burger',
    category: 'burgers',
    price: 119,
    isVegetarian: true,
  },
  {
    id: 'burger-classic',
    name: 'Classic Burger',
    category: 'burgers',
    price: 180,
    isVegetarian: true,
    servingNote: 'Served with fries',
    description: 'Veg deep-fried patty, plain mayo, lettuce, onion & tomato. Served with French fries.',
  },
  {
    id: 'burger-paneer-crunch',
    name: 'Paneer Crunch Burger',
    category: 'burgers',
    price: 199,
    isVegetarian: true,
    description: 'Crispy paneer patty, chipotle mayo, lettuce, tomato & onion.',
  },
];
