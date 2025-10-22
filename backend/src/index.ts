/**
 * index.ts
 *
 * HTTP routing entrypoint for the AgroGo backend (Hono + Cloudflare Workers).
 *
 * Responsibilities
 * - Configure global middleware:
 *   - CORS for all routes.
 *   - Firebase auth verification for all routes under /api/* (expects `Authorization: Bearer <token>`).
 * - Wire small, focused route handlers that delegate business logic to handler modules:
 *   - POST routes that insert rows into specific tables use `handleAddTableEntry`.
 *   - A generic GET route that returns rows from any table uses `handleGetTableEntries`.
 *   - Zone creation endpoint uses `createZone` from databaseQueries.
 *
 * Key files / modules used by this router
 * - ./handlers/databaseQueries         : DB helpers (getDB, createZone, insert/return helpers)
 * - ./handlers/addTableEntry           : handleAddTableEntry (inserts into a table)
 * - ./handlers/getTableEntries         : handleGetTableEntries (query table rows with filters/limit)
 * - ./handlers/firebaseAuth            : verifyFirebaseToken used by auth middleware
 * - ./schema                          : Drizzle table definitions used to look up tables by name
 *
 * Routes summary
 * - POST /api/data/<table>        : Insert a row into a specific table (many table-specific routes wired).
 * - GET  /api/data/:table         : Generic tabular endpoint. Accepts query params as filters and `limit`.
 *
 * Important notes / conventions
 * - All /api/* routes require a valid Firebase Bearer token; middleware sets `userId` on context.
 * - Route handlers should be small and delegate DB/logic to the handler modules (separation of concerns).
 * - Table names passed to the generic GET endpoint are looked up from the exported `schema` object;
 *   callers receive 404 if the requested table name is not found in the schema.
 * - Handlers return JSON responses and log errors to the Worker console. Status codes follow:
 *   - 200 / 201 for success, 400 for client errors, 401 for auth errors, 500 for server errors.
 *
 * Deployment / bindings
 * - Expected environment bindings (Env):
 *     FIREBASE_PROJECT_ID
 *     FIREBASE_API_KEY
 *     DB               : D1Database
 *
 * Keep this file focused on routing only. Business logic, DB queries, and Durable Object internals
 * belong in their respective modules to keep routes concise and testable.
 */

import { Hono } from 'hono';
// CORS headers allow other domains (like our frontend) to query our endpoint - Madeline
import { cors } from 'hono/cors';
import { handleGetTableEntries } from './handlers/getTableEntries';
import * as schema from './schema';
import { handleAddTableEntry } from './handlers/addTableEntry';
import { getDB } from './handlers/databaseQueries';
import { emailDistributionHandler } from "./handlers/handleEmailDistribution";
import { requireFirebaseHeader as requireFirebaseHeader } from './handlers/authHandlers';
import { handleLogin } from './handlers/handleLogin';
import { handleRaspiPairing } from './handlers/handleRaspiPairing';
import { handlePiMacDataRetrieval, handlePiPairingStatus, handlePiSensorDataPosting } from './handlers/raspiHandlers';
import { handleReturnUserDataByTable } from './handlers/userDataHandlers';

export interface Env {
	STREAMING_OBJECT: DurableObjectNamespace;
	FIREBASE_PROJECT_ID: string;
	FIREBASE_API_KEY: string;
	ENV_NAME: string;
	DB: D1Database;
}

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
  }
}

const app = new Hono<{ Bindings: Env }>();

// telling app to use CORS headers - Madeline
app.use('*', cors());

/**
 * Created by Drew on 10.20
 */
app.get('api/raspi/:mac', async(c) => {
	return await handlePiMacDataRetrieval(c);
});

app.get('api/raspi/pairingStatus', async(c) => {
	return await handlePiPairingStatus(c);
});

/**
 * Created by Drew on 10.20
 */
app.post('api/raspi/sensorReadings', async(c) => {
	return await handlePiSensorDataPosting(c);
});

/**
 * Created by Drew on 10.20
 * 
 * Take a user and pair a Raspberry Pi (by mac address) to their account
 */
app.post('api/auth/pairDevice', async (c) => {
	try {
		const decoded = await requireFirebaseHeader(c, c.env.FIREBASE_API_KEY);
		const { raspiMac, firstName, lastName } = await c.req.json();

		const rawMac = raspiMac.toString();
		if(!rawMac) {
			return c.json({ error: "Missing raspiMac in request body" }, 400);
		}

		const db = getDB({ DB: c.env.DB });
		
		const result = await handleRaspiPairing(
			db,
			decoded.uid,
			decoded.email!,
			rawMac,
			firstName,
			lastName
		);

		return c.json(result, 200);
	} catch(error) {
		console.error("[pairDevice] Error:", error);
		return c.json({ error: (error as Error).message }, 500);
	}
});

/**
 * Created by Drew on 10.18
 * 
 * User signs in with Firebase and sends their ID token.
 * We verify it, get UID, and store/update their info in D1.
 */
