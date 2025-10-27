import { getDB } from "./databaseQueries";
import * as schema from '../schema';
import { asc, eq } from "drizzle-orm";
import { Context } from "hono";
import { handleLogin } from "./handleLogin";
import type { DB } from "./databaseQueries";
import { requireFirebaseHeader } from "./authHandlers";

/**
 * Helper: normalize MAC string to canonical lower-case colon-separated format
 * - Accepts formats like "AA:BB:CC:DD:EE:FF", "aabbccddeeff", "AA-BB-..." etc.
 * - Returns null if input doesn't look like 12 hex digits.
 */
export function normalizeMac(raw?: string | null): string | null {
    if(!raw) return null;

    // Convert input to lowercase and remove any character that isn't (0-9 or a-f)
    const hex = raw.toLowerCase().replace(/[^0-9a-f]/g, '');
    if(hex.length !== 12) return null;

    // Format as a proper Mac Address
    // i.e. aabbccddeeff --> aa:bb:cc:dd:ee:ff
    return hex.match(/.{2}/g)!.join(":");
}

/**
 * Handles pairing of a Raspberry Pi device with a user's account.
 *
 * This function verifies the user's Firebase authentication token, normalizes and validates
 * the provided Raspberry Pi MAC address, ensures the user exists in the database (creating one
 * if necessary), and updates the user record to include the associated device MAC address.
 * 
 * It returns the updated user record upon success or an error response upon failure.
 *
 * @async
 * @function handleRaspiPairing
 * @param {Context} c - The Hono context object containing the request, environment variables, and response helpers.
 * @returns {Promise<Response>} A JSON response containing the updated user record on success,
 * or an error object with an appropriate HTTP status code on failure.
 *
 * @throws {Error} If the Firebase authentication fails, the MAC address is missing or invalid,
 * the user record cannot be created or updated, or database operations fail.
 */
