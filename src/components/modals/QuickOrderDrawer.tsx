import React, { useEffect } from 'react';
import { useOrderCart } from '../../context/OrderCartContext';
import { businessConfig } from '../../data/businessConfig';
import { menuData } from '../../data/menuData';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  MessageCircle, 
  Phone, 
  Bike, 
  UtensilsCrossed, 
  Package, 
  ArrowRight, 
  Sparkles, 
  Flame,
  ChevronRight
} from 'lucide-react';

export const QuickOrderDrawer: React.FC = () => {
  const {
    cart,
    isDrawerOpen,
    closeDrawer,
    orderType,
    setOrderType,
    tableOrAddress,
    setTableOrAddress,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    notes,
    setNotes,
    subtotal,
    deliveryFee,
    totalAmount,
    totalItems,
    updateQuantity,
    removeFromCart,
    addToCart,
    clearCart,
    getWhatsAppOrderUrl,
  } = useOrderCart();

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const popularQuickPicks = menuData.filter(i => i.isBestseller || i.isSignature).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-brand-darker/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div 
        className="relative w-full sm:max-w-md h-full max-h-[100dvh] bg-brand-surface border-l border-brand-border flex flex-col justify-between shadow-2xl z-10 overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your Order Cart"
      >
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 bg-brand-surfaceElevated border-b border-brand-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white leading-tight">
                Your Order
              </h3>
              <span className="text-[11px] text-brand-muted font-mono block">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in basket
              </span>
            </div>
          </div>

          <button
            onClick={closeDrawer}
            className="p-2 rounded-full bg-brand-surface border border-brand-border text-brand-muted hover:text-white hover:border-brand-orange active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close Cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5 min-h-0">
          {cart.length > 0 ? (
            <>
              {/* Order Mode Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-semibold">
                  Order Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[
                    { id: 'delivery' as const, label: 'Delivery', sub: 'Ayodhya', icon: Bike },
                    { id: 'dinein' as const, label: 'Dine-In', sub: 'Table', icon: UtensilsCrossed },
                    { id: 'takeaway' as const, label: 'Takeaway', sub: 'Self-Pick', icon: Package },
                  ].map(type => {
                    const Icon = type.icon;
                    const isSelected = orderType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setOrderType(type.id)}
                        className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                          isSelected
                            ? 'bg-brand-orange/20 border-brand-orange text-white shadow-luxury-orange'
                            : 'bg-brand-dark/40 border-brand-border text-brand-muted hover:border-brand-borderStrong'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-orange' : 'text-brand-muted'}`} />
                        <span className="text-xs font-semibold leading-none">{type.label}</span>
                        <span className="text-[9px] text-brand-muted leading-none hidden xs:inline">{type.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-brand-muted">
                  <span className="uppercase tracking-wider font-semibold text-[10px]">Selected Items</span>
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 py-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {cart.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-between gap-2.5"
                    >
                      {/* Left: Item Info */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          {item.isWoodFired && (
                            <Flame className="w-3 h-3 text-brand-orange shrink-0" />
                          )}
                          <h4 className="font-serif text-sm sm:text-base font-semibold text-white truncate leading-tight">
                            {item.name}
                          </h4>
                        </div>
                        <div className="text-[11px] text-brand-orange font-mono font-bold">
                          ₹{typeof item.price === 'number' ? item.price : 0} each
                        </div>
                      </div>

                      {/* Middle: Touch-friendly Quantity Selector */}
                      <div className="flex items-center gap-1.5 bg-brand-dark px-2 py-1 rounded-full border border-brand-border shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-full hover:bg-brand-surfaceElevated flex items-center justify-center text-brand-muted hover:text-white active:scale-90 transition-transform"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-white w-4 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-full hover:bg-brand-surfaceElevated flex items-center justify-center text-brand-muted hover:text-white active:scale-90 transition-transform"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Right: Subtotal */}
                      <div className="text-right font-mono text-xs font-semibold text-white min-w-[44px] shrink-0">
                        ₹{typeof item.price === 'number' ? item.price * quantity : 'MRP'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Contact & Address Form */}
              <div className="space-y-2 pt-2 border-t border-brand-border/40">
                <label className="block text-[10px] uppercase tracking-widest text-brand-subtle font-semibold">
                  {orderType === 'dinein' ? 'Seating / Table Information' : 'Delivery Address & Contact'}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                  />

                  <input
                    type="tel"
                    placeholder="Phone / WhatsApp *"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                  />
                </div>

                <input
                  type="text"
                  placeholder={
                    orderType === 'dinein'
                      ? 'Table No. / Floor (e.g. Table 4 / Gaming Station 2)'
                      : 'Delivery Street Address in Ayodhya *'
                  }
                  value={tableOrAddress}
                  onChange={e => setTableOrAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                />

                <input
                  type="text"
                  placeholder="Special instructions (e.g. Extra oregano, less spicy)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-brand-terracotta"
                />
              </div>
            </>
          ) : (
            /* Empty Cart View */
            <div className="text-center py-8 space-y-5">
              <div className="w-14 h-14 rounded-full bg-brand-surfaceElevated border border-brand-border flex items-center justify-center mx-auto text-brand-subtle">
                <ShoppingBag className="w-6 h-6 opacity-40" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-xl font-bold text-brand-cream">
                  Your cart is empty
                </h4>
                <p className="text-xs text-brand-subtle font-light max-w-xs mx-auto">
                  Add wood-fired pizzas, iced frappes, or snacks to start your order.
                </p>
              </div>

              {/* Quick Picks for fast adding */}
              <div className="text-left space-y-2 pt-3 border-t border-brand-border/40">
                <span className="text-[10px] uppercase tracking-widest text-brand-gold font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Popular Quick Picks
                </span>
                <div className="space-y-1.5">
                  {popularQuickPicks.map(pick => (
                    <div
                      key={pick.id}
                      className="p-2.5 rounded-xl bg-brand-surfaceElevated border border-brand-border flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-brand-cream truncate">{pick.name}</div>
                        <div className="text-[11px] text-brand-gold font-mono">₹{pick.price}</div>
                      </div>
                      <button
                        onClick={() => addToCart(pick)}
                        className="px-3 py-1.5 rounded-full bg-brand-terracotta hover:bg-brand-terracottaHover text-white text-[11px] font-semibold shrink-0 active:scale-95 transition-transform"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Sticky Footer Checkout Summary */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 bg-brand-surfaceElevated border-t border-brand-border space-y-3 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            {/* Price Calculations */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-brand-subtle">
                <span>Subtotal</span>
                <span className="font-mono">₹{subtotal}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between text-brand-subtle text-[11px]">
                  <span>Delivery (Ayodhya)</span>
                  <span className="font-mono">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-400 font-semibold">FREE (Above ₹{businessConfig.delivery.freeDeliveryAbove})</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-brand-cream pt-1.5 border-t border-brand-border/40">
                <span>Total Amount</span>
                <span className="font-mono text-brand-gold text-base">₹{totalAmount}</span>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="space-y-2">
              <a
                href={getWhatsAppOrderUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Send Order on WhatsApp</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>

              <a
                href={`tel:${businessConfig.contact.phone}`}
                className="w-full py-2 px-3 rounded-full bg-brand-surface border border-brand-border text-brand-subtle hover:text-brand-cream font-medium text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3 h-3 text-brand-gold" />
                <span>Or Call to Order: {businessConfig.contact.displayPhone}</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
