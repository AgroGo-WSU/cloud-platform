import * as schema from "../../schema";
import { DB, getDB, getOrCreateDeviceId, getRecentReadings } from "./databaseQueries";

export interface Env {
	DB: D1Database;
}

export class StreamingObject {
	private state: DurableObjectState;
	private env: Env;
	private db: DB;
	private streamId: string;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;

		// Drizzle setup with your D1 DB
		this.db = getDB(env); // Updated to use shared Drizzle method

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
	 * Handles POST requests incoming by saving a new sensor reading.
	 * 
	 * Parses the incoming request body, ensures the device exists (creating it if
	 * necessary), and stores the reading in the database.
	 * 
	 * Original code created by Nick
	 * 
	 * Drew 9.21 - Fallback checks added
	 * 
	 * Drew 9.22 - Refactored to use shared Drizzle queries
	 */
	private async handlePost(request: Request): Promise<Response> {
		try {
			const rawData = await request.text();
			const deviceKey = request.headers.get("x-device-key") || this.streamId;
			
			const deviceId = await getOrCreateDeviceId(this.db, deviceKey);

			await this.db.insert(schema.deviceReadings).values({
				id: crypto.randomUUID(),
				deviceId: deviceId,
				jsonData: rawData,
				receivedAt: new Date().toISOString(),
			});

			console.log(`Saved data for sensor: ${this.streamId} - stored for device ${deviceId}`);
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
	 * Handles GET requests by returning recent readings for a device.
	 *
	 * Looks up or creates the device by key, then retrieves the last 10 readings
	 * from the database.
	 *
	 * TODO: Add support for specifying the number of readings via query parameter.
	 * 
	 * @param deviceKey - Name of the device who's readings to return
	 * @returns The last 10 reads for the device passed
	 * 
	 * Drew 9.21 - Created function
	 * 
	 * Drew 9.22 - Refactored to use shared Drizzle queries
	 */
	private async handleGet(deviceKey: string): Promise<Response> {
		try {
			const deviceId = await getOrCreateDeviceId(this.db, deviceKey);
			const readings = await getRecentReadings(this.db, deviceId, 10);

			return new Response(JSON.stringify(readings), {
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