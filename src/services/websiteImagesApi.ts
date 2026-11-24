import { WebsiteImageItem, WebsiteImageSectionId } from '../types';
import { DEFAULT_WEBSITE_IMAGES, getWebsiteImagesBySection } from '../data/websiteImagesData';
import { buildApiUrl } from './apiConfig';

class WebsiteImagesService {
  private cache: Record<string, { data: WebsiteImageItem[]; timestamp: number }> = {};
  private CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  /**
   * Fetch published images for a specific section or all sections.
   * Fallback instantly to DEFAULT_WEBSITE_IMAGES on network error or offline.
   */
  async getImages(
    section?: WebsiteImageSectionId,
    forceRefresh = false
  ): Promise<WebsiteImageItem[]> {
    const cacheKey = section || 'all';
    const now = Date.now();

    if (!forceRefresh && this.cache[cacheKey] && now - this.cache[cacheKey].timestamp < this.CACHE_TTL_MS) {
      return this.cache[cacheKey].data;
    }

    try {
      const url = section
        ? buildApiUrl('/website-images', { section })
        : buildApiUrl('/website-images');

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        this.cache[cacheKey] = { data: json.data, timestamp: now };
        return json.data;
      }
    } catch (err) {
      console.warn(`[WebsiteImages] Network fetch failed for "${section || 'all'}". Using default genuine assets:`, err);
    }

    // Fallback
    const fallback = section
      ? getWebsiteImagesBySection(section, DEFAULT_WEBSITE_IMAGES)
      : DEFAULT_WEBSITE_IMAGES.filter((img) => img.isActive);

    this.cache[cacheKey] = { data: fallback, timestamp: now };
    return fallback;
  }

  /**
   * Fetch all images (including inactive) for Admin management
   */
  async getAdminImages(passcode: string, section?: WebsiteImageSectionId): Promise<WebsiteImageItem[]> {
    try {
      const url = section
        ? buildApiUrl('/admin/website-images/all', { section })
        : buildApiUrl('/admin/website-images/all');

      const res = await fetch(url, {
        headers: {
          'x-admin-passcode': passcode,
          'Authorization': `Bearer ${passcode}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Admin fetch failed: HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    } catch (err) {
      console.warn('[WebsiteImages] Admin fetch error, fallback to defaults:', err);
    }

    return section
      ? DEFAULT_WEBSITE_IMAGES.filter((img) => img.section === section)
      : [...DEFAULT_WEBSITE_IMAGES];
  }

  /**
   * Admin bulk update / reorder section images
   */
  async saveSectionImages(
    section: WebsiteImageSectionId,
    images: WebsiteImageItem[],
    passcode: string
  ): Promise<WebsiteImageItem[]> {
    const url = buildApiUrl(`/admin/website-images/${encodeURIComponent(section)}`);
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        'Authorization': `Bearer ${passcode}`,
      },
      body: JSON.stringify({ images }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to save ${section} images.`);
    }

    // Invalidate local cache
    delete this.cache[section];
    delete this.cache['all'];

    return json.data;
  }

  /**
   * Admin add new image to section
   */
  async addImage(
    section: WebsiteImageSectionId,
    item: Partial<WebsiteImageItem>,
    passcode: string
  ): Promise<WebsiteImageItem> {
    const url = buildApiUrl(`/admin/website-images/${encodeURIComponent(section)}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        'Authorization': `Bearer ${passcode}`,
      },
      body: JSON.stringify(item),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to add image.');
    }

    delete this.cache[section];
    delete this.cache['all'];
    return json.data;
  }

  /**
   * Admin update a single image
   */
  async updateImage(
    id: string,
    updates: Partial<WebsiteImageItem>,
    passcode: string
  ): Promise<WebsiteImageItem> {
    const url = buildApiUrl(`/admin/website-images/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        'Authorization': `Bearer ${passcode}`,
      },
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update image.');
    }

    this.cache = {}; // clear cache
    return json.data;
  }

  /**
   * Admin delete an image
   */
  async deleteImage(id: string, publicId?: string, passcode = ''): Promise<boolean> {
    const url = buildApiUrl(`/admin/website-images/${encodeURIComponent(id)}`, publicId ? { publicId } : undefined);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-admin-passcode': passcode,
        'Authorization': `Bearer ${passcode}`,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete image.');
    }

    this.cache = {};
    return true;
  }
}

export const websiteImagesService = new WebsiteImagesService();
