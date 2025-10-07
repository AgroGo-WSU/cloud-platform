/**
 * StreamingObject.ts
 *
 * Defines the Durable Object responsible for handling streaming device data.
 *
 * Responsibilities:
 * - Provides an isolated, per-device execution context using Cloudflare Durable Objects.
 * - Handles incoming HTTP requests:
 *   - **POST** Stores new sensor readings in the database.
 *   - **GET** Retrieves recent readings for a given device.
 * - Ensures devices are registered (creates device records if they do not exist).
 * - Uses shared Drizzle-based query helpers (`databaseQueries.ts`) for all
 *   database interactions.
 *
 * This Durable Object serves as the main entry point for device communication,
 * ensuring reliable ingestion and retrieval of IoT data on a per-device basis.
 */

import * as schema from "../../schema";
import { DB, getDB, createUser, getRecentReadings } from "../../databaseQueries";

export interface Env {
	DB: D1Database;
}

export class StreamingObject {
	private state: DurableObjectState;
	private env: Env;
	private db: DB;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;

		// Drizzle setup with your D1 DB
		this.db = getDB(env); // Updated to use shared Drizzle method
	}

	async fetch(request: Request): Promise<Response> {
		switch (request.method) {
			case "POST":
				return this.handlePost(request);
			case "GET":
				return this.handleGet(request);
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
			const rawData = await request.json();
			const userId = request.headers.get("x-user-id");
			const zoneId = request.headers.get("x-zone-id");

			if(!userId || !zoneId) {
				return new Response("User ID and Zone ID are required in headers", { status: 400 })
			}
			await createUser(this.db, userId);

			await this.db.insert(schema.deviceReadings).values({
				id: crypto.randomUUID(),
				zoneId: zoneId,
				jsonData: JSON.stringify(rawData),
				receivedAt: new Date().toISOString(),
			});
			return new Response ("Data saved successfully", { 
				status: 200});

		} catch (error) {
				console.error(`Failed to save data for zone ${this.state.id.toString()}:`, error);
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
	 * @param zoneId - Name of the Zone who's readings to return
	 * @returns The last 10 reads for the device passed
	 * 
	 * Drew 9.21 - Created function
	 * 
	 * Drew 9.22 - Refactored to use shared Drizzle queries
	 */
	private async handleGet(request: Request): Promise<Response> {
		try {
			const zoneId = request.headers.get("x-zone-id");

			if (!zoneId) {
				return new Response("Zone ID is required in headers", { status: 400 });
			}
			const readings = await getRecentReadings(this.db, zoneId, 10);
			return new Response(JSON.stringify(readings), {
				headers: {"Content-Type": "application/json"},
				status: 200
			})
		} catch (error) {
			console.error(`GET failed for zone ${this.state.id.toString()}:`, error);
			return new Response("Internal Server Error while getting data", {
				status: 500,
			});
		}
	}
}