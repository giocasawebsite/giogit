import { PageRoute, RouteParams } from '../types';

export interface ParsedRoute {
  page: PageRoute;
  params: RouteParams;
}

export function parseCurrentRoute(): ParsedRoute {
  // Check hash first (#/tournaments/...) then fallback to pathname (/tournaments/...)
  let raw = window.location.hash ? window.location.hash.replace(/^#/, '') : window.location.pathname;
  if (!raw || raw === '/') raw = '/home';

  // Extract query string if any
  let queryString = '';
  const qIdx = raw.indexOf('?');
  if (qIdx !== -1) {
    queryString = raw.slice(qIdx + 1);
    raw = raw.slice(0, qIdx);
  } else if (window.location.search) {
    queryString = window.location.search.replace(/^\?/, '');
  }

  const queryParams = new URLSearchParams(queryString);
  const token = queryParams.get('token') || undefined;

  // Normalize path segments: remove leading/trailing slashes
  const segments = raw.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] === 'home') {
    return { page: 'home', params: {} };
  }

  // 1. TOURNAMENTS PUBLIC ROUTES
  if (segments[0] === 'tournaments') {
    if (segments.length === 1) {
      return { page: 'tournaments', params: {} };
    }

    const slug = segments[1];

    if (segments.length === 2) {
      return { page: 'tournament-detail', params: { slug } };
    }

    if (segments[2] === 'register') {
      return { page: 'tournament-register', params: { slug } };
    }

    if (segments[2] === 'results') {
      return { page: 'tournament-results', params: { slug } };
    }

    if (segments[2] === 'confirmation') {
      const registrationId = segments[3];
      return { page: 'tournament-confirmation', params: { slug, registrationId, token } };
    }

    return { page: 'tournament-detail', params: { slug } };
  }

  // 2. HALL OF FAME
  if (segments[0] === 'hall-of-fame') {
    return { page: 'hall-of-fame', params: {} };
  }

  // 3. ADMIN ROUTES
  if (segments[0] === 'admin') {
    if (segments.length === 1) {
      return { page: 'admin', params: { adminTab: 'overview' } };
    }

    if (segments[1] === 'tournaments') {
      if (segments.length === 2) {
        return { page: 'admin', params: { adminTab: 'tournaments' } };
      }
      if (segments[2] === 'new') {
        return { page: 'admin', params: { adminTab: 'tournament-new' } };
      }

      const id = segments[2];
      if (segments[3] === 'edit') {
        return { page: 'admin', params: { adminTab: 'tournament-edit', adminTournamentId: id } };
      }
      if (segments[3] === 'registrations') {
        return { page: 'admin', params: { adminTab: 'tournament-registrations', adminTournamentId: id } };
      }
      if (segments[3] === 'results') {
        return { page: 'admin', params: { adminTab: 'tournament-results', adminTournamentId: id } };
      }

      return { page: 'admin', params: { adminTab: 'tournaments', adminTournamentId: id } };
    }

    if (segments[1] === 'players') {
      if (segments.length === 2) {
        return { page: 'admin', params: { adminTab: 'players', adminSubTab: 'directory' } };
      }
      if (segments[2] === 'segments') {
        return { page: 'admin', params: { adminTab: 'players', adminSubTab: 'segments' } };
      }
      if (segments[2] === 'loyalty') {
        return { page: 'admin', params: { adminTab: 'players', adminSubTab: 'loyalty' } };
      }
      const playerId = segments[2];
      return { page: 'admin', params: { adminTab: 'players', adminSubTab: 'profile', adminPlayerId: playerId } };
    }

    if (segments[1] === 'hall-of-fame') {
      return { page: 'admin', params: { adminTab: 'hall-of-fame' } };
    }

    return { page: 'admin', params: { adminTab: 'overview' } };
  }

  // 4. EXISTING CORE PAGES
  const corePages: PageRoute[] = ['experience', 'menu', 'gaming', 'events', 'about', 'contact', 'book'];
  if (corePages.includes(segments[0] as PageRoute)) {
    return { page: segments[0] as PageRoute, params: {} };
  }

  return { page: 'home', params: {} };
}

export function buildRoutePath(page: PageRoute, params?: RouteParams): string {
  switch (page) {
    case 'home':
      return '/';
    case 'tournaments':
      return '/tournaments';
    case 'tournament-detail':
      return `/tournaments/${params?.slug || ''}`;
    case 'tournament-register':
      return `/tournaments/${params?.slug || ''}/register`;
    case 'tournament-confirmation': {
      const q = params?.token ? `?token=${encodeURIComponent(params.token)}` : '';
      return `/tournaments/${params?.slug || ''}/confirmation/${params?.registrationId || ''}${q}`;
    }
    case 'tournament-results':
      return `/tournaments/${params?.slug || ''}/results`;
    case 'hall-of-fame':
      return '/hall-of-fame';
    case 'admin': {
      if (params?.adminTab === 'players') {
        if (params.adminSubTab === 'profile' && params.adminPlayerId) {
          return `/admin/players/${params.adminPlayerId}`;
        }
        if (params.adminSubTab === 'segments') {
          return '/admin/players/segments';
        }
        if (params.adminSubTab === 'loyalty') {
          return '/admin/players/loyalty';
        }
        return '/admin/players';
      }
      if (params?.adminTab === 'tournament-new') return '/admin/tournaments/new';
      if (params?.adminTab === 'tournament-edit' && params.adminTournamentId) {
        return `/admin/tournaments/${params.adminTournamentId}/edit`;
      }
      if (params?.adminTab === 'tournament-registrations' && params.adminTournamentId) {
        return `/admin/tournaments/${params.adminTournamentId}/registrations`;
      }
      if (params?.adminTab === 'tournament-results' && params.adminTournamentId) {
        return `/admin/tournaments/${params.adminTournamentId}/results`;
      }
      if (params?.adminTab === 'tournaments') return '/admin/tournaments';
      if (params?.adminTab === 'hall-of-fame') return '/admin/hall-of-fame';
      return '/admin';
    }
    default:
      return `/${page}`;
  }
}
