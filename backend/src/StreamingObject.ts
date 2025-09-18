import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { DurableObject } from "cloudflare:workers";

//connects to database
export interface Env {
    DB: D1Database;
}

//I looked this up and have not a clue how this works just yet the old
//way of doing this is not good anymore
export class StreamingObject extends DurableObject {
    db: ReturnType<typeof drizzle>;
    streamId: string | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    this.db = drizzle(env.DB, { schema });
    this.streamId = ctx.id.name;

    }
   
    async fetch(request: Request): Promise<Response> {
        // We only allow POST requests to this endpoint.
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        try {
            
            const rawData = await request.text();

            const deviceId = this.state.id.toString();

            // Insert the data into the `deviceReadings` table using Drizzle.
            // We associate it with this object's unique streamId.
            await this.db.insert(schema.deviceReadings).values({
                deviceId: deviceId,
                jsonData: rawData,
            });
            
            console.log(`Successfully saved data for sensor: ${this.streamId}`);
            return new Response('Data saved successfully', { status: 200 });

        } catch (error) {
            console.error(`[Durable Object Error] Failed to save data for sensor ${this.streamId}:`, error);
            return new Response('Internal Server Error while saving data', { status: 500 });
        }
    }
}
