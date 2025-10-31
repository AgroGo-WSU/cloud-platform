import type { DB } from "../handlers/databaseQueries";
import * as schema from '../schema';
import { eq } from "drizzle-orm";


export async function findUserFromMacAddress(db: DB, mac: string) {
    // The Pi passes a MAC address, find the user associated with
    // that address for the tempAndHumidity table's schema
    const users = await db.select()
        .from(schema.user)
        .where(eq(schema.user.raspiMac, mac))
        .all();
        
    // There will only be one userId associated with each MAC address
    return users.length > 0 ? users[0].id : null;
}