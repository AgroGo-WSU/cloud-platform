//completely overhualed by nick 10.4
interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface FirebaseAccountsLookupResponse {
  users: Array<{
    localId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
  }>;
}

export async function requireFirebaseHeader(c: any, firebaseAPIKey: string) {
  const authHeader = c.req.header('Authorization');

  if(!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }

  const token = authHeader.split(' ')[1];
  const decoded = await verifyFirebaseToken(token, firebaseAPIKey);

  if(!decoded) {
    throw new Error('Invalid or expired Firebase token');
  }

  return decoded;
}

/**
 * Verifies a Firebase ID token by sending a lookup request to the Firebase Identity Toolkit API.
 *
 * This function checks whether the provided ID token corresponds to a valid Firebase user account.
 * If valid, it returns a simplified `FirebaseUser` object containing key user details.
 * If the token is invalid or the request fails, it returns `null`.
 *
 * @async
 * @function verifyFirebaseToken
 * @param {string} token - The Firebase ID token to verify.
 * @param {string} apiKey - The Firebase project's Web API key used for authentication with the Identity Toolkit API.
 * @returns {Promise<FirebaseUser | null>} A promise that resolves to a `FirebaseUser` object if verification succeeds, or `null` if invalid or not found.
 */
async function verifyFirebaseToken(token: string, apiKey: string): Promise<FirebaseUser | null> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as FirebaseAccountsLookupResponse;

  if (!data.users || data.users.length === 0) return null;

  const user = data.users[0];

  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,
    picture: user.photoUrl
  };
}

