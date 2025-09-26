/**
 * databaseQueries.ts
 *
 * Provides helper functions and type definitions for interacting with the
 * Cloudflare D1 database using Drizzle ORM.
 *
 * All database access from workers or durable objects should go through
 * this module to ensure consistent query patterns and type safety.
 */

import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../schema";
import { or, eq, desc } from "drizzle-orm";
import { create } from "domain";

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

    // ----- USER Qurries ------ -Nick 9/26
}
/**
 * 
 * @param db creates a user record if one does not exist
 * @returns An ubject indicating if the user was newly created.
 * @param userId 
 * @returns 
 */
export async function upsertUser(db:DB, userId: string){
    const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.id, userId)
    });

    if (!existingUser){
        await db.insert(schema.users).values({ id: userId }).execute();
        return {created: true};
    }
    return {created: false};
}

//fetch all devices associated with user ID
export async function getUserDevices(db: DB, userID: string) {
    return db.query.deviceStream.findMany({
        where: eq(schema.deviceStream.userID, userID)
    });
    
}

//creates device and links to user
export async function createUserDevices(db:DB, userID: string, deviceName: string) {
    const newDevice = await db.insert(schema.deviceStream).values({
        userID: userID,
        deviceStreamName : deviceName
    }).returning();
    return newDevice[0];
    
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

    throw new Error(`device with key "${deviceKey}" could not be found.`);
   /** 
    * I dont think we need this anymore as we only allow device creation through user context
    * // If not found, insert a new device
    await db.insert(schema.deviceStream).values({
        id: deviceKey,
        deviceStreamName: deviceKey,
        createdAt: new Date().toISOString(),
    });

    return deviceKey;
    */
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