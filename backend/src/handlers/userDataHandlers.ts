import { Context } from 'hono';
import * as schema from '../schema';
import { getDB } from './databaseQueries';
import { eq } from 'drizzle-orm';
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

export async function handleDetermineUserDeviceHealth(c: Context) {
    try {
        // First, determine if user has a mac address associated
        
        const db = getDB({ DB: c.env.db });
    } catch(error) {
        console.error("[handleDetermineUserDeviceHealth] Error:", error);
        return c.json({ error: (error as Error).message }, 500);
    }
}