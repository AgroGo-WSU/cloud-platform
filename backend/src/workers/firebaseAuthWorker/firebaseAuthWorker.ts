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

