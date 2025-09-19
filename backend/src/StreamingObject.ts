import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export interface Env {
	DB: D1Database;
}

export class StreamingObject {
	private state: DurableObjectState;
	private env: Env;
	private db: ReturnType<typeof drizzle>;
	private streamId: string;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;

		// Drizzle setup with your D1 DB
		this.db = drizzle(env.DB, { schema });

		// Unique name/id for this Durable Object instance
		this.streamId = state.id.toString();
	}

	async fetch(request: Request): Promise<Response> {
		// Only POST is allowed
		if (request.method !== "POST") {
			return new Response("Method Not Allowed", { status: 405 });
		}

		try {
			const rawData = await request.text();

			// Unique device identifier is this DO’s ID
			const deviceId = this.state.id.toString();

			// Insert into Drizzle/D1
			await this.db.insert(schema.deviceReadings).values({
				deviceId,
				jsonData: rawData,
			});

			console.log(` Saved data for sensor: ${this.streamId}`);
			return new Response("Data saved successfully", { status: 200 });
		} catch (error) {
			console.error(
				`Failed to save data for sensor ${this.streamId}:`,
				error,
			);
			return new Response("Internal Server Error while saving data", {
				status: 500,
			});
		}
	}
}