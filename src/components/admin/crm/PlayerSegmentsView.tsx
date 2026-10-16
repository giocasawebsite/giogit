import React from 'react';
import { PlayerSegment } from '../../../types';
import {
  Users,
  Sparkles,
  Trophy,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  MessageCircle,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface PlayerSegmentsViewProps {
  segmentsSummary: Record<string, number>;
  onSelectSegment: (seg: PlayerSegment) => void;
}

export const PlayerSegmentsView: React.FC<PlayerSegmentsViewProps> = ({
  segmentsSummary,
  onSelectSegment,
}) => {
  const cards = [
    {
      id: 'new' as PlayerSegment,
      title: 'New Players',
      count: segmentsSummary.new || 0,
      icon: Sparkles,
      color: 'pink',
      description: 'First joined within the last 14 days or only 1 visit on record. Welcome them and introduce them to the venue.',
      actionLabel: 'View New Players',
    },
    {
      id: 'frequent' as PlayerSegment,
      title: 'Frequent Visitors',
      count: segmentsSummary.frequent || 0,
      icon: Flame,
      color: 'orange',
      description: 'Players with 3+ station reservations or over 5 hours of total playtime logged. Your most reliable weekday and weekend crowd.',
      actionLabel: 'View Frequent Regulars',
    },
    {
      id: 'tournament_regulars' as PlayerSegment,
      title: 'Tournament Regulars',
      count: segmentsSummary.tournament_regulars || 0,
      icon: Trophy,
      color: 'blue',
      description: 'Competitive players who have entered 2 or more tournaments. Ideal audience for new tournament launches and bracket announcements.',
      actionLabel: 'View Competitors',
    },
    {
      id: 'winners' as PlayerSegment,
      title: 'Champions & Winners',
      count: segmentsSummary.winners || 0,
      icon: Trophy,
      color: 'orange',
      description: 'Hall of Fame inductees and tournament podium finishers. Ayodhya community legends with verified competitive wins.',
      actionLabel: 'View Champions',
    },
    {
      id: 'vip' as PlayerSegment,
      title: 'VIP Platinum Members',
      count: segmentsSummary.vip || 0,
      icon: UserCheck,
      color: 'pink',
      description: 'VIP tier guests or players with ₹2,000+ verified venue spend. Entitled to priority reservations and station perks.',
      actionLabel: 'View VIP Players',
    },
    {
      id: 'upcoming_bookings' as PlayerSegment,
      title: 'Upcoming Bookings',
      count: segmentsSummary.upcoming_bookings || 0,
      icon: Calendar,
      color: 'blue',
      description: 'Players with confirmed reservations scheduled today or in the future. Check station readiness and warm up displays.',
      actionLabel: 'View Upcoming',
    },
    {
      id: 'inactive' as PlayerSegment,
      title: 'Inactive / Lapsed Players',
      count: segmentsSummary.inactive || 0,
      icon: UserX,
      color: 'subtle',
      description: 'Registered customers who have not visited in 30+ days. Perfect candidates for re-engagement WhatsApp check-ins and offers.',
      actionLabel: 'Re-engage Inactive',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold text-white">
          Intelligent Player Segments
        </h2>
        <p className="text-xs text-brand-subtle max-w-2xl">
          Automated customer cohorts derived directly from real booking attendance, tournament registrations, and verified spending.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className="p-6 rounded-3xl bg-brand-surface border border-brand-border hover:border-brand-pink/50 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      c.color === 'pink'
                        ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/40'
                        : c.color === 'orange'
                        ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/40'
                        : c.color === 'blue'
                        ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/40'
                        : 'bg-brand-surfaceElevated text-brand-subtle border border-brand-border'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-serif text-3xl font-bold text-white group-hover:scale-105 transition-transform">
                    {c.count}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-white">{c.title}</h3>
                <p className="text-xs text-brand-subtle leading-relaxed font-light">{c.description}</p>
              </div>

              <div className="pt-4 border-t border-brand-border/40">
                <button
                  onClick={() => onSelectSegment(c.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-surfaceElevated hover:bg-brand-pink hover:text-white border border-brand-border text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>{c.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
