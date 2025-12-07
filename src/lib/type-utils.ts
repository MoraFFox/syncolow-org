/**
 * Extract error message from unknown error types
 * @param error - Error of unknown type
 * @returns Human-readable error message
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   toast({ description: getErrorMessage(error) });
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

/**
 * Type guard to check if value is sortable (string or number)
 * @param value - Value to check
 * @returns True if value is string or number
 * @example
 * ```typescript
 * if (isSortable(value)) {
 *   items.sort((a, b) => a.value > b.value ? 1 : -1);
 * }
 * ```
 */
export function isSortable(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

/**
 * Safely parse JSON with null fallback
 * @param json - JSON string to parse
 * @returns Parsed object or null if parsing fails
 * @example
 * ```typescript
 * const config = parseJSON<Config>(localStorage.getItem('config') || '');
 * ```
 */
export function parseJSON<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Type guard to filter out null and undefined values
 * @param value - Value to check
 * @returns True if value is not null or undefined
 * @example
 * ```typescript
 * const validItems = items.filter(isNotNull);
 * ```
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
