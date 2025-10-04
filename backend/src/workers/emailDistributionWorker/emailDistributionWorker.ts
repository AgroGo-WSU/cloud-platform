export type ResendResponse = { id: string };

/**
 * Handles outbound email distribution via the Resend API.
 *
 * This Cloudflare Worker-compatible handler accepts an HTTP request, constructs
 * an email payload, and sends it to the Resend API using the configured API key.
 * It returns a standardized HTTP `Response` object containing either a success message
 * with the Resend email ID or an error message if sending fails.
 *
 * @async
 * @function fetch
 * @param {Request} request - The incoming HTTP request triggering the email dispatch.
 * @param {any} env - The environment variables available to the worker (e.g., API keys, configuration).
 * @returns {Promise<Response>} A `Response` object representing the result of the email operation.
 *
 * @typedef {Object} ResendResponse
 * @property {string} id - The unique Resend identifier for the sent email.
 *
 * @throws {Error} When the Resend API call fails or returns a non-2xx status code.
 *
 * @example
 * const response = await emailDistributionHandler.fetch(request, env);
 * console.log(await response.text());
 *
 * @todo Make `recipient`, `subject`, and `message` dynamic — currently hardcoded.
 * @todo Move the Resend API key (`Authorization` header) to an environment variable.
 * @todo Add input validation to ensure required fields are present before sending.
 * @todo Add logging or metrics for email send attempts and failures.
 * @todo Distribute emails from our agrogo.org (once it's registered)
 */
export const emailDistributionHandler = {
    async fetch(request: Request, env: any): Promise<Response> {
        // TODO: currently statuc values, make these dynamic
        const recipient = "agrogodev@gmail.com";
        const subject = "Hello from AgroGo + Resend";
        const message = "Testing to see if this went through";

        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer RESEND_API_KEY_HERE`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: "onboarding@resend.dev",
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