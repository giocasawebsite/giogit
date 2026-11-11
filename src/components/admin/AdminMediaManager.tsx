import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Eye,
  Layers,
  Plus,
  UtensilsCrossed,
  Sliders,
  Check,
} from 'lucide-react';
import { menuData, menuCategories } from '../../data/menuData';
import { MenuCustomization, GalleryItem } from '../../types';
import {
  imageUploadService,
  compressImage,
  CloudinaryStatusResult,
} from '../../services/imageUploadService';

interface AdminMediaManagerProps {
  passcode: string;
}

export const AdminMediaManager: React.FC<AdminMediaManagerProps> = ({ passcode }) => {
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'gallery' | 'settings'>('menu');

  // Cloudinary Status
  const [status, setStatus] = useState<CloudinaryStatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);

  // Menu items and customizations
  const [customizations, setCustomizations] = useState<Record<string, MenuCustomization>>({});
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);
  const [menuUploadLoadingId, setMenuUploadLoadingId] = useState<string | null>(null);

  // Gallery items
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  const [galleryForm, setGalleryForm] = useState<{
    title: string;
    description: string;
    imageUrl: string;
    imagePublicId?: string;
    category: string;
    tags: string;
    isFeatured: boolean;
    displayOrder: number;
  }>({
    title: '',
    description: '',
    imageUrl: '',
    category: 'cafe',
    tags: 'ambience, dining',
    isFeatured: true,
    displayOrder: 0,
  });
  const [galleryUploadLoading, setGalleryUploadLoading] = useState<boolean>(false);

  // Toast / feedback message
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Load Initial Data
  const loadData = async () => {
    try {
      // 1. Check Cloudinary Status
      setStatusLoading(true);
      const stat = await imageUploadService.getStatus(passcode, true).catch(() => null);
      if (stat) setStatus(stat);
    } catch (e) {
      // ignore
    } finally {
      setStatusLoading(false);
    }

    try {
      // 2. Load Menu Customizations
      const customs = await imageUploadService.getMenuCustomizations().catch(() => ({}));
      setCustomizations(customs);
    } catch (e) {
      // ignore
    }

    try {
      // 3. Load Gallery Items
      setGalleryLoading(true);
      const items = await imageUploadService.getGalleryItems().catch(() => []);
      setGalleryItems(items);
    } catch (e) {
      // ignore
    } finally {
      setGalleryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [passcode]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.toLowerCase().trim();
    return menuData.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!q) return matchesCategory;
      return (
        matchesCategory &&
        (item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)))
      );
    });
  }, [menuSearch, selectedCategory]);

  // Upload dish image for a menu item
  const handleMenuImageUpload = async (
    menuItemId: string,
    file: File
  ) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file size must be less than 10MB.', 'error');
      return;
    }

    setMenuUploadLoadingId(menuItemId);
    try {
      // Compress slightly before upload for maximum speed
      const base64 = await compressImage(file, 1600, 1200, 0.85);

      const existing = customizations[menuItemId];
      const previousPublicId = existing?.imagePublicId;

      const uploadRes = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'menu',
        previousPublicId,
      });

      const updated = await imageUploadService.saveMenuCustomization(passcode, menuItemId, {
        imageUrl: uploadRes.secureUrl,
        imagePublicId: uploadRes.publicId,
      });

      setCustomizations((prev) => ({
        ...prev,
        [menuItemId]: updated,
      }));

      showToast(`Image uploaded & optimized for "${menuData.find((m) => m.id === menuItemId)?.name || 'Dish'}"!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to upload dish photo.', 'error');
    } finally {
      setMenuUploadLoadingId(null);
    }
  };

  // Remove dish image
  const handleRemoveMenuImage = async (menuItemId: string) => {
    if (!window.confirm('Are you sure you want to delete this dish photo from Cloudinary?')) {
      return;
    }

    setMenuUploadLoadingId(menuItemId);
    try {
      await imageUploadService.deleteMenuCustomization(passcode, menuItemId);
      setCustomizations((prev) => {
        const next = { ...prev };
        delete next[menuItemId];
        return next;
      });
      showToast('Dish photo removed from Cloudinary and database.');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove dish photo.', 'error');
    } finally {
      setMenuUploadLoadingId(null);
    }
  };

  // Gallery image file select
  const handleGalleryFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size exceeds 10MB limit.', 'error');
      return;
    }

    setGalleryUploadLoading(true);
    try {
      const base64 = await compressImage(file, 1920, 1080, 0.88);
      const uploadRes = await imageUploadService.uploadImage({
        passcode,
        imageBase64: base64,
        filename: file.name,
        folder: 'gallery',
        previousPublicId: galleryForm.imagePublicId,
      });

      setGalleryForm((prev) => ({
        ...prev,
        imageUrl: uploadRes.secureUrl,
        imagePublicId: uploadRes.publicId,
      }));

      showToast('Image uploaded to Cloudinary! Complete the details and save.');
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setGalleryUploadLoading(false);
    }
  };

  // Save gallery item (create or update)
  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.title.trim() || !galleryForm.imageUrl) {
      showToast('Title and image are required.', 'error');
      return;
    }

    try {
      const tagsArray = galleryForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingGalleryItem) {
        const updated = await imageUploadService.updateGalleryItem(passcode, editingGalleryItem.id, {
          title: galleryForm.title.trim(),
          description: galleryForm.description.trim(),
          imageUrl: galleryForm.imageUrl,
          imagePublicId: galleryForm.imagePublicId,
          category: galleryForm.category,
          tags: tagsArray,
          isFeatured: galleryForm.isFeatured,
          displayOrder: Number(galleryForm.displayOrder) || 0,
        });

        setGalleryItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast('Gallery item updated successfully.');
      } else {
        const created = await imageUploadService.createGalleryItem(passcode, {
          title: galleryForm.title.trim(),
          description: galleryForm.description.trim(),
          imageUrl: galleryForm.imageUrl,
          imagePublicId: galleryForm.imagePublicId,
          category: galleryForm.category,
          tags: tagsArray,
          isFeatured: galleryForm.isFeatured,
          displayOrder: Number(galleryForm.displayOrder) || 0,
        });

        setGalleryItems((prev) => [created, ...prev]);
        showToast('New gallery item published to website.');
      }

      setShowGalleryModal(false);
      setEditingGalleryItem(null);
      setGalleryForm({
        title: '',
        description: '',
        imageUrl: '',
        category: 'cafe',
        tags: 'ambience, dining',
        isFeatured: true,
        displayOrder: 0,
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to save gallery item.', 'error');
    }
  };

  // Delete gallery item
  const handleDeleteGalleryItem = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This permanently removes the Cloudinary asset.`)) {
      return;
    }

    try {
      await imageUploadService.deleteGalleryItem(passcode, id);
      setGalleryItems((prev) => prev.filter((item) => item.id !== id));
      showToast('Gallery item and Cloudinary asset permanently deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete gallery item.', 'error');
    }
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

      {/* Header & Cloudinary Status Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-brand-surface border border-brand-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-orange/10 border border-brand-orange/30 text-brand-orange">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Cloudinary Media & Assets Manager
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  CDN Active
                </span>
              </h2>
              <p className="text-xs text-brand-subtle">
                Upload, optimize, replace, and manage permanent high-res images for Menu dishes, Cafe Gallery, and Website features.
              </p>
            </div>
          </div>
        </div>

        {/* Cloudinary Live Status Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-xl bg-brand-surfaceElevated border border-brand-border flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status?.configured && status.ping?.ok ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-brand-subtle">Cloud:</span>
            <span className="text-white font-semibold">{status?.cloudName || 'hcmnz5rk'}</span>
            <span className="text-brand-subtle text-[11px]">
              {status?.configured ? '(Connected)' : '(Local Mode)'}
            </span>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={statusLoading}
            className="p-2 rounded-xl bg-brand-surfaceElevated border border-brand-border text-brand-subtle hover:text-white transition-colors"
            title="Refresh Status & Assets"
          >
            <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin text-brand-orange' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-brand-border pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('menu')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'menu'
              ? 'bg-brand-orange text-brand-charcoalDeep shadow-luxury-orange'
              : 'bg-brand-surface text-brand-subtle hover:text-white border border-brand-border'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          Menu Dishes & Pizzas ({Object.keys(customizations).length} Custom Images)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('gallery')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'gallery'
              ? 'bg-brand-orange text-brand-charcoalDeep shadow-luxury-orange'
              : 'bg-brand-surface text-brand-subtle hover:text-white border border-brand-border'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Cafe & Lounge Gallery ({galleryItems.length} Photos)
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'settings'
              ? 'bg-brand-orange text-brand-charcoalDeep shadow-luxury-orange'
              : 'bg-brand-surface text-brand-subtle hover:text-white border border-brand-border'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Optimization & CDN Info
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MENU DISHES & PIZZAS TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'menu' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-brand-surface border border-brand-border">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-brand-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search menu items (e.g. Margherita, Noodles, Shake)..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white placeholder-brand-subtle focus:outline-none focus:border-brand-orange"
              />
              {menuSearch && (
                <button
                  type="button"
                  onClick={() => setMenuSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-subtle hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-mono text-brand-subtle shrink-0">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white focus:outline-none focus:border-brand-orange"
              >
                {menuCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenuItems.map((item) => {
              const custom = customizations[item.id];
              const displayImage = custom?.imageUrl || item.image;
              const hasCustomCloudinaryImage = !!custom?.imageUrl;
              const isUploading = menuUploadLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-borderStrong flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Dish Image Preview or Placeholder */}
                    <div className="relative w-full h-36 rounded-lg overflow-hidden bg-brand-surfaceElevated border border-brand-border/60 mb-3 group">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-brand-subtle gap-1.5">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                          <span className="text-[11px] font-mono">No Image Uploaded</span>
                        </div>
                      )}

                      {/* Cloudinary CDN Badge */}
                      {hasCustomCloudinaryImage && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-dark/90 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1 backdrop-blur-sm">
                          <Sparkles className="w-2.5 h-2.5" />
                          Cloudinary
                        </span>
                      )}

                      {/* Image Public ID */}
                      {custom?.imagePublicId && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-brand-dark/80 text-[9px] font-mono text-brand-subtle backdrop-blur-sm truncate max-w-[200px]">
                          {custom.imagePublicId}
                        </span>
                      )}
                    </div>

                    {/* Dish Title & Category */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm line-clamp-1">{item.name}</h4>
                        <span className="text-[10px] font-mono uppercase text-brand-subtle tracking-wider">
                          {item.category}
                        </span>
                      </div>
                      <span className="font-mono text-brand-orange text-xs font-semibold shrink-0">
                        {typeof item.price === 'number' ? `₹${item.price}` : item.price}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs text-brand-subtle line-clamp-2 mt-1 font-light leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 mt-3 border-t border-brand-border/50 flex items-center justify-between gap-2">
                    <label
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                        isUploading
                          ? 'bg-brand-surfaceElevated text-brand-subtle cursor-wait'
                          : 'bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange border border-brand-orange/30'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{hasCustomCloudinaryImage ? 'Replace Photo' : 'Upload Photo'}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMenuImageUpload(item.id, file);
                        }}
                        className="hidden"
                      />
                    </label>

                    {hasCustomCloudinaryImage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMenuImage(item.id)}
                        disabled={isUploading}
                        title="Delete photo from Cloudinary"
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMenuItems.length === 0 && (
            <div className="p-12 text-center text-brand-subtle bg-brand-surface rounded-2xl border border-brand-border">
              <p>No dishes match your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MEDIA GALLERY TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-brand-surface border border-brand-border">
            <div>
              <h3 className="text-sm font-bold text-white">Cafe, Dining & Gaming Gallery</h3>
              <p className="text-xs text-brand-subtle">
                Visual highlights showcasing GioCasa's lounge, brick-oven pizzas, cafe ambience, and gaming zones.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingGalleryItem(null);
                setGalleryForm({
                  title: '',
                  description: '',
                  imageUrl: '',
                  category: 'cafe',
                  tags: 'ambience, dining',
                  isFeatured: true,
                  displayOrder: galleryItems.length + 1,
                });
                setShowGalleryModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-brand-orange text-brand-charcoalDeep font-semibold text-xs flex items-center gap-1.5 shadow-luxury-orange"
            >
              <Plus className="w-4 h-4" />
              Add Photo to Gallery
            </button>
          </div>

          {/* Gallery Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-brand-surface border border-brand-border overflow-hidden flex flex-col justify-between group hover:border-brand-borderStrong transition-all"
              >
                <div>
                  <div className="relative w-full h-48 overflow-hidden bg-brand-surfaceElevated">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {item.isFeatured && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-orange text-brand-charcoalDeep text-[10px] font-bold uppercase tracking-wider">
                        Featured
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-brand-dark/80 text-[10px] font-mono text-brand-subtle backdrop-blur-sm">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-4 space-y-1">
                    <h4 className="font-bold text-white text-sm">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-brand-subtle leading-relaxed font-light">{item.description}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {item.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-brand-surfaceElevated text-[10px] font-mono text-brand-subtle border border-brand-border/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-brand-border/40 mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-brand-subtle">
                    Order: {item.displayOrder || 0}
                  </span>
                  <div className="flex items-center gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGalleryItem(item);
                        setGalleryForm({
                          title: item.title,
                          description: item.description || '',
                          imageUrl: item.imageUrl,
                          imagePublicId: item.imagePublicId,
                          category: item.category,
                          tags: (item.tags || []).join(', '),
                          isFeatured: !!item.isFeatured,
                          displayOrder: item.displayOrder || 0,
                        });
                        setShowGalleryModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-brand-surfaceElevated hover:bg-brand-border text-brand-subtle hover:text-white transition-colors"
                      title="Edit details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGalleryItem(item.id, item.title)}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 transition-colors"
                      title="Delete asset permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {galleryItems.length === 0 && !galleryLoading && (
            <div className="p-12 text-center text-brand-subtle bg-brand-surface rounded-2xl border border-brand-border">
              <p>No gallery images uploaded yet. Click "Add Photo to Gallery" to upload your first image.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OPTIMIZATION & CDN INFO TAB */}
      {/* ========================================================================= */}
      {activeSubTab === 'settings' && (
        <div className="p-6 rounded-2xl bg-brand-surface border border-brand-border space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Automated Cloudinary CDN Optimizations</h3>
              <p className="text-xs text-brand-subtle">
                Real-time delivery architecture configured for GioCasa Ayodhya
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <h4 className="text-xs font-mono uppercase text-brand-orange font-bold">Auto Format (`f_auto`)</h4>
              <p className="text-xs text-brand-subtle leading-relaxed">
                Cloudinary detects client browser capabilities and dynamically delivers the most lightweight modern image format (AVIF on Chrome, WebP on Safari/Firefox), cutting payload sizes by up to 60%.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <h4 className="text-xs font-mono uppercase text-brand-orange font-bold">Auto Quality (`q_auto`)</h4>
              <p className="text-xs text-brand-subtle leading-relaxed">
                Perceptual compression algorithms find the optimal balance between high visual fidelity and low file size, eliminating human guesswork and keeping mobile loading times under 400ms.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-brand-surfaceElevated border border-brand-border space-y-2">
              <h4 className="text-xs font-mono uppercase text-brand-orange font-bold">Smart Replacement Cleanup</h4>
              <p className="text-xs text-brand-subtle leading-relaxed">
                Whenever an image is replaced or deleted in the Admin Panel, the backend triggers <code>destroy(publicId)</code> with cache invalidation to prevent orphaned file accumulation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-dark/50 border border-brand-border/60 text-xs font-mono space-y-1.5">
            <div className="text-brand-subtle">Configured Environment Variables (Render & Server):</div>
            <div className="text-white">CLOUDINARY_CLOUD_NAME = hcmnz5rk</div>
            <div className="text-white">CLOUDINARY_API_KEY = 312623792228253</div>
            <div className="text-brand-subtle">CLOUDINARY_API_SECRET = ••••••••••••••••••••••••••• (Securely stored on server)</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GALLERY UPLOAD / EDIT MODAL */}
      {/* ========================================================================= */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-brand-border">
              <h3 className="font-bold text-white text-sm">
                {editingGalleryItem ? 'Edit Gallery Photo' : 'Upload New Gallery Photo'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="text-brand-subtle hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGalleryItem} className="p-5 space-y-4">
              {/* Photo Upload Zone */}
              <div>
                <label className="block text-xs font-mono text-brand-subtle uppercase mb-1.5">
                  Select Photo (Cloudinary CDN)
                </label>
                <div className="relative border-2 border-dashed border-brand-border hover:border-brand-orange/60 rounded-xl p-4 text-center bg-brand-surfaceElevated transition-colors">
                  {galleryForm.imageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={galleryForm.imageUrl}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg border border-brand-border"
                      />
                      <label className="inline-block px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-xs text-white cursor-pointer hover:border-brand-orange">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleGalleryFileSelect(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      {galleryUploadLoading ? (
                        <div className="flex flex-col items-center gap-2 text-brand-orange">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span className="text-xs font-mono">Uploading & Optimizing...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <Upload className="w-6 h-6 text-brand-subtle" />
                          <span className="text-xs font-medium text-white">Click or drag image here</span>
                          <span className="text-[10px] text-brand-subtle font-mono">PNG, JPG, WEBP up to 10MB</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={galleryUploadLoading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleGalleryFileSelect(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono text-brand-subtle uppercase mb-1">
                  Title / Caption *
                </label>
                <input
                  type="text"
                  required
                  value={galleryForm.title}
                  onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                  placeholder="e.g. Wood-Fired Margherita in the Brick Oven"
                  className="w-full px-3 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Category & Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-brand-subtle uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={galleryForm.category}
                    onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white focus:outline-none focus:border-brand-orange"
                  >
                    <option value="cafe">Cafe & Dining</option>
                    <option value="pizza">Brick Oven Pizza</option>
                    <option value="lounge">PS5 & Gaming Lounge</option>
                    <option value="events">Events & Tournaments</option>
                    <option value="ambience">Ambience & Decor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-brand-subtle uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={galleryForm.displayOrder}
                    onChange={(e) =>
                      setGalleryForm({ ...galleryForm, displayOrder: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-brand-subtle uppercase mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={galleryForm.description}
                  onChange={(e) => setGalleryForm({ ...galleryForm, description: e.target.value })}
                  placeholder="Additional context or notes..."
                  className="w-full px-3 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white focus:outline-none focus:border-brand-orange resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-mono text-brand-subtle uppercase mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={galleryForm.tags}
                  onChange={(e) => setGalleryForm({ ...galleryForm, tags: e.target.value })}
                  placeholder="pizza, woodfired, italian, dinner"
                  className="w-full px-3 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="galleryFeatured"
                  checked={galleryForm.isFeatured}
                  onChange={(e) => setGalleryForm({ ...galleryForm, isFeatured: e.target.checked })}
                  className="rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                />
                <label htmlFor="galleryFeatured" className="text-xs text-white cursor-pointer select-none">
                  Show in Featured Website Highlights
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setShowGalleryModal(false)}
                  className="px-4 py-2 rounded-lg bg-brand-surfaceElevated border border-brand-border text-xs text-brand-subtle hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!galleryForm.imageUrl || galleryUploadLoading}
                  className="px-5 py-2 rounded-lg bg-brand-orange text-brand-charcoalDeep font-semibold text-xs disabled:opacity-50 shadow-luxury-orange"
                >
                  {editingGalleryItem ? 'Save Changes' : 'Publish to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
