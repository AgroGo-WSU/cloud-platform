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

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Device Stream Table
 * -This table contains the masterlist for all of the RasPi devices we will use.
 * Currently is does not auto generate device IDs so we will want to give each
 * id maunually and then we can also assign names to them as well from the RasPi side.
 */
export const deviceStream = sqliteTable("deviceStream", {
    
    // we will track pi's as the primary key (later we will go by user)
    id: text("id").primaryKey(),

    // human readible name to be used with frontend ui.
    deviceStreamName: text("deviceStreamName").notNull(),
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
    deviceId: text("device_id").notNull().references(() => deviceStream.id), // linking Pi ID back from json POST
    jsonData: text("json_data").notNull(),
    receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // so we can tell when we've recived json data
});

