import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Search,
  Sparkles,
  Trophy,
  Filter,
  Flame,
  Clock,
  Users,
  CheckCircle2,
  CalendarDays,
  X,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Info,
  Tv,
  RotateCcw,
  ShieldCheck,
  Disc3,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { PageRoute, GameItem, RouteParams } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';

interface GamesPageProps {
  onNavigate: (page: PageRoute, params?: RouteParams) => void;
}

// Fallback high-res cover art in case of any network interruption
// Fallback high-res cover art in case of any network interruption
const DEFAULT_GAME_ARTWORK = '/assets/games/gta-5_cover.jpg';
const DEFAULT_HERO_ARTWORK = '/assets/games/gta-5_hero.jpg';

// Fallback initial list of all 14 games in case backend is loading
const FALLBACK_14_GAMES: GameItem[] = [
  {
    id: 'game-gta-5',
    title: 'GTA 5',
    category: 'ps5',
    genre: 'Action',
    description: 'Experience the genre-defining open-world masterpiece in Los Santos. Features ray-traced 4K visuals, 60 FPS performance, fast-paced heist missions, and complete open-world freedom across Franklin, Michael, and Trevor.',
    image: '/assets/games/gta-5_cover.jpg',
    heroImage: '/assets/games/gta-5_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: true,
    badge: 'Blockbuster Classic',
    resourceId: 'ps5-station-2',
    resourceName: 'PS5 Pro Station 2 (4K 120Hz)',
    playOptions: ['Single Player Campaign', '4K 60FPS Fidelity', 'DualSense Haptics', 'Open World Sandbox'],
    minPlayers: 1,
    maxPlayers: 1,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-gta-6',
    title: 'GTA 6',
    category: 'ps5',
    genre: 'Action',
    description: 'The most anticipated open-world spectacle of the generation. Set in the neon-soaked streets and coastal Everglades of Vice City and the state of Leonida. Pre-configured for GioCasa PS5 Pro stations upon launch.',
    image: '/assets/games/gta-6_cover.webp',
    heroImage: '/assets/games/gta-6_hero.jpg',
    isAvailable: false,
    availabilityStatus: 'coming_soon',
    isFeatured: true,
    badge: 'Coming Soon',
    resourceId: 'ps5-station-2',
    resourceName: 'PS5 Pro Station 2 (Basement Arena)',
    playOptions: ['Vice City Next-Gen', 'Anticipated 2025/2026', 'PS5 Pro Enhanced Ready', 'Cinematic Dual Protagonists'],
    minPlayers: 1,
    maxPlayers: 1,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-wwe',
    title: 'WWE',
    category: 'ps5',
    genre: 'Fighting',
    description: 'Celebrate 40 years of WrestleMania with legendary icons and modern superstars. Intense 4-player couch multiplayer, Royal Rumble brawls, and precision ring reversals with friends.',
    image: '/assets/games/wwe_cover.jpg',
    heroImage: '/assets/games/wwe_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'Squad Favorite',
    resourceId: 'ps5-station-3',
    resourceName: 'PS5 Pro Station 3 (Squad Lounge)',
    playOptions: ['1-4 Players Local Couch', 'WrestleMania Showcase', 'Ladder & Steel Cage Matches', 'DualSense Vibration'],
    minPlayers: 1,
    maxPlayers: 4,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-tekken-8',
    title: 'TEKKEN 8',
    category: 'ps5',
    genre: 'Fighting',
    description: 'Powered by Unreal Engine 5 with groundbreaking graphics and the aggressive Heat System. High-speed martial arts combat, visceral stage destruction, and tournament-grade competition.',
    image: '/assets/games/tekken-8_cover.jpg',
    heroImage: '/assets/games/tekken-8_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: true,
    badge: 'Esports Tournament',
    resourceId: 'ps5-station-1',
    resourceName: 'PS5 Pro Station 1 (4K 120Hz)',
    playOptions: ['1v1 Competitive Duels', '4K 120Hz Low Latency', 'Heat Combat Mechanics', 'Tournament Arena Ready'],
    minPlayers: 1,
    maxPlayers: 2,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-mortal-kombat',
    title: 'MORTAL KOMBAT',
    category: 'ps5',
    genre: 'Fighting',
    description: 'A reborn universe crafted by Fire God Liu Kang. Features the game-changing Kameo Fighter system, brutal cinematic Fatalities, and razor-sharp local fighting duels on ultra-low latency displays.',
    image: '/assets/games/mortal-kombat_cover.jpg',
    heroImage: '/assets/games/mortal-kombat_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'Hardcore Fighter',
    resourceId: 'ps5-station-1',
    resourceName: 'PS5 Pro Station 1 (4K 120Hz)',
    playOptions: ['1v1 Local Versus', 'Kameo Assist Mechanics', 'Cinematic Fatalities', 'Low-Lag Gaming Display'],
    minPlayers: 1,
    maxPlayers: 2,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-the-last-of-us',
    title: 'The Last of Us',
    category: 'ps5',
    genre: 'Adventure',
    description: 'The critically acclaimed narrative masterpiece. Follow Joel and Ellie across post-pandemic America with breathtaking storytelling, stealth mechanics, and harrowing survival encounters.',
    image: '/assets/games/the-last-of-us_cover.jpg',
    heroImage: '/assets/games/the-last-of-us_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'Masterpiece Story',
    resourceId: 'ps5-station-2',
    resourceName: 'PS5 Pro Station 2 (4K 120Hz)',
    playOptions: ['Cinematic Story Campaign', '3D Spatial Audio', 'Adaptive Triggers', 'Ultra-Realistic Visuals'],
    minPlayers: 1,
    maxPlayers: 1,
    order: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-fifa-2k26',
    title: 'FIFA 2K26',
    category: 'ps5',
    genre: 'Sports',
    description: 'Next-generation football action featuring true ball physics, authentic international club rosters, tactical dribbling, and electric 4-player head-to-head match-ups.',
    image: '/assets/games/fifa-2k26_cover.jpg',
    heroImage: '/assets/games/fifa-2k26_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: true,
    badge: 'Arena Tournament',
    resourceId: 'ps5-station-1',
    resourceName: 'PS5 Pro Station 1 (4K 120Hz)',
    playOptions: ['1-4 Players Local Match', 'HyperMotion Physics', 'Custom Tournaments', '4K 120Hz Fluidity'],
    minPlayers: 1,
    maxPlayers: 4,
    order: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-call-of-duty',
    title: 'Call of Duty',
    category: 'ps5',
    genre: 'Action',
    description: 'Fast-paced military tactical shooter. Jump into heart-pounding multiplayer gunfights, objective modes, and precision reflex shooting on high-refresh low-lag displays.',
    image: '/assets/games/call-of-duty_cover.jpg',
    heroImage: '/assets/games/call-of-duty_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'High Intensity',
    resourceId: 'ps5-station-3',
    resourceName: 'PS5 Pro Station 3 (Squad Lounge)',
    playOptions: ['Split-Screen / Local Co-op', 'Tactical FPS Gunplay', 'High Refresh Competitive', 'Pro Headset Support'],
    minPlayers: 1,
    maxPlayers: 2,
    order: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-spider-man',
    title: 'Spider-Man',
    category: 'ps5',
    genre: 'Action',
    description: 'Peter Parker and Miles Morales swing through Marvel New York with near-instant fast travel, Web Wings across skyscrapers, Symbiote combat, and legendary Marvel villains.',
    image: '/assets/games/spider-man_cover.jpg',
    heroImage: '/assets/games/spider-man_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: true,
    badge: 'Fan Favorite',
    resourceId: 'ps5-station-2',
    resourceName: 'PS5 Pro Station 2 (4K 120Hz)',
    playOptions: ['Single Player Action', 'Near-Instant Fast Travel', 'Ray-Traced NYC', 'Adaptive Trigger Web-Swinging'],
    minPlayers: 1,
    maxPlayers: 1,
    order: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-forza',
    title: 'Forza',
    category: 'racing',
    genre: 'Racing',
    description: 'The ultimate open-world automotive adventure. Drive hundreds of the world greatest supercars through vibrant Mexican landscapes, deserts, jungles, and mountain highways.',
    image: '/assets/games/forza_cover.jpg',
    heroImage: '/assets/games/forza_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: true,
    badge: 'Simulator Experience',
    resourceId: 'racing-station-1',
    resourceName: 'Pro Racing Simulator Rig (Force Feedback)',
    playOptions: ['Force Feedback Steering Rig', 'GT Racing Bucket Seat', 'Hundreds of Supercars', 'Open World Expeditions'],
    minPlayers: 1,
    maxPlayers: 2,
    order: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-f1',
    title: 'F1',
    category: 'racing',
    genre: 'Racing',
    description: 'Step into the cockpit of an official Formula 1 machine. Dynamic tire wear physics, authentic telemetry, and official circuits integrated with the force-feedback simulator cockpit.',
    image: '/assets/games/f1_cover.jpg',
    heroImage: '/assets/games/f1_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'Championship Sim',
    resourceId: 'racing-station-1',
    resourceName: 'Pro Racing Simulator Rig (Force Feedback)',
    playOptions: ['Direct Cockpit Simulator', 'Official Circuits & Telemetry', 'Precision Force Feedback', 'Grand Prix Hot-Lap Challenges'],
    minPlayers: 1,
    maxPlayers: 2,
    order: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-asphalt',
    title: 'Asphalt',
    category: 'racing',
    genre: 'Racing',
    description: 'Hyper-arcade racing thrills with gravity-defying nitro stunts, 360-barrel rolls, licensed hypercars (Ferrari, Porsche, Lamborghini), and lightning-fast arcade velocity.',
    image: '/assets/games/asphalt_cover.jpg',
    heroImage: '/assets/games/asphalt_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'Arcade Rush',
    resourceId: 'racing-station-1',
    resourceName: 'Pro Racing Simulator Rig (Force Feedback)',
    playOptions: ['Arcade Velocity Battles', 'Nitro Boost Stunts', 'Licensed Hypercars', 'Spectator Screen Mirroring'],
    minPlayers: 1,
    maxPlayers: 2,
    order: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-god-of-war',
    title: 'God of War',
    category: 'ps5',
    genre: 'Adventure',
    description: 'Journey across the Nine Realms with Kratos and Atreus as Fimbulwinter tightens its grip. Brutal Leviathan Axe combat, Norse mythological gods, and breathtaking cinematic scale.',
    image: '/assets/games/god-of-war_cover.jpg',
    heroImage: '/assets/games/god-of-war_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'Award Winner',
    resourceId: 'ps5-station-2',
    resourceName: 'PS5 Pro Station 2 (4K 120Hz)',
    playOptions: ['Epic Norse Mythology', 'Leviathan Axe Haptics', '4K HDR Visuals', 'Critically Acclaimed Combat'],
    minPlayers: 1,
    maxPlayers: 1,
    order: 13,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'game-minecraft',
    title: 'Minecraft',
    category: 'ps5',
    genre: 'Sandbox',
    description: 'Infinite possibilities. Build magnificent architectural wonders, explore perilous caves, survive the night against mobs, or team up in local split-screen creative building sessions.',
    image: '/assets/games/minecraft_cover.png',
    heroImage: '/assets/games/minecraft_hero.jpg',
    isAvailable: true,
    availabilityStatus: 'available',
    isFeatured: false,
    badge: 'All Ages Classic',
    resourceId: 'ps5-station-3',
    resourceName: 'PS5 Pro Station 3 (Squad Lounge)',
    playOptions: ['1-4 Players Split-Screen', 'Endless Creative Sandbox', 'Survival Exploration', 'Relaxing Lounge Gameplay'],
    minPlayers: 1,
    maxPlayers: 4,
    order: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const GENRES = ['All', 'Action', 'Racing', 'Fighting', 'Sports', 'Adventure', 'Sandbox'];

export const GamesPage: React.FC<GamesPageProps> = ({ onNavigate }) => {
  const [games, setGames] = useState<GameItem[]>(FALLBACK_14_GAMES);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedStationFilter, setSelectedStationFilter] = useState<'all' | 'ps5' | 'racing'>('all');
  const [activeModalGame, setActiveModalGame] = useState<GameItem | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  // Carousel ref
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch games from backend with fallback
  useEffect(() => {
    let isMounted = true;
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/games');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            if (isMounted) {
              // Ensure all 14 requested games are present even if DB is fresh
              const dbGames: GameItem[] = json.data;
              const merged = [...dbGames];
              for (const fb of FALLBACK_14_GAMES) {
                if (!merged.some((g) => g.title.toLowerCase() === fb.title.toLowerCase() || g.id === fb.id)) {
                  merged.push(fb);
                }
              }
              setGames(merged);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch /api/games, displaying local catalogue:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGames();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered games based on search, genre, and station
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.title.toLowerCase().includes(q) ||
        (g.genre && g.genre.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.badge && g.badge.toLowerCase().includes(q));

      // 2. Genre Filter
      const matchesGenre = selectedGenre === 'All' || (g.genre && g.genre.toLowerCase() === selectedGenre.toLowerCase());

      // 3. Station / Category Filter
      const matchesStation =
        selectedStationFilter === 'all' ||
        (selectedStationFilter === 'ps5' && (g.category === 'ps5' || !g.category)) ||
        (selectedStationFilter === 'racing' && g.category === 'racing');

      return matchesSearch && matchesGenre && matchesStation;
    });
  }, [games, searchQuery, selectedGenre, selectedStationFilter]);

  // Featured games for spotlight
  const featuredGames = useMemo(() => {
    const list = games.filter((g) => g.isFeatured || g.badge);
    return list.length > 0 ? list : games.slice(0, 4);
  }, [games]);

  const currentFeatured = featuredGames[featuredIndex] || featuredGames[0] || games[0];

  // Carousel scroll helpers
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const distance = 340;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  // Keyboard escape listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModalGame) {
        setActiveModalGame(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalGame]);

  // Handle booking action
  const handleBookGame = (game: GameItem) => {
    setActiveModalGame(null);
    if (game.resourceId) {
      onNavigate('book', { resourceId: game.resourceId });
    } else if (game.category === 'racing') {
      onNavigate('book', { resourceId: 'racing-station-1' });
    } else {
      onNavigate('book', { resourceId: 'ps5-station-1' });
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker text-white pt-24 sm:pt-28 pb-24 selection:bg-brand-pink selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-25">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-brand-pink/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-16">
        
        {/* ============================================================== */}
        {/* 1. HERO HEADER                                                 */}
        {/* ============================================================== */}
        <div className="text-center max-w-4xl mx-auto space-y-4 pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-surface/90 border border-brand-border text-xs uppercase tracking-[0.25em] text-brand-blue font-semibold shadow-inner">
            <Gamepad2 className="w-4 h-4 text-brand-pink" />
            <span>Interactive Gaming Wall • 14 Flagship Titles</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            The GioCasa Gaming Wall
          </h1>

          <p className="font-italic-accent text-xl sm:text-2xl text-brand-orange italic">
            PS5 Pro 4K 120Hz Arenas • Pro Force-Feedback Racing Cockpit
          </p>

          <p className="text-sm sm:text-base text-brand-subtle max-w-2xl mx-auto font-light leading-relaxed">
            Explore our curated AAA blockbuster catalogue, tournament-grade fighting duels, immersive story campaigns, and cockpit racing hot-laps. Select any title to view play options, station specs, or book your controller.
          </p>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-3 text-xs text-brand-subtle font-mono">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-brand-border/60">
              <Tv className="w-3.5 h-3.5 text-brand-blue" />
              <span>4K 120Hz Displays</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-brand-border/60">
              <Sparkles className="w-3.5 h-3.5 text-brand-pink" />
              <span>DualSense Haptics</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-brand-border/60">
              <Flame className="w-3.5 h-3.5 text-brand-orange" />
              <span>Sim Cockpit Rig</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-surface border border-brand-border/60">
              <Trophy className="w-3.5 h-3.5 text-brand-blue" />
              <span>Arena Tournament Ready</span>
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. FEATURED SPOTLIGHT SHOWCASE                                 */}
        {/* ============================================================== */}
        {currentFeatured && (
          <div className="relative rounded-3xl overflow-hidden border border-brand-border/80 bg-brand-surface shadow-2xl">
            {/* Ambient Blurred Artwork Glow */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <img
                src={currentFeatured.heroImage || currentFeatured.image || DEFAULT_HERO_ARTWORK}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover opacity-20 blur-3xl scale-125"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-brand-surface via-brand-surface/95 to-brand-surface/70" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px] sm:min-h-[460px] relative z-10">
              {/* Left Column: Editorial Info */}
              <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative z-10 space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-xs font-semibold uppercase tracking-wider text-brand-pink">
                      Featured Spotlight
                    </span>
                    {currentFeatured.badge && (
                      <span className="px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-xs font-mono font-semibold text-brand-orange">
                        {currentFeatured.badge}
                      </span>
                    )}
                    {currentFeatured.availabilityStatus === 'coming_soon' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300 uppercase">
                        Coming Soon
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-400 uppercase">
                        Available on Station
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                    {currentFeatured.title}
                  </h2>

                  <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed max-w-xl">
                    {currentFeatured.description}
                  </p>

                  {/* Play Options Pills */}
                  {currentFeatured.playOptions && currentFeatured.playOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {currentFeatured.playOptions.map((opt, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-brand-charcoalDeep/90 border border-brand-border/60 text-xs font-mono text-brand-cream/80"
                        >
                          ✓ {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveModalGame(currentFeatured)}
                    className="px-6 py-3 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <span>View Game Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {currentFeatured.availabilityStatus !== 'coming_soon' && (
                    <button
                      onClick={() => handleBookGame(currentFeatured)}
                      className="px-6 py-3 rounded-full bg-brand-surfaceElevated hover:bg-brand-charcoal border border-brand-border hover:border-brand-blue text-xs font-semibold uppercase tracking-wider text-white hover:text-brand-blue transition-all flex items-center gap-2"
                    >
                      <Gamepad2 className="w-4 h-4 text-brand-blue" />
                      <span>Book This Game</span>
                    </button>
                  )}

                  {/* Carousel Jump Dots */}
                  <div className="ml-auto flex items-center gap-1.5 pt-2 sm:pt-0">
                    {featuredGames.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFeaturedIndex(idx)}
                        aria-label={`Featured slide ${idx + 1}`}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          featuredIndex === idx ? 'w-7 bg-brand-pink' : 'bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Artwork */}
              <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full overflow-hidden bg-brand-charcoalDeep">
                <img
                  src={currentFeatured.heroImage || currentFeatured.image || DEFAULT_HERO_ARTWORK}
                  alt={currentFeatured.title}
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = currentFeatured.image || DEFAULT_GAME_ARTWORK;
                  }}
                  className="w-full h-full object-cover object-center brightness-95 hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-brand-surface via-transparent to-transparent" />
                
                {/* Station Tag Overlay */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-brand-darker/90 backdrop-blur-md border border-brand-border text-xs font-mono font-semibold text-brand-blue flex items-center gap-1.5 shadow-lg">
                  <Tv className="w-3.5 h-3.5" />
                  <span>{currentFeatured.resourceName || (currentFeatured.category === 'racing' ? 'Pro Sim Cockpit' : 'PS5 Pro Station')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. HORIZONTAL DISCOVERY CAROUSEL: "ARENA PICKS"                 */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-brand-orange font-semibold block">
                Quick Browse
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Popular In The Arena
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollCarousel('left')}
                aria-label="Scroll left"
                className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border hover:border-brand-pink text-white hover:text-brand-pink flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border hover:border-brand-pink text-white hover:text-brand-pink flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
          >
            {games.map((game) => (
              <div
                key={game.id}
                onClick={() => setActiveModalGame(game)}
                className="snap-start shrink-0 w-[240px] sm:w-[280px] bg-brand-surface rounded-2xl border border-brand-border hover:border-brand-pink/50 overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-brand-charcoalDeep">
                  <img
                    src={game.heroImage || game.image || DEFAULT_HERO_ARTWORK}
                    alt={game.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = game.image || DEFAULT_GAME_ARTWORK;
                    }}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent opacity-80" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    {game.availabilityStatus === 'coming_soon' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wider">
                        Soon
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-black text-[10px] font-bold uppercase tracking-wider">
                        Playable
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90">
                      {game.genre || 'Action'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="font-serif text-lg font-bold text-white group-hover:text-brand-pink transition-colors truncate">
                    {game.title}
                  </h4>
                  <p className="text-xs text-brand-subtle font-light line-clamp-2 leading-relaxed">
                    {game.description}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs text-brand-orange font-medium">
                    <span>Inspect Specs</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. SEARCH & FILTER CONTROLS                                    */}
        {/* ============================================================== */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-brand-blue font-semibold block">
                Catalogue Exploration
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                All 14 Gaming Wall Titles
              </h2>
            </div>

            {/* Live Counter */}
            <div className="text-xs font-mono text-brand-subtle">
              Showing <span className="text-brand-pink font-bold">{filteredGames.length}</span> of {games.length} titles
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input (5 cols) */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games by title, genre, keyword..."
                className="w-full pl-11 pr-10 py-3 rounded-full bg-brand-surface border border-brand-border focus:border-brand-pink focus:outline-none text-sm text-white placeholder:text-brand-muted font-light transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Station Filter Pills (4 cols) */}
            <div className="md:col-span-4 flex items-center gap-1.5 p-1 rounded-full bg-brand-surface border border-brand-border">
              <button
                onClick={() => setSelectedStationFilter('all')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedStationFilter === 'all'
                    ? 'bg-brand-pink text-white shadow-luxury-pink'
                    : 'text-brand-subtle hover:text-white'
                }`}
              >
                All Stations
              </button>
              <button
                onClick={() => setSelectedStationFilter('ps5')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedStationFilter === 'ps5'
                    ? 'bg-brand-blue text-brand-darker font-bold shadow-luxury-blue'
                    : 'text-brand-subtle hover:text-white'
                }`}
              >
                PS5 Pro
              </button>
              <button
                onClick={() => setSelectedStationFilter('racing')}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedStationFilter === 'racing'
                    ? 'bg-brand-orange text-brand-darker font-bold shadow-luxury-orange'
                    : 'text-brand-subtle hover:text-white'
                }`}
              >
                Racing Sim
              </button>
            </div>

            {/* Reset Button (3 cols) */}
            <div className="md:col-span-3 flex md:justify-end">
              {(searchQuery || selectedGenre !== 'All' || selectedStationFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGenre('All');
                    setSelectedStationFilter('all');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-subtle hover:text-brand-pink transition-colors py-2 px-3 rounded-lg hover:bg-brand-surface"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Genre Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs uppercase tracking-wider text-brand-muted flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Genre:</span>
            </span>
            {GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedGenre === genre
                    ? 'bg-white text-brand-darker font-bold shadow-md'
                    : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-white hover:border-brand-borderStrong'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. INTERACTIVE GAME CARDS GRID                                 */}
        {/* ============================================================== */}
        {filteredGames.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-brand-border p-12 text-center max-w-lg mx-auto space-y-4 my-12 bg-brand-surface/40">
            <div className="w-14 h-14 rounded-full bg-brand-surface flex items-center justify-center mx-auto text-brand-orange">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-white">No Matching Games Found</h3>
            <p className="text-sm text-brand-subtle font-light">
              We couldn't find any games matching "{searchQuery}". Try searching for popular titles like GTA, Tekken, FIFA, or Forza.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('All');
                setSelectedStationFilter('all');
              }}
              className="px-6 py-2.5 rounded-full bg-brand-surfaceElevated border border-brand-border hover:border-brand-pink text-xs uppercase tracking-wider text-white hover:text-brand-pink transition-colors font-semibold"
            >
              Clear Search & Show All 14 Games
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredGames.map((game, idx) => (
              <GameCard
                key={game.id}
                game={game}
                index={idx}
                onSelect={() => setActiveModalGame(game)}
                onBook={() => handleBookGame(game)}
              />
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. CALL TO ACTION FOOTER BANNER                                */}
        {/* ============================================================== */}
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-brand-surface to-brand-charcoalDeep border border-brand-border relative overflow-hidden text-center space-y-6 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="text-xs uppercase tracking-[0.25em] text-brand-pink font-semibold">
              Ready to Play?
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Reserve Your Station & Controllers in Advance
            </h3>
            <p className="text-sm text-brand-subtle font-light leading-relaxed">
              Skip the line on weekend tournament days. Book a 60, 90, or 120-minute slot on PS5 Pro Stations or our Pro Simulator Rig with wood-fired pizzas and espresso served right to your seating.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate('book')}
                className="py-3 px-8 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Open Gaming Booking Engine</span>
              </button>
              <button
                onClick={() => onNavigate('gaming')}
                className="py-3 px-6 rounded-full bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue text-xs font-semibold uppercase tracking-wider text-white hover:text-brand-blue transition-colors flex items-center gap-2"
              >
                <Tv className="w-4 h-4 text-brand-blue" />
                <span>Explore Arena Hardware</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 7. POLISHED DETAIL MODAL / DRAWER                              */}
      {/* ============================================================== */}
      <AnimatePresence>
        {activeModalGame && (
          <GameDetailModal
            game={activeModalGame}
            onClose={() => setActiveModalGame(null)}
            onBook={() => handleBookGame(activeModalGame)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================================
// INTERACTIVE GAME CARD WITH SMOOTH 3D PERSPECTIVE TILT
// =========================================================================
interface GameCardProps {
  game: GameItem;
  index: number;
  onSelect: () => void;
  onBook: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, index, onSelect, onBook }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState<number>(0);
  const [rotateY, setRotateY] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Subtle 3D tilt calculation on desktop mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 6; // Max 6 deg
    const rotY = ((x - centerX) / centerX) * 6;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
      }}
      className="group bg-brand-surface rounded-3xl border border-brand-border/80 hover:border-brand-pink/50 overflow-hidden flex flex-col justify-between shadow-xl transition-colors duration-300 relative cursor-pointer"
      onClick={onSelect}
    >
      {/* Artwork Header */}
      <div className="relative aspect-[4/5] bg-brand-charcoalDeep overflow-hidden">
        <img
          src={game.image || DEFAULT_GAME_ARTWORK}
          alt={game.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_GAME_ARTWORK;
          }}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 brightness-95"
        />

        {/* Cinematic Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-brand-surface/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
          {game.availabilityStatus === 'coming_soon' ? (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wider shadow-md">
              Coming Soon
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-black text-[10px] font-bold uppercase tracking-wider shadow-md">
              Available
            </span>
          )}

          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-white/90 border border-white/10">
            {game.genre || 'Action'}
          </span>
        </div>

        {/* Floating Station Pill */}
        {game.resourceName && (
          <div className="absolute bottom-3 left-3 right-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-darker/90 backdrop-blur-md border border-brand-border text-[11px] font-mono text-brand-blue truncate max-w-full">
              <Tv className="w-3 h-3 shrink-0" />
              <span className="truncate">{game.resourceName}</span>
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {game.badge && (
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-orange block">
              ★ {game.badge}
            </span>
          )}

          <h3 className="font-serif text-2xl font-bold text-white group-hover:text-brand-pink transition-colors">
            {game.title}
          </h3>

          <p className="text-xs text-brand-subtle font-light line-clamp-3 leading-relaxed">
            {game.description}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between gap-2">
          <span className="text-xs text-brand-pink font-semibold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            <span>Explore Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>

          {game.availabilityStatus !== 'coming_soon' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBook();
              }}
              className="py-1.5 px-3 rounded-full bg-brand-surfaceElevated hover:bg-brand-blue hover:text-brand-darker text-[11px] font-semibold uppercase tracking-wider text-white border border-brand-border transition-colors flex items-center gap-1"
            >
              <Gamepad2 className="w-3 h-3" />
              <span>Book</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// =========================================================================
// POLISHED GAME DETAIL MODAL
// =========================================================================
interface GameDetailModalProps {
  game: GameItem;
  onClose: () => void;
  onBook: () => void;
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({ game, onClose, onBook }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl bg-brand-surface rounded-3xl border border-brand-border overflow-hidden shadow-2xl z-10 my-8 max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all hover:scale-105"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto">
          {/* Header Banner Artwork */}
          <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-brand-charcoalDeep overflow-hidden">
            <img
              src={game.heroImage || game.image || DEFAULT_HERO_ARTWORK}
              alt={game.title}
              loading="eager"
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = game.image || DEFAULT_GAME_ARTWORK;
              }}
              className="w-full h-full object-cover brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-brand-surface/40 to-transparent" />

            {/* Badges Overlay */}
            <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {game.availabilityStatus === 'coming_soon' ? (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg">
                    Coming Soon
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg">
                    Available in Lounge
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-mono text-white border border-white/20">
                  {game.genre || 'Action'}
                </span>
              </div>

              {game.badge && (
                <span className="px-3 py-1 rounded-full bg-brand-orange/90 text-black text-xs font-mono font-bold">
                  {game.badge}
                </span>
              )}
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-24 sm:w-28 shrink-0 aspect-[4/5] rounded-xl overflow-hidden border border-brand-border/80 shadow-xl bg-brand-charcoalDeep hidden sm:block">
                <img
                  src={game.image || DEFAULT_GAME_ARTWORK}
                  alt={game.title}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_GAME_ARTWORK;
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2 flex-1">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {game.title}
                </h2>
                <p className="text-sm sm:text-base text-brand-subtle font-light leading-relaxed">
                  {game.description}
                </p>
              </div>
            </div>

            {/* Station / Hardware Mapping */}
            <div className="p-4 rounded-2xl bg-brand-charcoalDeep/90 border border-brand-border space-y-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-brand-blue font-semibold block">
                Hardware & Station Allocation
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-surface flex items-center justify-center text-brand-pink shrink-0">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {game.resourceName || (game.category === 'racing' ? 'Pro Racing Simulator Rig' : 'PS5 Pro Station (Basement Arena)')}
                  </div>
                  <div className="text-xs text-brand-subtle font-light">
                    {game.availabilityStatus === 'coming_soon'
                      ? 'Pre-installed on high-speed NVMe SSD upon official release.'
                      : 'Equipped with 4K 120Hz display, dual haptic controllers, and low-latency audio.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Play Options Specs */}
            {game.playOptions && game.playOptions.length > 0 && (
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-[0.2em] text-brand-orange font-semibold block">
                  Available Play Options
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {game.playOptions.map((opt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 text-xs text-brand-cream/90 font-mono"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-brand-border flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-full bg-brand-surface border border-brand-border text-xs uppercase tracking-wider text-brand-subtle hover:text-white transition-colors"
              >
                Close Preview
              </button>

              {game.availabilityStatus === 'coming_soon' ? (
                <button
                  onClick={() => {
                    onClose();
                    onBook();
                  }}
                  className="px-6 py-3 rounded-full bg-brand-surfaceElevated hover:bg-brand-charcoal border border-brand-border text-xs uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-2 transition-colors"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Reserve Station in Advance</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onBook();
                  }}
                  className="px-7 py-3 rounded-full bg-brand-pink hover:bg-brand-pinkHover text-white text-xs uppercase tracking-wider font-semibold transition-all shadow-luxury-pink hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Book This Game Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
