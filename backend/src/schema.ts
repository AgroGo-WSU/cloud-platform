/**
 * schema.ts
 * 
 * Centralized location for all Drizzle ORM table definitions.
 * 
 * This file defines the database schema used by the application.
 * Each table should be declared here to ensure a single source of truth.
 *
 * Tables:
 * - user: Master list of all authenticated users.
 * - zone: User-defined zones for monitoring plants.
 * - deviceReadings: Raw data log for all incoming JSON packets.
 * - rasPi: Registry for Raspberry Pi devices.
 * - alert: User-specific system alerts.
 * - integrations: Third-party account integrations.
 * - automations: User-defined automation rules.
 * - plant: User-managed plants linked to zones.
 */

import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Users Table
 * - This table contains the master list for all authenticated users,
 * using their Firebase UID as the primary key.
 * table added by nick 10.2
 */
export const user = sqliteTable("user",{
    id: text("id").primaryKey(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name")
})

/**
 * Zone Table
 * -This table contains the masterlist for all of the Zones for users
 * each time a users adds a zone to there account to monitor a uuid is created
 * and it gets associated with the users firebase id
 * table added by nick 10.2
 */
export const zone = sqliteTable("zone", {
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    // human readible name to be used with frontend ui.
    zoneName: text("zone_name").notNull(),
    // this is just a way to keep track of registered device creations.
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    description: text("description")
});

/**
 * Device Reading table
 * - This table's sole purpose is to log incoming json data from pi's
 *   we are not parsing at this point only storing raw data and the
 *   frontend will have to assign data
 */
export const deviceReadings = sqliteTable("deviceReadings",{
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), // this is used to give tracking to the json packets
    zoneId: text("zone_id").notNull().references(() => zone.id), // linking zone ID back from json POST
    jsonData: blob("json_data").notNull(),
    receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // so we can tell when we've recived json data
});

export const rasPi = sqliteTable("rasPi", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    status: text("status").notNull().default("unpaired"),  // Values are 'unpaired', 'offline', 'online', 'error'
});

export const alert = sqliteTable("alert", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    message: text("message").notNull(),
    severity: text("severity"), // Values are  'low', 'medium', 'high'
    status: text("statis") // Values are 'handled', 'unhandled', 'error'
});

/**
 * Integrations Table
 * - Tracks connected third-party services for each user.
 *   Used for API-based integrations.
 *   Stores provider name, access tokens, and expiration metadata.
 */
export const integration = sqliteTable("integrations", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    provider: text("provider").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
});

/**
 * Automations Table
 * - Placeholder for user-defined automation rules.
 *   Each automation will link triggers, conditions, and actions
 *   (to be implemented in future development).
 */
export const automation = sqliteTable("automations", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
});

export const plant = sqliteTable("plant", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    plantType: text("plant_type"),
    plantName: text("plant_name"),
    zoneId: text("zone_id").notNull().references(() => zone.id)
});

