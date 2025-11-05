import { returnTableEntries } from "../utilities/databaseQueries";
import { getDB } from "../utilities/databaseQueries";
import { emailDistributionHandler } from "./handleEmailDistribution";
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import type { Env } from "../index";

type WeatherGovPointsResponse = {
  properties: {
    forecast: string; // URL for forecast
    forecastGridData: string; // URL containing precipitation data
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

type WeatherGovGridResponse = {
    properties: {
        quantitativePrecipitation: {
            values: number[]
        };
    }
}

// Configurable thresholds
const HIGH_TEMP_THRESHOLD = 90;
const LOW_TEMP_THRESHOLD = 40;
const HIGH_PRECIPITATION_THRESHOLD = 25; // mm (~1 inch)
const LOW_PRECIPITATION_THRESHOLD = 0;

// Detroit coords - Used for weather forecasting
const lat = 42.3314;
const lon = -83.0458;


export const distributeWeatherGovEmails = async (env: Env) => {
    try {
        const emailBody = await buildWeatherEmailBodyFromApi();
        const db = getDB({ DB: env.DB });
        
        let emailsSent = 0;
        const userEmails = await db
            .select({ email: schema.user.email})
            .from(schema.user)
            .all();

        for(const userEmail of userEmails) {
            const res = await emailDistributionHandler.fetch(
                env,
                userEmail.email,
                "AgroGo ALERT - Inclement Weather Detected",
                emailBody!,
                "alerts@agrogo.org"
            );
            
            if(res.ok) emailsSent++;
        }

        console.log(`${emailsSent} Emails Sent Successfully!`);
        if(emailsSent !== userEmails.length) {
            throw new Error(`User Count: ${userEmails.length}, emails sent: ${emailsSent}. Check for discrepancies`);
        }
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

const buildWeatherEmailBodyFromApi = async() => {
    try {
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
        const gridApiUrl = pointData.properties.forecastGridData; 

        // Catch forecast and grid data in parallel
        const [forecastResponse, gridResponse] = await Promise.all([
            fetch(forecastApiUrl, {headers: { "User-Agent": "AgroGo (contact@agrogo.org)" },}),
            fetch(gridApiUrl, {headers: { "User-Agent": "AgroGo (contact@agrogo.org)" }})
        ]);
        if(!forecastResponse.ok) throw new Error(`Weather.gov forecast fetch failed: ${forecastResponse.status}`);
        if(!gridResponse.ok) throw new Error(`Weather.gov forecast fetch failed: ${gridResponse.status}`);

        const forecastData: WeatherGovForecastResponse = await forecastResponse.json();
        const gridData: WeatherGovGridResponse = await gridResponse.json();
        const periods = forecastData.properties.periods;

        // Parse precipitation data (in mm)
        const precipitationValues = 
            gridData.properties.quantitativePrecipitation?.values || [];

        // Helper: recommendation engine. Maps inclement weather to a specific action the user should take
        const getRecommendation = (
            high: number,
            low: number,
            precip: number
        ): string => {
            if (high >= HIGH_TEMP_THRESHOLD)
                return "Increase watering and provide shade where possible.";
            if (low <= LOW_TEMP_THRESHOLD)
                return "Protect sensitive plants or move them indoors.";
            if (precip >= HIGH_PRECIPITATION_THRESHOLD)
                return "Ensure good drainage and check for root rot risk.";
            if (precip <= LOW_PRECIPITATION_THRESHOLD)
                return "Water plants manually to prevent dehydration.";
            return "Conditions are normal — maintain routine care.";
        };

        // Check if any day violates thresholds
        const extremeDays: {
            date: string;
            high: number;
            low: number;
            precipitation: number;
            reasons: string[];
            recommendation: string;
        }[] = [];

        for(let i = 0; i < periods.length; i+=2) {
            const day = periods[i];
            const night = periods[i + 1];
            if (!day || !night) continue;

            // Data points
            const high = day.temperature;
            const low = night.temperature;
            const date = day.startTime.split("T")[0];

            // Find precipitation for the current date
            const precipitationForDay = precipitationValues
                .filter((v: any) => v.validTime.startsWith(date))
                .reduce((sum: number, v: any) => sum + (v.value ?? 0), 0);

            const reasons: string[] = [];

            // Add any bad weather reasons to the list
            if (high >= HIGH_TEMP_THRESHOLD) {
                reasons.push(`High temperature of ${high}°F exceeds ${HIGH_TEMP_THRESHOLD}°F`);
            }
            if (low <= LOW_TEMP_THRESHOLD) {
                reasons.push(`Low temperature of ${low}°F below ${LOW_TEMP_THRESHOLD}°F`);
            }
            if (precipitationForDay >= HIGH_PRECIPITATION_THRESHOLD){
                reasons.push(`Heavy precipitation of ${precipitationForDay.toFixed(1)} mm (>${HIGH_PRECIPITATION_THRESHOLD} mm)`);
            }
            if (precipitationForDay <= LOW_PRECIPITATION_THRESHOLD) {
                reasons.push(`No expected precipitation (${precipitationForDay.toFixed(1)} mm)`);
            }

            // If any inclement weather was detected, add it to the list of reasons to be sent in the email
            if (reasons.length > 0) {
                extremeDays.push({ 
                    date: date, 
                    high: high, 
                    low: low, 
                    precipitation: precipitationForDay,
                    reasons: reasons,
                    recommendation: getRecommendation(high, low, precipitationForDay)
                });
            }
        }

        if(extremeDays.length < 0) {
            console.log("No extreme temperatures detected, no emails sent");
            return;
        }

        // Build alert email
        let html = `<h2>⚠️ Inclement Weather Alert</h2>
                    <p>The following days have weather that is potentially damaging to outdoor plants:</p>
                    <table border="1" cellpadding="6">
                    <tr><th>Date</th><th>High (°C)</th><th>Low (°C)</th><th>Reason</th><th>Recommended Action</th></tr>`;
        
        for(const d of extremeDays) {
            html += `<tr>
                <td>${d.date}</td>
                <td>${d.high}</td>
                <td>${d.low}</td>
                <td>${d.reasons.toString()}</td>
                <td>${d.recommendation}</td>
               </tr>`;
        }

        html += `</table>`;

        return html;
    } catch(error) {
        console.error("[buildWeatherEmailFromApi] error:", error);
    }
}

