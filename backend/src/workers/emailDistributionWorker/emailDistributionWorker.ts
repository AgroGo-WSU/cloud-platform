export default {
    async fetch(request, env): Promise<Response> {
        // TODO: currently statuc values, make these dynamic
        const recipient = "theelderone02@gmail.com";
        const subject = "Hello from AgroGo + Resend";
        const message = "Testing to see if this went through";

        try {
            const response = await this.fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer API_KEY_HERE`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: "agrogodev@gmail.com",
                    to: recipient,
                    subject: subject,
                    text: message,
                }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                return new Response(
                    `Failed top send email: ${JSON.stringify(data)}`,
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