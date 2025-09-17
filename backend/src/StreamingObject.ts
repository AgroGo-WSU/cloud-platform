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
    deviceId: string | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    this.db = drizzle(env.DB, { schema });
    this.deviceId = ctx.id.name;

    }
}