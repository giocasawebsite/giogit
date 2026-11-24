import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowUp,
  ArrowDown,
  Layers,
  Plus,
  Save,
  Check,
  X,
  Sliders,
  ExternalLink,
  Flame,
  Gamepad2,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  Tag,
  Monitor,
  Tablet,
  Smartphone,
  ChevronRight,
  Info,
} from 'lucide-react';
import { WebsiteImageItem, WebsiteImageSectionId } from '../../types';
import { websiteImagesService } from '../../services/websiteImagesApi';
import { DEFAULT_WEBSITE_IMAGES } from '../../data/websiteImagesData';
import { imageUploadService, compressImage } from '../../services/imageUploadService';

interface AdminCentralizedImageManagerProps {
  passcode: string;
}

interface SectionMeta {
  id: WebsiteImageSectionId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  defaultAspect: string;
  location: string;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'first_floor_carousel',
    label: '1st Floor Dining Carousel',
    description: 'Auto-carousel in the "More Than A Café" section for 1st floor dining, pool table, seating, and atmosphere.',
    icon: Flame,
    accentColor: 'text-brand-orange border-brand-orange/40 bg-brand-orange/10',
    defaultAspect: '16/10',
    location: 'Homepage -> "More Than A Café" -> 1st Floor Card',
  },
  {
    id: 'basement_carousel',
    label: 'Basement Gaming Carousel',
    description: 'Auto-carousel in the "More Than A Café" section for basement PS5 stations, racing simulator, and foosball lounge.',
    icon: Gamepad2,
    accentColor: 'text-brand-blue border-brand-blue/40 bg-brand-blue/10',
    defaultAspect: '16/10',
    location: 'Homepage -> "More Than A Café" -> Basement Card',
  },
  {
    id: 'racing_simulator',
    label: 'Racing Simulator (Official)',
    description: 'The official high-resolution image of the GioCasa Pro Racing Simulator rig used across the website.',
    icon: Sparkles,
    accentColor: 'text-red-400 border-red-500/40 bg-red-500/10',
    defaultAspect: '16/9',
    location: 'Used across Hero Slide 4, Zone Cards, Equipment Specs & Booking',
  },
  {
    id: 'hero_slides',
    label: 'Homepage Hero Carousel',
    description: 'The 5 premium full-screen hero slides introducing GioCasa at the top of the homepage.',
    icon: Sliders,
    accentColor: 'text-brand-gold border-brand-gold/40 bg-brand-gold/10',
    defaultAspect: '16/9',
    location: 'Homepage -> Top Hero Scroll/Auto Banner',
  },
  {
    id: 'visual_stories',
    label: 'Visual Stories / Gallery',
    description: 'Curated genuine Instagram photos and lounge visual highlights.',
    icon: Layers,
    accentColor: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
    defaultAspect: '1/1',
    location: 'Homepage -> Visual Stories (@giocasa.ayodhya) Grid',
  },
  {
    id: 'experience_page',
    label: 'Experience Page Visuals',
    description: 'Showcase photos highlighting wood-fired pizza ovens, PS5 battlestations, and billiards on the Experience page.',
    icon: Eye,
    accentColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    defaultAspect: '16/10',
    location: 'Experience & About Page feature sections',
  },
  {
    id: 'menu_food',
    label: 'Menu & Food Showcase',
    description: 'Artisanal Neapolitan pizza dishes, gourmet combos, and mocktails featured on the food menu.',
    icon: UtensilsCrossed,
    accentColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    defaultAspect: '4/3',
    location: 'Menu Page & Food Highlights',
  },
  {
    id: 'games_artwork',
    label: 'Games Page Artwork',
    description: 'Cover artwork and visual banners for PS5 competitive titles (FC 25, Tekken 8, MK1, Gran Turismo).',
    icon: Gamepad2,
    accentColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    defaultAspect: '16/9',
    location: 'Games Page -> Title Cards & Banners',
  },
  {
    id: 'tournaments_hall_of_fame',
    label: 'Tournaments & Hall of Fame',
    description: 'Esports championship banners, trophies, and tournament prize announcements.',
    icon: Trophy,
    accentColor: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
    defaultAspect: '16/9',
    location: 'Tournaments Page & Hall of Fame leaderboard',
  },
  {
    id: 'promotional_banners',
    label: 'Promotional Banners',
    description: 'Special offers, student discounts, weekend game nights, and birthday celebration packages.',
    icon: Tag,
    accentColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    defaultAspect: '16/9',
    location: 'Promotions bar, booking modals, and special offer cards',
  },
];

