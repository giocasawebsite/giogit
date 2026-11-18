import { HeroSlide } from '../types';
import { buildApiUrl } from './apiConfig';
import { DEFAULT_HERO_SLIDES } from '../data/heroSlidesData';

let cachedSlides: { data: HeroSlide[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60000; // 1 minute client cache

export const heroService = {
  /**
   * Fetches the hero slides from the API.
   * Falls back gracefully to DEFAULT_HERO_SLIDES if offline or error.
   */
  async getHeroSlides(includeAll = false): Promise<HeroSlide[]> {
    const now = Date.now();
    if (!includeAll && cachedSlides && now - cachedSlides.timestamp < CACHE_TTL_MS) {
      return cachedSlides.data;
    }

    try {
      const url = buildApiUrl(`/hero/slides${includeAll ? '?all=true' : ''}`);
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
        if (!includeAll) {
          cachedSlides = { data: json.data, timestamp: now };
        }
        return json.data;
      }
      return DEFAULT_HERO_SLIDES;
    } catch (err) {
      console.warn('HeroService: Falling back to default slides:', err);
      return DEFAULT_HERO_SLIDES;
    }
  },

  /**
   * Saves updated hero slides via admin authenticated PUT endpoint.
   */
  async saveHeroSlides(passcode: string, slides: HeroSlide[]): Promise<HeroSlide[]> {
    const url = buildApiUrl('/hero/slides');
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
      body: JSON.stringify({ slides }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save hero carousel slides.');
    }

    // Invalidate client cache
    cachedSlides = null;
    return json.data;
  },

  /**
   * Updates a single hero slide.
   */
  async updateHeroSlide(passcode: string, id: string, updates: Partial<HeroSlide>): Promise<HeroSlide> {
    const url = buildApiUrl(`/hero/slides/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update hero slide.');
    }

    cachedSlides = null;
    return json.data;
  },

  /**
   * Clear in-memory cache
   */
  invalidateCache(): void {
    cachedSlides = null;
  },
};