export async function handleRaspiPairing(c: Context) {
    try {
        const decoded = await requireFirebaseHeader(c, c.env.FIREBASE_API_KEY);
        const { raspiMac, firstName, lastName } = await c.req.json();

        const rawMac = raspiMac.toString();
        if(!rawMac) {
            return c.json({ error: "Missing raspiMac in request body" }, 400);
        }

        const db = getDB({ DB: c.env.DB });


            const normalizedMac = normalizeMac(rawMac);
            if(!normalizedMac) {
                throw new Error("Invalid raspi_mac format. Expected 12 hex digits");
            }
        
            // Ensure user exists
            // TODO: fix before deploying to wrangler
            await handleLogin(c);
        
            // Update raspi_mac field
            await db
                .update(schema.user)
                .set({ raspiMac: normalizedMac })
                .where(eq(schema.user.id, decoded.uid))
                .run();
            
            // Fetch and return updated record
            const [user] = await db
                .select()
                .from(schema.user)
                .where(eq(schema.user.id, decoded.uid))
                .all();
            
            if(!user) {
                throw new Error("Failed to fetch updated user record");
            }
            

        return c.json(user, 200);
    } catch(error) {
        console.error("[pairDevice] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}

export async function handlePostRaspiSensorReadings(c: Context) {
    try {
        const mac = c.req.param("mac");
        const db = getDB({ DB: c.env.DB })
        const body = await c.req.json();
        const readings = body.readings; // Expect { readings: [...] }

        if(!mac) return c.json({ error: "Missing MAC address" }, 400);

        if(!Array.isArray(readings) || readings.length === 0) {
            return c.json({ error: "No sensor readings provided" }, 400);
        }

        // Find the userId associated with this MAC address
        const userId = await findUserFromMacAddress(db, mac);

        // Map readings to the insert structure
        const rowsToInsert = readings.map((r: any) => ({
            userId: userId,
            type: r.type,
            value: r.value
        }));

        await db.insert(schema.tempAndHumidity).values(rowsToInsert);

        return c.json({ 
            success: true,
            inserted: rowsToInsert.length
        });

    } catch(error) {
        console.error("[sensorReadings] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}

async function findUserFromMacAddress(db: DB, mac: string) {
    // The Pi passes a MAC address, find the user associated with
    // that address for the tempAndHumidity table's schema
    const users = await db.select()
        .from(schema.user)
        .where(eq(schema.user.raspiMac, mac))
        .all();
        
    // There will only be one userId associated with each MAC address
    return users.length > 0 ? users[0].id : null;
}

/**
 * Generates and returns a pin action schedule table for a Raspberry Pi device based on the user’s saved settings.
 *
 * This endpoint is called by a Raspberry Pi to retrieve its action schedule, using the device's MAC address
 * to identify the associated user. It queries the database for that user’s fan and water schedules, maps each
 * schedule to a corresponding GPIO pin, and returns a structured table of pin actions (including activation
 * times and durations).
 *
 * The function assumes that each user has no more than one fan schedule and three water schedules, corresponding
 * to specific GPIO pins.
 *
 * @async
 * @function returnPinActionTable
 * @param {Context} c - The Hono context object containing the HTTP request, environment bindings, and response helpers.
 * @returns {Promise<Response>} A JSON response containing:
 * - `success: true` and a `data` array of pin action objects if successful.
 * - `{ error: string }` with a 4xx or 5xx status code on failure.
 *
 * @throws {Error} If the MAC address is missing or invalid, no associated user is found, or database queries fail.
 *
 * @example
 * // Example successful response:
 * {
 *   "success": true,
 *   "data": [
 *     { "type": "fan", "pin": 17, "time": "06:00", "duration": 1200 },
 *     { "type": "water1", "pin": 27, "time": "07:00", "duration": 600 },
 *     { "type": "water2", "pin": 22, "time": "08:00", "duration": 600 },
 *     { "type": "water3", "pin": 23, "time": "09:00", "duration": 600 }
 *   ]
 * }
 */
export async function returnPinActionTable(c: Context) {

    // Raspberry Pi has devices attached to each separate pin.
    // These variables simulate the pins
    const FAN_PIN = 17;
    const WATER_PIN1 = 27;
    const WATER_PIN2 = 22;
    const WATER_PIN3 = 23;

    try {
        const mac = c.req.param('mac');
        if(!mac) {
            return c.json({ error: 'Missing MAC address' }, 400);
        }

        const db = getDB({ DB: c.env.DB });

        const userId = await findUserFromMacAddress(db, mac);

        // Find the schedules that the user has on their account
        const fanSchedules = await db.select()
            .from(schema.fanSchedule)
            .where(eq(schema.fanSchedule.userId, userId))
            .all();
        // One fanSchedule per user, so this is just a workaround for typescript
        const fanSchedule = fanSchedules[0];

        const waterSchedules = await db.select()
            .from(schema.waterSchedule)
            .where(eq(schema.waterSchedule.userId, userId))
            .orderBy(asc(schema.waterSchedule.type))
            .all();
        
        // Map the water schedules to individual pins

        const pinActionTable = [];

        // Push the fan schedule to the pin action table
        pinActionTable.push({
            type: "fan",
            pin: FAN_PIN,
            time: fanSchedule.timeOn,
            duration: calculateDurationFromTimes(fanSchedule.timeOn, fanSchedule.timeOff)
        });

        // Push the water schedules to the pin action table
        pinActionTable.push({
            type: "water1",
            pin: WATER_PIN1,
            time: waterSchedules[0].time,
            duration: waterSchedules[0].duration
        });
        pinActionTable.push({
            type: "water2",
            pin: WATER_PIN2,
            time: waterSchedules[1].time,
            duration: waterSchedules[1].duration
        });
        pinActionTable.push({
            type: "water3",
            pin: WATER_PIN3,
            time: waterSchedules[2].time,
            duration: waterSchedules[2].duration
        });

        return c.json({ success: true, data: pinActionTable})

    } catch(error) {
        console.error("[returnPinActionTable] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}


/**
 * Helper: calculate duration in seconds from two "HH:MM" times
 */
function calculateDurationFromTimes(timeOn: string, timeOff: string): number {
    const [h1, m1] = timeOn.split(":").map(Number);
    const [h2, m2] = timeOff.split(":").map(Number);
    const onMinutes = h1 * 60 + m1;
    const offMinutes = h2 * 60 + m2;
    const diffMinutes = offMinutes - onMinutes;
    return diffMinutes; // default 5min if invalid
}

export async function handlePiPairingStatus(c: Context) {
    try {
        const mac = c.req.param('mac');

        if(!mac) {
            return c.json({ success: false, error: 'MAC Address not provided' }, 400);
        }

        const db = getDB({ DB: c.env.DB });

        // Determine whether this mac address exists in a row on the User table
        const result = await db
            .select()
            .from(schema.user)
            .where(eq(schema.user.raspiMac, mac))
            .all();
        
        if(result.length > 0) {
            return c.json ({
                success: true,
                paired: true,
                user: result[0].id
            }, 200);
        }        

        return c.json({
            success: true,
            paired: false,
            message: "No user found with this MAC address"
        }, 200);

    } catch(error) {
        console.error('[handlePiPairingStatus] error:', error);
        return c.json({ error: (error as Error).message }, 500)
    }
}