import { getApiBaseUrl, buildApiUrl } from './apiConfig';
import { MenuCustomization, GalleryItem } from '../types';

export interface UploadImageResult {
  url: string;
  secureUrl: string;
  publicId?: string;
  thumbnailUrl?: string;
  format?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  storage: 'cloudinary' | 'local';
}

export interface CloudinaryStatusResult {
  configured: boolean;
  cloudName: string | null;
  ping?: {
    ok: boolean;
    cloudName: string;
    message: string;
  };
}

/**
 * Converts a browser File object to a base64 Data URI string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Resizes and compresses an image in-browser before uploading to save bandwidth
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.85
): Promise<string> {
  const base64 = await fileToBase64(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP for superior compression that preserves transparency without ballooning PNGs
      let compressedDataUrl = '';
      try {
        compressedDataUrl = canvas.toDataURL('image/webp', quality);
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          compressedDataUrl = canvas.toDataURL(mimeType, quality);
        }
      } catch {
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        compressedDataUrl = canvas.toDataURL(mimeType, quality);
      }
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      resolve(base64); // Fallback to raw base64 if compression fails
    };
  });
}

/**
 * Image upload and management service for GioCasa Admin
 */
export const imageUploadService = {
  /**
   * Upload an image to Cloudinary (or fallback storage) via backend
   */
  async uploadImage(params: {
    passcode: string;
    imageBase64: string;
    filename?: string;
    folder?: 'tournaments' | 'hall_of_fame' | 'menu' | 'gallery' | 'equipment';
    previousPublicId?: string;
  }): Promise<UploadImageResult> {
    const url = buildApiUrl('/admin/uploads');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': params.passcode,
        Authorization: `Bearer ${params.passcode}`,
      },
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        filename: params.filename,
        folder: params.folder || 'uploads',
        previousPublicId: params.previousPublicId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Upload failed with status ${res.status}`);
    }

    return json.data;
  },

  /**
   * Permanently delete a Cloudinary image asset by public ID
   */
  async deleteImage(passcode: string, publicId: string): Promise<void> {
    const url = buildApiUrl('/admin/uploads');
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
      body: JSON.stringify({ publicId }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete image asset.');
    }
  },

  /**
   * Check Cloudinary status and test connection
   */
  async getStatus(passcode: string, test = false): Promise<CloudinaryStatusResult> {
    const url = buildApiUrl('/admin/uploads/status', { test: test ? 'true' : undefined });
    const res = await fetch(url, {
      headers: {
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to verify Cloudinary status.');
    }

    return json.data;
  },

  // ==========================================
  // MENU CUSTOMIZATION APIS
  // ==========================================

  async getMenuCustomizations(): Promise<Record<string, MenuCustomization>> {
    const url = buildApiUrl('/menu/customizations');
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch menu customizations.');
    }
    return json.data;
  },

  async saveMenuCustomization(
    passcode: string,
    menuItemId: string,
    data: Partial<MenuCustomization>
  ): Promise<MenuCustomization> {
    const url = buildApiUrl(`/menu/customizations/${encodeURIComponent(menuItemId)}`);
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to save menu customization.');
    }
    return json.data;
  },

  async deleteMenuCustomization(passcode: string, menuItemId: string): Promise<void> {
    const url = buildApiUrl(`/menu/customizations/${encodeURIComponent(menuItemId)}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to remove menu customization.');
    }
  },

  // ==========================================
  // GALLERY APIS
  // ==========================================

  async getGalleryItems(params?: { category?: string; featured?: boolean }): Promise<GalleryItem[]> {
    const url = buildApiUrl('/gallery', {
      category: params?.category,
      featured: params?.featured ? 'true' : undefined,
    });
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch gallery items.');
    }
    return json.data;
  },

  async createGalleryItem(
    passcode: string,
    item: Omit<GalleryItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GalleryItem> {
    const url = buildApiUrl('/gallery');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
      body: JSON.stringify(item),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to create gallery item.');
    }
    return json.data;
  },

  async updateGalleryItem(
    passcode: string,
    id: string,
    data: Partial<GalleryItem>
  ): Promise<GalleryItem> {
    const url = buildApiUrl(`/gallery/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update gallery item.');
    }
    return json.data;
  },

  async deleteGalleryItem(passcode: string, id: string): Promise<void> {
    const url = buildApiUrl(`/gallery/${encodeURIComponent(id)}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-admin-passcode': passcode,
        Authorization: `Bearer ${passcode}`,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete gallery item.');
    }
  },
};
