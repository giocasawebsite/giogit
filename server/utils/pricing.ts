/**
 * GioCasa Official Pricing Calculation (Backend)
 * - Pool: ₹200/hr, ₹120 for half an hour
 * - PlayStation: ₹150 single (1P), ₹250 double (2P) per hour (+₹100/hr per additional player)
 * - Racing: ₹200/hr base (1P), +₹100 per additional player (+100/hr each)
 */
export function calculateBookingPrice(
  category: string,
  durationMinutes: number,
  numberOfPeople: number = 1,
  fallbackRatePerHour: number = 150
): number {
  if (category === 'pool') {
    const fullHours = Math.floor(durationMinutes / 60);
    const remMins = durationMinutes % 60;
    const halfHours = Math.ceil(remMins / 30);
    return fullHours * 200 + halfHours * 120;
  }

  if (category === 'racing') {
    const hourlyRate = 200 + Math.max(0, numberOfPeople - 1) * 100;
    return Math.round((hourlyRate * durationMinutes) / 60);
  }

  if (category === 'ps5') {
    const hourlyRate = numberOfPeople <= 1 ? 150 : 150 + (numberOfPeople - 1) * 100;
    return Math.round((hourlyRate * durationMinutes) / 60);
  }

  return Math.round((fallbackRatePerHour * durationMinutes) / 60);
}
