import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../schema";
import { or, eq, desc } from "drizzle-orm";

/**
 * Strongly typed Drizzle database instance
 * 
 * This alias ensures all queries are scoped to the project schema
 */
export type DB = DrizzleD1Database<typeof schema>;

/**
 * Initializes a Drizzle ORM instance for the Cloudflare D1 database.
 *
 * Wraps the provided `env.DB` binding in Drizzle with the project schema,
 * allowing type-safe queries against the database.
 *
 * @param env - The Cloudflare environment containing the D1 database binding
 * @returns A Drizzle ORM client configured with the schema
 * 
 * Drew 9.22 Created method
 */
export function getDB(env: {DB: D1Database}): DB {
    return drizzle(env.DB, { schema })
}

/**
 * Retrieves reent readings for a given device
 * 
 * @param db - The database client
 * @param deviceKey - The device UUID or name to find/create
 * @returns The resolved device ID
 * 
 * Drew 9.22 Created method
 */
export async function getOrCreateDeviceId(db: DB, deviceKey: string): Promise<string> {
    const device = await db.query.deviceStream.findFirst({
        where: or(
            eq(schema.deviceStream.id, deviceKey),
            eq(schema.deviceStream.deviceStreamName, deviceKey),
        ),
    });

    if(device) {
        return device.id;
    }

    // If not found, insert a new device
    await db.insert(schema.deviceStream).values({
        id: deviceKey,
        deviceStreamName: deviceKey,
        createdAt: new Date().toISOString(),
    });

    return deviceKey;
}

/**
 * Find a device ID by name or UUID. If not found, insert a new row.
 * 
 * @param db - The database client
 * @param deviceId - The device ID whose readings should be fetched
 * @param limit - The maximum records to return (default: 10)
 * @returns A list of recent device readings ordered by received timestamp
 * 
 * Drew 9.22 Created method
 */
export async function getRecentReadings(db: DB, deviceId: string, limit = 10) {
    return db
        .select()
        .from(schema.deviceReadings)
        .where(eq(schema.deviceReadings.deviceId, deviceId))
        .orderBy(desc(schema.deviceReadings.receivedAt))
        .limit(limit)
}