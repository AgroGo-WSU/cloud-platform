import { getDB } from "./databaseQueries";
import * as schema from '../schema';
import { asc, desc, eq } from "drizzle-orm";
import { Context } from "hono";

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

        // The Pi passes a MAC address, find the user associated with
        // that address for the tempAndHumidity table's schema
        const users = await db.select()
            .from(schema.user)
            .where(eq(schema.user.raspiMac, mac))
            .all();

        if(users.length === 0) {
            return c.json({ error: 'No user found for provided MAC address'}, 404);
        }
        // There will only be one userId associated with each MAC address
        const userId = users[0]?.id;
        

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