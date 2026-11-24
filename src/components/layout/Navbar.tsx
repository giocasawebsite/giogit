import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageRoute } from '../../types';
import { useBookingModal } from '../../context/BookingModalContext';
import { useOrderCart } from '../../context/OrderCartContext';
import { 
  Menu as MenuIcon, 
  X, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Gamepad2,
  Trophy,
  Utensils,
  Sparkles,
  Info
} from 'lucide-react';
import { businessConfig } from '../../data/businessConfig';
import { WinnersButton } from '../ui/WinnersButton';
import { PlayerIdentityModal } from '../common/PlayerIdentityModal';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [isJerkShaking, setIsJerkShaking] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const { openBookingModal } = useBookingModal();
  const { totalItems, openDrawer } = useOrderCart();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 30;
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for Letter Explosion Shockwave
  useEffect(() => {
    const handleBlast = () => {
      setIsJerkShaking(true);
      setTimeout(() => setIsJerkShaking(false), 500);
    };

    window.addEventListener('giocasa-letter-blast', handleBlast);
    return () => window.removeEventListener('giocasa-letter-blast', handleBlast);
  }, []);

  // Lock background scrolling while mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (moreDropdownOpen) setMoreDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, moreDropdownOpen]);

  // Primary visible links in Desktop Header (Prioritized)
  const primaryNavLinks: { id: PageRoute; label: string }[] = [
    { id: 'menu', label: 'Menu' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'tournaments', label: 'Arena' },
    { id: 'experience', label: 'Experience' },
  ];

  // Secondary links placed neatly inside the desktop "More" dropdown
  // Includes items moved from header bar when screen width is constrained
  const secondaryNavLinks: { id: PageRoute; label: string; desc: string; icon: React.ReactNode; isAction?: boolean; action?: () => void }[] = [
    { 
      id: 'book', 
      label: 'Reserve Dining Table', 
      desc: '1st Floor restaurant & private events', 
      icon: <Utensils className="w-4 h-4 text-brand-orange" />,
      isAction: true,
      action: () => openBookingModal('choice')
    },
    { 
      id: 'gaming', 
      label: 'Player ID & Rewards', 
      desc: 'Check points, tier & player card', 
      icon: <Gamepad2 className="w-4 h-4 text-brand-blue" />,
      isAction: true,
      action: () => setPlayerModalOpen(true)
    },
    { id: 'hall-of-fame', label: 'Winners & Hall of Fame', desc: 'Champions, records & leaderboard', icon: <Trophy className="w-4 h-4 text-brand-pink" /> },
    { id: 'games', label: 'Gaming Wall', desc: 'Installed titles & console library', icon: <Gamepad2 className="w-4 h-4 text-brand-blue" /> },
    { id: 'events', label: 'Private Events', desc: 'Birthdays, parties & group bookings', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { id: 'about', label: 'Our Story', desc: 'Ayodhya’s premier social house', icon: <Info className="w-4 h-4 text-brand-orange" /> },
    { id: 'contact', label: 'Contact & Location', desc: 'Hours, map & directions', icon: <MapPin className="w-4 h-4 text-emerald-400" /> },
  ];

  // Complete clean list for Mobile Drawer
  const mobileNavLinks: { id: PageRoute; label: string; num: string; badge?: string }[] = [
    { id: 'home', label: 'Home', num: '01' },
    { id: 'menu', label: 'Food & Drinks Menu', num: '02', badge: 'Wood-Fired' },
    { id: 'gaming', label: 'Gaming Lounge', num: '03', badge: 'PS5 • Sim' },
    { id: 'tournaments', label: 'Arena Tournaments', num: '04', badge: 'Live' },
    { id: 'games', label: 'Gaming Wall & Titles', num: '05' },
    { id: 'experience', label: 'Dual-Floor Experience', num: '06' },
    { id: 'hall-of-fame', label: 'Hall of Fame', num: '07' },
    { id: 'events', label: 'Private Events', num: '08' },
    { id: 'about', label: 'Our Story', num: '09' },
    { id: 'contact', label: 'Contact & Location', num: '10' },
  ];

  const handleNavClick = (page: PageRoute) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hide public website navbar completely on Admin Panel
  if (currentPage === 'admin') {
    return null;
  }

  const isMoreActive = ['games', 'hall-of-fame', 'events', 'about', 'contact'].includes(currentPage);

  return (
    <>
      <motion.header
        animate={
          isJerkShaking
            ? {
                x: [0, -10, 10, -7, 6, -3, 2, 0],
                y: [0, -7, 7, -5, 4, -2, 0],
                rotate: [0, -0.9, 0.9, -0.5, 0.3, 0],
              }
            : { x: 0, y: 0, rotate: 0 }
        }
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pt-[max(0.65rem,env(safe-area-inset-top))] ${
          isScrolled
            ? 'glass-dark py-2.5 sm:py-3 shadow-luxury'
            : 'bg-gradient-to-b from-brand-dark/95 via-brand-dark/60 to-transparent py-3 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo - Crisp, properly sized & always visible */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none shrink-0"
            aria-label="GioCasa Home"
            title="GioCasa Home"
          >
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-brand-surfaceElevated border border-brand-border/80 group-hover:border-brand-pink overflow-hidden shadow-sm transition-all duration-300">
              <img
                src="/assets/giocasa_logo_192.png"
                onError={(e) => {
                  e.currentTarget.src = '/assets/giocasa_logo_circle.png';
                }}
                alt="GioCasa Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-brand-pink border-2 border-brand-dark animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white block leading-none">
                GIOCASA
              </span>
              <span className="text-[7.5px] sm:text-[8.5px] lg:text-[9px] uppercase tracking-[0.2em] text-brand-pink block mt-0.5 font-semibold">
                AYODHYA • SOCIAL HOUSE
              </span>
            </div>
          </button>

          {/* Desktop Nav Links - Clean & Prioritized (Visible from lg: 1024px upwards) */}
          <nav className="hidden lg:flex items-center gap-8">
            {primaryNavLinks.map((link) => {
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-xs uppercase tracking-[0.18em] transition-all duration-200 relative py-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-brand-subtle hover:text-white font-medium'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-pink rounded-full shadow-sm" />
                  )}
                </button>
              );
            })}

            {/* Desktop "More" Dropdown Menu */}
            <div className="relative" ref={moreDropdownRef}>
              <button
                type="button"
                onClick={() => setMoreDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1 text-xs uppercase tracking-[0.18em] py-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isMoreActive || moreDropdownOpen
                    ? 'text-white font-semibold'
                    : 'text-brand-subtle hover:text-white font-medium'
                }`}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180 text-brand-pink' : ''}`} />
                {isMoreActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-brand-pink rounded-full shadow-sm" />
                )}
              </button>

              <AnimatePresence>
                {moreDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-[#111116] border border-brand-border/80 shadow-2xl p-2 z-50 backdrop-blur-xl"
                  >
                    <div className="space-y-1">
                      {secondaryNavLinks.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              if (item.isAction && item.action) {
                                setMoreDropdownOpen(false);
                                item.action();
                              } else {
                                handleNavClick(item.id);
                              }
                            }}
                            className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isActive
                                ? 'bg-brand-surfaceElevated text-brand-pink border border-brand-pink/30'
                                : 'text-brand-subtle hover:text-white hover:bg-brand-surface/70'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg bg-brand-surface border border-brand-border/50 shrink-0 mt-0.5">
                              {item.icon}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white tracking-wide">
                                {item.label}
                              </div>
                              <div className="text-[10px] text-brand-subtle leading-snug">
                                {item.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Desktop Actions - Dynamically responsive; secondary actions move to 'More' / Drawer at laptop & tablet */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Player ID Pill: Visible on wide screens (xl: 1280px+), accessible in More/drawer on tablet & laptop */}
            <button
              onClick={() => setPlayerModalOpen(true)}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-brand-surface/80 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue/60 text-brand-subtle hover:text-white text-xs font-mono font-medium transition-all group cursor-pointer whitespace-nowrap"
              aria-label="GioCasa Player ID"
              title="GioCasa Player ID & Rewards"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-brand-blue group-hover:scale-110 transition-transform" />
              <span className="hidden xl:inline">Player ID</span>
            </button>

            {/* Winners Button: Visible on wide desktop (xl: 1280px+), accessible in More/drawer on tablet & laptop */}
            <div className="hidden xl:block">
              <WinnersButton
                onNavigate={handleNavClick}
                isActive={currentPage === 'hall-of-fame'}
                variant="header"
              />
            </div>

            {/* Food Order Cart Button */}
            <button
              onClick={openDrawer}
              className="relative p-2 sm:p-2.5 rounded-full bg-brand-surface/80 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-orange/60 text-white transition-all group cursor-pointer shrink-0"
              aria-label="Open Order Cart"
              title="Food / Pizza Cart"
            >
              <ShoppingBag className="w-4 h-4 text-white group-hover:text-brand-orange transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-pink text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-luxury-pink animate-pulse">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Reserve Table (Dining): Visible on wide desktop (xl: 1280px+), accessible in More/drawer on tablet & laptop */}
            <button
              onClick={() => openBookingModal('choice')}
              className="hidden 2xl:inline-flex xl:inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold px-3.5 py-2 rounded-full bg-brand-surface/80 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-orange/60 text-white transition-all cursor-pointer whitespace-nowrap"
            >
              <Utensils className="w-3.5 h-3.5 text-brand-orange" />
              <span>Reserve Table</span>
            </button>

            {/* Primary Gaming Action Button - Essential CTA */}
            <button
              onClick={() => handleNavClick('book')}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold px-3.5 sm:px-4 py-2 rounded-full bg-brand-pink text-white hover:bg-brand-pinkHover transition-all shadow-luxury-pink active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              title="Book Slot"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Book Slot</span>
            </button>
          </div>

          {/* Mobile & Tablet Clean Hamburger Button (Visible on all screens < 1024px: mobile + 768px/820px/900px tablets) */}
          {/* Mobile Clean Hamburger Button Only - Spacious & Minimal */}
          <div className="flex lg:hidden items-center ml-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-surface/90 border border-brand-border/80 text-white hover:border-brand-pink/50 hover:bg-brand-surfaceElevated focus:outline-none focus:ring-2 focus:ring-brand-pink/40 active:scale-95 transition-all cursor-pointer shrink-0"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <MenuIcon className="w-5 h-5 text-white" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-brand-dark animate-pulse" />
                  )}
                </div>
              )}
            </button>
          </div>

        </div>
      </motion.header>

      {/* Mobile & Tablet Slide-Out Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/80 lg:hidden backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[88vw] max-w-sm bg-[#0C0C10] border-l border-brand-border/70 shadow-2xl flex flex-col justify-between overflow-y-auto lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              {/* Drawer Top Header with Safe Area Inset */}
              <div className="pt-[max(1.1rem,env(safe-area-inset-top))] px-5 pb-3.5 border-b border-brand-border/40 flex items-center justify-between shrink-0 bg-[#0C0C10]/90 backdrop-blur-md">
                <button
                  onClick={() => handleNavClick('home')}
                  className="flex items-center gap-2.5 text-left group focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-surfaceElevated border border-brand-border/80 overflow-hidden flex items-center justify-center shadow-sm">
                    <img
                      src="/assets/giocasa_logo_192.png"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/giocasa_logo_circle.png';
                      }}
                      alt="GioCasa Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="font-serif text-lg font-bold tracking-tight text-white block leading-none">
                      GIOCASA
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.2em] text-brand-pink block mt-0.5 font-semibold">
                      AYODHYA • SOCIAL HOUSE
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-brand-surface/90 border border-brand-border text-brand-subtle hover:text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                
                {/* Primary Booking Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleNavClick('book')}
                    className="w-full p-3 rounded-2xl bg-gradient-to-r from-brand-pink via-[#E02660] to-brand-pink text-white font-semibold flex items-center justify-between shadow-luxury-pink active:scale-[0.98] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                        <Gamepad2 className="w-4.5 h-4.5" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-xs tracking-wider block uppercase leading-tight">
                          Book Games
                        </span>
                        <span className="text-[10px] text-white/80 block font-normal">
                          PS5 • Racing Sim • Pool Slots
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openBookingModal('choice');
                    }}
                    className="w-full p-2.5 rounded-2xl bg-brand-surfaceElevated border border-brand-orange/40 text-white font-semibold flex items-center justify-between active:scale-[0.98] transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0">
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-xs tracking-wide block uppercase leading-tight text-white">
                          Reserve Table or Event
                        </span>
                        <span className="text-[10px] text-brand-subtle block font-normal">
                          1st Floor Restaurant • Group Events
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-orange group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Quick Utilities Row */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openDrawer();
                    }}
                    className="relative p-2.5 rounded-xl bg-brand-surface border border-brand-border/60 hover:border-brand-orange/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-orange/15 text-brand-orange flex items-center justify-center">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-white leading-tight">Food Cart</span>
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-pink text-white text-[9px] font-bold flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPlayerModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-brand-surface border border-brand-border/60 hover:border-brand-blue/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center">
                      <Gamepad2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-white leading-tight">Player ID</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('hall-of-fame')}
                    className={`p-2.5 rounded-xl bg-brand-surface border flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all group cursor-pointer ${
                      currentPage === 'hall-of-fame'
                        ? 'border-brand-pink text-white'
                        : 'border-brand-border/60 hover:border-brand-pink/60 text-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-pink/15 text-brand-pink flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-white leading-tight">Winners</span>
                  </button>
                </div>

                {/* Main Navigation Links */}
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-[0.25em] text-brand-subtle/80 mb-2 px-1">
                    Explore GioCasa
                  </div>
                  <nav className="flex flex-col space-y-1">
                    {mobileNavLinks.map((link) => {
                      const isActive = currentPage === link.id;
                      return (
                        <button
                          key={link.id}
                          onClick={() => handleNavClick(link.id)}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer ${
                            isActive
                              ? 'bg-brand-surfaceElevated text-brand-pink border border-brand-pink/30 font-semibold'
                              : 'text-brand-subtle hover:text-white hover:bg-brand-surface/60 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`text-[10px] font-mono shrink-0 ${isActive ? 'text-brand-pink' : 'text-brand-subtle/60'}`}>
                              {link.num}
                            </span>
                            <span className="text-xs tracking-wide truncate">
                              {link.label}
                            </span>
                            {link.badge && (
                              <span className="px-1.5 py-0.5 rounded-md bg-brand-pink/15 text-brand-pink text-[9px] font-mono uppercase tracking-wider shrink-0">
                                {link.badge}
                              </span>
                            )}
                          </div>
                          {isActive ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-brand-subtle/40 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

              </div>

              {/* Drawer Bottom Footer with Safe Area Inset */}
              <div className="px-5 py-3 border-t border-brand-border/40 bg-brand-surface/40 pb-[max(1.1rem,env(safe-area-inset-bottom))] shrink-0">
                <div className="flex items-center justify-between text-[11px] text-brand-subtle">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                    <span>Civil Lines, Ayodhya</span>
                  </span>
                  <a
                    href={`tel:${businessConfig.contact.phone}`}
                    className="flex items-center gap-1 text-white hover:text-brand-pink font-mono"
                  >
                    <Phone className="w-3 h-3 text-brand-pink shrink-0" />
                    <span>{businessConfig.contact.displayPhone}</span>
                  </a>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Player Identity Modal */}
      <PlayerIdentityModal
        isOpen={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
      />
    </>
  );
};
