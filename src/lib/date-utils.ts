import { parseISO, isValid } from 'date-fns';

export function parseDateSafely(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsed) ? parsed : null;
}

export function formatDateForForm(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  const parsed = parseDateSafely(date);
  return parsed ? parsed.toISOString() : '';
}
