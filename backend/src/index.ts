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

import { StreamingObject } from './objects/streamingObject/StreamingObject';
import { emailDistributionHandler } from "./workers/emailDistributionWorker/emailDistributionWorker";

export interface Env {
	STREAMING_OBJECT: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// telling app to use CORS headers - Madeline
app.use('*', cors());

/**
 * Created by Nick
 * 
 * Forwarding logic added by Drew on 9.21
 */
app.post('/api/data/:id', async (c) => {

	const deviceIdOrName = c.req.param('id'); // e.g. "Raspi001" or a unique UUID - Drew

	const doId = c.env.STREAMING_OBJECT.idFromName(deviceIdOrName);
  	const stub = c.env.STREAMING_OBJECT.get(doId);

	// Forward original request but attach the original id in a header
	const original = c.req.raw;
	const headers = new Headers(original.headers);
	headers.set('x-device-key', deviceIdOrName); // Pass canonical id or name - Drew

	const forwarded = new Request(original, { headers });
	return stub.fetch(forwarded);
});

/**
 * Created by Drew on 9.21
 */
app.get('/api/data/:id', async (c) => {
	const deviceIdOrName = c.req.param('id');

	const doId = c.env.STREAMING_OBJECT.idFromName(deviceIdOrName);
	const stub = c.env.STREAMING_OBJECT.get(doId);

	// Forward original request but attach the original id in a header
	const headers = new Headers(c.req.raw.headers);
	headers.set('x-device-key', deviceIdOrName); // Pass canonical id or name - Drew

	const forwarded = new Request(c.req.url, {
		method: "GET",
		headers
	});
	return stub.fetch(forwarded);
});

/**
 * Created by Drew on 10.4
 */
app.post('/api/sendEmail', async (c) => {
	return emailDistributionHandler.fetch(c.req.raw, c.env);
});

export default app;

export { StreamingObject };
