import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../schema";

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
		switch (request.method) {
			case "POST":
				return this.handlePost(request);
			case "GET":
				// Pull device identifier from header or fallback
				const canonicalKey: string = request.headers.get("x-device-key") || this.state.id.toString();
				return this.handleGet(canonicalKey);
			default:
				return new Response("Method not allowed", { status: 405 });
		}
	}

	/**
	 * Holds POST logic for StreamingObject
	 * 
	 * Posts a new sensor reading
	 * 
	 * Original code created by Nick
	 * 
	 * Drew 9.21 - Fallback checks added
	 */
	private async handlePost(request: Request): Promise<Response> {
		try {
			const rawData = await request.text();

			// Prefer canonical header-provided canonical id/name (safer); fallback to DO id - Drew
			const canonicalKey: string | unknown = request.headers.get('x-device-key') || this.state.id.toString();

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

	/**
	 * Holds GET logic for StreamingObject.
	 * 
	 * @returns The last 10 reads for the device passed
	 * 
	 * Drew 9.21 - Created function
	 */
	private async handleGet(deviceName: string): Promise<Response> {
		try {
			// Device is passed into the function as a name, but saved in the DB as an ID
			// Convert the name to the corresponding ID
			const deviceQuery = await this.env.DB.prepare(
				`SELECT id FROM deviceStream WHERE id = ? OR deviceStreamName = ?`
			).bind(deviceName, deviceName).all();
			const deviceId = deviceQuery.results[0].id;

			// Get the last 10 readings from this sensor
			const readings = await this.env.DB.prepare(
				`SELECT * FROM device_readings
				WHERE device_id = ? OR device_id IN
					(SELECT id FROM deviceStream WHERE deviceStreamName = ?)
				ORDER BY received_at DESC
				LIMIT 10`
			).bind(deviceId, deviceId).all();

			// Parse JSON string fields into real objects
			const parsed = readings.results.map(r => ({
				...r,
				json_data: JSON.parse(r.json_data as string)
			}))

			return new Response(JSON.stringify(parsed), {
				headers: {"Content-Type": "application/json"},
				status: 200
			})
		} catch (error) {
			console.error(
				`GET failed ${this.streamId}:`,
				error
			);
			return new Response("Internal Server Error while saving data", {
				status: 500,
			});
		}
	}
}