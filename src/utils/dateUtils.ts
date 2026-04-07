/**
 * Timezone-aware date utilities.
 * Uses Intl.DateTimeFormat to convert dates to the user's configured timezone
 * without requiring any external dependencies.
 */

/**
 * Get the components (year, month, day) of a Date in a given timezone.
 */
function getDatePartsInTz(date: Date, timezone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA locale formats as YYYY-MM-DD
  const parts = formatter.format(date).split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

/**
 * Returns today's date as a YYYY-MM-DD string in the given timezone.
 */
export function getTodayStringInTz(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Checks if a given date is "today" in the specified timezone.
 */
export function isDateTodayInTz(date: Date, timezone: string): boolean {
  const todayParts = getDatePartsInTz(new Date(), timezone);
  const dateParts = getDatePartsInTz(date, timezone);
  return (
    todayParts.year === dateParts.year &&
    todayParts.month === dateParts.month &&
    todayParts.day === dateParts.day
  );
}

/**
 * Checks if a given date is "tomorrow" in the specified timezone.
 */
export function isDateTomorrowInTz(date: Date, timezone: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowParts = getDatePartsInTz(tomorrow, timezone);
  const dateParts = getDatePartsInTz(date, timezone);
  return (
    tomorrowParts.year === dateParts.year &&
    tomorrowParts.month === dateParts.month &&
    tomorrowParts.day === dateParts.day
  );
}

/**
 * Checks if a given date is in the past in the specified timezone.
 * A date is "past" if its calendar day in the timezone is before today.
 */
export function isDatePastInTz(date: Date, timezone: string): boolean {
  const todayStr = getTodayStringInTz(timezone);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date);
  return dateStr < todayStr;
}

/**
 * Checks if a given date is in the future in the specified timezone.
 * A date is "future" if its calendar day in the timezone is after today.
 */
export function isDateFutureInTz(date: Date, timezone: string): boolean {
  const todayStr = getTodayStringInTz(timezone);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date);
  return dateStr > todayStr;
}
