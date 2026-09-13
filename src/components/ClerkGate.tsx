import type { ReactNode } from 'react'
import { AuthenticateWithRedirectCallback, useAuth, useClerk } from '@clerk/react'
import EntryScreen from './EntryScreen'
import { setCredentialSource } from '../live/credential'
import { NAME_KEY } from '../live/ProfileProvider'
import { storage } from '../platform'

/** Set = Google sign-in is required (see .env.example). Unset = guest mode, and nothing in this file runs. */
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null

// The app's own URL (it may live under a sub-path). Google sends people back to it with ?sso_callback=1, which works on
// any static host without a rewrite rule.
const APP_ROOT = new URL(import.meta.env.BASE_URL, document.baseURI).href
const CALLBACK_URL = `${APP_ROOT}?sso_callback=1`
const isCallback = () => new URLSearchParams(location.search).has('sso_callback')

/**
 * Sign-in gate (inside <ClerkProvider>). `children` (the socket, the account, the game) mount only once signed in; the
 * entry screen covers them until `entered`, and offers "Continue with Google" when signed out.
 */
export function ClerkGate({ entered, onEnter, children }: { entered: boolean; onEnter: () => void; children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const clerk = useClerk()

  // Registered during render, before the children below mount, so the socket's first hello already carries a token.
  setCredentialSource(
    isSignedIn ? () => getToken() : null,
    isSignedIn ? () => { storage.set(NAME_KEY, ''); void signOut() } : null,
  )

  if (isCallback()) {
    return (
      <>
        <AuthenticateWithRedirectCallback signInFallbackRedirectUrl={APP_ROOT} signUpFallbackRedirectUrl={APP_ROOT}/>
        <EntryScreen onContinue={() => {}} auth={{ ready: false, signedIn: false, onGoogle: async () => {} }}/>
      </>
    )
  }

  const google = async () => {
    const signIn = clerk.client?.signIn
    if (!signIn) throw new Error('Clerk is not ready')
    // New Google users are turned into a sign-up automatically on the way back.
    await signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: CALLBACK_URL, redirectUrlComplete: APP_ROOT })
  }

  return (
    <>
      {isSignedIn && children}
      {(!entered || !isSignedIn) && (
        <EntryScreen onContinue={onEnter} auth={{ ready: isLoaded, signedIn: !!isSignedIn, onGoogle: google }}/>
      )}
    </>
  )
}
