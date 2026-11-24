import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Flame, 
  Gamepad2, 
  Sparkles, 
  MessageCircle, 
  PartyPopper, 
  Check, 
  ArrowRight,
  Calendar,
  User,
  Phone,
  FileText
} from 'lucide-react';

export const EventPackageCalculator: React.FC = () => {
  const [packageName, setPackageName] = useState('Custom Celebration Package');
  const [celebrationType, setCelebrationType] = useState('Birthday Celebration');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState('06:00 PM');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  const [guests, setGuests] = useState(12);
  const [durationHours, setDurationHours] = useState(3);
  const [includeFullGaming, setIncludeFullGaming] = useState(true);
  const [includePizzaFeast, setIncludePizzaFeast] = useState(true);
  const [includeTournamentHost, setIncludeTournamentHost] = useState(true);
  const [includeCakeCeremony, setIncludeCakeCeremony] = useState(true);

  // Price calculations
  const baseRatePerGuestPerHour = 150;
  const foodRatePerGuest = includePizzaFeast ? 250 : 0;
  const gamingPerGuest = includeFullGaming ? 150 : 0;
  const tournamentHostFee = includeTournamentHost ? 500 : 0;

  const estimatedTotal = (guests * (baseRatePerGuestPerHour + foodRatePerGuest + gamingPerGuest)) + tournamentHostFee;
  const estimatedPerGuest = Math.round(estimatedTotal / guests);

  // Official GioCasa WhatsApp number requested: 919696028522
  const OFFICIAL_WHATSAPP_NUMBER = '919696028522';

  const generatePackageInquiryWhatsApp = () => {
    const addOnsList: string[] = [];
    if (includeFullGaming) addOnsList.push('• Full Gaming Lounge (PS5, Pool, Racing & Foosball)');
    if (includePizzaFeast) addOnsList.push('• Chef’s Wood-Fired Pizza Feast, Starters & Shakes');
    if (includeTournamentHost) addOnsList.push('• Dedicated Tournament Coordinator & Custom Trophy');
    if (includeCakeCeremony) addOnsList.push('• Cake Cutting Ceremony Setup & Private Playlist Control');

    const msg = 
`🎉 *GIOCASA AYODHYA — CELEBRATION PACKAGE ENQUIRY* 🎉
--------------------------------------------------
*Selected Package:* ${packageName}
*Celebration / Event Type:* ${celebrationType}
*Preferred Date:* ${eventDate}
*Preferred Time:* ${preferredTime}
*Number of Guests:* ${guests} Persons
*Estimated Duration:* ${durationHours} Hours

*Selected Inclusions & Add-ons:*
${addOnsList.length > 0 ? addOnsList.join('\n') : '• Standard Social Table Hosting'}
${customerName.trim() ? `\n*Customer Name:* ${customerName.trim()}` : ''}${customerPhone.trim() ? `\n*Contact Number:* ${customerPhone.trim()}` : ''}${specialRequirements.trim() ? `\n*Special Requests:* ${specialRequirements.trim()}` : ''}

*Estimated Package Quote:* ~₹${estimatedTotal.toLocaleString()} (approx. ₹${estimatedPerGuest}/guest)
--------------------------------------------------
Hi GioCasa Team! I would like to check availability and discuss this celebration package for our event. Please connect with me!`;

    return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="bg-brand-surface rounded-3xl border border-brand-border p-4 sm:p-8 lg:p-10 shadow-2xl space-y-6 sm:space-y-8">
      <div className="border-b border-brand-border/40 pb-5 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-brand-gold font-semibold block mb-0.5">
            Instant Event Estimator
          </span>
          <h3 className="font-serif text-xl sm:text-3xl font-bold text-brand-cream">
            Build Your Celebration Package
          </h3>
        </div>
        <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-brand-surfaceElevated border border-brand-border text-[11px] sm:text-xs text-brand-subtle w-fit">
          Suitable for 6 to 45 Guests • WhatsApp Finalization
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sliders & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Event Type & Package Selection */}
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-widest text-brand-subtle font-semibold block">
              1. Celebration Type & Event Style
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                'Birthday Celebration',
                'Private Gaming Night',
                'Corporate / Mixer',
                'Farewell / Reunion',
                'Championship Party',
                'Custom Gathering',
              ].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCelebrationType(type)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition-all ${
                    celebrationType === type
                      ? 'bg-brand-surfaceElevated border-brand-terracotta text-brand-cream ring-1 ring-brand-terracotta/50 font-semibold'
                      : 'bg-brand-surface border-brand-border/60 text-brand-subtle hover:text-white hover:border-brand-border'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Date & Preferred Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs text-brand-subtle font-semibold flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                <span>Selected Date</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3.5 py-2 text-xs font-mono text-brand-cream focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="text-xs text-brand-subtle font-semibold flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-gold" />
                <span>Preferred Time Slot</span>
              </label>
              <select
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-2 text-xs font-mono text-brand-cream focus:outline-none focus:border-brand-gold"
              >
                <option value="01:00 PM">01:00 PM (Afternoon Lunch Session)</option>
                <option value="03:30 PM">03:30 PM (Tea & Gaming Matinee)</option>
                <option value="06:00 PM">06:00 PM (Evening Celebration)</option>
                <option value="08:00 PM">08:00 PM (Dinner & Night Social)</option>
                <option value="09:30 PM">09:30 PM (Late Night Gaming Mixer)</option>
              </select>
            </div>
          </div>

          {/* 3. Guest Count Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-brand-subtle uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-terracotta" />
                Number of Guests
              </span>
              <span className="font-mono text-base font-bold text-brand-cream">
                {guests} Guests
              </span>
            </div>
            <input
              type="range"
              min={6}
              max={40}
              step={1}
              value={guests}
              onChange={e => setGuests(Number(e.target.value))}
              className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-terracotta"
            />
            <div className="flex justify-between text-[10px] text-brand-muted font-mono">
              <span>6 Min</span>
              <span>20 Regular</span>
              <span>40 VIP Floor Buyout</span>
            </div>
          </div>

          {/* 4. Duration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-brand-subtle uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-gold" />
                Celebration Duration
              </span>
              <span className="font-mono text-base font-bold text-brand-cream">
                {durationHours} Hours
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={durationHours}
              onChange={e => setDurationHours(Number(e.target.value))}
              className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-brand-gold"
            />
          </div>

          {/* 5. Add-ons Checkboxes */}
          <div className="space-y-3 pt-2">
            <span className="text-xs uppercase tracking-widest text-brand-subtle font-semibold block">
              Package Add-ons & Inclusions:
            </span>
            
            <div className="space-y-2">
              <label className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 flex items-center justify-between cursor-pointer hover:border-brand-borderStrong transition-colors">
                <div className="flex items-center gap-2.5">
                  <Gamepad2 className="w-4 h-4 text-brand-gold" />
                  <span className="text-xs text-brand-cream font-medium">
                    Unlimited PS5, 8-Ball Pool & Foosball Lounge Access
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeFullGaming}
                  onChange={e => setIncludeFullGaming(e.target.checked)}
                  className="w-4 h-4 accent-brand-terracotta rounded"
                />
              </label>

              <label className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 flex items-center justify-between cursor-pointer hover:border-brand-borderStrong transition-colors">
                <div className="flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-brand-terracotta" />
                  <span className="text-xs text-brand-cream font-medium">
                    Chef's Wood-Fired Pizza Feast + Shakes & Starters
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includePizzaFeast}
                  onChange={e => setIncludePizzaFeast(e.target.checked)}
                  className="w-4 h-4 accent-brand-terracotta rounded"
                />
              </label>

              <label className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 flex items-center justify-between cursor-pointer hover:border-brand-borderStrong transition-colors">
                <div className="flex items-center gap-2.5">
                  <PartyPopper className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-brand-cream font-medium">
                    Dedicated Tournament Coordinator + Custom Trophy Setup
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeTournamentHost}
                  onChange={e => setIncludeTournamentHost(e.target.checked)}
                  className="w-4 h-4 accent-brand-terracotta rounded"
                />
              </label>

              <label className="p-3 rounded-xl bg-brand-surfaceElevated border border-brand-border/60 flex items-center justify-between cursor-pointer hover:border-brand-borderStrong transition-colors">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-xs text-brand-cream font-medium">
                    Complimentary Cake-Cutting Ceremony & Custom Music Playlist
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeCakeCeremony}
                  onChange={e => setIncludeCakeCeremony(e.target.checked)}
                  className="w-4 h-4 accent-brand-terracotta rounded"
                />
              </label>
            </div>
          </div>

          {/* 6. Contact Details & Special Requirements (Optional inputs) */}
          <div className="space-y-3 pt-2 border-t border-brand-border/40">
            <span className="text-xs uppercase tracking-widest text-brand-subtle font-semibold block">
              Contact & Additional Details (Optional):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-brand-subtle flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-brand-gold" />
                  <span>Your Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div>
                <label className="text-[11px] text-brand-subtle flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3 text-brand-gold" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs font-mono text-brand-cream focus:outline-none focus:border-brand-gold"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-brand-subtle flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-brand-gold" />
                <span>Special Requests / Notes</span>
              </label>
              <textarea
                rows={2}
                placeholder="Mention cake preferences, special games, or any custom requirements..."
                value={specialRequirements}
                onChange={e => setSpecialRequirements(e.target.value)}
                className="w-full bg-brand-surfaceElevated border border-brand-border rounded-xl px-3 py-1.5 text-xs text-brand-cream focus:outline-none focus:border-brand-gold resize-none"
              />
            </div>
          </div>
        </div>

        {/* Live Estimate Card (5 cols) */}
        <div className="lg:col-span-5 bg-brand-dark/90 rounded-2xl border border-brand-border p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-xl sticky top-28">
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-widest text-brand-gold font-semibold block">
              Estimated Pricing Overview
            </span>

            <div>
              <div className="font-mono text-3xl sm:text-4xl font-bold text-brand-cream">
                ₹{estimatedTotal.toLocaleString()}
              </div>
              <div className="text-xs text-brand-muted mt-0.5">
                Approx. <span className="text-brand-terracotta font-mono font-semibold">₹{estimatedPerGuest}</span> per guest for {durationHours} hours ({guests} guests)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-surface border border-brand-border/60 text-xs space-y-1.5 text-brand-cream">
              <div className="flex justify-between text-brand-subtle">
                <span>Occasion:</span>
                <span className="font-semibold text-white">{celebrationType}</span>
              </div>
              <div className="flex justify-between text-brand-subtle">
                <span>Date & Time:</span>
                <span className="font-semibold text-brand-gold font-mono">{eventDate} • {preferredTime}</span>
              </div>
              <div className="flex justify-between text-brand-subtle">
                <span>Estimated Quote:</span>
                <span className="font-mono font-bold text-emerald-400">₹{estimatedTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-brand-subtle pt-3 border-t border-brand-border/40">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Reserved floor zone with private playlist control</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Complimentary cake-cutting ceremony setup</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero cleanup hassle, 100% hospitable service</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href={generatePackageInquiryWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all group cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Discuss & Book on WhatsApp</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>

            <p className="text-[10px] text-center text-brand-subtle font-mono">
              Direct connection with GioCasa Events Team (+91 96960 28522). No upfront payment required to inquire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
