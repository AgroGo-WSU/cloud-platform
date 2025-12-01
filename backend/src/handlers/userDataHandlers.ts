import { Context } from 'hono';
import * as schema from '../schema';
import { getDB } from '../utilities/databaseQueries';
import { desc, eq } from 'drizzle-orm';
import { getFirebaseUserInfo } from '../utilities/getFirebaseUserInfo';

/**
 * Retrieves all records from a specified database table associated with the authenticated user.
 *
 * This endpoint dynamically queries a table within the database schema based on the `table` route parameter.
 * It uses the authenticated user's ID (retrieved from the request context) to filter results.
 * If the requested table is `"user"`, it fetches only that user's record; otherwise, it selects
 * all records associated with the user's ID via a `userId` field.
 *
 * The function validates that the table exists within the schema and that the user is authenticated
 * before executing the query. Results are returned as a JSON response including metadata such as
 * table name and row count.
 *
 * @async
 * @function handleReturnUserDataByTable
 * @param {Context} c - The Hono context object containing the HTTP request, environment bindings, and user session data.
 * @returns {Promise<Response>} A JSON response containing:
 * - `{ success: true, table, count, data }` on success, or
 * - `{ error: string }` with an appropriate status code on failure.
 *
 * @throws {Error} If authentication fails, the table name is invalid, or database access encounters an error.
 *
 * @example
 * // Example successful response:
 * {
 *   "success": true,
 *   "table": "waterSchedule",
 *   "count": 3,
 *   "data": [
 *     { "id": 1, "userId": "abc123", "time": "07:00", "duration": 600 },
 *     { "id": 2, "userId": "abc123", "time": "08:00", "duration": 600 },
 *     { "id": 3, "userId": "abc123", "time": "09:00", "duration": 600 }
 *   ]
 * }
 */
export async function handleReturnUserDataByTable(c: Context) {
    try {
        const userId = c.get('userId');

        if(!userId) return c.json({ error: "User not authenticated" }, 400);

        const tableName = c.req.param('table');
        const table = (schema as any)[tableName];

        if(!table) {
            return c.json({ error: `Unknown table: ${tableName}` }, 400)
        }

        const db = getDB({ DB: c.env.DB });

        let rows;
        if(tableName === "user") {
            rows = await db.select()
                .from(table)
                .where(eq(table.id, userId))
                .all();
        } else {
            rows = await db.select()
                .from(table)
                .where((table as any).userId ? eq((table as any).userId, userId) : undefined)
                .all();
        }
        
        return c.json({
            success: true,
            table: tableName,
            count: rows.length,
            data: rows
        }, 200);
    } catch(error) {
        console.error("[handleReturnUserDataByTable] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}

export async function handleDeleteUserDataByTable(c: Context) {
    try {
        const db = getDB({ DB: c.env.DB });
        const tableName = c.req.param('table');
        const table = (schema as any)[tableName];
        const body = await c.req.json();
        const id = body.id;

        if(!id) return c.json({ error: "id isn't passed in the request"}, 400);

        const records = await db
            .select()
            .from(table)
            .where(eq(table.id, id))
            .all();
        
        // Validate that only one record was found
        if(records.length < 1) return c.json({ error: `No records found with ID: ${id}`}, 400);
        else if(records.length > 1) return c.json({ error: `Multiple records found with ID: ${id}`, records: records}, 400);

        const record = await db
            .delete(table)
            .where(eq(table.id, id))
            .run();
        
        return c.json({ success: true, record: record }, 200);
    } catch(error) {
        console.error("[handleDeleteUserDataByTable] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}

export async function handleDetermineUserDeviceHealth(c: Context) {
    try {
        // Get the bearer token from the "Authorization" header
        const authHeader = c.req.header('Authorization');
        const bearerToken = authHeader?.split(' ')[1];

        // From the bearer token, find the user's Firebase uid
        const firebaseUser = await getFirebaseUserInfo(bearerToken!, c.env.FIREBASE_API_KEY);
        const userId = firebaseUser?.uid!;
        
        // A user should exist with the firebase uid found from earlier
        const db = getDB({ DB: c.env.DB });
        const users = await db
            .select()
            .from(schema.user)
            .where(eq(schema.user.id, userId))
            .all();

        // One and only one user should be found, ensure that's the case
        if(users.length < 1) {
            return c.json({ error: "[handleDetermineUserDeviceHealth] Error: no user found with the uid: " + userId}, 500)
        }
        if(users.length > 1) {
            return c.json({
                error: `[handleDetermineUserDeviceHealth] Error: ${users.length} found with the uid: ${userId}`,
            }, 500);
        }

        // Now that we can be sure that only one user exists, get their raspi's MAC address
        const user = users[0];
        const userRaspiMac = user.raspiMac;

        // Error out if the raspi hasn't been paired yet
        if(userRaspiMac === "") {
            return c.json({
                error: "[handleDetermineUserDeviceHealth] Error: no raspi found for user: " + userId
            }, 404)
        }

        // Now that the user is confirmed to have a raspi paired,
        // find the last time the raspi sent readings to the cloud
		const [tempAndHumidityReadings, waterLogReadings, fanLogReadings] = await Promise.all([
			db.select().from(schema.tempAndHumidity)
				.where(eq(schema.tempAndHumidity.userId, userId))
				.orderBy(desc(schema.tempAndHumidity.receivedAt))
				.limit(1),
			db.select().from(schema.waterLog)
				.where(eq(schema.waterLog.userId, userId))
				.orderBy(desc(schema.waterLog.timeConfirmed))
				.limit(1),
			db.select().from(schema.fanLog)
				.where(eq(schema.fanLog.userId, userId))
				.orderBy(desc(schema.fanLog.timeConfirmed))
				.limit(1)
		]);
        
        // Standardize the timestamps to numbers for later processing
        const lastTHTime = tempAndHumidityReadings[0]?.receivedAt ?? null;
        const lastWLTime = waterLogReadings[0]?.timeConfirmed ?? null;
        const lastFLTime = fanLogReadings[0]?.timeConfirmed ?? null;
        const timestamps = [
            lastTHTime ? new Date(lastTHTime).getTime() : 0,
            lastWLTime ? new Date(lastWLTime).getTime() : 0,
            lastFLTime ? new Date(lastFLTime).getTime() : 0
        ];

        // Find the latest timestamp
        const latestTimestamp = Math.max(...timestamps);
        const latestReadingTime = latestTimestamp > 0 ? new Date(latestTimestamp) : null;

        // Determine if the device has been active in the last 20 minutes
        const fiveMinutesAgo = Date.now() - 5*60*1000;
        const isDeviceActive = latestTimestamp > fiveMinutesAgo;

        // Return a flag determining if the device was seen in the last
        // 20 minutes, and the last time it was seen
        return c.json({
            deviceActive: isDeviceActive,
            lastSeen: latestReadingTime ? latestReadingTime.toISOString().split(".")[0] : "No data"
        }, 200);
        

    } catch(error) {
        console.error("[handleDetermineUserDeviceHealth] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}