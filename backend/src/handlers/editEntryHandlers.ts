import { eq, InferInsertModel } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { Context } from "hono";
import { getDB } from "../utilities/databaseQueries";

export async function handleEditTableEntries<
    T extends SQLiteTable,
    PK extends keyof T["_"]["columns"]
>(
    table: T,
    c: Context,
    entries: InferInsertModel<T>[],
    primaryKey: PK // Explicitly passed for each table
) {
    try {
        const db = getDB({ DB: c.env.DB });
        const pkColumn = (table as any)[primaryKey];


        let validCount = 0;
        let invalidEntries: any[] = [];

        // Multiple entries may be passed, validate every entry before updating
        for(const entry of entries) {
            const pkValue = (entry as any)[primaryKey];

            // Ensure the pk was passed
            if(!pkValue) {
                invalidEntries.push({ entry, reason: "missing primary key"});
                continue;
            }

            const found = await db
                .select()
                .from(table)
                .where(eq(pkColumn, pkValue))
                .all();
            
            // 1 and only 1 record should be passed, validate that the condition is met
            if(found.length === 0) {
                invalidEntries.push({ entry, reason: "no match"});
                continue;
            } else if(found.length > 1) {
                invalidEntries.push({ entry, reason: "ambiguous match"});
                continue;
            }

            // Update the entry, and add to the tally
            await db.update(table)
                .set(entry)
                .where(eq(pkColumn, pkValue))
                .run();
            validCount++;
        }

        return c.json({
            success: true,
            validCount,
            invalidCount: invalidEntries.length,
            invalidEntries
        });
    } catch(error) {
        console.error(error);
		return c.json({ error: 'Failed to retrieve entry' }, 500);
    }
}