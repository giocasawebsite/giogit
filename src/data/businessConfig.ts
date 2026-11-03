export const businessConfig = {
  brandName: "GioCasa",
  tagline: "Eat. Play. Stay.",
  slogan: "Wood-fired pizza, good games and even better company.",
  location: {
    city: "Ayodhya",
    state: "Uttar Pradesh",
    country: "India",
    addressLine1: "Civil Lines / Main Hub",
    addressLine2: "Ayodhya, Uttar Pradesh 224001",
    landmark: "Near City Center",
    googleMapsUrl: "https://maps.google.com/?q=Ayodhya+Uttar+Pradesh",
    mapEmbedPlaceholder: "Ayodhya, Uttar Pradesh, India"
  },
  contact: {
    phone: "+91 96960 28522",
    displayPhone: "+91 96960 28522",
    whatsappNumber: "919696028522", // Format for wa.me links
    email: "ciao@giocasa.in",
    instagramHandle: "@giocasa.ayodhya",
    instagramUrl: "https://instagram.com",
  },
  hours: [
    { days: "Monday – Thursday", timing: "11:00 AM – 11:00 PM", note: "Dine-in, Gaming & Delivery" },
    { days: "Friday – Sunday", timing: "11:00 AM – Midnight", note: "Late-night Gaming & Pizza" }
  ],
  delivery: {
    status: "Active",
    radius: "Delivering across Ayodhya",
    freeDeliveryAbove: 499,
    avgDeliveryTime: "30-45 mins",
    orderVia: ["WhatsApp Direct", "Phone Call", "Zomato / Swiggy (Coming Soon)"]
  },
  floors: {
    firstFloor: {
      level: "1st Floor • Restaurant & Pool",
      name: "GioCasa Dine-in Restaurant & Hot-Shot Pool",
      vibe: "Warm, Artisanal & Relaxed Social Dining",
      highlights: [
        "Artisan Wood-Fired Pizza Oven (450°C)",
        "Hot-Shot Slate 8-Ball Championship Pool Table",
        "Specialty Espresso, Café Brews & Handcrafted Mocktails",
        "Cozy Banquettes & Warm Wood Paneling"
      ],
      idealFor: "Dinner dates, family meals, friends shooting pool, relaxed dining & celebrations."
    },
    basement: {
      level: "Basement • Gaming Arena",
      name: "GioCasa High-Octane Gaming Arena & Racing Sim",
      vibe: "High Energy, Cyberpunk & Competitive Gaming",
      highlights: [
        "Ultra-Immersive Force-Feedback Racing Simulator Cockpit",
        "PlayStation 5 (PS5) Stations with 4K HDR 120Hz Displays",
        "Top Titles: EA Sports FC 25, Mortal Kombat 1, GTA V, Tekken 8",
        "Dual-Controller Couches & Pro Gaming Surround Sound"
      ],
      idealFor: "Intense multiplayer duels, racing lap times, birthday gaming tournaments, group gaming sessions."
    },
    // Backwards-compatible aliases
    get downstairs() {
      return this.basement;
    },
    get upstairs() {
      return this.firstFloor;
    }
  }
};
