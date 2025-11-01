import { getFirebaseUserInfo } from "../utilities/getFirebaseUserInfo";

/**
 * Validates and decodes a Firebase Authentication token from the request header.
 * 
 * This function checks for an `Authorization` header with a Bearer token, verifies the
 * token using Firebase Admin SDK (via `verifyFirebaseToken`), and returns the decoded
 * Firebase user payload if valid. It throws descriptive errors if the header is missing,
 * malformed, or if the token is invalid or expired.
 * 
 * @async
 * @function requireFirebaseHeader
 * @param {any} c - The Hono request context, used to access request headers.
 * @param {string} firebaseAPIKey - The Firebase API key used to verify the token.
 * @throws {Error} If the Authorization header is missing or malformed.
 * @throws {Error} If the Firebase token is invalid or expired.
 * @returns {Promise<object>} The decoded Firebase token payload containing user information (e.g., `uid`, `email`).
 */
export async function requireFirebaseHeader(c: any, firebaseAPIKey: string) {
  const authHeader = c.req.header('Authorization');

  if(!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }

  const token = authHeader.split(' ')[1];
  const decoded = await getFirebaseUserInfo(token, firebaseAPIKey);

  if(!decoded) {
    throw new Error('Invalid or expired Firebase token');
  }

  return decoded;
}



