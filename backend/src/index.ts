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
 * - ./schema                           : Drizzle table definitions used to look up tables by name
 *
 * See the README to see the route descriptions in detail.
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

import { Context, Hono } from 'hono';
// CORS headers allow other domains (like our frontend) to query our endpoint - Madeline
import { cors } from 'hono/cors';
import { handleGetTableEntries } from './handlers/getTableEntries';
import * as schema from './schema';
import { handleAddTableEntry } from './handlers/addTableEntry';
import { handleSendEmail } from "./handlers/handleEmailDistribution";
import { requireFirebaseHeader as requireFirebaseHeader } from './handlers/authHandlers';
import { handleLogin } from './handlers/handleLogin';
import {
	returnPinActionTable, 
	handleRaspiPairing, 
	handlePostRaspiSensorReadings,
	handleRaspiPairingStatus
} from './handlers/raspiHandlers';
import { handleDeleteUserDataByTable, handleDetermineUserDeviceHealth, handleReturnUserDataByTable } from './handlers/userDataHandlers';
import { distributeWeatherGovEmails, distributeUnsentEmails } from './handlers/scheduledEventHandlers';
import { handleEditTableEntry } from './handlers/editEntryHandlers';
import { validateCompleteEntry } from './utilities/validateCompleteEntries';

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

// Disable strict COOP/COEP for Firebase popup compatibility
app.use('*', async (c, next) => {
  c.header('Cross-Origin-Opener-Policy', 'unsafe-none')
  c.header('Cross-Origin-Embedder-Policy', 'unsafe-none')
  await next()
});

// telling app to use CORS headers - Madeline
app.use("*", 
	cors({
		origin: "*",
		credentials: true,
		allowHeaders: ['Authorization', 'Content-Type'],
	})
);

/**
 * Created by Drew on 10.20
 */
app.get('/raspi/:mac/pinActionTable', async(c) => {
	return await returnPinActionTable(c);
});

/**
 * Created by Drew on 10.20
 */
app.post('raspi/:mac/sensorReadings', async(c) => {
	return await handlePostRaspiSensorReadings(c);
});

/**
 * Created by Drew on 10.29
 */
app.get('/raspi/:mac/pairingStatus', async(c) => {
	return await handleRaspiPairingStatus(c);
});

/**
 * Created by Drew on 10.20
 * 
 * Take a user and pair a Raspberry Pi (by mac address) to their account
 */
app.post('api/auth/pairDevice', async (c) => {
	return await handleRaspiPairing(c);
});

/**
 * Created by Drew on 10.18
 * 
 * User signs in with Firebase and sends their ID token.
 * We verify it, get UID, and store/update their info in D1.
 */
