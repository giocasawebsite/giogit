import React, { useState, useEffect, Suspense, lazy } from 'react';
import { PageRoute, RouteParams } from './types';
import { BookingModalProvider } from './context/BookingModalContext';
import { OrderCartProvider } from './context/OrderCartContext';
import { ContactSettingsProvider } from './context/ContactSettingsContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomBar } from './components/layout/MobileBottomBar';
import { WhatsAppFloater } from './components/layout/WhatsAppFloater';
import { parseCurrentRoute, buildRoutePath, ParsedRoute } from './utils/router';

// Lazy-loaded Core Pages for maximum initial mobile bundle efficiency
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ExperiencePage = lazy(() => import('./pages/ExperiencePage').then((m) => ({ default: m.ExperiencePage })));
const MenuPage = lazy(() => import('./pages/MenuPage').then((m) => ({ default: m.MenuPage })));
const GamingPage = lazy(() => import('./pages/GamingPage').then((m) => ({ default: m.GamingPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const BookingPage = lazy(() => import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

// Lazy-loaded GioCasa Arena Pages
const TournamentsPage = lazy(() => import('./pages/TournamentsPage').then((m) => ({ default: m.TournamentsPage })));
const TournamentDetailPage = lazy(() => import('./pages/TournamentDetailPage').then((m) => ({ default: m.TournamentDetailPage })));
const TournamentRegisterPage = lazy(() => import('./pages/TournamentRegisterPage').then((m) => ({ default: m.TournamentRegisterPage })));
const TournamentConfirmationPage = lazy(() => import('./pages/TournamentConfirmationPage').then((m) => ({ default: m.TournamentConfirmationPage })));
const TournamentResultsPage = lazy(() => import('./pages/TournamentResultsPage').then((m) => ({ default: m.TournamentResultsPage })));
const HallOfFamePage = lazy(() => import('./pages/HallOfFamePage').then((m) => ({ default: m.HallOfFamePage })));

// Lazy-loaded Global Modals
const ReservationModal = lazy(() => import('./components/modals/ReservationModal').then((m) => ({ default: m.ReservationModal })));
const QuickOrderDrawer = lazy(() => import('./components/modals/QuickOrderDrawer').then((m) => ({ default: m.QuickOrderDrawer })));

// Lightweight non-blocking loading placeholder
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 py-24 select-none">
    <div className="w-8 h-8 rounded-full border-2 border-brand-pink/20 border-t-brand-pink animate-spin" />
    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-brand-subtle animate-pulse">
      GioCasa
    </span>
  </div>
);

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(() => parseCurrentRoute());

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(parseCurrentRoute());
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateTo = (page: PageRoute, params?: RouteParams) => {
    const nextParams = params || {};
    setCurrentRoute({ page, params: nextParams });
    const path = buildRoutePath(page, nextParams);
    window.location.hash = `#${path}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (currentRoute.page) {
      case 'home':
        return <HomePage onNavigate={navigateTo} />;
      case 'experience':
        return <ExperiencePage onNavigate={navigateTo} />;
      case 'menu':
        return <MenuPage onNavigate={navigateTo} />;
      case 'gaming':
        return <GamingPage onNavigate={navigateTo} />;
      case 'events':
        return <EventsPage onNavigate={navigateTo} />;
      case 'about':
        return <AboutPage onNavigate={navigateTo} />;
      case 'contact':
        return <ContactPage onNavigate={navigateTo} />;
      case 'book':
        return <BookingPage onNavigate={navigateTo} />;
      case 'admin':
        return (
          <AdminPage
            onNavigate={navigateTo}
            adminTab={currentRoute.params.adminTab}
            adminTournamentId={currentRoute.params.adminTournamentId}
            adminSubTab={currentRoute.params.adminSubTab}
            adminPlayerId={currentRoute.params.adminPlayerId}
          />
        );
      case 'tournaments':
        return <TournamentsPage onNavigate={navigateTo} />;
      case 'tournament-detail':
        return <TournamentDetailPage slug={currentRoute.params.slug || ''} onNavigate={navigateTo} />;
      case 'tournament-register':
        return <TournamentRegisterPage slug={currentRoute.params.slug || ''} onNavigate={navigateTo} />;
      case 'tournament-confirmation':
        return (
          <TournamentConfirmationPage
            slug={currentRoute.params.slug || ''}
            registrationId={currentRoute.params.registrationId || ''}
            token={currentRoute.params.token}
            onNavigate={navigateTo}
          />
        );
      case 'tournament-results':
        return <TournamentResultsPage slug={currentRoute.params.slug || ''} onNavigate={navigateTo} />;
      case 'hall-of-fame':
        return <HallOfFamePage onNavigate={navigateTo} />;
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  return (
    <ContactSettingsProvider>
      <BookingModalProvider>
        <OrderCartProvider>
          <div className="min-h-screen flex flex-col bg-brand-dark text-brand-cream relative selection:bg-brand-terracotta selection:text-white">
            
            {/* Main Navigation Header (Hidden on all Admin pages & nested admin routes) */}
            {currentRoute.page !== 'admin' && (
              <Navbar currentPage={currentRoute.page} onNavigate={navigateTo} />
            )}

            {/* Active Page View */}
            <main className="flex-grow pb-16 sm:pb-0">
              <Suspense fallback={<PageLoadingFallback />}>
                {renderPage()}
              </Suspense>
            </main>

            {/* Luxury Oversized Footer */}
            <Footer onNavigate={navigateTo} />

            {/* Mobile Bottom Quick Bar */}
            <MobileBottomBar onNavigate={navigateTo} />

            {/* Floating WhatsApp Contact Button */}
            <WhatsAppFloater currentPage={currentRoute.page} />

            {/* Global Interactive Modals (Lazy Loaded on Demand) */}
            <Suspense fallback={null}>
              <ReservationModal />
              <QuickOrderDrawer />
            </Suspense>

          </div>
        </OrderCartProvider>
      </BookingModalProvider>
    </ContactSettingsProvider>
  );
};

export default App;
