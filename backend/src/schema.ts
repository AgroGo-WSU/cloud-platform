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

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Users Table
 * - This table contains the master list for all authenticated users,
 * using their Firebase UID as the primary key.
 * table added by nick 10.2
 */
export const user = sqliteTable("user",{
    // TODO: use firebase UID
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    location: text("location"),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    raspiMac: text("raspi_mac")
});

/** 
 * Sensor table
 * this contains a table of uuids for every sensor, for every person
 */
export const sensorsTypeEnum = ['water pump', 'fan', 'temp/humidity'] as const
export const sensors = sqliteTable("sensors",{
    sensorId: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // uuid for each sensor
    userId: text("user_id").notNull().references(() => user.id), // connecting to the user id
    type: text("type", { enum: sensorsTypeEnum }).notNull(),
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
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    description: text("description")
});

/**
 * Device Reading tables
 * - These are the tables we need to read and write device data to and from the hardware
 */
export const tempAndHumidityTypeEnum = ['humidity', 'temperature'] as const;
export const tempAndHumidity = sqliteTable("tempAndHumidity",{
    userId: text("userID").references(() => user.id), // reference the userID to identify the account
    type: text("type", { enum: tempAndHumidityTypeEnum }).notNull(),
    receivedAt: text("received_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // timestamp for tracking
    value: text("value").notNull(), // this is the humidity percentage or temperature value
});

export const pingsConfirmedEnum = ["yes", "no"] as const;
export const pings = sqliteTable("pings",{
    userId: text("userID").references(() => user.id), // reference the userID to identify the account
    sensorId: text("sensorId").references(() => sensors.sensorId), // make sure it's the right sensor
    confirmed: text("confirmed", { enum: pingsConfirmedEnum }).notNull(), // device still connected or not
    time: text("confirmed_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // time of confirmation
    value: text("value")
});

export const waterSchedule = sqliteTable("waterSchedule",{
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id the instance
    type: text("type"),
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant bc sensors are connected with user account, but leaving it here for now)
    sensorId: text("sensorId").references(() => sensors.sensorId), // make sure it's the right sensor
    time: text("scheduled_time").notNull(), // scheduled time
    duration: text("duration")
});

export const fanSchedule = sqliteTable("fanSchedule",{
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id the instance 
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant bc sensors are connected with user account, but leaving it here for now)
    sensorId: text("sensorId").references(() => sensors.sensorId), // make sure it's the right sensor
    timeOn: text("scheduled_time_on").notNull(), // scheduled time on
    timeOff: text("scheduled_time_off").notNull(), // scheduled time off
});

export const waterLog = sqliteTable("waterLog",{ // this table is for confirming that these events happened
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id this confirmation instance 
    schedule_instance: text("schedule_instance").references(() => waterSchedule.id), // this is the instance of the scheduled time from the schedule table
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant, but leaving it here for now)
    timeOnConfirm: text("scheduled_time_on_confirm").notNull(), // scheduled water time happened, yes or no
    timeConfirmed: text("confirmed_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // time of confirmation
});

export const fanLog = sqliteTable("fanLog",{ // this table is for confirming that these events happened
    id: text("id").primaryKey().$defaultFn(()=> crypto.randomUUID()), // to id this confirmation instance 
    schedule_instance: text("schedule_instance").references(() => fanSchedule.id), // this is the instance of the scheduled time from the schedule table
    userId: text("userID").references(() => user.id), // reference the userID to identify the account (redundant, but leaving it here for now)
    timeOnConfirm: text("scheduled_time_on_confirm").notNull(), // scheduled time on happened, yes or no
    timeOff: text("scheduled_time_off_confirm").notNull(), // scheduled time off happened, yes or no
    timeConfirmed: text("confirmed_at").default(sql`CURRENT_TIMESTAMP`).notNull(), // time of confirmation
});

/** Connection health for RasPi */
export const rasPiStatusEnum = ['unpaired', 'offline', 'online', 'error'] as const;
export const rasPi = sqliteTable("rasPi", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    receivedAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    status: text("status", { enum: rasPiStatusEnum }).notNull().default("unpaired"),
});

/** alert table */
export const alertSeverityEnum = ['low', 'medium', 'high', 'error'] as const;
export const alertStatusEnum = ["handled", "unhandled", "error"] as const;
export const alert = sqliteTable("alert", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    message: text("message").notNull(),
    severity: text("severity", { enum: alertSeverityEnum }).notNull(),
    status: text("status", { enum: alertStatusEnum }).notNull()
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
    expiresAt: text("expires_at"),
});

/** 
 * Plant inventory table
*/
export const plantInventory = sqliteTable("plantInventory", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id),
    plantType: text("plant_type"),
    plantName: text("plant_name"),
    zoneId: text("zone_id").notNull().references(() => zone.id),
    quantity: integer("quantity")
});