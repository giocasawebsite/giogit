import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageRoute } from '../../types';
import { useBookingModal } from '../../context/BookingModalContext';
import { useOrderCart } from '../../context/OrderCartContext';
import { 
  Menu as MenuIcon, 
  X, 
  ShoppingBag, 
  CalendarDays, 
  MapPin, 
  Phone, 
  ChevronRight,
  ArrowRight,
  Gamepad2,
  Trophy,
  Utensils
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
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [isJerkShaking, setIsJerkShaking] = useState(false);
  const { openBookingModal } = useBookingModal();
  const { totalItems, openDrawer } = useOrderCart();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 40;
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navLinks: { id: PageRoute; label: string }[] = [
    { id: 'menu', label: 'Menu' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'games', label: 'Gaming Wall' },
    { id: 'tournaments', label: 'Arena' },
    { id: 'events', label: 'Events' },
    { id: 'experience', label: 'Experience' },
    { id: 'contact', label: 'Contact' },
  ];

  const mobileNavLinks: { id: PageRoute; label: string; num: string }[] = [
    { id: 'home', label: 'Home', num: '01' },
    { id: 'menu', label: 'Food & Drinks Menu', num: '02' },
    { id: 'gaming', label: 'Gaming Lounge', num: '03' },
    { id: 'games', label: 'Gaming Wall', num: '04' },
    { id: 'tournaments', label: 'Arena Tournaments', num: '05' },
    { id: 'experience', label: 'Dual-Floor Experience', num: '06' },
    { id: 'events', label: 'Private Events', num: '07' },
    { id: 'about', label: 'Our Story', num: '08' },
    { id: 'contact', label: 'Contact & Location', num: '09' },
  ];

  const handleNavClick = (page: PageRoute) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hide public website navbar completely on Admin Panel and nested admin routes
  if (currentPage === 'admin') {
    return null;
  }

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
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pt-[max(0.75rem,env(safe-area-inset-top))] ${
          isScrolled
            ? 'glass-dark py-3 sm:py-3.5 shadow-luxury'
            : 'bg-gradient-to-b from-brand-dark/95 via-brand-dark/60 to-transparent py-3.5 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo - Minimal, balanced & responsive */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none shrink-0"
            aria-label="GioCasa Home"
            title="GioCasa Home"
          >
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-surfaceElevated border border-brand-border/80 group-hover:border-brand-pink overflow-hidden shadow-sm transition-all duration-300">
              <img
                src="/assets/giocasa_logo_circle.png"
                alt="GioCasa Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-brand-pink border-2 border-brand-dark animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-white block leading-none">
                GIOCASA
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] text-brand-pink block mt-0.5 font-semibold">
                AYODHYA • SOCIAL HOUSE
              </span>
            </div>
          </button>

          {/* Desktop Nav Links - Clean, uncluttered & spacious */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-xs uppercase tracking-[0.2em] transition-all duration-200 relative py-1 ${
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
          </nav>

          {/* Desktop Actions - Minimalist & refined */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Player ID Button */}
            <button
              onClick={() => setPlayerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-brand-surface/80 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-blue/60 text-white text-xs font-mono font-semibold transition-all group"
              aria-label="GioCasa Player ID"
              title="GioCasa Player ID & Rewards"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-brand-blue group-hover:scale-110 transition-transform" />
              <span className="hidden xl:inline text-brand-subtle group-hover:text-white">Player ID</span>
            </button>

            {/* Winners Button */}
            <WinnersButton
              onNavigate={handleNavClick}
              isActive={currentPage === 'hall-of-fame'}
              variant="header"
            />

            {/* Pizza Cart Button */}
            <button
              onClick={openDrawer}
              className="relative p-2.5 rounded-full bg-brand-surface/80 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-orange/60 text-white transition-all group"
              aria-label="Open Order Cart"
              title="Cart / Pizza Order"
            >
              <ShoppingBag className="w-4 h-4 text-white group-hover:text-brand-orange transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-pink text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-luxury-pink animate-pulse">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Reserve Table Button */}
            <button
              onClick={() => openBookingModal('choice')}
              className="hidden md:inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold px-4 py-2.5 rounded-full bg-brand-surface/80 hover:bg-brand-surfaceElevated border border-brand-border hover:border-brand-orange/60 text-white transition-all hover:-translate-y-0.5"
            >
              <Utensils className="w-3.5 h-3.5 text-brand-orange" />
              <span>Reserve Table</span>
            </button>

            {/* Primary Gaming Action Button */}
            <button
              onClick={() => handleNavClick('book')}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold px-5 py-2.5 rounded-full bg-brand-pink text-white hover:bg-brand-pinkHover transition-all shadow-luxury-pink hover:-translate-y-0.5"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Book Games</span>
            </button>
          </div>

          {/* Mobile Clean Hamburger Button Only - Spacious & Minimal */}
          <div className="flex sm:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-brand-surface/90 border border-brand-border/80 text-white hover:border-brand-pink/50 hover:bg-brand-surfaceElevated focus:outline-none focus:ring-2 focus:ring-brand-pink/40 active:scale-95 transition-all"
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

      {/* Mobile Slide-Out Drawer Navigation */}
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
              className="fixed inset-0 z-50 bg-black/75 sm:hidden will-change-transform"
              aria-hidden="true"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[86vw] max-w-sm bg-[#0B0B0F] border-l border-brand-border/70 shadow-2xl flex flex-col justify-between overflow-y-auto sm:hidden will-change-transform"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              {/* Drawer Top Header with Safe Area Inset */}
              <div className="pt-[max(1.25rem,env(safe-area-inset-top))] px-5 pb-4 border-b border-brand-border/40 flex items-center justify-between shrink-0">
                <button
                  onClick={() => handleNavClick('home')}
                  className="flex items-center gap-2.5 text-left group focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-surfaceElevated border border-brand-border/80 overflow-hidden flex items-center justify-center shadow-sm">
                    <img
                      src="/assets/giocasa_logo_circle.png"
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
                  className="w-9 h-9 rounded-full bg-brand-surface/90 border border-brand-border text-brand-subtle hover:text-white flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Primary Action: Book Slot CTA */}
                <div>
                  <button
                    onClick={() => handleNavClick('book')}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand-pink via-[#E02660] to-brand-pink text-white font-semibold flex items-center justify-between shadow-luxury-pink active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-sm tracking-wide block uppercase leading-tight">
                          Book Games
                        </span>
                        <span className="text-[11px] text-white/80 block font-normal">
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
                    className="w-full mt-2.5 p-3 rounded-2xl bg-brand-surfaceElevated border border-brand-orange/40 text-white font-semibold flex items-center justify-between active:scale-[0.98] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0">
                        <Utensils className="w-4 h-4" />
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

                {/* Quick Action Cards Row */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Order Food / Pizza */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openDrawer();
                    }}
                    className="relative p-2.5 rounded-xl bg-brand-surface border border-brand-border/60 hover:border-brand-orange/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-orange/15 text-brand-orange flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-white leading-tight">Order Food</span>
                    {totalItems > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-pink text-white text-[9px] font-bold flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </button>

                  {/* Player ID */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPlayerModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-brand-surface border border-brand-border/60 hover:border-brand-blue/60 flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-blue/15 text-brand-blue flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-white leading-tight">Player ID</span>
                  </button>

                  {/* Hall of Fame / Winners */}
                  <button
                    onClick={() => handleNavClick('hall-of-fame')}
                    className={`p-2.5 rounded-xl bg-brand-surface border flex flex-col items-center text-center gap-1.5 active:scale-95 transition-all group ${
                      currentPage === 'hall-of-fame'
                        ? 'border-brand-pink text-white'
                        : 'border-brand-border/60 hover:border-brand-pink/60 text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange/20 to-brand-pink/20 text-brand-pink flex items-center justify-center">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-white leading-tight">Winners</span>
                  </button>
                </div>

                {/* Main Navigation Links */}
                <div className="pt-2">
                  <div className="text-[10px] uppercase font-mono tracking-[0.25em] text-brand-subtle/80 mb-2 px-1">
                    Navigation
                  </div>
                  <nav className="flex flex-col space-y-1">
                    {mobileNavLinks.map((link) => {
                      const isActive = currentPage === link.id;
                      return (
                        <button
                          key={link.id}
                          onClick={() => handleNavClick(link.id)}
                          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.99] ${
                            isActive
                              ? 'bg-brand-surfaceElevated text-brand-pink border border-brand-pink/30 font-semibold'
                              : 'text-brand-subtle hover:text-white hover:bg-brand-surface/60 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-mono ${isActive ? 'text-brand-pink' : 'text-brand-subtle/60'}`}>
                              {link.num}
                            </span>
                            <span className="text-sm tracking-wide">
                              {link.label}
                            </span>
                          </div>
                          {isActive ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-pink animate-pulse" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-brand-subtle/40" />
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* Drawer Bottom Footer with Safe Area Inset */}
              <div className="px-5 py-3 border-t border-brand-border/40 bg-brand-surface/40 pb-[max(1.25rem,env(safe-area-inset-bottom))] shrink-0">
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
