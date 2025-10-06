// Dotenv logic, allowing dynamically passed environment variables
import 'dotenv/config';
require('dotenv').config();

export type ResendResponse = { id: string };

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
        request: Request,
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
                    "Authorization": `Bearer ${process.env.resend_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: sender,
                    to: recipient,
                    subject: subject,
                    text: message,
                }),
            });

            const data: ResendResponse = await response.json();
            
            if (!response.ok) {
                return new Response(
                    `Failed to send email: ${JSON.stringify(data)}`,
                    { status: response.status}
                );
            }

            return new Response(`Email sent successfully! ID: ${data.id}`, {
                status: 200,
            });
        } catch (error) {
            if(error instanceof Error) return new Response(`Error: ${error.message}`, { status: 500 });
            else return new Response(`Unknown error: ${error}`);
        }
    },
}