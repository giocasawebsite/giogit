import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from '../config';

/**
 * Cloudinary service initialization and configuration.
 * All credentials are strictly read from backend environment variables (Render / local .env),
 * never exposed to client code.
 */
function initCloudinary() {
  const cloudName = (config.cloudinaryCloudName || '').trim();
  const apiKey = (config.cloudinaryApiKey || '').trim();
  const apiSecret = (config.cloudinaryApiSecret || '').trim();

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
}

initCloudinary();

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  thumbnailUrl: string;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  overwrite?: boolean;
}

class CloudinaryService {
  /**
   * Checks whether Cloudinary credentials are fully configured on the server
   */
  isConfigured(): boolean {
    return !!(
      config.cloudinaryCloudName &&
      config.cloudinaryApiKey &&
      config.cloudinaryApiSecret
    );
  }

  /**
   * Health ping and credentials check against Cloudinary Admin API
   */
  async testConnection(): Promise<{
    ok: boolean;
    cloudName: string;
    message: string;
    details?: any;
  }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        cloudName: config.cloudinaryCloudName || 'not-set',
        message: 'Cloudinary credentials missing in environment variables.',
      };
    }

    try {
      initCloudinary();
      const ping = await cloudinary.api.ping();
      return {
        ok: true,
        cloudName: config.cloudinaryCloudName,
        message: 'Cloudinary API connection successful.',
        details: ping,
      };
    } catch (err: any) {
      console.error('Cloudinary connection test failed:', err);
      let safeMsg = err.message || 'Failed to ping Cloudinary API.';
      if (config.cloudinaryApiKey) {
        safeMsg = safeMsg.split(config.cloudinaryApiKey).join('[REDACTED_KEY]');
      }
      if (config.cloudinaryApiSecret) {
        safeMsg = safeMsg.split(config.cloudinaryApiSecret).join('[REDACTED_SECRET]');
      }
      return {
        ok: false,
        cloudName: config.cloudinaryCloudName,
        message: safeMsg,
      };
    }
  }

  /**
   * Uploads an image (base64 string or data URI) to Cloudinary with automatic optimization.
   * - Automatic format selection (webp / avif based on client browser support)
   * - Automatic compression quality (q_auto)
   * - Stored in dedicated folders (e.g. giocasa/tournaments, giocasa/hall_of_fame, giocasa/menu, giocasa/gallery)
   */
  async uploadImage(
    imageBase64: string,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Render environment variables.'
      );
    }

    initCloudinary();

    // Ensure base64 string is properly formatted as a data URI
    let uploadPayload = imageBase64;
    if (!uploadPayload.startsWith('data:image/')) {
      uploadPayload = `data:image/png;base64,${uploadPayload}`;
    }

    const folder = options.folder || 'giocasa/uploads';

    try {
      const uploadRes: UploadApiResponse = await cloudinary.uploader.upload(uploadPayload, {
        folder,
        public_id: options.publicId,
        overwrite: options.overwrite ?? true,
        resource_type: 'image',
        tags: ['giocasa', ...(options.tags || [])],
        // Automatically optimize image delivering WebP/AVIF with best perceptual quality
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });

      // Construct an optimized thumbnail URL using Cloudinary dynamic transformations
      const thumbnailUrl = cloudinary.url(uploadRes.public_id, {
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        secure: true,
      });

      // Ensure the delivered secureUrl has automatic optimization parameters
      const optimizedSecureUrl = uploadRes.secure_url.includes('/image/upload/')
        ? uploadRes.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto/')
        : uploadRes.secure_url;

      return {
        url: optimizedSecureUrl,
        secureUrl: optimizedSecureUrl,
        publicId: uploadRes.public_id,
        format: uploadRes.format,
        width: uploadRes.width,
        height: uploadRes.height,
        bytes: uploadRes.bytes,
        thumbnailUrl,
      };
    } catch (err: any) {
      console.error('Error uploading image to Cloudinary:', err);
      let safeMsg = err.message || 'Cloudinary upload failed.';
      if (config.cloudinaryApiKey) {
        safeMsg = safeMsg.split(config.cloudinaryApiKey).join('[REDACTED_KEY]');
      }
      if (config.cloudinaryApiSecret) {
        safeMsg = safeMsg.split(config.cloudinaryApiSecret).join('[REDACTED_SECRET]');
      }
      if (safeMsg.toLowerCase().includes('invalid api_key')) {
        safeMsg = 'Authentication with Cloudinary image storage failed. Please check your credentials in Render.';
      }
      throw new Error(safeMsg);
    }
  }

  /**
   * Permanently deletes an image asset from Cloudinary by its public ID.
   * Safe execution: Does not crash if asset is already deleted or not found.
   */
  async deleteImage(publicId?: string): Promise<{ result: string; deleted: boolean }> {
    if (!publicId || typeof publicId !== 'string') {
      return { result: 'invalid_public_id', deleted: false };
    }

    if (!this.isConfigured()) {
      console.warn('Cannot delete Cloudinary image: Cloudinary credentials not configured.');
      return { result: 'not_configured', deleted: false };
    }

    initCloudinary();

    try {
      const res = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true, // Invalidate CDN cache
      });

      return {
        result: res.result || 'ok',
        deleted: res.result === 'ok',
      };
    } catch (err: any) {
      console.warn(`Failed to delete Cloudinary asset "${publicId}":`, err?.message || err);
      return { result: 'error', deleted: false };
    }
  }

  /**
   * Generates a responsive, transformed Cloudinary URL from an existing Cloudinary public ID or URL
   */
  getOptimizedUrl(
    publicIdOrUrl: string,
    transforms: {
      width?: number;
      height?: number;
      crop?: string;
      gravity?: string;
      quality?: string;
      format?: string;
    } = {}
  ): string {
    if (!publicIdOrUrl) return '';

    // If it's a Cloudinary URL, inject or update transformations
    if (publicIdOrUrl.includes('res.cloudinary.com')) {
      const parts = [];
      if (transforms.width) parts.push(`w_${transforms.width}`);
      if (transforms.height) parts.push(`h_${transforms.height}`);
      if (transforms.crop) parts.push(`c_${transforms.crop}`);
      if (transforms.gravity) parts.push(`g_${transforms.gravity}`);
      parts.push(`f_${transforms.format || 'auto'}`);
      parts.push(`q_${transforms.quality || 'auto'}`);

      const transformStr = parts.join(',');

      // If already has transformation segment, replace or prepend
      if (publicIdOrUrl.includes('/image/upload/f_auto,q_auto/')) {
        return publicIdOrUrl.replace('/image/upload/f_auto,q_auto/', `/image/upload/${transformStr}/`);
      }
      if (publicIdOrUrl.includes('/image/upload/')) {
        return publicIdOrUrl.replace('/image/upload/', `/image/upload/${transformStr}/`);
      }
      return publicIdOrUrl;
    }

    // If it's a publicId without host
    if (this.isConfigured() && !publicIdOrUrl.startsWith('http')) {
      return cloudinary.url(publicIdOrUrl, {
        transformation: [
          {
            width: transforms.width,
            height: transforms.height,
            crop: transforms.crop || 'fill',
            gravity: transforms.gravity || 'auto',
            quality: transforms.quality || 'auto',
            fetch_format: transforms.format || 'auto',
          },
        ],
        secure: true,
      });
    }

    return publicIdOrUrl;
  }
}

export const cloudinaryService = new CloudinaryService();
