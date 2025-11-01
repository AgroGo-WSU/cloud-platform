/**
 * Helper: normalize MAC string to canonical lower-case colon-separated format
 * - Accepts formats like "AA:BB:CC:DD:EE:FF", "aabbccddeeff", "AA-BB-..." etc.
 * - Returns null if input doesn't look like 12 hex digits.
 */
export function normalizeMac(raw?: string | null): string | null {
    if(!raw) return null;

    // Convert input to lowercase and remove any character that isn't (0-9 or a-f)
    const hex = raw.toLowerCase().replace(/[^0-9a-f]/g, '');
    if(hex.length !== 12) return null;

    // Format as a proper Mac Address
    // i.e. aabbccddeeff --> aa:bb:cc:dd:ee:ff
    return hex.match(/.{2}/g)!.join(":");
}