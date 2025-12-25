
/**
 * Extracts the 4-digit Department Code from a Customer Account ID.
 * Expects format like "1016-00014-001" -> returns "1016".
 * If input is less than 4 digits, returns the input trimmed.
 */
export function getDepartmentCode(customerAccountId: string): string {
    if (!customerAccountId) return '';
    const trimmed = customerAccountId.trim();
    // If it contains hyphens, split and take first part
    if (trimmed.includes('-')) {
        return trimmed.split('-')[0].trim();
    }
    // Otherwise take first 4 chars if length >= 4
    if (trimmed.length >= 4) {
        return trimmed.substring(0, 4);
    }
    return trimmed;
}
