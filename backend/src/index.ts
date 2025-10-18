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
import { getDB, createZone, createUser } from './handlers/databaseQueries';
import { StreamingObject } from './objects/streamingObject/StreamingObject';
import { emailDistributionHandler } from "./workers/emailDistributionWorker/emailDistributionWorker";
import { requireFirebaseHeader as requireFirebaseHeader } from './handlers/authHandlers';
import { handleLogin } from './handlers/handleLogin';

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


/**
 * Created by Drew on 10.18
 * 
 * Links a user's Firebase UID to a device's MAC address
 */
// app.post("/api/pairDevice", async (c) => {
// 	try {
// 		const { mac, firebaseUid } = await c.req.json();

// 		if(!mac || !firebaseUid) {
// 			return c.json({ error: "Missing mac or firebaseUid" }, 400);
// 		}

// 		const db = getDB({ DB: c.env.DB });
// 		await updateDeviceUserMapping(db, mac, firebaseUid);
		
// 		return c.json({ message: "Device successfully paired." }, 200);
// 	} catch(error) {
// 		console.error("Error in /api/pairing:", error);
// 		return c.json({ error: "Internal server error" }, 500);
// 	}
// });

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
export { StreamingObject };
