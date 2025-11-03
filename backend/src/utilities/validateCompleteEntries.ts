import { Context } from "hono";

export async function validateCompleteEntry(
    c: Context,
    entry: Record<string, any>,
    requiredFields: string[]
) {
    // Ensure that every has all needed fields
    const missing = requiredFields.filter(
        f => entry[f] === undefined
    );

    if(missing.length > 0) return c.json({ success: false, missingFields: missing, entry: entry}, 500);

    return { valid: true };
}