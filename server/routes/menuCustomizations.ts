import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { cloudinaryService } from '../services/cloudinary';

const router = Router();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// GET /api/menu/customizations - Get all custom menu items and overrides
router.get('/customizations', async (_req: Request, res: Response) => {
  try {
    const customizations = await dbService.getMenuCustomizations();
    const map: Record<string, any> = {};
    for (const c of customizations) {
      if (c.menuItemId) {
        map[c.menuItemId] = c;
      }
    }
    return res.json({
      success: true,
      data: map,
      list: customizations,
    });
  } catch (err: any) {
    console.error('Error fetching menu customizations:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch menu customizations.' });
  }
});

// GET /api/menu/customizations/:menuItemId - Get a single customization
router.get('/customizations/:menuItemId', async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const item = await dbService.getMenuCustomization(menuItemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Customization not found.' });
    }
    return res.json({
      success: true,
      data: item,
    });
  } catch (err: any) {
    console.error('Error fetching menu customization:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch menu item customization.' });
  }
});

// ==========================================
// PROTECTED ADMIN ENDPOINTS
// ==========================================

// PUT /api/menu/customizations/:menuItemId - Set or update dish customization
router.put('/customizations/:menuItemId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const { imageUrl, imagePublicId, name, category, isFeatured, badge, description, price } = req.body;

    // Check existing record to clean up replaced Cloudinary asset
    const existing = await dbService.getMenuCustomization(menuItemId);
    if (existing?.imagePublicId && imagePublicId && existing.imagePublicId !== imagePublicId) {
      try {
        await cloudinaryService.deleteImage(existing.imagePublicId);
      } catch (cleanupErr) {
        console.warn('Failed to clean up old Cloudinary menu asset:', existing.imagePublicId, cleanupErr);
      }
    }

    const updated = await dbService.setMenuCustomization(menuItemId, {
      imageUrl,
      imagePublicId,
      name,
      category,
      isFeatured,
      badge,
      description,
      price,
    });

    return res.json({
      success: true,
      message: 'Menu customization saved successfully.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error saving menu customization:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save menu customization.' });
  }
});

// DELETE /api/menu/customizations/:menuItemId - Delete customization and Cloudinary asset
router.delete('/customizations/:menuItemId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const deleted = await dbService.deleteMenuCustomization(menuItemId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Customization not found.' });
    }

    return res.json({
      success: true,
      message: 'Menu customization removed successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting menu customization:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete menu customization.' });
  }
});

export default router;
