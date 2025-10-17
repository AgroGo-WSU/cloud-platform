import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { InferInsertModel } from "drizzle-orm";
import { Context } from "hono";
import { getDB, insertTableEntry } from "./databaseQueries";

/**
 * Inserts a new entry into the specified database table.
 *
 * @param {SQLiteTable} table - The Drizzle ORM table schema to insert into.
 * @param {Context} c - The Hono request context containing the environment and response helpers.
 * @param {Object} entry - The record to be inserted into the table.
 * @returns {Promise<Response>} A JSON response indicating success or failure.
 */
export async function handleAddTableEntry<T extends SQLiteTable>(
    table: T,
    c: Context,
    entry: InferInsertModel<T>
) {
    try {
        const db = getDB( { DB: c.env.DB });

        const row = await insertTableEntry(db, table, entry);
        return c.json({ success: true, data: row }, 200)
    }  catch(error) {
		console.error(error);
		return c.json({ error: 'Failed to insert entry.' }, 500);
	}
}