app.post('/api/auth/login', async (c) => {
	try {
		const decoded = await requireFirebaseHeader(c, c.env.FIREBASE_API_KEY);
		const db = getDB({ DB: c.env.DB });

		// Parse first/last name from request body
		const { firstName, lastName } = await c.req.json();

		const result = await handleLogin(
			db, 
			decoded.uid, 
			decoded.email!, 
			firstName, 
			lastName
		);

		return c.json({
			message: 'Login successful',
			user: result.userRecord
		}, 200);
	} catch(error) {
		console.error('Error in /api/auth/login:', error);
		return c.json({ error: (error as Error).message }, 400);
	}
});

// Require all API routes below this declaration to use a Firebase auth token
app.use('/api/*', async (c, next) => {
	try {
		const decoded = await requireFirebaseHeader(c, c.env.FIREBASE_API_KEY);
		c.set('userId', decoded.uid);
		return next();
	} catch(error) {
		return c.json({ error: (error as Error).message }, 401);
	}
});

// === All private API routes (require Firebase auth token) go below this line ===

/**
 * Created by Drew on 10.20
 */
app.post('api/raspi/sensorReadings', async(c) => {
	return await handlePiSensorDataPosting(c);
});

/**
 * Created by Drew on 10.20
 */
app.get('api/raspi/:mac', async(c) => {
	return await handlePiMacDataRetrieval(c);
});

/**
 * Created by Drew on 10.20
 */
app.get('api/user/:table', async(c) => {
	const bearer = c.req.header('Authorization') || '';
	return await handleReturnUserDataByTable(c, bearer);
});


/**
 * POST Routes for database tables
 * 10.13 - Created by Drew
 */
app.post('api/data/user', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.user, c,
		{ location: body.location, email: body.email, firstName: body.firstName, lastName: body.lastName }
	);
});

app.post('/api/data/sensors', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.sensors, c,
		{ userId: body.userId, type: body.type, zone: body.zone }
	);
});

app.post('/api/data/zone', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.zone, c,
		{ userId: body.userId, zoneName: body.zoneName, description: body.description }
	);
});

app.post('/api/data/tempAndHumidity', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.tempAndHumidity, c,
		{ userId: body.userId, type: body.type, value: body.value }
	);
});

app.post('/api/data/pings', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.pings, c,
		{ userId: body.userId, sensorId: body.sensorId, confirmed: body.confirmed }
	);
});

app.post('/api/data/waterSchedule', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.waterSchedule, c,
		{ userId: body.userId, sensorId: body.sensorId, time: body.time }
	);
});

app.post('/api/data/fanSchedule', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.fanSchedule, c,
		{ userId: body.userId, sensorId: body.sensorId, timeOn: body.timeOn, timeOff: body.timeOff }
	);
});

app.post('/api/data/waterLog', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.waterLog, c,
		{ userId: body.userId, schedule_instance: body.schedule_instance, timeOnConfirm: body.timeOnConfirm, timeConfirmed: body.timeConfirmed }
	);
});

app.post('/api/data/fanLog', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.fanLog, c,
		{ userId: body.userId, schedule_instance: body.schedule_instance, timeOnConfirm: body.timeOnConfirm, timeOff: body.timeOff }
	);
});

app.post('/api/data/rasPi', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.rasPi, c,
		{ status: body.status }
	);
});

app.post('/api/data/alert', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.alert, c,
		{ userId: body.userId, message: body.message, severity: body.severity, status: body.status }
	);
});

app.post('/api/data/integration', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.integration, c,
		{ userId: body.userId, provider: body.provider, accessToken: body.accessToken, refreshToken: body.refreshToken, expiresAt: body.expiresAt }
	);
});

app.post('/api/data/plantInventory', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.plantInventory, c,
		{ userId: body.userId, plantType: body.plantType, plantName: body.plantName, zoneId: body.zoneId, quantity: body.quantity }
	);
});

/**
 * 10.13 Route created by Drew
 * 
 * 10.17 Route deprecated by Drew. Too insecure
 * 
 * Returns entries in a table based on params passed by the request
 */
app.get('api/data/:table', async (c) => {
	// Find the table's name that was passed
	const tableName = c.req.param('table');

	// Check if the table exists in the schema
	const table = (schema as Record<string, any>)[tableName];
	if(!table) return c.json({ error: `Table ${tableName} not found`}, 404);

	return handleGetTableEntries(table, c);
});

/**
 * Uses emailDistributionHandler to send an email via the Resend API
 * 
 * Created by Drew on 10.4
 */
app.post('/api/sendEmail', async (c) => {
	try {
		// Parse the incoming request body
		const { recipient, subject, message, sender } = await c.req.json();

		// Input validation, sender is optional
		if(!recipient || !subject || !message) {
			return new Response("Missing one of the required fields: recipient, subject, or message", {
				status: 400,
			});
		}

		// Call the email handler
		return await emailDistributionHandler.fetch(
			c.req.raw,
			c.env,
			recipient,
			subject,
			message,
			sender || "no-reply@agrogo.org" // Default sender
		);
	} catch(error) {
		console.error("Error in /api/sendEmail:", error);
		return new Response(`Error sending email: ${(error as Error).message}`, { 
			status: 500
		});
	}
});

export default app;

// Durable Object stub to prevent Cloudflare from throwing errors
export class StreamingObject {
	constructor(public state: DurableObjectState, public env: any) {}

	async fetch(request: Request) {
		return new Response("Durable Object stub active");
	}
}
