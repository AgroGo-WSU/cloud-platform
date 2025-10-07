/**
 * index.ts
 *
 * Entry point for defining API routes in the Hono application.
 * 
 * This file wires incoming HTTP requests to the correct Durable Object
 * instance (`StreamingObject`), based on either a device UUID or a
 * human-readable device name provided in the request URL.
 *
 * - POST /api/data/:id Forwards incoming sensor data payloads to the 
 *   corresponding Durable Object for processing and database insertion.
 * 
 * - GET /api/data/:id Retrieves the latest sensor readings for a device 
 *   by delegating the query to the corresponding Durable Object.
 * 
 * All requests are forwarded with the original device identifier attached
 * as the `x-device-key` header, allowing the Durable Object to correctly
 * resolve and persist/query data.
 *
 * This file should remain focused on routing logic. Device handling logic,
 * business methods, and database interactions should live in their own
 * dedicated modules for clarity and maintainability.
 */

import { Hono } from 'hono';
// CORS headers allow other domains (like our frontend) to query our endpoint - Madeline
import { cors } from 'hono/cors';
import { getDB, createZone } from './databaseQueries';
import { StreamingObject } from './objects/streamingObject/StreamingObject';

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
