import { getDB, returnTableEntries } from "./databaseQueries";
import { Context } from "hono";
import * as schema from "../schema";

/**
 * Retrieves entries from the specified database table based on URL query parameters.
 *
 * Extracts query parameters from the request URL to build filter conditions
 * and applies an optional `limit` parameter (defaulting to 100). Returns
 * the matching rows as a JSON response.
 *
 * @param {SQLiteTable} table - The Drizzle ORM table schema to query from.
 * @param {Context} c - The Hono request context containing the environment and response helpers.
 * @returns {Promise<Response>} A JSON response containing the retrieved entries or an error message.
 */
export async function handleGetTableEntries (
    c: Context
) {
    try {
        // Find the table's name that was passed
        const tableName = c.req.param('table');

        // Check if the table exists in the schema
        const table = (schema as Record<string, any>)[tableName];
        if(!table) return c.json({ error: `Table ${tableName} not found`}, 404);

        const db = getDB({ DB: c.env.DB });
        const url = new URL(c.req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        // Default to a limit of 100 if no limit is passed in the params
        const limit = queryParams.limit ? parseInt(queryParams.limit) : 100;
        delete queryParams.limit; // Remove the limit from the params to keep it from being counted twice

        // Build an object of all params passed
        const condition: Record<string, any> = {};
        for(const [key, value] of Object.entries(queryParams)) {
            condition[key] = value;
        }

        const entries = await returnTableEntries(db, table, condition, limit);
        return c.json({ success: true, data: entries }, 200);
    } catch(error) {
        console.error(error);
		return c.json({ error: 'Failed to retrieve entry' }, 500);
    }
}