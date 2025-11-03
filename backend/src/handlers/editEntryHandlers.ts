import { eq, InferInsertModel } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { Context } from "hono";
import { getDB } from "../utilities/databaseQueries";

export async function handleEditTableEntry<
    T extends SQLiteTable,
    PK extends keyof T["_"]["columns"]
>(
    table: T,
    c: Context,
    entry: InferInsertModel<T>,
    primaryKey: PK // Explicitly passed for each table
) {
    try {
        const db = getDB({ DB: c.env.DB });
        const pkColumn = (table as any)[primaryKey];

        // Multiple entries may be passed, validate every entry before updating
        const pkValue = (entry as any)[primaryKey];

        // Ensure the pk was passed
        if(!pkValue) {
            return c.json({ entry, reason: "missing primary key"}, 400);
        }

        const found = await db
            .select()
            .from(table)
            .where(eq(pkColumn, pkValue))
            .all();
        
        // 1 and only 1 record should be passed, validate that the condition is met
        if(found.length === 0) {
            return c.json({ entry, reason: "no match"}, 400);
        } else if(found.length > 1) {
            return c.json({ entry, reason: ">1 match, ambiguous"}, 400);
        }

        // As long as 1 value was found, update it in the database
        await db.update(table)
            .set(entry)
            .where(eq(pkColumn, pkValue))
            .run();

        return c.json({
            success: true,
            data: entry
        });
    } catch(error) {
        console.error(error);
		return c.json({ error: 'Failed to retrieve entry: ' + error }, 500);
    }
}