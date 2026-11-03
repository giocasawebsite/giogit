export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'pizza' | 'gaming' | 'events';
}

export const faqData: FAQItem[] = [
  {
    category: 'general',
    question: 'How is GioCasa structured across its two floors?',
    answer: 'GioCasa is thoughtfully divided across two distinct hospitality zones: The 1st Floor houses our Dine-in Restaurant and Hot-Shot Pool Table — featuring authentic wood-fired pizzas baked at 450°C, specialty cafés, mocktails, and a slate 8-ball pool table. The Basement houses our High-Octane Gaming Arena — equipped with ultra-fast PS5 stations (4K 120Hz) and force-feedback Racing Simulator cockpits.'
  },
  {
    category: 'general',
    question: 'Do I need to book in advance or can I walk in?',
    answer: 'Walk-ins are always welcome! However, for Friday to Sunday evenings, PS5 tournament stations, the pool table, and group birthday parties, advance reservation is recommended to secure your preferred slot.'
  },
  {
    category: 'pizza',
    question: 'What makes GioCasa wood-fired pizza unique in Ayodhya?',
    answer: 'We slow-ferment our dough for 48 hours for maximum digestibility, light airy cornicione (crust), and authentic Neapolitan flavor. Each pizza is hand-stretched and baked in our 450°C wood-fired oven in under 90 seconds using premium Italian pomodoro tomatoes and fresh mozzarella.'
  },
  {
    category: 'pizza',
    question: 'Is your food 100% vegetarian / halal / hygienic?',
    answer: 'Our entire food menu is prepared with the utmost hygiene standards using farm-fresh ingredients. We offer extensive vegetarian, vegan-friendly, and pure cheese preparations with zero artificial preservatives.'
  },
  {
    category: 'pizza',
    question: 'Do you deliver wood-fired pizza across Ayodhya?',
    answer: 'Yes! We deliver across Ayodhya via direct WhatsApp ordering and phone dispatch. We use specialized heat-retaining thermal boxes so your pizza arrives piping hot with a crispy crust.'
  },
  {
    category: 'gaming',
    question: 'What are the charges for PS5, Pool, and Board Games?',
    answer: 'PS5 stations start from ₹149/hour per controller, Hot-Shot 8-ball pool is ₹199/hour per table, and foosball is ₹99/hour. Our 50+ tabletop board game library is complimentary with any food or beverage order over ₹200!'
  },
  {
    category: 'gaming',
    question: 'Can we eat pizza and drink coffee while gaming?',
    answer: 'Absolutely! You can order wood-fired pizzas, burgers, frappes, and snacks directly to your gaming station or lounge table so you never have to pause the action.'
  },
  {
    category: 'events',
    question: 'Can we host birthday parties or private group celebrations?',
    answer: 'Yes! We host birthdays, anniversaries, corporate gaming mixers, and private tournaments. We offer custom packages including gaming floor access, customized pizza & drink menus, cake-cutting setup, and tournament coordination.'
  }
];
