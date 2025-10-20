import { getDB } from "./databaseQueries";
import * as schema from '../schema';
import { eq } from "drizzle-orm";
import { Context } from "hono";
import { Schema } from "inspector/promises";

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