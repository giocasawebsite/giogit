import React, { useState, useEffect } from 'react';
import { PageRoute, RouteParams } from './types';
import { BookingModalProvider } from './context/BookingModalContext';
import { OrderCartProvider } from './context/OrderCartContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileBottomBar } from './components/layout/MobileBottomBar';
import { ReservationModal } from './components/modals/ReservationModal';
import { QuickOrderDrawer } from './components/modals/QuickOrderDrawer';
import { parseCurrentRoute, buildRoutePath, ParsedRoute } from './utils/router';

// Core Pages
import { HomePage } from './pages/HomePage';
import { ExperiencePage } from './pages/ExperiencePage';
import { MenuPage } from './pages/MenuPage';
import { GamingPage } from './pages/GamingPage';
import { EventsPage } from './pages/EventsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { BookingPage } from './pages/BookingPage';
import { AdminPage } from './pages/AdminPage';

// GioCasa Arena Pages
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { TournamentRegisterPage } from './pages/TournamentRegisterPage';
import { TournamentConfirmationPage } from './pages/TournamentConfirmationPage';
import { TournamentResultsPage } from './pages/TournamentResultsPage';
import { HallOfFamePage } from './pages/HallOfFamePage';

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
    <BookingModalProvider>
      <OrderCartProvider>
        <div className="min-h-screen flex flex-col bg-brand-dark text-brand-cream relative selection:bg-brand-terracotta selection:text-white">
          
          {/* Main Navigation Header */}
          <Navbar currentPage={currentRoute.page} onNavigate={navigateTo} />

          {/* Active Page View */}
          <main className="flex-grow pb-16 sm:pb-0">
            {renderPage()}
          </main>

          {/* Luxury Oversized Footer */}
          <Footer onNavigate={navigateTo} />

          {/* Mobile Bottom Quick Bar */}
          <MobileBottomBar onNavigate={navigateTo} />

          {/* Global Interactive Modals */}
          <ReservationModal />
          <QuickOrderDrawer />

        </div>
      </OrderCartProvider>
    </BookingModalProvider>
  );
};

export default App;
