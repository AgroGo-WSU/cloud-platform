//import { DurableObject } from "cloudflare:workers";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
//export class MyDurableObject extends DurableObject<Env> {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	//constructor(ctx: DurableObjectState, env: Env) {
		//super(ctx, env);
	//}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param name - The name provided to a Durable Object instance from a Worker
	 * @returns The greeting to be sent back to the Worker
	 */
	//async sayHello(name: string): Promise<string> {
		//return `Hello, ${name}!`;
	//}
//}

//export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	//async fetch(request, env, ctx): Promise<Response> {
		// Create a stub to open a communication channel with the Durable Object
		// instance named "foo".
		//
		// Requests from all Workers to the Durable Object instance named "foo"
		// will go to a single remote Durable Object instance.
		//const stub = env.MY_DURABLE_OBJECT.getByName("foo");

		// Call the `sayHello()` RPC method on the stub to invoke the method on
		// the remote Durable Object instance.
		//const greeting = await stub.sayHello("world");

		//return new Response(greeting);
	//},
//} satisfies ExportedHandler<Env>;

//-------------------------------------------------------------------//

//code for project

import { Hono } from 'hono';

import { StreamingObject } from './StreamingObject';

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
