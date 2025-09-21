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

			// Prefer canonical header-provided canonical id/name (safer); fallback to DO id - Drew
			const canonicalKey: string | unknown = request.headers.get('x-device-key') || this.state.id.toString();

			// Unique device identifier is this DO’s ID
			const deviceId = this.state.id.toString();

			// Provide multiple fallback checks to increase liklihood of finding the deviceStream entry - Drew
			const find = await this.env.DB.prepare(
				`SELECT id FROM deviceStream WHERE id = ? OR deviceStreamName = ?`
			).bind(canonicalKey, canonicalKey).all();

			let deviceIdToUse: string | unknown = canonicalKey;

			if(!find || !find.results || find.results.length === 0) {
				// Insert a new device row using a canonicalKey as id and set name to canonicalKey - Drew
				await this.env.DB.prepare(
					`INSERT INTO deviceStream (id, deviceStreamName, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
				).bind(canonicalKey, canonicalKey).run();
				deviceIdToUse = canonicalKey;
			} else {
				deviceIdToUse = find.results[0].id;
			}

			// Insert into Drizzle/D1
			await this.env.DB.prepare(
				`INSERT INTO device_readings (id, device_id, json_data, received_at)
				VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
			).bind(crypto.randomUUID(), deviceIdToUse, rawData).run();

			console.log(`Saved data for sensor: ${this.streamId} - stored for device ${deviceIdToUse}`);
			return new Response("Data saved successfully", { 
				status: 200 
			});
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