/**
 * GioCasa WhatsApp & Phone Utility (Frontend)
 * Handles normalization, validation, readable formatting, and page-specific prefilled messages.
 */

export const DEFAULT_WHATSAPP_NUMBER = '919696028522';
export const DEFAULT_DISPLAY_PHONE = '+91 96960 28522';

/**
 * Normalizes input string into clean international digits for wa.me URL.
 * Accepts:
 * - 10-digit Indian numbers: '9696028522' -> '919696028522'
 * - 11-digit numbers with leading 0: '09696028522' -> '919696028522'
 * - Numbers with country code: '+91 96960 28522' -> '919696028522'
 * - International numbers: '+1 (555) 234-5678' -> '15552345678'
 */
export function normalizeWhatsAppNumber(input?: string | null): string {
  if (!input || typeof input !== 'string') {
    return DEFAULT_WHATSAPP_NUMBER;
  }

  // Strip all non-digit characters
  let digits = input.replace(/\D/g, '');

  if (!digits) {
    return DEFAULT_WHATSAPP_NUMBER;
  }

  // Handle leading 0 for 11-digit numbers (common Indian format 0XXXXXXXXXX)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = '91' + digits.slice(1);
  } else if (digits.length === 10) {
    // 10-digit standard Indian mobile number
    digits = '91' + digits;
  }

  // Return digits if valid length, otherwise fallback
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return DEFAULT_WHATSAPP_NUMBER;
}

/**
 * Validates whether candidate string can resolve to a valid phone/WhatsApp number.
 */
export function isValidPhoneNumber(input?: string | null): boolean {
  if (!input || typeof input !== 'string') return false;
  const digits = input.replace(/\D/g, '');
  // Must be between 10 and 15 digits
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Formats a phone string into a human-readable display string.
 * Example: '919696028522' -> '+91 96960 28522'
 */
export function formatReadablePhone(input?: string | null): string {
  if (!input || typeof input !== 'string') {
    return DEFAULT_DISPLAY_PHONE;
  }

  const normalized = normalizeWhatsAppNumber(input);

  // Indian numbers: +91 XXXXX XXXXX
  if (normalized.startsWith('91') && normalized.length === 12) {
    const local = normalized.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }

  // General international format: +[country] [rest]
  if (normalized.length >= 10) {
    return `+${normalized}`;
  }

  return input;
}

/**
 * Smart pre-filled messages mapped to public website pages.
 */
export function getWhatsAppMessageForPage(page?: string | null): string {
  const p = (page || '').toLowerCase().trim();

  switch (p) {
    case 'home':
    case 'general':
    case '':
      return "Hi GioCasa! I'd like to know more about your gaming experience and restaurant.";

    case 'experience':
    case 'gaming':
      return "Hi GioCasa! I'd like to know more about gaming slots and availability.";

    case 'menu':
      return "Hi GioCasa! I'd like to know more about your menu and food ordering.";

    case 'book':
    case 'bookings':
      return "Hi GioCasa! I'd like to enquire about a gaming booking.";

    case 'tournaments':
    case 'tournament-detail':
    case 'tournament-register':
    case 'tournament-confirmation':
    case 'tournament-results':
      return "Hi GioCasa! I'd like to know more about upcoming tournaments at GioCasa Arena.";

    case 'hall-of-fame':
      return "Hi GioCasa! I'd like to know more about the Hall of Fame and tournaments.";

    case 'events':
      return "Hi GioCasa! I'd like to enquire about hosting a private event or celebration.";

    case 'about':
      return "Hi GioCasa! I'd like to know more about GioCasa.";

    case 'contact':
      return "Hi GioCasa! I'd like to get in touch with the GioCasa team.";

    default:
      return "Hi GioCasa! I'd like to know more about your gaming experience and restaurant.";
  }
}

/**
 * Constructs direct WhatsApp wa.me click-to-chat URL with pre-filled encoded text.
 */
export function generateWhatsAppUrl(whatsappNumber?: string | null, messageOrPage?: string | null, isPageName: boolean = false): string {
  const number = normalizeWhatsAppNumber(whatsappNumber);
  const message = isPageName ? getWhatsAppMessageForPage(messageOrPage) : (messageOrPage || getWhatsAppMessageForPage('home'));
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
