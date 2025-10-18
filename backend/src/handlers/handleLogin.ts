import { eq } from "drizzle-orm";
import * as schema from "../schema";
import type { DB } from "./databaseQueries";
import type { InferModel } from "drizzle-orm";

export type User = InferModel<typeof schema.user, 'select'>;

interface HandleLoginResult {
    userRecord: User;
}

/**
 * handleLogin
 * 
 * Called when a user signs in via Firebase.
 * Ensures that the user exists in the D1 database.
 * If they already exist, returns their record.
 * If not, creates a new record with their Firebase UID and email.
 */
export async function handleLogin(
    db: DB,
    firebaseUid: string,
    email: string,
    firstName: string,
    lastName: string
): Promise<HandleLoginResult> {
    try {
        // Check if user already exists
        const existingUsers = await db.select()
            .from(schema.user)
            .where(eq(schema.user.id, firebaseUid))
            .all();
        
        const existingUser = existingUsers[0];
        
        if(existingUser) {
            console.log(`[handleLogin] Existing user logged in: ${firebaseUid}`);
            return { userRecord: existingUser };
        }

        // Create a new user record if they don't exist
        const newUser = {
            id: firebaseUid,
            email: email,
            firstName: firstName,
            lastName: lastName
        };

        await db.insert(schema.user).values(newUser).run();

        const insertedUsers = await db.select()
            .from(schema.user)
            .where(eq(schema.user.id, firebaseUid))
            .all();
        
        if (insertedUsers.length === 0) {
            throw new Error('User was not inserted correctly');
        }

        console.log(`[handleLogin] Created new user record for UID=${firebaseUid}`);
        return { userRecord: insertedUsers[0] };
    } catch(error) {
        console.error('[handleLogin] Error handling login:', error);
        console.error('[handleLogin] firebaseUid:', firebaseUid, 'email:', email);
        throw new Error(`Failed to handle login: ${error instanceof Error ? error.message : error}`);
    }
}