app.post('/api/auth/login', async(c) => {
	return await handleLogin(c);
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
 * Created by Drew on 11.3
 */
app.delete('api/data/:table', async(c) => {
	return await handleDeleteUserDataByTable(c);
});

/**
 * Created by Drew on 10.20
 */
app.get('api/user/:table', async(c) => {
	return await handleReturnUserDataByTable(c);
});

/**
 * Created by Drew on 10.31
 */
app.get('api/userDeviceHealth', async(c) => {
	return await handleDetermineUserDeviceHealth(c);
});

/**
 * Routes for specific database tables
 * 10.13 - Created by Drew
 */
app.post('api/data/user', async (c) => {
	const body = await c.req.json();
	const now = new Date();
	const formattedDate = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getFullYear()}`;

	return handleAddTableEntry(
		schema.user, c,
		{ 
			id: body.id,
			createdAt: formattedDate,
			location: body.location, 
			email: body.email, 
			firstName: body.firstName, 
			lastName: body.lastName, 
			profileImage: body.profileImage || "",
			notificationsForBlueAlerts: body.notificationsForBlueAlerts || "N",
			notificationsForGreenAlerts: body.notificationsForGreenAlerts || "N",
			notificationsForRedAlerts: body.notificationsForRedAlerts || "Y"
		}
	);
});

app.patch('/api/data/user', async (c) => {
	const body = await c.req.json();
	return await handleEditTableEntry(schema.user, c, body, "id");
});

app.put('/api/data/user', async (c) => {
	const body = await c.req.json();

	// Validate that all required fields are passed before editing row
	const requiredFields = [
		"id", "createdAt", "location", "email", "firstName", "lastName",
		"raspiMac", "profileImage", "notificationsForGreenAlerts",
		"notificationsForBlueAlerts", "notificationsForRedAlerts"
	];
	
	await validateCompleteEntry(c, body, requiredFields);

	return await handleEditTableEntry(schema.user, c, body, "id");
});

app.post('/api/data/zone', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.zone, c,
		{ zoneNumber: body.zoneNumber, userId: body.userId, zoneName: body.zoneName, description: body.description }
	);
});

app.post('/api/data/tempAndHumidity', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.tempAndHumidity, c,
		{ userId: body.userId, type: body.type, value: body.value }
	);
});

app.post('/api/data/waterSchedule', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.waterSchedule, c,
		{ userId: body.userId, time: body.time }
	);
});

app.post('/api/data/fanSchedule', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.fanSchedule, c,
		{ userId: body.userId, timeOn: body.timeOn, timeOff: "na" }
	);
});

app.post('/api/data/waterLog', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.waterLog, c,
		{ userId: body.userId, schedule_instance: null, timeOnConfirm: body.timeOnConfirm, timeConfirmed: body.timeConfirmed }
	);
});

app.post('/api/data/fanLog', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.fanLog, c,
		{ userId: body.userId, schedule_instance: null, timeOnConfirm: body.timeOnConfirm, timeOff: body.timeOff }
	);
});

app.post('/api/data/alert', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.alert, c,
		{ userId: body.userId, message: body.message, severity: body.severity, status: body.status }
	);
});

app.post('/api/data/plantInventory', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.plantInventory, c,
		{ 
			userId: body.userId, 
			plantType: body.plantType, 
			plantName: body.plantName, 
			zoneId: body.zoneId, 
			quantity: body.quantity,
			datePlanted: body.datePlanted
		}
	);
});

app.patch('/api/data/plantInventory', async (c) => {
	const body = await c.req.json();
	return await handleEditTableEntry(schema.plantInventory, c, body, "id");
});

app.put('/api/data/plantInventory', async (c) => {
	const body = await c.req.json();

	// Validate that all fields are passed before editing row
	const requiredFields = [
		"id", "userId", "plantType", "plantName", "zoneId", "quantity", "datePlanted"
	];
	await validateCompleteEntry(c, body, requiredFields);

	return await handleEditTableEntry(schema.plantInventory, c, body, "id");
});

/**
 * 10.13 Route created by Drew
 * 
 * 10.17 Route deprecated by Drew. Too insecure
 * 
 * Returns entries in a table based on params passed by the request
 */
app.get('api/data/:table', async (c) => {
	return handleGetTableEntries(c);
});

/**
 * Uses emailDistributionHandler to send an email via the Resend API
 * 
 * Created by Drew on 10.4
 */
app.post('/api/sendEmail', async (c) => {
	return await handleSendEmail(c);
});


export default {
	// API routes
	fetch: app.fetch,

	// Scheduled cron job
	scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
		// Cloudflare provides the cron string that triggered this execution
		const cron = event.cron;

		switch(cron) {
			// Send any unsent alerts from the "alerts" table
			case "*/1 * * * *":
				ctx.waitUntil(distributeUnsentEmails(env));
				break;
			// Once a day, send an OpenMeteo alert to all users
			// This will tell all users if any upcoming days have bad weather
			case "20 21 * * *":
				ctx.waitUntil(distributeWeatherGovEmails(env));
				break;
			default:
				console.log("Unhandled cron:", cron);
		}

	}
};

// Durable Object stub to prevent Cloudflare from throwing errors
export class StreamingObject {
	constructor(public state: DurableObjectState, public env: any) {}

	async fetch(request: Request) {
		return new Response("Durable Object stub active");
	}
}
