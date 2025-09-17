import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { DurableObject } from "cloudflare:workers";

export interface Env {
    DB: D1Database;
}

export class StreamingObject extends DurableObject {
    db: ReturnType<typeof drizzle>;
    deviceId: string | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    this.db = drizzle(env.DB, { schema });
    this.deviceId = ctx.id.name;

    }
}