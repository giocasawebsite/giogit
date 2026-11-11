import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { cloudinaryService } from '../services/cloudinary';

const router = Router();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// GET /api/gallery - List gallery items with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, featured } = req.query;
    const filter: { category?: string; featuredOnly?: boolean } = {};

    if (typeof category === 'string' && category.trim()) {
      filter.category = category.trim();
    }
    if (featured === 'true') {
      filter.featuredOnly = true;
    }

    const items = await dbService.getGalleryItems(filter);
    return res.json({
      success: true,
      data: items,
    });
  } catch (err: any) {
    console.error('Error fetching gallery items:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch gallery items.' });
  }
});

// GET /api/gallery/:id - Get a single gallery item
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await dbService.getGalleryItem(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Gallery item not found.' });
    }
    return res.json({
      success: true,
      data: item,
    });
  } catch (err: any) {
    console.error('Error fetching gallery item:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch gallery item.' });
  }
});

// ==========================================
// PROTECTED ADMIN ENDPOINTS
// ==========================================

// POST /api/gallery - Create new gallery item
router.post('/', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, imageUrl, imagePublicId, category, tags, isFeatured, displayOrder } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ success: false, error: 'Title and image URL are required.' });
    }

    const created = await dbService.createGalleryItem({
      title,
      description,
      imageUrl,
      imagePublicId,
      category: category || 'general',
      tags: Array.isArray(tags) ? tags : [],
      isFeatured: !!isFeatured,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Gallery item created successfully.',
      data: created,
    });
  } catch (err: any) {
    console.error('Error creating gallery item:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create gallery item.' });
  }
});

// PUT /api/gallery/:id - Update gallery item and clean up replaced Cloudinary asset
router.put('/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await dbService.getGalleryItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Gallery item not found.' });
    }

    const { title, description, imageUrl, imagePublicId, category, tags, isFeatured, displayOrder } = req.body;

    // Clean up replaced Cloudinary asset if a new one was provided
    if (existing.imagePublicId && imagePublicId && existing.imagePublicId !== imagePublicId) {
      try {
        await cloudinaryService.deleteImage(existing.imagePublicId);
      } catch (cleanupErr) {
        console.warn('Failed to clean up old Cloudinary gallery asset:', existing.imagePublicId, cleanupErr);
      }
    }

    const updated = await dbService.updateGalleryItem(id, {
      title,
      description,
      imageUrl,
      imagePublicId,
      category,
      tags: Array.isArray(tags) ? tags : undefined,
      isFeatured,
      displayOrder,
    });

    return res.json({
      success: true,
      message: 'Gallery item updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating gallery item:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update gallery item.' });
  }
});

// DELETE /api/gallery/:id - Delete gallery item and associated Cloudinary asset
router.delete('/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await dbService.deleteGalleryItem(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Gallery item not found.' });
    }

    return res.json({
      success: true,
      message: 'Gallery item deleted successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting gallery item:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete gallery item.' });
  }
});

export default router;
