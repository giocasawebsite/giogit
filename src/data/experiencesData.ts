import { NightExperience } from '../types';

export const nightExperiences: NightExperience[] = [
  {
    id: 'dinner-night',
    title: 'The Italian Hearth Night',
    tagline: 'Artisanal Wood-Fired Pizza • Pour-over Coffee • Candlelit Conversation',
    idealFor: 'Couples, cozy family dinners & quiet catchups',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    duration: '1.5 - 2 Hours',
    vibe: 'Warm, rustic & aromatic',
    bookingType: 'dining',
    includes: [
      'Reserved table seating in the 1st Floor Dine-in Restaurant',
      'Chef-curated wood-fired pizza & white sauce pasta',
      'Artisanal hazelnut coffee & chilled frappes',
      'Option to head downstairs to the Basement Gaming Arena after dessert'
    ]
  },
  {
    id: 'game-night',
    title: 'The Gaming Arena Duel',
    tagline: 'PS5 Rivals • 8-Ball Showdown • Loaded Nachos • High Octane Fun',
    idealFor: 'Best friends, competitive duos & weekend warriors',
    image: '/assets/real/ps5_setup.png',
    duration: '2 - 3 Hours',
    vibe: 'Competitive, energetic & loud cheering',
    bookingType: 'gaming',
    includes: [
      'Dedicated PS5 4K station with DualSense controllers',
      '1 hour reserved on the Hot-Shot pool table',
      'Loaded nachos, crispy fries & cold coffees served station-side',
      'Fast-paced foosball decider matches'
    ]
  },
  {
    id: 'birthday-bash',
    title: 'The GioCasa Birthday Takeover',
    tagline: 'Private Lounge Zone • Pizza Feast • Custom Tournament • Music',
    idealFor: 'Birthday celebrations, graduation parties & milestone bashes (6–25 guests)',
    image: '/assets/real/foosball_lounge.png',
    duration: '3 - 4 Hours',
    vibe: 'Celebratory, unhurried & unforgettable',
    bookingType: 'event',
    includes: [
      'Dedicated section of the first floor gaming lounge',
      'Customized party pizza buffet & shake towers',
      'Organized FIFA / Tekken / Pool mini-tournament with trophy recognition',
      'Cake-cutting setup with party lighting & playlist control'
    ]
  },
  {
    id: 'friends-hangout',
    title: 'The Board Games & Slices Circle',
    tagline: '50+ Tabletop Classics • Endless Chai • Big Pizza Sharing Platters',
    idealFor: 'Groups of 4–8 looking to unplug and laugh for hours',
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
    duration: '2 - 3 Hours',
    vibe: 'Social, strategy, friendly banter',
    bookingType: 'combo',
    includes: [
      'Large wooden dining table with unlimited board game library access',
      'Game master rule explanations for Catan, Codenames & Exploding Kittens',
      'Hot Adrak Chai, crispy burger platters & wood-fired pizzas',
      'No rush dining policy — stay as long as the match lasts'
    ]
  },
  {
    id: 'tournament-night',
    title: 'Friday Night Championship',
    tagline: 'Official Brackets • Cash & Trophy Prizes • Live Streamed on Big Screens',
    idealFor: 'Solo gamers and squads looking to prove their skills in Ayodhya',
    image: '/assets/real/pool_table.png',
    duration: '3 - 5 Hours',
    vibe: 'Championship tension & community glory',
    bookingType: 'event',
    includes: [
      'Seeded tournament entry (EA Sports FC or 8-Ball Pool)',
      'Free welcome mocktail & game-day snacks',
      'Cash prize pool + GioCasa VIP Champion pass for the winner',
      'Spectator seating with live commentary'
    ]
  }
];

export const eventPackages = [
  {
    id: 'pkg-birthday-silver',
    name: 'Silver Birthday Pack',
    guests: '6 - 10 Guests',
    pricePerPerson: 499,
    features: [
      '2 Hours of Unlimited Gaming (PS5, Pool, Foosball & Board Games)',
      '2 Signature Wood-Fired Pizzas + Loaded Nachos Platter',
      'Welcome Drinks (Choice of Mocktails or Cold Coffee)',
      'Party music & Cake cutting setup'
    ]
  },
  {
    id: 'pkg-birthday-gold',
    name: 'Gold Championship Pack',
    popular: true,
    guests: '10 - 20 Guests',
    pricePerPerson: 699,
    features: [
      '3.5 Hours Private Lounge Section Access',
      'Unlimited Wood-Fired Pizza Feast + Burgers + Pasta + Shakes',
      'Organized Tournament with Custom GioCasa Trophy for the Birthday Person',
      'Professional Polaroid instant group photo souvenirs',
      'Dedicated host & game master for your group'
    ]
  },
  {
    id: 'pkg-venue-buyout',
    name: 'Full Floor VIP Buyout',
    guests: '20 - 45 Guests',
    pricePerPerson: 899,
    features: [
      'Exclusive private buyout of the entire 1st Floor Gaming Lounge',
      'Full open kitchen & beverage bar buffet package',
      'Custom playlist & projection screen branding',
      'Dedicated service team & tournament coordinator'
    ]
  }
];
