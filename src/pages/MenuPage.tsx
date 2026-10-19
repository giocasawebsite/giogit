import React, { useState, useEffect } from 'react';
import { PageRoute, MenuItem } from '../types';
import { menuCategories, menuData } from '../data/menuData';
import { businessConfig } from '../data/businessConfig';
import { useOrderCart } from '../context/OrderCartContext';
import { PizzaFeatureCard } from '../components/shared/PizzaFeatureCard';
import { MenuItemCard } from '../components/shared/MenuItemCard';
import { 
  Flame, 
  ShoppingBag, 
  Search, 
  X, 
  Maximize2, 
  Sparkles,
  Info,
  Bike
} from 'lucide-react';

interface MenuPageProps {
  onNavigate: (page: PageRoute) => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { cart, openDrawer, totalItems, totalAmount } = useOrderCart();

  useEffect(() => {
    document.title = 'GioCasa Menu | Vegetarian Brick-Oven Pizza, Coffee & More';
  }, []);

  // Filter items
  const filteredItems = menuData.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesName = item.name.toLowerCase().includes(q);
    const matchesDesc = item.description ? item.description.toLowerCase().includes(q) : false;
    const matchesFlavors = item.flavors ? item.flavors.some(f => f.name.toLowerCase().includes(q)) : false;
    const matchesCategoryName = item.category.toLowerCase().includes(q);

