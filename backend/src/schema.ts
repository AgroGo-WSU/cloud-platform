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
 * - deviceReadings: Stores raw JSON readings received from devices. -Nick 9/18
 */

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Users Table
 * - This table will store a record for each authenticated user.
 * - The primary key 'id' directly corresponds to the user's UID from Firebase Authentication.
 * - We do not use devicestream as primaryKey anymore
 */

export const users = sqliteTable("users", {

    id: text("id").primaryKey(),

    //TODO: Add email or names or whatever we decide later in here

    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * Device Stream Table
 * -This table contains the masterlist for all of the RasPi devices we will use.
 * Currently is does not auto generate device IDs so we will want to give each
 * id maunually and then we can also assign names to them as well from the RasPi side. -Nick 9/18
 */
export const deviceStream = sqliteTable("deviceStream", { 

    //create ID for device
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // forign key linking decices to entity in user table tying user to device
    userID: text("user_id").notNull().references(() => users.id),

    // human readible name to be used with frontend ui.
    deviceStreamName: text("deviceStreamName").notNull(),

    // this is jsut a way to keep track of registered device creations.
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),

});

/**
 * Device Reading table
 * -This tables sole purpous is to log incoming json data from pi's
 * we are not parsing at this point only storing raw data and the 
 * frontend will have to assign data -Nick 9/18
 */
export const deviceReadings = sqliteTable("device_readings",{
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), // this is used to give tracking to the json packets
    deviceId: text("device_id").notNull().references(() => deviceStream.id), // linking Pi ID back from json POST
    jsonData: text("json_data").notNull(),
    receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // so we can tell when we've recived json data
});

