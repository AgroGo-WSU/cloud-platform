import { returnTableEntries } from "../utilities/databaseQueries";
import { getDB } from "../utilities/databaseQueries";
import { emailDistributionHandler } from "./handleEmailDistribution";
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import type { Env } from "../index";

export const distributeUnsentEmails = async (env: Env) => {
    console.log("Running email distribution job");

    // Check the database for any unsent email alerts on the table
    const db = getDB({ DB: env.DB});
    const unhandledEmails = await returnTableEntries(
        db,
        schema.alert,
        { status: "unhandled" },
        // Since cron runs every minute, and resend needs 
        // a second delay in between sends. Set the max amount
        // to 50 (60 - small buffer)
        50
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
                env,
                recipient,
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

        // Leave a second of delay to prevent Resend from flagging our
        // alerts as spam
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}