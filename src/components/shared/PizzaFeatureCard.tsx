import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { useOrderCart } from '../../context/OrderCartContext';
import { Flame, Plus, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PizzaFeatureCardProps {
  pizza: MenuItem;
  layout?: 'grid' | 'featured';
}

export const PizzaFeatureCard: React.FC<PizzaFeatureCardProps> = ({ pizza }) => {
  const { addToCart, cart } = useOrderCart();
  const [selectedSize, setSelectedSize] = useState<string>(
    pizza.sizes && pizza.sizes.length > 0 ? pizza.sizes[0].size : '8-inch'
  );

  const activeSizeObj = pizza.sizes?.find(s => s.size === selectedSize);
  const activePrice = activeSizeObj ? activeSizeObj.price : (typeof pizza.price === 'number' ? pizza.price : 0);
  const cartItemId = pizza.sizes ? `${pizza.id}-${selectedSize}` : pizza.id;
  const inCart = cart.find(i => i.item.id === cartItemId);

  const handleAddToCart = () => {
    const itemToAdd: MenuItem = {
      ...pizza,
      id: cartItemId,
      name: pizza.sizes ? `${pizza.name} (${selectedSize})` : pizza.name,
      price: activePrice,
    };
    addToCart(itemToAdd);
  };

  return (
    <div className="group bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-orange/40 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xl hover:shadow-2xl">
      {/* Top Header / Meta Bar */}
      <div className="p-5 pb-3 border-b border-brand-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Vegetarian Indicator */}
          <span className="w-3.5 h-3.5 rounded border border-emerald-500 flex items-center justify-center shrink-0" title="100% Vegetarian">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold">
            100% Vegetarian
          </span>
        </div>

        {/* Spice Label / Wood-Fired Tag */}
        <div className="flex items-center gap-1.5">
          {pizza.spiceLabel && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-brand-surfaceElevated border border-brand-border text-brand-orange">
              <Flame className="w-3 h-3" />
              {pizza.spiceLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-dark/80 border border-brand-border/60 text-[10px] font-mono uppercase tracking-wider text-brand-subtle">
            Brick Oven
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-brand-orange transition-colors">
                {pizza.name}
              </h3>
              {pizza.flaggedForVerification && (
                <span className="inline-block mt-0.5 text-[10px] font-mono text-amber-400">
                  * Printed spelling preserved
                </span>
              )}
            </div>
            
            {/* Displayed Price - immediately responsive to selected size */}
            <div className="text-right shrink-0">
              <div className="font-mono text-xl sm:text-2xl font-bold text-brand-orange">
                ₹{activePrice}
              </div>
              {pizza.sizes && (
                <div className="text-[10px] font-mono text-brand-subtle">
                  for {selectedSize}
                </div>
              )}
            </div>
          </div>

          {pizza.description && (
            <p className="text-xs sm:text-sm text-brand-subtle font-light leading-relaxed">
              {pizza.description}
            </p>
          )}

          {pizza.flaggedForVerification && (
            <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
              {pizza.verificationNote}
            </p>
          )}

          {/* Size Selector with exact inch measurements and price updates */}
          {pizza.sizes && pizza.sizes.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-brand-subtle font-mono">
                <span>Select Size:</span>
                <span className="text-white font-medium">{selectedSize}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {pizza.sizes.map(s => {
                  const isSelected = selectedSize === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setSelectedSize(s.size)}
                      className={`py-2 px-2 rounded-xl text-center transition-all border ${
                        isSelected
                          ? 'bg-brand-orange text-brand-charcoalDeep border-brand-orange font-bold shadow-luxury-orange'
                          : 'bg-brand-surfaceElevated text-brand-subtle hover:text-white border-brand-border/60 hover:border-brand-border'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-semibold">{s.size}</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${isSelected ? 'text-brand-charcoalDeep' : 'text-brand-orange'}`}>
                        ₹{s.price}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between gap-3">
          <span className="text-[11px] text-brand-muted flex items-center gap-1 font-mono">
            <Flame className="w-3 h-3 text-brand-orange" />
            Wood & Brick Fired
          </span>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`py-2.5 px-4 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              inCart
                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'
                : 'bg-brand-surfaceElevated hover:bg-brand-orange hover:text-brand-charcoalDeep text-white border border-brand-border hover:border-brand-orange'
            }`}
          >
            {inCart ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added ({inCart.quantity})</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-brand-orange group-hover:text-brand-charcoalDeep" />
                <span>Add ({selectedSize})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
