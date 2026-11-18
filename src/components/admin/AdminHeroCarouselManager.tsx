import React, { useState, useEffect } from 'react';
import { HeroSlide } from '../../types';
import { heroService } from '../../services/heroService';
import { imageUploadService, compressImage } from '../../services/imageUploadService';
import { DEFAULT_HERO_SLIDES } from '../../data/heroSlidesData';
import {
  Sliders,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Check,
  X,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

interface AdminHeroCarouselManagerProps {
  passcode: string;
}

export const AdminHeroCarouselManager: React.FC<AdminHeroCarouselManagerProps> = ({ passcode }) => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewSlide, setPreviewSlide] = useState<HeroSlide | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  };

  // Load existing slides from server
  const loadSlides = async () => {
    setLoading(true);
    try {
      const serverSlides = await heroService.getHeroSlides(true);
      // Ensure we have exactly 5 slides
      let merged: HeroSlide[] = [];
      if (Array.isArray(serverSlides) && serverSlides.length > 0) {
        merged = [...serverSlides];
      }

      // If fewer than 5, fill from default slides
      while (merged.length < 5) {
        const nextOrder = merged.length + 1;
        const defaultMatch = DEFAULT_HERO_SLIDES.find((d) => d.order === nextOrder) || DEFAULT_HERO_SLIDES[merged.length % DEFAULT_HERO_SLIDES.length];
        merged.push({
          ...defaultMatch,
          id: `slide-${nextOrder}`,
          order: nextOrder,
        });
      }

      merged.sort((a, b) => a.order - b.order);
      setSlides(merged.slice(0, 5));
    } catch (err: any) {
      showToast(err?.message || 'Failed to load hero slides. Using defaults.', 'error');
      setSlides([...DEFAULT_HERO_SLIDES]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlides();
  }, [passcode]);

  // Handle field update for a slide
  const handleFieldChange = (slideId: string, field: keyof HeroSlide, value: any) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, [field]: value } : s))
    );
  };

  // Move slide up or down
  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    // Reassign orders 1..5
    const reordered = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSlides(reordered);
  };

  // Toggle active state
  const toggleSlideActive = (slideId: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, isActive: !s.isActive } : s))
    );
  };

  // Handle Image Upload for a specific screen size slot
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slideId: string,
    slotType: 'desktop' | 'tablet' | 'mobile'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const slotKey = `${slideId}-${slotType}`;
    setUploadingSlots((prev) => ({ ...prev, [slotKey]: true }));

    try {
      // Dimension limits per slot
      const maxW = slotType === 'mobile' ? 1080 : slotType === 'tablet' ? 1440 : 1920;
      const maxH = slotType === 'mobile' ? 1920 : slotType === 'tablet' ? 1080 : 1080;

      const compressedBase64 = await compressImage(file, maxW, maxH, 0.85);

      const targetSlide = slides.find((s) => s.id === slideId);
      const previousPublicId =
        slotType === 'desktop'
          ? targetSlide?.desktopPublicId
          : slotType === 'tablet'
          ? targetSlide?.tabletPublicId
          : targetSlide?.mobilePublicId;

      const result = await imageUploadService.uploadImage({
        passcode,
        imageBase64: compressedBase64,
        filename: `hero-${slideId}-${slotType}-${file.name.replace(/\.[^/.]+$/, '')}`,
        folder: 'hero',
        previousPublicId,
      });

      // Update slide state with new image URL and public ID
      setSlides((prev) =>
        prev.map((s) => {
          if (s.id !== slideId) return s;
          if (slotType === 'desktop') {
            return { ...s, desktopImageUrl: result.secureUrl, desktopPublicId: result.publicId };
          } else if (slotType === 'tablet') {
            return { ...s, tabletImageUrl: result.secureUrl, tabletPublicId: result.publicId };
          } else {
            return { ...s, mobileImageUrl: result.secureUrl, mobilePublicId: result.publicId };
          }
        })
      );

      showToast(`${slotType.toUpperCase()} image uploaded and optimized successfully!`, 'success');
    } catch (err: any) {
      console.error('Upload failed:', err);
      showToast(err?.message || 'Image upload failed. Please try again.', 'error');
    } finally {
      setUploadingSlots((prev) => ({ ...prev, [slotKey]: false }));
      // Clear file input so the same file can be re-selected if needed
      e.target.value = '';
    }
  };

  // Revert a single slide to its initial default
  const handleResetSlide = (slideId: string, order: number) => {
    const defaultSlide = DEFAULT_HERO_SLIDES.find((d) => d.order === order) || DEFAULT_HERO_SLIDES[(order - 1) % DEFAULT_HERO_SLIDES.length];
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...defaultSlide, id: slideId, order } : s))
    );
    showToast(`Slide ${order} reset to factory default!`, 'success');
  };

  // Save all changes to MongoDB via backend API
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const activeCount = slides.filter((s) => s.isActive).length;
      if (activeCount === 0) {
        throw new Error('At least one hero slide must be enabled and active.');
      }

      const saved = await heroService.saveHeroSlides(passcode, slides);
      setSlides(saved);
      showToast('Hero Carousel configuration saved successfully in MongoDB!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save hero carousel configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-gold animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-brand-subtle">
          Loading Hero Carousel Manager...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/95 border-red-500/50 text-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-brand-surface/90 border border-brand-border/60 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-brand-gold">
            <Sliders className="w-4 h-4" />
            <span>Homepage Hero Control</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            Hero Carousel Manager (5 Slides)
          </h2>
          <p className="text-xs text-brand-subtle max-w-2xl leading-relaxed">
            Manage the 5 responsive scroll slides displayed in the homepage hero. Upload separate landscape images for Desktop & Tablet, and vertical portrait images for Mobile phones. All assets are optimized and saved to Cloudinary & MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadSlides}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-brand-surfaceElevated hover:bg-brand-surfaceElevated/80 border border-brand-border text-brand-subtle hover:text-white text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoalDeep text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-luxury-gold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All 5 Slides</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5 Slide Cards Grid / Stack */}
      <div className="space-y-6">
        {slides.map((slide, index) => {
          return (
            <div
              key={slide.id}
              className={`bg-brand-surface/70 border rounded-3xl p-6 transition-all shadow-xl space-y-6 ${
                slide.isActive
                  ? 'border-brand-border hover:border-brand-gold/50'
                  : 'border-brand-border/40 opacity-70 bg-brand-surface/40'
              }`}
            >
              {/* Card Header & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-gold/20 border border-brand-gold/40 text-brand-gold font-mono font-bold text-xs flex items-center justify-center">
                    #{slide.order}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Slide {slide.order}: {slide.title || 'Untitled Slide'}</span>
                      {!slide.isActive && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Disabled
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] font-mono text-brand-subtle">
                      ID: {slide.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reorder Buttons */}
                  <div className="flex items-center border border-brand-border rounded-xl overflow-hidden bg-brand-surface">
                    <button
                      onClick={() => moveSlide(index, 'up')}
                      disabled={index === 0}
                      title="Move slide up"
                      className="p-2 hover:bg-brand-surfaceElevated text-brand-subtle hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-brand-border" />
                    <button
                      onClick={() => moveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      title="Move slide down"
                      className="p-2 hover:bg-brand-surfaceElevated text-brand-subtle hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Preview Button */}
                  <button
                    onClick={() => setPreviewSlide(slide)}
                    title="Live Preview Slide"
                    className="p-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-brand-blue" />
                  </button>

                  {/* Reset to Default */}
                  <button
                    onClick={() => handleResetSlide(slide.id, slide.order)}
                    title="Reset to default image & text"
                    className="p-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-brand-orange" />
                  </button>

                  {/* Active Toggle Switch */}
                  <button
                    onClick={() => toggleSlideActive(slide.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      slide.isActive
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-brand-surface border-brand-border text-brand-subtle hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${slide.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span>{slide.isActive ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>

              {/* Text Fields Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-brand-subtle uppercase tracking-wider">
                    Badge Micro-Text
                  </label>
                  <input
                    type="text"
                    value={slide.badge || ''}
                    onChange={(e) => handleFieldChange(slide.id, 'badge', e.target.value)}
                    placeholder="e.g. 1ST FLOOR • SLATE BILLIARDS"
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-gold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-brand-subtle uppercase tracking-wider">
                    Slide Headline / Title
                  </label>
                  <input
                    type="text"
                    value={slide.title || ''}
                    onChange={(e) => handleFieldChange(slide.id, 'title', e.target.value)}
                    placeholder="e.g. Artisanal Wood-Fired Pizza"
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-gold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-brand-subtle uppercase tracking-wider">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={slide.ctaText || ''}
                    onChange={(e) => handleFieldChange(slide.id, 'ctaText', e.target.value)}
                    placeholder="e.g. Book PS5 Station"
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-gold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-brand-subtle uppercase tracking-wider">
                    CTA Target Route
                  </label>
                  <select
                    value={slide.ctaLink || 'book'}
                    onChange={(e) => handleFieldChange(slide.id, 'ctaLink', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-gold outline-none"
                  >
                    <option value="book">Book Gaming Slot (#book)</option>
                    <option value="menu">Explore Menu (#menu)</option>
                    <option value="experience">Experience Dual Floors (#experience)</option>
                    <option value="events">Events & Parties (#events)</option>
                    <option value="games">Gaming Wall Library (#games)</option>
                    <option value="reservation">Table Reservation Modal</option>
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-4 space-y-1">
                  <label className="text-[11px] font-mono text-brand-subtle uppercase tracking-wider">
                    Subtitle Narrative Description
                  </label>
                  <textarea
                    rows={2}
                    value={slide.subtitle || ''}
                    onChange={(e) => handleFieldChange(slide.id, 'subtitle', e.target.value)}
                    placeholder="Describe this flagship offering in 1-2 compelling sentences..."
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-gold outline-none resize-none"
                  />
                </div>
              </div>

              {/* 3 Responsive Image Upload Slots */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono text-brand-gold uppercase tracking-[0.2em] font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Responsive Images (Desktop Landscape, Tablet Landscape, Mobile Portrait)</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  
                  {/* Slot 1: Desktop Landscape (16:9) */}
                  <div className="bg-brand-surfaceElevated/60 border border-brand-border/60 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Desktop Landscape</span>
                      </span>
                      <span className="text-[10px] font-mono text-brand-subtle">1920×1080 (16:9)</span>
                    </div>

                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 border border-brand-border/40 group">
                      {slide.desktopImageUrl ? (
                        <img
                          src={slide.desktopImageUrl}
                          alt="Desktop preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-brand-subtle text-[11px]">
                          <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                          <span>No Image</span>
                        </div>
                      )}

                      {uploadingSlots[`${slide.id}-desktop`] && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-10">
                          <RefreshCw className="w-6 h-6 text-brand-gold animate-spin" />
                          <span className="text-[10px] font-mono text-white">Uploading...</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={slide.desktopImageUrl || ''}
                        onChange={(e) => handleFieldChange(slide.id, 'desktopImageUrl', e.target.value)}
                        placeholder="Image URL or upload below"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-brand-cream text-[10px] font-mono outline-none"
                      />

                      <label className="w-full py-2 px-3 rounded-xl bg-brand-surface hover:bg-brand-surfaceElevated border border-brand-border/80 hover:border-brand-blue text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Upload Desktop Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, slide.id, 'desktop')}
                          disabled={uploadingSlots[`${slide.id}-desktop`]}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Slot 2: Tablet Landscape (4:3 / 16:9) */}
                  <div className="bg-brand-surfaceElevated/60 border border-brand-border/60 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Tablet className="w-3.5 h-3.5 text-brand-orange" />
                        <span>Tablet Landscape</span>
                      </span>
                      <span className="text-[10px] font-mono text-brand-subtle">1200×800 (Optional)</span>
                    </div>

                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 border border-brand-border/40 group">
                      {slide.tabletImageUrl || slide.desktopImageUrl ? (
                        <img
                          src={slide.tabletImageUrl || slide.desktopImageUrl}
                          alt="Tablet preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-brand-subtle text-[11px]">
                          <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                          <span>Falls back to Desktop</span>
                        </div>
                      )}

                      {uploadingSlots[`${slide.id}-tablet`] && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-10">
                          <RefreshCw className="w-6 h-6 text-brand-gold animate-spin" />
                          <span className="text-[10px] font-mono text-white">Uploading...</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={slide.tabletImageUrl || ''}
                        onChange={(e) => handleFieldChange(slide.id, 'tabletImageUrl', e.target.value)}
                        placeholder="Optional URL (fallback to desktop)"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-brand-cream text-[10px] font-mono outline-none"
                      />

                      <label className="w-full py-2 px-3 rounded-xl bg-brand-surface hover:bg-brand-surfaceElevated border border-brand-border/80 hover:border-brand-orange text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-brand-orange" />
                        <span>Upload Tablet Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, slide.id, 'tablet')}
                          disabled={uploadingSlots[`${slide.id}-tablet`]}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Slot 3: Mobile Portrait (9:16) */}
                  <div className="bg-brand-surfaceElevated/60 border border-brand-border/60 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-brand-pink" />
                        <span>Mobile Portrait</span>
                      </span>
                      <span className="text-[10px] font-mono text-brand-subtle">1080×1920 (9:16)</span>
                    </div>

                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 border border-brand-border/40 group flex items-center justify-center">
                      {slide.mobileImageUrl ? (
                        <img
                          src={slide.mobileImageUrl}
                          alt="Mobile portrait preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-brand-subtle text-[11px]">
                          <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                          <span>No Portrait Image</span>
                        </div>
                      )}

                      {uploadingSlots[`${slide.id}-mobile`] && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-10">
                          <RefreshCw className="w-6 h-6 text-brand-gold animate-spin" />
                          <span className="text-[10px] font-mono text-white">Uploading...</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={slide.mobileImageUrl || ''}
                        onChange={(e) => handleFieldChange(slide.id, 'mobileImageUrl', e.target.value)}
                        placeholder="Portrait Image URL"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-brand-cream text-[10px] font-mono outline-none"
                      />

                      <label className="w-full py-2 px-3 rounded-xl bg-brand-surface hover:bg-brand-surfaceElevated border border-brand-border/80 hover:border-brand-pink text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                        <Upload className="w-3.5 h-3.5 text-brand-pink" />
                        <span>Upload Mobile Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, slide.id, 'mobile')}
                          disabled={uploadingSlots[`${slide.id}-mobile`]}
                        />
                      </label>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Save Bar */}
      <div className="sticky bottom-4 z-40 bg-brand-dark/95 backdrop-blur-xl border border-brand-border rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-brand-subtle">
          <Sparkles className="w-4 h-4 text-brand-gold" />
          <span>All 5 slides will be saved in MongoDB and updated on the live website.</span>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-8 py-3 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoalDeep font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-luxury-gold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save & Publish Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Modal for Slide Preview */}
      {previewSlide && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">
                  Slide Preview: {previewSlide.title}
                </span>
                <div className="flex items-center gap-1 bg-brand-surfaceElevated p-1 rounded-xl border border-brand-border">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 ${
                      previewDevice === 'desktop' ? 'bg-brand-blue text-white font-bold' : 'text-brand-subtle'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 ${
                      previewDevice === 'tablet' ? 'bg-brand-orange text-white font-bold' : 'text-brand-subtle'
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1 ${
                      previewDevice === 'mobile' ? 'bg-brand-pink text-white font-bold' : 'text-brand-subtle'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setPreviewSlide(null)}
                className="p-2 rounded-full hover:bg-brand-surfaceElevated text-brand-subtle hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/40">
              <div
                className={`relative rounded-2xl overflow-hidden border border-brand-border shadow-2xl transition-all duration-300 flex items-center justify-center ${
                  previewDevice === 'mobile'
                    ? 'w-[320px] h-[568px]'
                    : previewDevice === 'tablet'
                    ? 'w-[640px] h-[440px]'
                    : 'w-full max-w-3xl aspect-video'
                }`}
              >
                <img
                  src={
                    previewDevice === 'mobile'
                      ? previewSlide.mobileImageUrl || previewSlide.desktopImageUrl
                      : previewDevice === 'tablet'
                      ? previewSlide.tabletImageUrl || previewSlide.desktopImageUrl
                      : previewSlide.desktopImageUrl
                  }
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/40 to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-center items-center space-y-2">
                  {previewSlide.badge && (
                    <span className="text-[9px] uppercase tracking-widest text-brand-pink font-bold bg-brand-surface/80 px-2.5 py-1 rounded-full border border-brand-pink/40">
                      {previewSlide.badge}
                    </span>
                  )}
                  <h4 className="text-xl sm:text-2xl font-serif font-bold text-white">
                    {previewSlide.title}
                  </h4>
                  <p className="text-xs text-white/80 max-w-md line-clamp-2">
                    {previewSlide.subtitle}
                  </p>
                  <div className="pt-2">
                    <span className="px-4 py-2 rounded-full bg-brand-blue text-brand-charcoalDeep font-bold text-xs uppercase tracking-wider inline-block">
                      {previewSlide.ctaText || 'Explore Now'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
