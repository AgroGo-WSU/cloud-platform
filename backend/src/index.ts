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
 * - Forward device-level API requests to a per-zone Durable Object (StreamingObject):
 *   - POST /api/data/:zoneId forwards sensor payloads to the Durable Object instance for that zone.
 *   - GET /api/data/:zoneId forwards reads to the Durable Object instance for that zone.
 *
 * Key files / modules used by this router
 * - ./handlers/databaseQueries         : DB helpers (getDB, createZone, insert/return helpers)
 * - ./handlers/addTableEntry           : handleAddTableEntry (inserts into a table)
 * - ./handlers/getTableEntries         : handleGetTableEntries (query table rows with filters/limit)
 * - ./handlers/firebaseAuth            : verifyFirebaseToken used by auth middleware
 * - ./objects/streamingObject/StreamingObject : Durable Object class used to isolate device ingestion
 * - ./schema                          : Drizzle table definitions used to look up tables by name
 *
 * Routes summary
 * - POST /api/data/<table>        : Insert a row into a specific table (many table-specific routes wired).
 * - GET  /api/data/:table         : Generic tabular endpoint. Accepts query params as filters and `limit`.
 * - POST /api/data/:zoneId        : Forward device POST payloads to the zone's Durable Object.
 * - GET  /api/data/:zoneId        : Forward device GET requests to the zone's Durable Object.
 * - POST /api/zones               : Create a new zone (uses createZone helper).
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
 *     STREAMING_OBJECT : Durable Object namespace
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
import { getDB, createZone } from './handlers/databaseQueries';
import { StreamingObject } from './objects/streamingObject/StreamingObject';
import { verifyFirebaseToken } from './handlers/firebaseAuth';
import { handleGetTableEntries } from './handlers/getTableEntries';
import * as schema from './schema';
import { handleAddTableEntry } from './handlers/addTableEntry';

export interface Env {
	STREAMING_OBJECT: DurableObjectNamespace;
	FIREBASE_PROJECT_ID: string;
	FIREBASE_API_KEY: string;
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


app.use('/api/*', async (c, next) => {
	const authHeader = c.req.header('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({ error: 'Missing or malformed token' }, 401);
	}

	const token = authHeader.split(' ')[1];
	const decoded = await verifyFirebaseToken(token, c.env.FIREBASE_API_KEY);

	console.log("Manual verification result:", decoded);

	if (!decoded) {
		return c.json({ error: 'Invalid or expired token' }, 401);
	}

	c.set('userId', decoded.uid); 
	return next();
});

// === All private API routes (require Firebase auth token) go below this line ===

// === POST Routes for database tables === \\

/**
 * 10.13 - Created by Drew
 */
app.post('api/data/user', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.user, c,
		{ location: body.location, email: body.email, firstName: body.firstName, lastName: body.lastName }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/sensors', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.sensors, c,
		{ userId: body.userId, type: body.type, zone: body.zone }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/zone', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.zone, c,
		{ userId: body.userId, zoneName: body.zoneName, description: body.description }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/tempAndHumidity', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.tempAndHumidity, c,
		{ userId: body.userId, type: body.type, value: body.value }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/pings', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.pings, c,
		{ userId: body.userId, sensorId: body.sensorId, confirmed: body.confirmed }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/waterSchedule', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.waterSchedule, c,
		{ userId: body.userId, sensorId: body.sensorId, time: body.time }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/fanSchedule', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.fanSchedule, c,
		{ userId: body.userId, sensorId: body.sensorId, timeOn: body.timeOn, timeOff: body.timeOff }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/waterLog', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.waterLog, c,
		{ userId: body.userId, schedule_instance: body.schedule_instance, timeOnConfirm: body.timeOnConfirm, timeOffConfirm: body.timeOffConfirm }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/fanLog', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.fanLog, c,
		{ userId: body.userId, schedule_instance: body.schedule_instance, timeOnConfirm: body.timeOnConfirm, timeOff: body.timeOff }
	);
});

/**
 * 10.13 - Created by Drew
 */
app.post('/api/data/rasPi', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.rasPi, c,
		{ status: body.status }
	);
});

/**
 * 10.13 Created by Drew
 * 
 * Inserts a row into the alert table
 */
app.post('/api/data/alert', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.rasPi, c,
		{ userId: body.userId, message: body.message, severity: body.severity, status: body.status }
	);
});

/**
 * 10.8 Created by Drew
 * 
 * Inserts a row into the alert table
 */
app.post('/api/data/integration', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.integration, c,
		{ userId: body.userId, provider: body.provider, accessToken: body.accessToken, refreshToken: body.refreshToken, expiresAt: body.expiresAt }
	);
});

/**
 * 10.13 Created by Drew
 */
app.post('/api/data/plantInventory', async (c) => {
	const body = await c.req.json();
	return handleAddTableEntry(
		schema.plantInventory, c,
		{ userId: body.userId, plantType: body.plantType, plantName: body.plantName, zoneId: body.zoneId }
	);
});

/**
 * 10.13 Route created by Drew
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
 * Created by Nick
 * 
 * Forwarding logic added by Drew on 9.21
 * Forwarding logic protected with firebase by Nick 10.1
 * updated by nick 10.4
 */
app.post('/api/data/:zoneId', async (c) => {
	const zoneId = c.req.param('zoneId');
	const userId = c.get('userId');

	const doId = c.env.STREAMING_OBJECT.idFromName(zoneId);
	const stub = c.env.STREAMING_OBJECT.get(doId);

	const original = c.req.raw;
	const headers = new Headers(original.headers);

	if (userId) headers.set('x-user-id', userId);
	headers.set('x-zone-id', zoneId);

	const forwarded = new Request(original, { headers });
	return stub.fetch(forwarded);
});

/**
 * Created by Drew on 9.21
 * updated by nick 10.4
 */
app.get('/api/data/:zoneId', async (c) => {
	const zoneId = c.req.param('zoneId');
	const userId = c.get('userId');

	const doId = c.env.STREAMING_OBJECT.idFromName(zoneId);
	const stub = c.env.STREAMING_OBJECT.get(doId);

	const headers = new Headers(c.req.raw.headers);
	if (userId) headers.set('x-user-id', userId);

	const forwarded = new Request(c.req.url, {
		method: "GET",
		headers
	});
	return stub.fetch(forwarded);
});

//wrote route for zone creation nick 10.3
app.post('/api/zones', async (c) => {
	const userId = c.get('userId');

	const { zoneName } = await c.req.json();
	if (!zoneName) {
		return c.json({ error: 'zoneName is required' }, 400);
	}

	const db = getDB({ DB: c.env.DB });
	const newZoneId = await createZone(db, userId, zoneName);

	return c.json({ zoneId: newZoneId, zoneName: zoneName });
});

export default app;
export { StreamingObject };