    return matchesCategory && (matchesName || matchesDesc || matchesFlavors || matchesCategoryName);
  });

  // Grouped by categories (excluding 'all')
  const categoriesToDisplay = activeCategory === 'all'
    ? menuCategories.filter(c => c.id !== 'all')
    : menuCategories.filter(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-brand-dark text-white pt-24 sm:pt-28 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-orange selection:text-brand-charcoalDeep">
      <div className="max-w-[1200px] mx-auto space-y-10 sm:space-y-12">
        
        {/* ========================================================= */}
        {/* 1. COMPACT HERO */}
        {/* ========================================================= */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-surface border border-brand-orange/30 text-brand-orange text-xs font-semibold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Café & Hearth</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Good Food. Great Mood.
          </h1>

          <p className="font-italic-accent text-xl sm:text-2xl text-brand-orange italic font-medium">
            Eat • Play • Repeat.
          </p>

          <p className="text-xs sm:text-sm text-brand-subtle font-light max-w-xl mx-auto leading-relaxed">
            Freshly prepared wood-fired pizzas, piping hot teas, handcrafted frappes, sandwiches, noodles, and loaded bites inside GioCasa Ayodhya.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 2. SEARCH & STICKY CATEGORY NAVIGATION */}
        {/* ========================================================= */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Search bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-brand-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Search the menu"
              placeholder="Search the menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-full bg-brand-surface border border-brand-border text-white text-xs sm:text-sm focus:outline-none focus:border-brand-orange placeholder:text-brand-muted transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-brand-muted hover:text-white hover:bg-brand-surfaceElevated transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontally Scrollable Category Pills */}
          <div 
            role="tablist"
            aria-label="Menu categories"
            className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none justify-start sm:justify-center -mx-4 sm:mx-0 px-4 sm:px-0"
          >
            {menuCategories.map(cat => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-brand-orange text-brand-charcoalDeep font-bold shadow-luxury-orange border border-brand-orange scale-105'
                      : 'bg-brand-surface border border-brand-border text-brand-subtle hover:text-white hover:border-brand-borderStrong'
                  }`}
                >
                  {cat.highlight && <Flame className="w-3.5 h-3.5 text-brand-pink" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. MENU CONTENT SECTIONS */}
        {/* ========================================================= */}
        {filteredItems.length > 0 ? (
          <div className="space-y-16">
            {categoriesToDisplay.map(cat => {
              const itemsInCat = filteredItems.filter(i => i.category === cat.id);
              if (itemsInCat.length === 0) return null;

              const isPizzaCategory = cat.id === 'pizza';

              return (
                <section key={cat.id} className="space-y-6">
                  {/* Category Header */}
                  <div className="border-b border-brand-border/60 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2.5">
                        {isPizzaCategory && <Flame className="w-6 h-6 text-brand-orange" />}
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                          {cat.label}
                        </h2>
                      </div>

                      {/* Special Category Highlights */}
                      {isPizzaCategory && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="w-3 h-3 rounded border border-emerald-500 flex items-center justify-center p-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                            100% Vegetarian Brick Oven Range
                          </span>
                        </div>
                      )}

                      {cat.id === 'sandwiches' && (
                        <p className="mt-1 text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span>🍟 All sandwiches are served with fries</span>
                        </p>
                      )}
                    </div>

                    <span className="text-xs text-brand-subtle font-mono">
                      {itemsInCat.length} {itemsInCat.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Pizza Category Rendering */}
                  {isPizzaCategory ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {itemsInCat.map(pizza => (
                        <PizzaFeatureCard key={pizza.id} pizza={pizza} />
                      ))}
                    </div>
                  ) : (
                    /* General Menu Items Rendering (Two columns on desktop) */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {itemsInCat.map(item => (
                        <MenuItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          /* Empty Search State */
          <div className="text-center py-20 space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center mx-auto text-brand-muted">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-white font-bold">No menu items found</h3>
            <p className="text-xs sm:text-sm text-brand-subtle font-light">
              We couldn't find any dish matching &ldquo;{searchQuery}&rdquo;. Try another search term or reset your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="py-2.5 px-6 rounded-full bg-brand-orange text-brand-charcoalDeep font-bold text-xs uppercase tracking-wider shadow-luxury-orange hover:bg-brand-orangeHover transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. VIEW ORIGINAL MENU SECTION */}
        {/* ========================================================= */}
        <section className="pt-12 border-t border-brand-border/60 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-brand-orange font-semibold block">
                Official Archive
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                View Original Menu
              </h2>
              <p className="text-xs sm:text-sm text-brand-subtle font-light mt-1">
                Inspect high-resolution photo scans of the official GioCasa printed café menu.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
            {/* Page 1 Thumbnail */}
            <div 
              onClick={() => setPreviewImage('/assets/menu/original-menu-page-1.jpg')}
              className="cursor-pointer group relative rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-orange/60 overflow-hidden shadow-lg transition-all"
            >
              <div className="aspect-[3/4] overflow-hidden bg-brand-dark relative">
                <img
                  src="/assets/menu/original-menu-page-1.jpg"
                  alt="Official GioCasa Printed Menu - Page 1 (Tea, Coffee, Shakes, Mocktails, Sides & Burgers)"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="px-4 py-2 rounded-full bg-brand-charcoalDeep/90 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 group-hover:scale-105 transition-transform shadow-xl">
                    <Maximize2 className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Click to Inspect Page 1</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-brand-border/40">
                <h4 className="font-serif text-sm font-bold text-white group-hover:text-brand-orange transition-colors">
                  Menu Page 1: Beverages, Shakes & Burgers
                </h4>
                <p className="text-[11px] text-brand-subtle font-mono mt-0.5">
                  High-Resolution Scan • Click to Zoom
                </p>
              </div>
            </div>

            {/* Note card regarding Page 2 digital transcription */}
            <div className="rounded-2xl bg-brand-surface border border-brand-border p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="font-serif text-lg font-bold text-white">
                  100% Digitized & Verified
                </h4>
                <p className="text-xs text-brand-subtle leading-relaxed font-light">
                  Every section of the GioCasa menu—including Chinese, Wood & Brick Fired Pizzas, Wraps, and Sandwiches—has been fully transcribed above with interactive size selectors and instant price lookups.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/40 text-[11px] text-brand-subtle font-mono">
                Location: GioCasa Café & Gaming Lounge, Ayodhya
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Announcement Footer Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark border border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Delivering Piping Hot Across Ayodhya
              </div>
              <div className="text-xs text-brand-subtle">
                Direct WhatsApp Order Dispatch • Free Delivery Above ₹{businessConfig.delivery.freeDeliveryAbove}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openDrawer}
            className="py-2.5 px-6 rounded-full bg-brand-orange hover:bg-brand-orangeHover text-brand-charcoalDeep font-bold text-xs uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 shadow-luxury-orange"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open Cart ({totalItems})</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* 5. LIGHTBOX MODAL FOR ORIGINAL MENU SCAN */}
        {/* ========================================================= */}
        {previewImage && (
          <div 
            role="dialog"
            aria-modal="true"
            aria-label="Menu scan viewer"
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setPreviewImage(null)}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] bg-brand-charcoalDeep rounded-2xl border border-brand-border/80 overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-brand-border/60 flex items-center justify-between bg-brand-surface">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Official Menu Scan Inspection
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 rounded-full text-brand-muted hover:text-white hover:bg-brand-surfaceElevated transition-colors"
                  aria-label="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-auto max-h-[80vh] p-2 flex items-center justify-center bg-black/50">
                <img
                  src={previewImage}
                  alt="Original printed menu full resolution"
                  className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. FLOATING CART TRIGGER BAR */}
        {/* ========================================================= */}
        {totalItems > 0 && (
          <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 animate-slide-up w-auto max-w-[92vw] flex justify-center">
            <button
              type="button"
              onClick={openDrawer}
              className="py-3.5 px-6 sm:py-4 sm:px-8 rounded-full bg-brand-charcoalDeep/90 backdrop-blur-2xl border border-white/20 text-white font-bold text-xs sm:text-sm uppercase tracking-widest shadow-[0_12px_40px_0_rgba(0,0,0,0.7),inset_0_1px_1.5px_0_rgba(255,255,255,0.25)] hover:bg-brand-charcoalDeep hover:border-brand-pink hover:shadow-luxury-pink flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group shrink-0 whitespace-nowrap"
            >
              <div className="w-6 h-6 rounded-full bg-brand-pink text-white flex items-center justify-center font-mono text-xs font-bold shadow-md group-hover:scale-110 transition-transform">
                {totalItems}
              </div>
              <span className="tracking-wider">View Order (₹{totalAmount})</span>
              <ShoppingBag className="w-4 h-4 text-brand-orange group-hover:text-brand-pink transition-colors" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
