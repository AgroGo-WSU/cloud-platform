import { returnTableEntries } from "./databaseQueries";
import { getDB } from "./databaseQueries";
import { emailDistributionHandler } from "./handleEmailDistribution";
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { Context } from "hono";

export const distributeUnsentEmails = async (
    c: Context,
) => {
    console.log("Running email distribution job");

    // Check the database for any unsent email alerts on the table
    const db = getDB({ DB: c.env.DB});
    const unhandledEmails = await returnTableEntries(
        db,
        schema.alert,
        { status: "unhandled" },
        1000 // Set to an unrealistically high number that we will never reach in the scope of this class
    );

    console.log(`Found ${unhandledEmails.length} unhandled emails`);
    let sentCount: number = 0;

    // Iterate and send each email
    for (const alert of unhandledEmails) {
        try {
            const alertUsers = await db
                .select()
                .from(schema.user)
                .where(eq(schema.user.id, alert.userId))
                .all();
            // There should only be one user, so to prevent type errors
            // Return the first user found
            const alertUser = alertUsers[0];

            // Call the Resend email handler
            const recipient = alertUser.email;
            const subject = `Alert: ${alert.severity}`;
            const message = alert.message;
            const sender = "alerts@agrogo.org";
            const res = await emailDistributionHandler.fetch(
                c.env,
                "nortleyo@gmail.com",
                subject,
                message,
                sender
            );

            // Check to be sure that the email sent properly
            if(res.status === 200) {
                console.log(`Email successfully sent to ${recipient}`);

                sentCount++;

                // Mark the alert as handled
                await db
                    .update(schema.alert)
                    .set({ status: "handled" })
                    .where(eq(schema.alert.id, alert.id));
            } else {
                console.error(`Failed to send email to ${recipient}`);
            }
        } catch (error) {
            console.error(`Error processing alert ${alert.id}:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return c.json({ "success": true, "count": sentCount })
}