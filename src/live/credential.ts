/**
 * Where API calls and the socket's hello get their credential. Signed in with Clerk, that's a fresh session token
 * (registered by src/components/ClerkGate.tsx); in guest mode (no VITE_CLERK_PUBLISHABLE_KEY) it's the device id.
 */
type TokenGetter = () => Promise<string | null>

let getToken: TokenGetter | null = null
let signOutFn: (() => void) | null = null
let warned = false

/** Signed-in builds register Clerk's token getter and sign-out here before anything talks to the server. */
export function setCredentialSource(get: TokenGetter | null, signOut: (() => void) | null = null) {
  getToken = get
  signOutFn = signOut
}

/** A session token, or null in guest mode (callers then use the device id). */
export async function sessionToken(): Promise<string | null> {
  if (!getToken) return null
  try {
    return await getToken()
  } catch {
    return null
  }
}

/** The server refused the session token: almost always a server whose CLERK_SECRET_KEY is from another Clerk app. */
export function credentialRejected() {
  if (warned) return
  warned = true
  console.error('[auth] The server rejected the Clerk session token. Check that CLERK_SECRET_KEY on the server belongs '
    + 'to the same Clerk application as VITE_CLERK_PUBLISHABLE_KEY.')
}

/** Sign-out exists only when signed in with Clerk. */
export const canSignOut = () => signOutFn !== null
export const signOut = () => signOutFn?.()
