import { Context } from "hono";

export type ResendResponse = { id: string };

/**
 * Handles an HTTP request to send an email through the email distribution handler.
 *
 * This function parses the incoming JSON request body for `recipient`, `subject`, and `message`
 * fields (with an optional `sender`). It validates the input, and if valid, forwards the
 * request to the `emailDistributionHandler` for delivery. If any required fields are missing,
 * it responds with a `400 Bad Request` error. On internal failures, it returns a `500 Internal Server Error`.
 *
 * @async
 * @function handleSendEmail
 * @param {Context} c - The Hono context object containing the request, environment bindings, and response helpers.
 * @returns {Promise<Response>} A Response object indicating success or failure of the email send operation.
 *
 * @throws {Error} Logs and returns an error response if email sending fails or request parsing encounters an issue.
 */

export async function handleSendEmail(c: Context) {
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
}

/**
 * Sends an outbound email using the Resend API.
 *
 * This handler is designed for use within a Cloudflare Worker or Hono-based API route.
 * It constructs an email payload from provided parameters and sends it through
 * the Resend API. A standardized `Response` object is returned to indicate
 * success or failure.
 *
 * @async
 * @function fetch
 * @param {Request} request - The incoming HTTP request triggering the email dispatch.
 * @param {any} env - The environment bindings available to the worker (e.g., secrets, configuration).
 * @param {string} recipient - The target recipient’s email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} message - The plain-text body of the email.
 * @param {string} sender - The sender’s email address (must be verified through Resend).
 * @returns {Promise<Response>} A standardized `Response` indicating the result of the email send attempt.
 *
 * @typedef {Object} ResendResponse
 * @property {string} id - The unique identifier returned by Resend for the sent email.
 *
 * @throws {Error} Throws if the Resend API request fails, the network call errors out,
 * or the response body cannot be parsed as JSON.
 *
 * @todo Log all email send attempts and failures for observability.
 */
export const emailDistributionHandler = {
    async fetch(
        env: any,
        recipient: string,
        subject: string,
        message: string,
        sender: string
    ): Promise<Response> {
        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    // NOTE: Need a .env file in the project directory
                    "Authorization": `Bearer ${env.resend_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: sender,
                    to: recipient,
                    subject: subject,
                    html: message,
                }),
            });

            const data: ResendResponse = await response.json();
            
            if (!response.ok) {
                return new Response(
                    `Failed to send email: ${JSON.stringify(data)}`,
                    { status: response.status}
                );
            }

            return new Response(`An email was sent successfully! ID: ${data.id}`, {
                status: 200,
            });
        } catch (error) {
            if(error instanceof Error) return new Response(`Error: ${error.message}`, { status: 500 });
            else return new Response(`Unknown error: ${error}`);
        }
    },
}