import { Context } from 'hono';
import * as schema from '../schema';
import { getDB } from './databaseQueries';
import { eq } from 'drizzle-orm';

export async function handleReturnUserDataByTable(c: Context, bearer: string) {
    try {
        // Decode user data using the bearer key
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