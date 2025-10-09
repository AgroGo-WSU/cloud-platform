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

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Users Table
 * - This table contains the master list for all authenticated users,
 * using their Firebase UID as the primary key.
 * table added by nick 10.2
 */
export const user = sqliteTable("user",{
    // TODO: use firebase UID
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    location: text("location").notNull(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull()
});

/** 
 * Sensor table
 * this contains a table of uuids for every sensor, for every person
 */
export const sensors = sqliteTable("sensors",{
    sensorId: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // uuid for each sensor
    userId: text("user_id").notNull().references(() => user.id), // connecting to the user id
    type: text("type").notNull(), // this is water pump, fan, temp/humidity sensor
    zone: text("zone_name").notNull().references(() => zone.id), // to connect the raspi hardware to the zone the user is expecting (may need rewrite)
});

/**
 * Zone Table
 * -This table contains the masterlist for all of the Zones for users
 * each time a users adds a zone to their account to monitor a uuid is created
 * and it gets associated with the users firebase id
 * table added by nick 10.2
 */
export const zone = sqliteTable("zone", {
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    // human readable name to be used with frontend ui.
    zoneName: text("zone_name").notNull(),
    // this is just a way to keep track of registered device creations.
    createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    description: text("description")
});

/**
 * Device Reading tables
 * - These are the tables we need to read and write device data to and from the hardware
 */
export const tempAndHumidity = sqliteTable("tempAndHumidity",{
    userId: text("userID").references(() => user.id), // reference the userID to identify the account
    type: text("type").notNull(), // either humidity or temperature
    receivedAt: text("received_at").default("CURRENT_TIMESTAMP").notNull(), // timestamp for tracking
    value: text("value").notNull(), // this is the humidity percentage or temperature value
});

export const pings = sqliteTable("pings",{
    userId: text("userID").references(() => user.id), // reference the userID to identify the account
    sensorID: text("sensorID").references(() => sensors.sensorId), // make sure it's the right sensor
    confirmed: text("confirmed").notNull(), // device still connected or not
    time: text("confirmed_at").default("CURRENT_TIMESTAMP").notNull(), // time of confirmation
});

export const waterSchedule = sqliteTable("waterSchedule",{
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id the instance 
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant bc sensors are connected with user account, but leaving it here for now)
    sensorID: text("sensorID").references(() => sensors.sensorId), // make sure it's the right sensor
    time: text("scheduled_time").notNull(), // scheduled time
});

export const fanSchedule = sqliteTable("fanSchedule",{
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id the instance 
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant bc sensors are connected with user account, but leaving it here for now)
    sensorID: text("sensorID").references(() => sensors.sensorId), // make sure it's the right sensor
    timeOn: text("scheduled_time_on").notNull(), // scheduled time on
    timeOff: text("scheduled_time_off").notNull(), // scheduled time off
});

export const waterLog = sqliteTable("waterLog",{ // this table is for confirming that these events happened
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id this confirmation instance 
    schedule_instance: text("schedule_instance").references(() => waterSchedule.id), // this is the instance of the scheduled time from the schedule table
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant, but leaving it here for now)
    timeOnConfirm: text("scheduled_time_on_confirm").notNull(), // scheduled water time happened, yes or no
    timeConfirmed: text("confirmed_at").default("CURRENT_TIMESTAMP").notNull(), // time of confirmation
});

export const fanLog = sqliteTable("fanLog",{ // this table is for confirming that these events happened
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id this confirmation instance 
    schedule_instance: text("schedule_instance").references(() => fanSchedule.id), // this is the instance of the scheduled time from the schedule table
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant, but leaving it here for now)
    timeOnConfirm: text("scheduled_time_on_confirm").notNull(), // scheduled time on happened, yes or no
    timeOff: text("scheduled_time_off_confirm").notNull(), // scheduled time off happened, yes or no
    timeConfirmed: text("confirmed_at").default("CURRENT_TIMESTAMP").notNull(), // time of confirmation
});

/** Connection health for Raspi */
export const rasPi = sqliteTable("rasPi", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    receivedAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
    status: text("status").notNull().default("unpaired"),  // Values are 'unpaired', 'offline', 'online', 'error'
});

/** alert table */
export const alert = sqliteTable("alert", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    message: text("message").notNull(),
    severity: text("severity"), // Values are  'low', 'medium', 'high'
    status: text("status") // Values are 'handled', 'unhandled', 'error'
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

/** I think this is the start of the inventory table 
*/
export const plant = sqliteTable("plant", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    plantType: text("plant_type"),
    plantName: text("plant_name"),
    zoneId: text("zone_id").notNull().references(() => zone.id)
});

