/**
 * GioCasa API Configuration & Base URL Resolver
 *
 * Normalizes the API base URL across local development, Netlify production, and direct backend connections.
 * Priority:
 *   1. import.meta.env.VITE_API_BASE_URL (Preferred environment variable)
 *   2. import.meta.env.VITE_API_URL (Legacy environment variable support)
 *   3. In production mode (PROD): 'https://giogit.onrender.com/api' (Live GioCasa Render backend)
 *   4. In development mode (DEV): '/api' (Proxied to http://localhost:5001 via Vite)
 *
 * Ensures:
 *   - No duplicate '/api' path segments
 *   - Strips trailing slashes
 *   - Validates URL syntax and rejects malformed values
 *   - Preserves all query parameters and path segments in downstream calls
 */

export const PRODUCTION_BACKEND_URL = 'https://giogit.onrender.com';

export function getApiBaseUrl(): string {
  let envUrl = '';

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
    }
  } catch {
    // fallback if import.meta is not supported
  }

  // Fallback to process.env if in Node/SSR/testing
  const nodeProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  if (!envUrl && typeof nodeProcess !== 'undefined' && nodeProcess.env) {
    envUrl = (nodeProcess.env.VITE_API_BASE_URL || nodeProcess.env.VITE_API_URL || '').trim();
  }

  // 1. Explicit environment variable provided
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
      throw new Error(`[GioCasa API Config Error] Malformed VITE_API_BASE_URL: "${envUrl}". Must be an absolute URL (e.g. https://giogit.onrender.com) or a root-relative path (e.g. /api).`);
    }
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2. Production build defaults to live Render backend
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD) {
    return `${PRODUCTION_BACKEND_URL}/api`;
  }

  // 3. Local development defaults to '/api' which proxies to local backend on port 5001
  return '/api';
}

/**
 * Validates and safely constructs a complete API URL from the base URL and endpoint path,
 * correctly formatting query parameters without throwing 'TypeError: Invalid URL' on relative paths.
 */
export function buildApiUrl(
  endpointPath: string,
  queryParams?: Record<string, string | number | boolean | undefined | null>
): string {
  const base = getApiBaseUrl();

  if (!base || typeof base !== 'string') {
    throw new Error('[GioCasa API Config Error] API base URL is missing or undefined.');
  }

  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const fullBase = `${base}${cleanPath}`;

  if (!queryParams) {
    return fullBase;
  }

  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(queryParams)) {
    if (val !== undefined && val !== null && val !== '' && val !== 'all') {
      sp.set(key, String(val));
    }
  }

  const queryString = sp.toString();
  return queryString ? `${fullBase}?${queryString}` : fullBase;
}
