import { parseISO, isValid } from 'date-fns';

export function parseDateSafely(date: string | Date | null | undefined): Date | null {
  if (!date) return null;

  let parsed: Date;
  if (date instanceof Date) {
    parsed = date;
  } else if (typeof date === 'string') {
    parsed = parseISO(date);
    if (!isValid(parsed)) {
      parsed = new Date(date); // Fallback to standard constructor
    }
  } else {
    return null;
  }

  return isValid(parsed) ? parsed : null;
}

export function formatDateForForm(date: string | Date | null | undefined): string {
  if (!date) return '';

  const parsed = parseDateSafely(date);
  if (!parsed) return '';

  // Return YYYY-MM-DD format required by HTML date inputs
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
