import { Router, Request, Response } from 'express';
import { dbService } from '../db';
import { requireAdminAuth } from './admin';
import { HeroSlide } from '../types';

const router = Router();

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// GET /api/hero/slides - Retrieve hero carousel slides (cached, public)
router.get('/slides', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === 'true';
    const slides = await dbService.getHeroSlides(includeInactive);

    if (!includeInactive) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    }

    return res.json({
      success: true,
      data: slides,
    });
  } catch (err: any) {
    console.error('Error fetching hero slides:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve hero carousel slides.' });
  }
});

// ==========================================
// ADMIN ENDPOINTS (Protected)
// ==========================================

// PUT /api/hero/slides - Bulk update / reorder all hero slides
router.put('/slides', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { slides } = req.body;
    if (!Array.isArray(slides)) {
      return res.status(400).json({ success: false, error: 'Slides must be an array of slide objects.' });
    }

    // Validate that required images exist on active slides
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i] as HeroSlide;
      if (!s.id) {
        s.id = `slide-${i + 1}`;
      }
      s.order = i + 1;
      if (s.isActive) {
        if (!s.desktopImageUrl || !s.mobileImageUrl) {
          return res.status(400).json({
            success: false,
            error: `Slide ${i + 1} requires at least a Desktop and a Mobile image when active.`,
          });
        }
      }
    }

    const saved = await dbService.saveHeroSlides(slides);
    return res.json({
      success: true,
      message: 'Hero carousel slides updated successfully.',
      data: saved,
    });
  } catch (err: any) {
    console.error('Error updating hero slides:', err);
    return res.status(500).json({ success: false, error: 'Failed to update hero carousel slides.' });
  }
});

// PATCH /api/hero/slides/:id - Update a single hero slide
router.patch('/slides/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const updated = await dbService.updateHeroSlide(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Hero slide not found.' });
    }

    return res.json({
      success: true,
      message: 'Slide updated successfully.',
      data: updated,
    });
  } catch (err: any) {
    console.error('Error updating hero slide:', err);
    return res.status(500).json({ success: false, error: 'Failed to update hero slide.' });
  }
});

export default router;
