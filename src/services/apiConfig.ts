/**
 * GioCasa API Configuration & Base URL Resolver
 *
 * Normalizes the API base URL across local development, Netlify production, and direct backend connections.
 * Priority:
 *   1. import.meta.env.VITE_API_BASE_URL (Preferred production environment variable)
 *   2. import.meta.env.VITE_API_URL (Legacy environment variable support)
 *   3. Default: '/api' (Relative endpoint proxying through Vite in dev or Netlify redirects in prod)
 *
 * Ensures:
 *   - No duplicate '/api' path segments
 *   - Strips trailing slashes
 *   - Preserves all query parameters and path segments in downstream calls
 */
export function getApiBaseUrl(): string {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim();

  if (!envUrl) {
    return '/api';
  }

  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}
