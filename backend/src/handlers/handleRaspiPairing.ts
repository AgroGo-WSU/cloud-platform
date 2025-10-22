import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { handleLogin } from "./handleLogin";
import type { DB } from "./databaseQueries";

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

export async function handleRaspiPairing(
    db: DB,
    uid: string,
    email: string,
    rawMac: string,
    firstName?: string,
    lastName?: string
) {
    const normalizedMac = normalizeMac(rawMac);
    if(!normalizedMac) {
        throw new Error("Invalid raspi_mac format. Expected 12 hex digits");
    }

    // Ensure user exists
    await handleLogin(db, uid, email, firstName ?? "", lastName ?? "");

    // Update raspi_mac field
    await db
        .update(schema.user)
        .set({ raspiMac: normalizedMac })
        .where(eq(schema.user.id, uid))
        .run();
    
    // Fetch and return updated record
    const [user] = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, uid))
        .all();
    
    if(!user) {
        throw new Error("Failed to fetch updated user record");
    }
    
    return { message: "Device paired", user }
}