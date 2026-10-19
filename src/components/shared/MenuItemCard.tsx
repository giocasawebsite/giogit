import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { useOrderCart } from '../../context/OrderCartContext';
import { Plus, Check, Info } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { addToCart, cart } = useOrderCart();

  // Selected portion (for items like Chilli Paneer Half/Full)
  const [selectedPortion, setSelectedPortion] = useState<string>(
    item.portions && item.portions.length > 0 ? item.portions[0].name : ''
  );

  // Selected flavor (for items like Ice Tea)
  const [selectedFlavor, setSelectedFlavor] = useState<string>(
    item.flavors && item.flavors.length > 0 ? item.flavors[0].name : ''
  );

  // Compute active price
  let activePrice = typeof item.price === 'number' ? item.price : 0;
  if (item.portions && selectedPortion) {
    const p = item.portions.find(p => p.name === selectedPortion);
    if (p) activePrice = p.price;
  } else if (item.flavors && selectedFlavor) {
    const f = item.flavors.find(f => f.name === selectedFlavor);
    if (f) activePrice = f.price;
  }

  // Cart item id
  let cartId = item.id;
  let cartName = item.name;
  if (item.portions && selectedPortion) {
    cartId = `${item.id}-${selectedPortion.toLowerCase()}`;
    cartName = `${item.name} (${selectedPortion})`;
  } else if (item.flavors && selectedFlavor) {
    cartId = `${item.id}-${selectedFlavor.toLowerCase()}`;
    cartName = `${item.name} (${selectedFlavor})`;
  }

  const inCart = cart.find(i => i.item.id === cartId);

  const handleAddToCart = () => {
    const itemToAdd: MenuItem = {
      ...item,
      id: cartId,
      name: cartName,
      price: activePrice,
    };
    addToCart(itemToAdd);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-borderStrong transition-all duration-300 flex flex-col justify-between space-y-4 shadow-md group">
      <div className="space-y-3">
        {/* Title and Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {/* Vegetarian Indicator */}
              {item.isVegetarian && (
                <span className="w-3 h-3 rounded border border-emerald-500 flex items-center justify-center shrink-0" title="Vegetarian">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
              )}
              <h3 className="font-serif text-lg sm:text-xl font-bold text-white group-hover:text-brand-orange transition-colors">
                {item.name}
              </h3>
            </div>

            {/* Serving Note (e.g. Served with fries) */}
            {item.servingNote && (
              <span className="inline-block text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                🍟 {item.servingNote}
              </span>
            )}
          </div>

          {/* Active Price */}
          <div className="text-right shrink-0">
            <span className="font-mono text-lg sm:text-xl font-bold text-brand-orange">
              ₹{activePrice}
            </span>
            {(selectedPortion || selectedFlavor) && (
              <div className="text-[10px] font-mono text-brand-subtle">
                {selectedPortion || selectedFlavor}
              </div>
            )}
          </div>
        </div>

        {/* Description if present */}
        {item.description && (
          <p className="text-xs text-brand-subtle font-light leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Owner Verification Flag */}
        {item.flaggedForVerification && item.verificationNote && (
          <p className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded flex items-center gap-1.5">
            <Info className="w-3 h-3 shrink-0" />
            <span>{item.verificationNote}</span>
          </p>
        )}

        {/* Portions Selector (e.g. Chilli Paneer Half ₹149 / Full ₹249) */}
        {item.portions && item.portions.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <div className="text-[11px] text-brand-subtle font-mono flex justify-between">
              <span>Portion:</span>
              <span className="text-white font-medium">{selectedPortion}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {item.portions.map(p => {
                const isSelected = selectedPortion === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSelectedPortion(p.name)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold text-center transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-orange text-brand-charcoalDeep border-brand-orange font-bold shadow-sm'
                        : 'bg-brand-surfaceElevated text-brand-subtle hover:text-white border-brand-border/60 hover:border-brand-border'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className={isSelected ? 'text-brand-charcoalDeep font-bold' : 'text-brand-orange font-mono'}>
                      ₹{p.price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Flavors Selector (e.g. Ice Tea: Lemon, Kiwi, Peach, Strawberry @ ₹79) */}
        {item.flavors && item.flavors.length > 0 && (
          <div className="pt-1 space-y-1.5">
            <div className="text-[11px] text-brand-subtle font-mono flex justify-between">
              <span>Select Flavour:</span>
              <span className="text-white font-medium">{selectedFlavor}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {item.flavors.map(f => {
                const isSelected = selectedFlavor === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setSelectedFlavor(f.name)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center transition-all border ${
                      isSelected
                        ? 'bg-brand-orange text-brand-charcoalDeep border-brand-orange font-bold shadow-sm'
                        : 'bg-brand-surfaceElevated text-brand-subtle hover:text-white border-brand-border/60 hover:border-brand-border'
                    }`}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Add to Cart button */}
      <div className="pt-3 border-t border-brand-border/40 flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-wider text-brand-subtle">
          GioCasa Kitchen
        </span>

        <button
          type="button"
          onClick={handleAddToCart}
          className={`py-2 px-4 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            inCart
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-surfaceElevated hover:bg-brand-orange hover:text-brand-charcoalDeep text-white border border-brand-border hover:border-brand-orange'
          }`}
        >
          {inCart ? (
            <>
              <Check className="w-3 h-3" />
              <span>Added ({inCart.quantity})</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 text-brand-orange group-hover:text-brand-charcoalDeep" />
              <span>Add</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
