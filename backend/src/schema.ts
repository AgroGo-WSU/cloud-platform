/**
 * schema.ts
 * 
 * Centralized location for all Drizzle ORM table definitions.
 * 
 * This file defines the database schema used by the application.
 * Each table should be declared here to ensure a single source of truth.
 *
 * Tables:
 * - deviceStream: Master list of all Raspberry Pi devices.
 * - deviceReadings: Stores raw JSON readings received from devices.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Users Table
 * - This table contains the master list for all authenticated users,
 * using their Firebase UID as the primary key.
 * table added by nick 10.2
 */
export const users = sqliteTable("users",{
    id: text("id").primaryKey(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
})

/**
 * Zone Table
 * -This table contains the masterlist for all of the Zones for users
 * each time a users adds a zone to there account to monitor a uuid is created
 * and it gets associated with the users firebase id
 * table added by nick 10.2
 */
export const zones = sqliteTable("zones", {
    
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id),
    // human readible name to be used with frontend ui.
    zoneName: text("zone_name").notNull(),
    // this is jsut a way to keep track of registered device creations.
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Device Reading table
 * -This tables sole purpous is to log incoming json data from pi's
 * we are not parsing at this point only storing raw data and the
 * frontend will have to assign data
 */
export const deviceReadings = sqliteTable("device_readings",{
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), // this is used to give tracking to the json packets
    zoneId: text("zone_id").notNull().references(() => zones.id), // linking zone ID back from json POST
    jsonData: text("json_data").notNull(),
    receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // so we can tell when we've recived json data
});

