import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Globe,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Eye,
  Loader2,
  Bell,
} from 'lucide-react';
import { InstagramIcon } from '../ui/InstagramIcon';
import { ContactSettings, PageRoute } from '../../types';
import { contactApi, DEFAULT_CONTACT_SETTINGS } from '../../services/contactApi';
import { useContactSettings } from '../../context/ContactSettingsContext';
import { AdminNotificationSettings } from './AdminNotificationSettings';
import {
  normalizeWhatsAppNumber,
  formatReadablePhone,
  isValidPhoneNumber,
  getWhatsAppMessageForPage,
  generateWhatsAppUrl,
} from '../../utils/phone';

interface AdminContactSettingsProps {
  passcode: string;
  initialSubTab?: 'contact' | 'notifications';
}

export const AdminContactSettings: React.FC<AdminContactSettingsProps> = ({ passcode, initialSubTab = 'contact' }) => {
  const { updateSettingsLocal } = useContactSettings();
  const [subTab, setSubTab] = useState<'contact' | 'notifications'>(initialSubTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live Preview Page Selector
  const [previewPage, setPreviewPage] = useState<PageRoute>('home');

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const data = await contactApi.getAdminSettings(passcode);
        if (isMounted) {
          setFormData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch contact settings from backend.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [passcode]);

  const handleChange = (field: keyof ContactSettings, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleWhatsAppBlur = () => {
    if (formData.whatsappNumber) {
      const normalized = normalizeWhatsAppNumber(formData.whatsappNumber);
      setFormData((prev) => ({
        ...prev,
        whatsappNumber: normalized,
        displayPhone: prev.displayPhone || formatReadablePhone(normalized),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (!formData.whatsappNumber || !isValidPhoneNumber(formData.whatsappNumber)) {
      setError('Please provide a valid 10-digit mobile number or international phone number for WhatsApp.');
      return;
    }

    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      setError('Please provide a valid business phone number.');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      const updated = await contactApi.updateSettings(passcode, formData);
      setFormData(updated);
      updateSettingsLocal(updated);
      setSuccess('Contact settings updated successfully! Live website and WhatsApp floater now use the new details.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save contact settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all contact settings to GioCasa official default values?')) {
      setFormData({ ...DEFAULT_CONTACT_SETTINGS });
    }
  };

  const normalizedWhatsApp = normalizeWhatsAppNumber(formData.whatsappNumber);
  const formattedPreviewPhone = formatReadablePhone(formData.whatsappNumber);
  const previewMessage = getWhatsAppMessageForPage(previewPage);
  const previewWhatsAppUrl = generateWhatsAppUrl(normalizedWhatsApp, previewMessage);

  if (loading) {
    return (
      <div className="bg-brand-surface border border-brand-border/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
        <p className="text-brand-subtle text-sm font-mono">Loading contact & WhatsApp settings from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-brand-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20">
              <MessageCircle className="w-5 h-5" />
            </span>
            <h2 className="font-serif text-2xl font-bold text-brand-cream">
              Contact & WhatsApp Settings
            </h2>
          </div>
          <p className="text-xs text-brand-subtle mt-1">
            Configure customer reachability, official WhatsApp number, business location, and social links with real-time site synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {subTab === 'contact' && (
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 rounded-xl border border-brand-border bg-brand-surface text-brand-subtle hover:text-brand-cream text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Sub-Tabs Navigation */}
      <div className="flex flex-wrap gap-2.5 border-b border-brand-border/60 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('contact')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
            subTab === 'contact'
              ? 'bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 shadow-sm'
              : 'text-brand-subtle hover:text-white bg-brand-surface/60 border border-transparent'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp & Business Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all ${
            subTab === 'notifications'
              ? 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30 shadow-sm'
              : 'text-brand-subtle hover:text-white bg-brand-surface/60 border border-transparent'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Web Push Notifications & Devices</span>
        </button>
      </div>

      {subTab === 'notifications' ? (
        <AdminNotificationSettings passcode={passcode} />
      ) : (
        <>
          {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-700/80 text-red-200 text-xs flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Error Updating Settings:</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Settings Saved Permanently:</span>
            <p>{success}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Form (2 Columns) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          
          {/* Section 1: WhatsApp Configuration */}
          <div className="bg-brand-surface/90 border border-brand-border/60 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/50">
              <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
              <h3 className="font-serif text-lg font-bold text-brand-cream">
                Official Business WhatsApp Number
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider flex items-center justify-between">
                  <span>WhatsApp Number (Input)</span>
                  <span className="text-[11px] text-[#25D366] font-mono">
                    wa.me/{normalizedWhatsApp}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#25D366]">
                    <MessageCircle className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                    onBlur={handleWhatsAppBlur}
                    placeholder="e.g. 9696028522 or +91 96960 28522"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream font-mono text-sm focus:outline-none focus:border-[#25D366] transition-colors"
                    required
                  />
                </div>
                <p className="text-[11px] text-brand-subtle">
                  Accepts 10-digit Indian mobile number (e.g. <code className="text-brand-gold">9696028522</code>) or international format. Automatically normalized to digits-only for WhatsApp URLs.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Display Phone / Calling Number</span>
                </label>
                <input
                  type="text"
                  value={formData.displayPhone}
                  onChange={(e) => handleChange('displayPhone', e.target.value)}
                  placeholder="+91 96960 28522"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream font-mono text-sm focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Public Contact Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="ciao@giocasa.in"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream font-mono text-sm focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Physical Venue Address */}
          <div className="bg-brand-surface/90 border border-brand-border/60 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/50">
              <MapPin className="w-4 h-4 text-brand-terracotta" />
              <h3 className="font-serif text-lg font-bold text-brand-cream">
                Venue Location & Physical Address
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  Address Line 1 (Street / Building)
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  placeholder="Civil Lines / Main Hub"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  Address Line 2 (Area / Locality)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  placeholder="Ayodhya, Uttar Pradesh"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  Landmark
                </label>
                <input
                  type="text"
                  value={formData.landmark}
                  onChange={(e) => handleChange('landmark', e.target.value)}
                  placeholder="Near City Center"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  City & State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Ayodhya"
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="Uttar Pradesh"
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  Pincode & Country
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    placeholder="224001"
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold"
                  />
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    placeholder="India"
                    className="w-full px-3 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider flex items-center justify-between">
                  <span>Google Maps URL</span>
                  {formData.googleMapsUrl && (
                    <a
                      href={formData.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Open Map Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-brand-subtle">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    value={formData.googleMapsUrl}
                    onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream font-mono text-xs focus:outline-none focus:border-brand-gold transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Social & Branding */}
          <div className="bg-brand-surface/90 border border-brand-border/60 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/50">
              <InstagramIcon className="w-4 h-4 text-brand-pink" />
              <h3 className="font-serif text-lg font-bold text-brand-cream">
                Social Media & Branding
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={formData.instagramHandle}
                  onChange={(e) => handleChange('instagramHandle', e.target.value)}
                  placeholder="@giocasa.ayodhya"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream font-mono text-sm focus:outline-none focus:border-brand-pink transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => handleChange('instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/giocasa.ayodhya"
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-cream font-mono text-xs focus:outline-none focus:border-brand-pink transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_10px_25px_rgba(37,211,102,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Contact Settings</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Interactive WhatsApp Floater Preview Card (1 Column) */}
        <div className="space-y-6">
          <div className="bg-brand-surface/90 border border-brand-border/60 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl sticky top-24">
            
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#25D366]" />
                <h3 className="font-serif text-lg font-bold text-brand-cream">
                  Live WhatsApp Preview
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] font-mono font-semibold uppercase">
                Active Simulator
              </span>
            </div>

            {/* Visual Floater Button Mockup */}
            <div className="relative h-44 rounded-2xl bg-brand-dark/90 border border-brand-border/80 flex items-center justify-center overflow-hidden p-6 group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-surface/20 to-transparent pointer-events-none" />
              
              <div className="flex flex-col items-center text-center space-y-3 z-10">
                {/* Floating Button Mock */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(37,211,102,0.5)] group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-brand-dark" />
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-brand-cream">{formattedPreviewPhone}</p>
                  <p className="text-[10px] text-brand-subtle font-mono">wa.me/{normalizedWhatsApp}</p>
                </div>
              </div>
            </div>

            {/* Smart Pre-filled Message Tester */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-brand-cream uppercase tracking-wider flex items-center justify-between">
                <span>Page-Context Simulator</span>
                <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              </label>

              <select
                value={previewPage}
                onChange={(e) => setPreviewPage(e.target.value as PageRoute)}
                className="w-full px-3 py-2 rounded-xl bg-brand-dark border border-brand-border text-brand-cream text-xs focus:outline-none focus:border-[#25D366]"
              >
                <option value="home">Home / General</option>
                <option value="experience">Experience (Slots & Play)</option>
                <option value="menu">Menu (Food & Pizza)</option>
                <option value="book">Bookings (Console / Table)</option>
                <option value="tournaments">Tournaments (Arena)</option>
                <option value="hall-of-fame">Hall of Fame</option>
                <option value="events">Events & Celebrations</option>
                <option value="about">About GioCasa</option>
                <option value="contact">Contact Us</option>
              </select>

              <div className="p-3.5 rounded-xl bg-brand-dark/80 border border-brand-border/60 text-xs text-brand-cream space-y-1.5 font-sans">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-subtle block">
                  Simulated Pre-filled Message:
                </span>
                <p className="italic text-brand-cream/90 bg-brand-surface/40 p-2.5 rounded-lg border border-brand-border/40">
                  &ldquo;{previewMessage}&rdquo;
                </p>
              </div>

              {/* Direct Test Link */}
              <a
                href={previewWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <span>Test Live Link in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Storage Info Badge */}
            <div className="pt-3 border-t border-brand-border/40 text-[11px] text-brand-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span>Database Document:</span>
                <code className="text-brand-gold font-mono">settings.contact_settings</code>
              </div>
              <div className="flex items-center justify-between">
                <span>Fallback File:</span>
                <code className="text-brand-subtle font-mono">server/data/settings.json</code>
              </div>
            </div>

          </div>
        </div>

      </div>
      </>
      )}
    </div>
  );
};
