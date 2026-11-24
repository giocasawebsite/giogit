import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { WebsiteImageItem, WebsiteImageSectionId } from '../types';
import { cloudinaryService } from '../services/cloudinary';

const router = Router();

const VALID_SECTIONS: WebsiteImageSectionId[] = [
  'first_floor_carousel',
  'basement_carousel',
  'hero_slides',
  'racing_simulator',
  'experience_page',
  'menu_food',
  'visual_stories',
  'games_artwork',
  'tournaments_hall_of_fame',
  'promotional_banners',
];

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// GET /api/website-images - Retrieve website images (cached, public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const section = req.query.section as WebsiteImageSectionId | undefined;
    const includeInactive = req.query.all === 'true';

    if (section && !VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const items = await dbService.getWebsiteImages(section, includeInactive);

    if (!includeInactive) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    }

    return res.json({
      success: true,
      data: items,
    });
  } catch (err: any) {
    console.error('Error fetching website images:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve website images.' });
  }
});

// ==========================================
// ADMIN ENDPOINTS (Protected)
// ==========================================

// GET /api/admin/website-images - Admin full access with inactive items
router.get('/all', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const section = req.query.section as WebsiteImageSectionId | undefined;
    const items = await dbService.getWebsiteImages(section, true);
    return res.json({
      success: true,
      data: items,
    });
  } catch (err: any) {
    console.error('Error in admin get website images:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve website images for admin.' });
  }
});

// PUT /api/admin/website-images/:section - Bulk update / reorder a section
router.put('/:section', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const section = req.params.section as WebsiteImageSectionId;
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const { images } = req.body;
    if (!Array.isArray(images)) {
      return res.status(400).json({ success: false, error: 'Images must be an array of image items.' });
    }

    // Assign sequential order
    const ordered = images.map((img: WebsiteImageItem, idx: number) => ({
      ...img,
      section,
      order: idx + 1,
    }));

    const saved = await dbService.saveWebsiteImages(section, ordered);
    return res.json({
      success: true,
      message: `Successfully saved ${saved.length} images for section "${section}".`,
      data: saved,
    });
  } catch (err: any) {
    console.error('Error saving website images:', err);
    return res.status(500).json({ success: false, error: 'Failed to save section images.' });
  }
});

// POST /api/admin/website-images/:section - Add a single new image item to a section
router.post('/:section', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const section = req.params.section as WebsiteImageSectionId;
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        error: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const {
      title,
      subtitle,
      caption,
      imageUrl,
      imagePublicId,
      mobileImageUrl,
      mobilePublicId,
      tabletImageUrl,
      tabletPublicId,
      order,
      isActive = true,
      altText,
      aspectRatio = '16/10',
      usageId,
      tags,
      ctaText,
      ctaLink,
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Image URL is required.' });
    }

    const currentSectionImages = await dbService.getWebsiteImages(section, true);
    const assignedOrder = typeof order === 'number' ? order : currentSectionImages.length + 1;

    const newItem = await dbService.addWebsiteImageItem(section, {
      section,
      title: title || 'Untitled Image',
      subtitle,
      caption,
      imageUrl,
      imagePublicId,
      mobileImageUrl,
      mobilePublicId,
      tabletImageUrl,
      tabletPublicId,
      order: assignedOrder,
      isActive,
      altText: altText || title || 'GioCasa Image',
      aspectRatio,
      usageId: usageId || `${section}_${Date.now()}`,
      tags: Array.isArray(tags) ? tags : [],
      ctaText,
      ctaLink,
    });

    return res.json({
      success: true,
      message: 'New image added to section successfully.',
      data: newItem,
    });
  } catch (err: any) {
    console.error('Error adding website image:', err);
    return res.status(500).json({ success: false, error: 'Failed to add image.' });
  }
});

// PATCH /api/admin/website-images/:id - Update an individual image
router.patch('/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updated = await dbService.updateWebsiteImageItem(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Image item not found.' });
    }

    return res.json({
      success: true,
      message: 'Image item updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating website image item:', err);
    return res.status(500).json({ success: false, error: 'Failed to update image item.' });
  }
});

// DELETE /api/admin/website-images/:id - Delete an individual image item
router.delete('/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { publicId } = req.query;

    if (publicId && typeof publicId === 'string') {
      try {
        await cloudinaryService.deleteImage(publicId);
      } catch (cloudErr) {
        console.warn('Failed to delete asset from Cloudinary:', cloudErr);
      }
    }

    const deleted = await dbService.deleteWebsiteImageItem(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Image item not found or already deleted.' });
    }

    return res.json({
      success: true,
      message: 'Image deleted successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting website image:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete image.' });
  }
});

export default router;
