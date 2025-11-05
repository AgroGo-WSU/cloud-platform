import { returnTableEntries } from "../utilities/databaseQueries";
import { getDB } from "../utilities/databaseQueries";
import { emailDistributionHandler, handleSendEmail } from "./handleEmailDistribution";
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import type { Env } from "../index";
import { fetchWeatherApi } from 'openmeteo';

type WeatherGovPointsResponse = {
  properties: {
    forecast: string; // URL for forecast
  };
};

type WeatherGovForecastResponse = {
  properties: {
    periods: Array<{
      number: number;
      name: string;
      startTime: string; // ISO
      endTime: string;
      temperature: number;
      temperatureUnit: string; // "F"
      isDaytime: boolean;
      detailedForecast?: string;
    }>;
  };
};

export const distributeWeatherGovEmails = async (env: Env) => {
    try {
        // Configurable thresholds
        const HIGH_TEMP_THRESHOLD = 90;
        const LOW_TEMP_THRESHOLD = 40;

        // Detroit coords
        const lat = 42.3314;
        const lon = -83.0458;

        // Fetch forecast from weather.gov
        const forecastUrl = `https://api.weather.gov/points/${lat},${lon}`;
        const pointResponse = await fetch(forecastUrl, {
            headers: { "User-Agent": "AgroGo (contact@agrogo.org)" },
        });

        if(!pointResponse.ok) {
            throw new Error(`Weather.gov point lookup failed: ${pointResponse.status}`);
        }

        const pointData: WeatherGovPointsResponse = await pointResponse.json();
        const forecastApiUrl = pointData.properties.forecast;

        const forecastResponse = await fetch(forecastApiUrl, {
            headers: { "User-Agent": "AgroGo (contact@agrogo.org)" },
        });

        if(!forecastResponse.ok) {
            throw new Error(`Weather.gov forecast fetch failed: ${forecastResponse.status}`);
        }

        const forecastData: WeatherGovForecastResponse = await forecastResponse.json();
        const periods = forecastData.properties.periods;

        // Check if any day violates thresholds
        const extremeDays: {
            date: string;
            high: number;
            low: number;
            reasons: string[];
        }[] = [];

        for(let i = 0; i < periods.length; i+=2) {
            const day = periods[i];
            const night = periods[i + 1];
            if (!day || !night) continue;

            const high = day.temperature;
            const low = night.temperature;
            const date = day.startTime.split("T")[0];
            const reasons: string[] = [];

            if (high >= HIGH_TEMP_THRESHOLD) {
                reasons.push(`High temperature of ${high}°F exceeds ${HIGH_TEMP_THRESHOLD}°F`);
            }
            if (low <= LOW_TEMP_THRESHOLD) {
                reasons.push(`Low temperature of ${low}°F below ${LOW_TEMP_THRESHOLD}°F`);
            }
            if (reasons.length > 0) {
                extremeDays.push({ date, high, low, reasons });
            }
        }

        if(extremeDays.length < 0) {
            console.log("No extreme temperatures detected, no emails sent");
            return;
        }

        // Build alert email
        let html = `<h2>⚠️ Weather Alert: Temperature Threshold Exceeded</h2>
                    <p>The following days are outside the safe temperature range:</p>
                    <table border="1" cellpadding="6">
                    <tr><th>Date</th><th>High (°C)</th><th>Low (°C)</th><th>Reason</th></tr>`;
        
        for(const d of extremeDays) {
            html += `<tr>
                <td>${d.date}</td>
                <td>${d.high}</td>
                <td>${d.low}</td>
                <td>${d.reasons.toString()}</td>
               </tr>`;
        }

        html += `</table>`;

        const res = await emailDistributionHandler.fetch(
            env,
            "theelderone02@gmail.com",
            "bad weather",
            html,
            "alerts@agrogo.org"
        );
    } catch (error) {
    console.error("[distributeOpenMeteoEmails] error:", error);
  }
}

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