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
import * as schema from "../schema";
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
 * Creates a new user in the database if they do not already exist.
 * This should be called after a user successfully authenticates with Firebase.
 * 
 * @param db - The database client
 * @param userId - The device UUID or name to find/create
 * @param email - The email tied to the user account
 * @param firstName - The first name tied to the user account
 * @param lastName - The last name tied to the user account
 * -method created nick 10.1
 */
export async function createUser(
    db: DB, 
    userId: string, 
    email: string,
    firstName: string,
    lastName: string
): Promise<void> {
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
    });

    if(user) return;

    await db.insert(schema.user).values({ 
        id: userId, 
        email: email,
        firstName: firstName,
        lastName: lastName
    });
}

export async function createPi(
    db: DB, 
    userId: string, 
    email: string,
    firstName: string,
    lastName: string
): Promise<void> {
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
    });

    if(user) return;

    await db.insert(schema.user).values({ 
        id: userId, 
        email: email,
        firstName: firstName,
        lastName: lastName
    });
}

export async function createReading(
    db: DB, 
    userId: string, 
    email: string,
    firstName: string,
    lastName: string
): Promise<void> {
    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, userId),
    });

    if(user) return;

    await db.insert(schema.user).values({ 
        id: userId, 
        email: email,
        firstName: firstName,
        lastName: lastName
    });
}

/**
 * Creates a new zone for a given user.
 * This would be called from an endpoint that the user interacts with on the web app.
 *
 * @param db - The database client
 * @param userId - The ID of the user creating the zone
 * @param zoneName - The name for the new zone
 * @returns The ID of the newly created zone
 * -method created by nick 10.1
 */
export async function createZone(db: DB, userId: string, zoneName: string): Promise<string> {
    const newZone = {
        id: crypto.randomUUID(),
        userId: userId,
        zoneName: zoneName,
    };
    await db.insert(schema.zone).values(newZone);
    return newZone.id;
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
 * updated 10.2 -nick
 */
export async function getRecentReadings(db: DB, zoneId: string, limit = 10) {
    return db
        .select()
        .from(schema.deviceReadings)
        .where(eq(schema.deviceReadings.zoneId, zoneId))
        .orderBy(desc(schema.deviceReadings.receivedAt))
        .limit(limit)
}