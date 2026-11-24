import React from 'react';
import { businessConfig } from '../../data/businessConfig';
import { ArrowUpRight } from 'lucide-react';
import { InstagramIcon } from '../ui/InstagramIcon';

export const InstagramGrid: React.FC = () => {
  const posts = [
    {
      id: 1,
      image: '/assets/real/insta_Dftthy4qYGO.jpg',
      tag: '#WoodFiredPizza',
      caption: 'Wood-fired pizza, gourmet burgers and crispy fries fresh from our kitchen in Ayodhya.',
      url: 'https://www.instagram.com/giocasacafe/p/Dftthy4qYGO/'
    },
    {
      id: 2,
      image: '/assets/real/ps5_setup.png',
      tag: '#PS5Arena',
      caption: '4K HDR gaming stations live in Ayodhya. Tekken 8 and EA FC 25 battles in full effect!',
      url: 'https://www.instagram.com/giocasacafe/p/DflyoVvKSNR/'
    },
    {
      id: 3,
      image: '/assets/real/insta_DfEfA5VzdBP.jpg',
      tag: '#8BallPool',
      caption: 'Championship slate pool tables ready for unhurried evening frames with friends.',
      url: 'https://www.instagram.com/giocasacafe/p/DfEfA5VzdBP/'
    },
    {
      id: 4,
      image: 'https://res.cloudinary.com/hcmnz5rk/image/upload/f_auto/q_auto/racing.jpg',
      tag: '#RacingSimulator',
      caption: 'Pro force-feedback racing simulator cockpit with GT bucket seating and ultra-wide display.',
      url: 'https://www.instagram.com/giocasacafe/'
    },
    {
      id: 5,
      image: '/assets/real/foosball_lounge.png',
      tag: '#FoosballLounge',
      caption: 'Fast-paced table soccer action in our first-floor lounge with friends.',
      url: 'https://www.instagram.com/giocasacafe/reel/DfwS1SDqgen/'
    },
    {
      id: 6,
      image: '/assets/real/insta_Df2v3KXz37R.jpg',
      tag: '#GioCasaCelebrations',
      caption: 'Birthday celebrations, good vibes and unforgettable memories at GioCasa Family Lounge.',
      url: 'https://www.instagram.com/giocasacafe/reel/Df2v3KXz37R/'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {posts.map(post => (
          <a
            key={post.id}
            href={post.url || businessConfig.contact.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-2xl overflow-hidden bg-brand-surface border border-brand-border block"
          >
            <img
              src={post.image}
              alt={post.tag}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-brand-dark/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-between text-brand-cream">
              <span className="text-[10px] font-mono text-brand-gold font-bold">
                {post.tag}
              </span>
              <p className="text-[11px] font-light line-clamp-3 leading-snug">
                {post.caption}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-brand-border/40 text-[10px] text-brand-subtle">
                <span className="flex items-center gap-1">
                  <InstagramIcon className="w-3 h-3 text-brand-terracotta" />
                  GioCasa
                </span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="text-center pt-2">
        <a
          href={businessConfig.contact.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-surface border border-brand-border hover:border-brand-terracotta text-brand-cream hover:text-brand-terracotta text-xs font-semibold uppercase tracking-widest transition-colors"
        >
          <InstagramIcon className="w-4 h-4 text-brand-terracotta" />
          <span>Follow {businessConfig.contact.instagramHandle}</span>
        </a>
      </div>
    </div>
  );
};
