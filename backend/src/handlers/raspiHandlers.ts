import { getDB } from "./databaseQueries";
import * as schema from '../schema';
import { eq } from "drizzle-orm";
import { Context } from "hono";

const FAN_PIN = 17;
const WATER_PIN = 27;

export async function handlePiMacDataRetrieval(c: Context) {
    try {
        const mac = c.req.param('mac');
        if(!mac) {
            return c.json({ error: 'Missing MAC address' }, 400);
        }

        const db = getDB({ DB: c.env.DB });

        // Find the user linked to this Pi
        const users = await db.select()
            .from(schema.user)
            .where(eq(schema.user.raspiMac, mac))
            .all();
        
        const user = users[0];

        if(!user) {
            return c.json({ error: 'Device not paired to any user' }, 404);
        }

        const userId = user.id;

        // Get the user's water and fan schedules
        const [waterSchedules, fanSchedules, sensorsList] = await Promise.all([
            db.select().from(schema.waterSchedule).where(eq(schema.waterSchedule.userId, userId)).all(),
            db.select().from(schema.fanSchedule).where(eq(schema.fanSchedule.userId, userId)).all(),
            db.select().from(schema.sensors).where(eq(schema.sensors.userId, userId)).all()
        ]);

        // Combine schedules into pinActionTable
        const pinActionTable = [
            ...fanSchedules.map(fs => ({
                type: 'fan',
                pin: FAN_PIN,
                time: fs.timeOn,
                duration: calculateDuration(fs.timeOn, fs.timeOff)
            })),
            ...waterSchedules.map(ws => ({
                type: 'water',
                pin: WATER_PIN,
                time: ws.time,
                duration: ws.duration
            }))
        ];

        return c.json(pinActionTable, 200);
    } catch(error) {
        console.error('[handlePiMacDataRetrieval] error:', error);
        return c.json({ error: (error as Error).message }, 500)
    }
}

function calculateDuration(timeOn:string, timeOff:string): number {
    try {
        const [sh, sm] = timeOn.split(':').map(Number);
        const [eh, em] = timeOff.split(':').map(Number);
        return ((eh * 60 + em) - (sh * 60 + sm)) * 60;
    } catch {
        return 0;
    }
}

export async function handlePiSensorDataPosting(c: Context) {
    try {
        const db = getDB({ DB: c.env.DB });

        // Parse body JSON
        const body = await c.req.json();
        const readings: {
            sensorUUID: string; 
            value: number;
            userID: string;
        }[] = body.readings;

        if (!Array.isArray(readings) || readings.length === 0) {
            return c.json({ error: "Body must contain a non-empty 'readings' array" }, 400);
        }

        const inserts = [];

        // Prepare inserts
        for(const reading of readings) {
            const { sensorUUID, value, userID: userId } = reading;

            // Skip invalid readings
            if(!sensorUUID || value === undefined || value === null) continue;

            // Find the sensor in the database
            const sensorRecords = await db.select()
                .from(schema.sensors)
                .where(eq(schema.sensors.sensorId, sensorUUID))
                .all();
            
            const sensorRecord = sensorRecords[0];
            
            // Ensure that the sensor record exists before inserting a ping related to it
            if(!sensorRecord) {
                console.warn(`Sensor not found for UUID: ${sensorUUID}`);
                continue;
            }

            // Push a record to the pings table matching the sensorId passed
            inserts.push({
                userId: userId || null,
                sensorId: sensorRecord.sensorId,
                confirmed: "yes",
                value: value.toString(),
            });
        }

        if(inserts.length === 0) {
            return c.json({ error: "No readings to insert" }, 400);
        }

        await db.insert(schema.pings).values(inserts).run();

        return c.json({ 
            success: true, 
            inserted: inserts.length,
            data: inserts
        }, 200);
    } catch(error) {
        console.error("[handlePiSensorDataPosting] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}