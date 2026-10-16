import React from 'react';
import { MenuItem } from '../../types';
import { useOrderCart } from '../../context/OrderCartContext';
import { Flame, Plus, Sparkles, Clock, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PizzaFeatureCardProps {
  pizza: MenuItem;
  layout?: 'grid' | 'featured';
}

export const PizzaFeatureCard: React.FC<PizzaFeatureCardProps> = ({ pizza, layout = 'grid' }) => {
  const { addToCart, cart } = useOrderCart();
  const inCart = cart.find(i => i.item.id === pizza.id);

  return (
    <div className="group bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-terracotta/50 transition-all duration-500 overflow-hidden flex flex-col justify-between shadow-xl hover:shadow-2xl hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-dark">
        <img
          src={pizza.image || 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80'}
          alt={pizza.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95 group-hover:brightness-100"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {pizza.isSignature && (
            <Badge variant="orange" size="sm">
              Signature
            </Badge>
          )}
          {pizza.isBestseller && (
            <Badge variant="pink" size="sm">
              Bestseller
            </Badge>
          )}
        </div>

        {/* Wood-Fired Hearth Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-dark/90 backdrop-blur-md border border-brand-border text-[10px] font-mono uppercase tracking-wider text-brand-orange font-semibold">
            <Flame className="w-3 h-3 text-brand-orange" />
            450°C Hearth
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-brand-orange transition-colors">
              {pizza.name}
            </h3>
            <span className="font-mono text-lg font-bold text-brand-orange">
              ₹{pizza.price}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-brand-subtle font-light line-clamp-2 leading-relaxed">
            {pizza.description}
          </p>

          {/* Ingredients Breakdown */}
          {pizza.ingredients && pizza.ingredients.length > 0 && (
            <div className="pt-2">
              <div className="flex flex-wrap gap-1">
                {pizza.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-brand-surfaceElevated border border-brand-border/40 text-white/80"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between">
          <span className="text-[11px] text-brand-muted flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-brand-orange" />
            {pizza.prepTime || '12-15 mins'}
          </span>

          <button
            onClick={() => addToCart(pizza)}
            className={`py-2 px-4 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              inCart
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
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
                <span>Add to Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
