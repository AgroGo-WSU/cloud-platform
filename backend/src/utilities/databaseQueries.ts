/**
 * databaseQueries.ts
 *
 * Provides helper functions and type definitions for interacting with the
 * Cloudflare D1 database using Drizzle ORM.
 *
 * All database access from workers or durable objects should go through
 * this module to ensure consistent query patterns and type safety.
 */

import { drizzle, DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../schema";
import { eq, desc, Table, InferInsertModel, InferSelectModel, and, asc } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";

/**
 * Strongly typed Drizzle database instance
 * 
 * This alias ensures all queries are scoped to the project schema
 */
export type DB = DrizzleD1Database<typeof schema>;

/**
 * Initializes a Drizzle ORM instance for the Cloudflare D1 database.
 *
 * Wraps the provided `env.DB` binding in Drizzle with the project schema,
 * allowing type-safe queries against the database.
 *
 * @param env - The Cloudflare environment containing the D1 database binding
 * @returns A Drizzle ORM client configured with the schema
 * 
 * Drew 9.22 Created method
 */
export function getDB(env: {DB: D1Database}): DB {
    return drizzle(env.DB, { schema })
}

/**
 * Inserts a single entry into the specified SQLite table and returns the inserted row.
 *
 * This function is a generic helper for inserting records into a Drizzle ORM table.
 * It executes an `INSERT` operation with the provided values and returns the first
 * inserted row (as Drizzle returns an array of inserted rows).
 *
 * @template T - The type of the SQLite table (extends `SQLiteTable`).
 * @param {DB} db - The database instance created with Drizzle ORM.
 * @param {T} table - The table schema into which the entry will be inserted.
 * @param {any} entry - The record data to insert into the table.
 * @returns {Promise<InferModel<T>>} A promise resolving to the first inserted row.
 */
export async function insertTableEntry<T extends SQLiteTable>(
    db: DB,
    table: T,
    entry: any
) {
    const insertedRows = await db.insert(table).values(entry).returning();
    
    return insertedRows[0];
}

/**
 * Retrieves entries from a specified database table with optional filtering and a result limit.
 *
 * This function performs a `SELECT` query using Drizzle ORM. If a filtering condition is provided,
 * it builds a `WHERE` clause based on the key-value pairs in the `condition` object. Multiple
 * conditions are combined with logical `AND`. If no condition is provided, all rows up to the
 * specified `amount` are returned.
 *
 * @template T - The table type, extending Drizzle's `Table` interface.
 * @param {DB} db - The Drizzle ORM database instance.
 * @param {T} table - The table schema from which to select rows.
 * @param {Partial<InferSelectModel<T>>} condition - Optional filtering criteria as key-value pairs.
 * @param {number} amount - The maximum number of rows to return.
 * @returns {Promise<InferSelectModel<T>[]>} A promise that resolves to an array of selected table entries.
 */
export async function returnTableEntries<T extends Table>(
    db: DB,
    table: T,
    condition: Partial<InferSelectModel<T>>, // Optional filtering
    amount: number
): Promise<InferSelectModel<T>[]> {
    let whereClause;

    // Only build a WHERE clause if conditions were passed
    if(condition && Object.keys(condition).length > 0) {
        // Pull all clauses from the user's condition entry
        const clauses = Object.entries(condition).map(
            ([key, value]) => eq((table as any)[key], value)
        );
        // If the user put in > 1 condition, spread them to whereClause
        // If the user put in 1 condition, use that one
        // No need to check if no conditions were passed, handled in if block above
        whereClause = clauses.length > 1 ? and(...clauses) : clauses[0];
    }

    // Build/return results
    let result;

    // Special case for the tempAndHumidity table
    // Frontend needs this sorted by most recently received items
    if(table._.name === schema.tempAndHumidity._.name) {
        result = await db
            .select()
            .from(table)
            .where(whereClause)
            .limit(amount)
            .orderBy(desc(schema.tempAndHumidity.receivedAt));
    } else {
        result = await db
            .select()
            .from(table)
            .where(whereClause)
            .limit(amount);
    }
    
    return result;
}