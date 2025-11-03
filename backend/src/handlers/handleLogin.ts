import { eq } from "drizzle-orm";
import * as schema from "../schema";
import type { DB } from "../utilities/databaseQueries";
import type { InferModel } from "drizzle-orm";
import { requireFirebaseHeader } from "./authHandlers";
import { getDB } from "../utilities/databaseQueries";
import { Context } from "hono";

export type User = InferModel<typeof schema.user, 'select'>;

interface HandleLoginResult {
    userRecord: User;
}

/**
 * Handles user login requests by verifying a Firebase authentication token and ensuring
 * the user's record exists in the database.
 *
 * This function performs Firebase token verification via `requireFirebaseHeader`, retrieves
 * or creates a user record in the D1 database, and returns the user data as JSON.
 * If the user already exists, their record is returned; otherwise, a new record is created.
 * 
 * Errors during authentication, database operations, or request parsing result in a
 * `400 Bad Request` JSON response with an appropriate error message.
 *
 * @async
 * @function handleLogin
 * @param {Context} c - The Hono context object containing the request, environment variables, and response helpers.
 * @returns {Promise<Response>} A JSON response containing either:
 * - `{ userRecord }` if the user already exists, or
 * - `{ message, user }` if a new user record is created.
 * Returns an error JSON object if any part of the process fails.
 *
 * @throws {Error} If Firebase authentication fails, request parsing fails, or user insertion fails.
 */
export async function handleLogin(c: Context) {
    try {
        const decoded = await requireFirebaseHeader(c, c.env.FIREBASE_API_KEY);
		const db = getDB({ DB: c.env.DB });

		// Parse first/last name from request body
		const { firstName, lastName, location, profileImage } = await c.req.json();

        // Check if user already exists
        const existingUsers = await db.select()
            .from(schema.user)
            .where(eq(schema.user.id, decoded.uid))
            .all();
        
        let existingUser;
        
        if(existingUsers.length > 0) {
            existingUser = existingUsers[0];
            console.log(`[handleLogin] Existing user logged in: ${decoded.uid}`);
            return c.json({ resp: "User already created!", userRecord: existingUser }, 400);
        }

        // Create a new user record if they don't exist
        const newUser = {
            id: decoded.uid,
            createdAt: new Date().toISOString().split('T')[0], // MM-DD-YYYY
            location: location,
            email: decoded.email!,
            firstName: firstName,
            lastName: lastName,
            profileImage: profileImage,
            // Blank on login, mac is added by the pairing function after insertion
            raspiMac: "" 
        };

        await db.insert(schema.user).values(newUser).run();

        const insertedUsers = await db.select()
            .from(schema.user)
            .where(eq(schema.user.id, decoded.uid))
            .all();
        
        if (insertedUsers.length === 0) {
            throw new Error('User was not inserted correctly');
        }

        console.log(`[handleLogin] Created new user record for UID=${decoded.uid}`);
        return c.json({
			message: 'Login successful',
			user: newUser
		}, 200);
    } catch(error) {
        console.error('[handleLogin] Error handling login:', error);
        return c.json({error: `Failed to handle login: ${error instanceof Error ? error.message : error}`}, 400);
    }
}