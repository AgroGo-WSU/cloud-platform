import { Hono } from 'hono';

import { StreamingObject } from './objects/streamingObject/StreamingObject';

export interface Env {
	STREAMING_OBJECT: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

/**
 * POST request on the /api/data/:id endpoint
 * Accepts sensor data from a device, where `:id` can be either the device's
 * UUID (from the deviceStream table) or a human-readable name (e.g. "Raspi001").
 * 
 * Looks up the corresponding Durable Object instance by that ID or name.
 * 
 * Forwards the request payload to the Durable Object, attaching the original
 * device key in the `x-device-key` header so the Durable Object can resolve it
 * to the correct device ID for database insertion
 * 
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
 * GET request on the /api/data/:id endpoint
 * 
 * Returns the last 10 sensor readings for a device, where `:id` can be either 
 * the device's UUID (from the deviceStream table) or a human-readable name 
 * (e.g. "Raspi001").
 * 
 * Looks up the corresponding Durable Object instance by that ID or name.
 * 
 * Forwards the request to the Durable Object, attaching the original device key 
 * in the `x-device-key` header so the Durable Object can resolve it to the 
 * correct device ID for database lookup.
 * 
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

export default app;

export { StreamingObject };