export const AdminCentralizedImageManager: React.FC<AdminCentralizedImageManagerProps> = ({ passcode }) => {
  const [selectedSection, setSelectedSection] = useState<WebsiteImageSectionId>('first_floor_carousel');
  const [allItems, setAllItems] = useState<WebsiteImageItem[]>(DEFAULT_WEBSITE_IMAGES);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit / Modal State
  const [editingItem, setEditingItem] = useState<WebsiteImageItem | null>(null);
  const [previewItem, setPreviewItem] = useState<WebsiteImageItem | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // New Image Form State
  const [newItemForm, setNewItemForm] = useState<{
    title: string;
    subtitle: string;
    caption: string;
    imageUrl: string;
    imagePublicId?: string;
    altText: string;
    usageId: string;
    aspectRatio: string;
    section: WebsiteImageSectionId;
  }>({
    title: '',
    subtitle: '',
    caption: '',
    imageUrl: '',
    altText: '',
    usageId: '',
    aspectRatio: '16/10',
    section: 'first_floor_carousel',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  };

  // Load all images for admin
  const loadImages = async () => {
    setLoading(true);
    try {
      const items = await websiteImagesService.getAdminImages(passcode);
      if (items && items.length > 0) {
        setAllItems(items);
      } else {
        setAllItems([...DEFAULT_WEBSITE_IMAGES]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load images from server. Showing local copies.', 'error');
      setAllItems([...DEFAULT_WEBSITE_IMAGES]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [passcode]);

  // Current Section Items
  const currentSectionMeta = useMemo(() => {
    return SECTIONS.find((s) => s.id === selectedSection) || SECTIONS[0];
  }, [selectedSection]);

  const currentSectionItems = useMemo(() => {
    return allItems
      .filter((item) => item.section === selectedSection)
      .sort((a, b) => a.order - b.order);
  }, [allItems, selectedSection]);

  // Move item up/down in current section
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSectionItems.length) return;

    const reorderedSection = [...currentSectionItems];
    const temp = reorderedSection[index];
    reorderedSection[index] = reorderedSection[targetIndex];
    reorderedSection[targetIndex] = temp;

    // Re-assign sequential order numbers 1..N
    const updatedSection = reorderedSection.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    // Update global state
    setAllItems((prev) => [
      ...prev.filter((item) => item.section !== selectedSection),
      ...updatedSection,
    ]);
  };

  // Toggle active status
  const toggleItemActive = (id: string) => {
    setAllItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  // Save current section changes to server
  const handleSaveSection = async () => {
    setSaving(true);
    try {
      await websiteImagesService.saveSectionImages(selectedSection, currentSectionItems, passcode);
      showToast(`Saved ${currentSectionItems.length} images for "${currentSectionMeta.label}" successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save section changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Upload a brand new image directly via Cloudinary
  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be less than 10MB.', 'error');
      return;
    }

    setUploadingItemId('new');
    try {
      const base64 = await compressImage(file, 2048, 1536, 0.88);
      const res = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'hero',
      });

      if (res.secureUrl) {
        setNewItemForm((prev) => ({
          ...prev,
          imageUrl: res.secureUrl,
          imagePublicId: res.publicId,
          title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          altText: prev.altText || `GioCasa ${currentSectionMeta.label}`,
          usageId: prev.usageId || `${selectedSection}_${Date.now()}`,
        }));
        showToast('Image uploaded to Cloudinary successfully. Complete details and click "Add Image".');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload image to Cloudinary.', 'error');
    } finally {
      setUploadingItemId(null);
    }
  };

  // Replace existing image with a newly uploaded Cloudinary image
  const handleReplaceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingItemId) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be less than 10MB.', 'error');
      return;
    }

    const itemToReplace = allItems.find((it) => it.id === replacingItemId);
    setUploadingItemId(replacingItemId);

    try {
      const base64 = await compressImage(file, 2048, 1536, 0.88);
      const res = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'hero',
        previousPublicId: itemToReplace?.imagePublicId,
      });

      if (res.secureUrl) {
        setAllItems((prev) =>
          prev.map((item) =>
            item.id === replacingItemId
              ? {
                  ...item,
                  imageUrl: res.secureUrl,
                  imagePublicId: res.publicId,
                  updatedAt: new Date().toISOString(),
                }
              : item
          )
        );
        showToast('Image replaced with new Cloudinary upload. Remember to click "Save Order & Changes".');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to replace image.', 'error');
    } finally {
      setUploadingItemId(null);
      setReplacingItemId(null);
    }
  };

  // Add new image item to section
  const handleAddNewItem = async () => {
    if (!newItemForm.imageUrl) {
      showToast('Please upload or provide an Image URL.', 'error');
      return;
    }

    setSaving(true);
    try {
      const added = await websiteImagesService.addImage(
        selectedSection,
        {
          ...newItemForm,
          order: currentSectionItems.length + 1,
          isActive: true,
        },
        passcode
      );

      setAllItems((prev) => [...prev, added]);
      setIsAddingNew(false);
      setNewItemForm({
        title: '',
        subtitle: '',
        caption: '',
        imageUrl: '',
        altText: '',
        usageId: '',
        aspectRatio: currentSectionMeta.defaultAspect,
        section: selectedSection,
      });
      showToast(`Added new image to "${currentSectionMeta.label}".`);
    } catch (err: any) {
      showToast(err.message || 'Failed to add image.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete an image item safely
  const handleDeleteItem = async (item: WebsiteImageItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      await websiteImagesService.deleteImage(item.id, item.imagePublicId, passcode);
      setAllItems((prev) => prev.filter((it) => it.id !== item.id));
      showToast(`Deleted "${item.title}" successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete image.', 'error');
    }
  };

  // Save edits from edit modal
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      await websiteImagesService.updateImage(editingItem.id, editingItem, passcode);
      setAllItems((prev) =>
        prev.map((it) => (it.id === editingItem.id ? editingItem : it))
      );
      setEditingItem(null);
      showToast('Image details updated successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to update image details.', 'error');
    }
  };

  // Re-assign an image to another section
  const handleAssignToSection = (item: WebsiteImageItem, targetSection: WebsiteImageSectionId) => {
    if (item.section === targetSection) return;

    setAllItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              section: targetSection,
              order: allItems.filter((x) => x.section === targetSection).length + 1,
            }
          : it
      )
    );
    showToast(`Assigned "${item.title}" to ${SECTIONS.find((s) => s.id === targetSection)?.label}. Save changes in both sections to persist.`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast notification */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/90 border-red-500/40 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-brand-surface border border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-serif">
                Centralized Website Image Manager
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Cloudinary + Mongo
                </span>
              </h2>
              <p className="text-xs text-brand-subtle mt-0.5">
                Single unified control center for every image, carousel, banner, and artwork across GioCasa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadImages}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs text-brand-subtle hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-orange' : ''}`} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSection}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orangeHover text-brand-charcoalDeep font-semibold text-xs flex items-center gap-1.5 shadow-luxury-orange transition-all"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Saving...' : 'Save Order & Changes'}</span>
          </button>
        </div>
      </div>

      {/* Section Selector Grid / Pills */}
      <div className="space-y-2">
        <label className="text-[11px] font-mono uppercase tracking-wider text-brand-subtle block px-1">
          Select Website Section to Manage ({SECTIONS.length} Sections Available):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const count = allItems.filter((it) => it.section === sec.id).length;
            const isSelected = selectedSection === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setSelectedSection(sec.id);
                  setIsAddingNew(false);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-brand-surfaceElevated border-brand-orange text-white shadow-luxury-orange'
                    : 'bg-brand-surface/70 hover:bg-brand-surface border-brand-border text-brand-subtle hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-1.5 rounded-lg border ${sec.accentColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-dark border border-brand-border/60 text-white font-semibold">
                    {count} {count === 1 ? 'img' : 'imgs'}
                  </span>
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold truncate text-white">{sec.label}</p>
                  <p className="text-[10px] text-brand-muted truncate">{sec.defaultAspect}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Section Meta Banner */}
      <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl border mt-0.5 ${currentSectionMeta.accentColor}`}>
            <currentSectionMeta.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{currentSectionMeta.label}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-dark border border-brand-border text-brand-orange">
                Section ID: {currentSectionMeta.id}
              </span>
            </div>
            <p className="text-xs text-brand-subtle mt-0.5">{currentSectionMeta.description}</p>
            <p className="text-[11px] text-brand-muted mt-1 flex items-center gap-1 font-mono">
              <Info className="w-3 h-3 text-brand-orange shrink-0" />
              <span>Location: {currentSectionMeta.location}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddingNew((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-brand-surfaceElevated text-white border border-brand-border text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-brand-orange" />
            <span>{isAddingNew ? 'Cancel Add' : 'Upload New Image'}</span>
          </button>
        </div>
      </div>

      {/* Add New Image Form (Expandable) */}
      {isAddingNew && (
        <div className="p-5 rounded-2xl bg-brand-dark/95 border border-brand-orange/40 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-brand-orange" />
              Upload & Add New Image to {currentSectionMeta.label}
            </h4>
            <button
              onClick={() => setIsAddingNew(false)}
              className="text-brand-subtle hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Box */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-brand-subtle block">
                Choose Image File (Direct Cloudinary Upload):
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-border hover:border-brand-orange/70 rounded-xl p-6 text-center cursor-pointer transition-all bg-brand-surface/40 hover:bg-brand-surface"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleNewImageUpload}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-brand-orange mx-auto mb-2" />
                <p className="text-xs text-white font-medium">Click to select photo</p>
                <p className="text-[10px] text-brand-muted mt-1">
                  JPG, PNG, WebP up to 10MB. Automatically compressed & uploaded to Cloudinary.
                </p>
                {uploadingItemId === 'new' && (
                  <p className="text-xs text-brand-orange animate-pulse mt-2">Uploading to CDN...</p>
                )}
              </div>

              {newItemForm.imageUrl && (
                <div className="p-2.5 rounded-xl bg-brand-surface border border-brand-border flex items-center gap-3">
                  <img
                    src={newItemForm.imageUrl}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="truncate text-xs">
                    <p className="text-emerald-400 font-mono text-[11px] truncate">Uploaded to Cloudinary</p>
                    <p className="text-brand-subtle text-[10px] truncate">{newItemForm.imageUrl}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brand-subtle block mb-1">Image Title / Headline</label>
                <input
                  type="text"
                  placeholder="e.g., Championship Slate Pool Table"
                  value={newItemForm.title}
                  onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-brand-subtle block mb-1">Subtitle / Category</label>
                <input
                  type="text"
                  placeholder="e.g., Tournament Standard Billiards"
                  value={newItemForm.subtitle}
                  onChange={(e) => setNewItemForm({ ...newItemForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-brand-subtle block mb-1">Caption / Description</label>
                <input
                  type="text"
                  placeholder="e.g., Handcrafted cues and precision slate on 1st Floor"
                  value={newItemForm.caption}
                  onChange={(e) => setNewItemForm({ ...newItemForm, caption: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-brand-subtle block mb-1">Usage Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g., first_floor_pool"
                    value={newItemForm.usageId}
                    onChange={(e) => setNewItemForm({ ...newItemForm, usageId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:border-brand-orange outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-subtle block mb-1">Aspect Ratio</label>
                  <select
                    value={newItemForm.aspectRatio}
                    onChange={(e) => setNewItemForm({ ...newItemForm, aspectRatio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surface border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                  >
                    <option value="16/10">16:10 (Floor Carousels)</option>
                    <option value="16/9">16:9 (Hero & Banners)</option>
                    <option value="4/3">4:3 (Food & Highlights)</option>
                    <option value="1/1">1:1 (Visual Stories)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/60">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border text-xs text-brand-subtle hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddNewItem}
              disabled={saving || !newItemForm.imageUrl}
              className="px-4 py-2 rounded-xl bg-brand-orange text-brand-charcoalDeep font-semibold text-xs flex items-center gap-1.5 shadow-luxury-orange disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Add Image to Section</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image Replacement */}
      <input
        type="file"
        ref={replaceFileInputRef}
        accept="image/*"
        onChange={handleReplaceImageUpload}
        className="hidden"
      />

      {/* Image Cards List for Current Section */}
      <div className="space-y-3">
        {currentSectionItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-brand-surface border border-brand-border space-y-3">
            <ImageIcon className="w-8 h-8 text-brand-subtle mx-auto" />
            <p className="text-sm text-white font-medium">No images in this section yet.</p>
            <p className="text-xs text-brand-subtle max-w-sm mx-auto">
              Click "Upload New Image" above to upload your first genuine image to this section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSectionItems.map((item, index) => {
              const isUploadingThis = uploadingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    item.isActive
                      ? 'bg-brand-surface border-brand-border'
                      : 'bg-brand-surface/40 border-brand-border/40 opacity-75'
                  }`}
                >
                  {/* Card Top: Order Pill, Usage ID, Active Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-6 h-6 rounded-lg bg-brand-surfaceElevated border border-brand-border flex items-center justify-center font-mono text-xs font-bold text-white shrink-0">
                        {index + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-brand-dark border border-brand-border text-[10px] font-mono text-brand-orange truncate">
                        Usage: [{item.usageId || item.id}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Active / Inactive switch */}
                      <button
                        type="button"
                        onClick={() => toggleItemActive(item.id)}
                        title={item.isActive ? 'Active on website - Click to disable' : 'Disabled - Click to enable'}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-colors border ${
                          item.isActive
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        <span>{item.isActive ? 'Active' : 'Disabled'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Body: Thumbnail & Details */}
                  <div className="flex gap-3">
                    <div className="relative group/thumb w-28 sm:w-36 aspect-[16/10] rounded-xl overflow-hidden bg-brand-dark border border-brand-border shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.altText || item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity"
                        title="Preview Full Size"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                      {item.subtitle && (
                        <p className="text-xs text-brand-orange font-medium truncate">{item.subtitle}</p>
                      )}
                      {item.caption && (
                        <p className="text-[11px] text-brand-subtle line-clamp-2 leading-tight">
                          {item.caption}
                        </p>
                      )}
                      <p className="text-[10px] text-brand-muted truncate font-mono pt-1">
                        URL: {item.imageUrl}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Reorder, Replace, Edit, Delete, Assign Section */}
                  <div className="pt-2 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-white hover:text-brand-orange disabled:opacity-30 disabled:hover:text-white transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === currentSectionItems.length - 1}
                        title="Move Down"
                        className="p-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-white hover:text-brand-orange disabled:opacity-30 disabled:hover:text-white transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Reassign to another section dropdown */}
                      <select
                        value={item.section}
                        onChange={(e) => handleAssignToSection(item, e.target.value as WebsiteImageSectionId)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white focus:border-brand-orange outline-none"
                        title="Assign to another section"
                      >
                        {SECTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move to: {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Replace Image Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingItemId(item.id);
                          replaceFileInputRef.current?.click();
                        }}
                        disabled={isUploadingThis}
                        title="Replace this image with a new Cloudinary upload"
                        className="px-2.5 py-1 rounded-lg bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Upload className="w-3 h-3 text-brand-orange" />
                        <span>{isUploadingThis ? 'Uploading...' : 'Replace'}</span>
                      </button>

                      {/* Edit Details Button */}
                      <button
                        type="button"
                        onClick={() => setEditingItem({ ...item })}
                        title="Edit title, caption, and metadata"
                        className="p-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        title="Delete this image"
                        className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-orange" />
                Edit Image Details
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-brand-subtle hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-brand-subtle block mb-1">Title</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-brand-subtle block mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingItem.subtitle || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-brand-subtle block mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={editingItem.caption || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-brand-subtle block mb-1">Direct Image URL</label>
                <input
                  type="text"
                  value={editingItem.imageUrl}
                  onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-orange outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-brand-subtle block mb-1">Usage Identifier</label>
                  <input
                    type="text"
                    value={editingItem.usageId || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, usageId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-orange outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-brand-subtle block mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={editingItem.altText || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, altText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs focus:border-brand-orange outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-xs text-brand-subtle hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-brand-orange text-brand-charcoalDeep font-semibold text-xs flex items-center gap-1.5 shadow-luxury-orange"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Updates</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{previewItem.title}</h3>
                <p className="text-xs text-brand-subtle">
                  Section: {SECTIONS.find((s) => s.id === previewItem.section)?.label}
                </p>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-brand-dark p-1 rounded-xl border border-brand-border">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg ${
                    previewDevice === 'desktop' ? 'bg-brand-orange text-brand-charcoalDeep' : 'text-brand-subtle'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg ${
                    previewDevice === 'tablet' ? 'bg-brand-orange text-brand-charcoalDeep' : 'text-brand-subtle'
                  }`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg ${
                    previewDevice === 'mobile' ? 'bg-brand-orange text-brand-charcoalDeep' : 'text-brand-subtle'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-brand-subtle hover:text-white ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Responsive Container */}
            <div className="flex justify-center bg-black/50 p-4 rounded-xl">
              <div
                className={`transition-all duration-300 rounded-xl overflow-hidden border border-brand-border ${
                  previewDevice === 'desktop'
                    ? 'w-full aspect-[16/10]'
                    : previewDevice === 'tablet'
                    ? 'w-[420px] aspect-[4/3]'
                    : 'w-[280px] aspect-[3/4]'
                }`}
              >
                <img
                  src={previewItem.imageUrl}
                  alt={previewItem.altText || previewItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-brand-subtle pt-2 border-t border-brand-border">
              <span className="font-mono">Usage: [{previewItem.usageId || previewItem.id}]</span>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-white text-xs hover:border-brand-orange"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
