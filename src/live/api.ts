import { credentialRejected, sessionToken } from './credential'
import { IDENTITY, PRESENCE_URL } from './usePresence'

/** The presence server's HTTP side (same host as the WebSocket unless VITE_API_URL says otherwise). */
export const API_BASE = (import.meta.env.VITE_API_URL || PRESENCE_URL.replace(/^ws/, 'http')).replace(/\/+$/, '')

/** A failed API call. status 0 = no connection; code is the server's short reason ('taken', 'insufficient-bp', …). */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

/** JSON call as the signed-in user (a Clerk session token), or as this device in guest mode. */
export async function api<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const credential = (await sessionToken()) ?? IDENTITY.userId
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${credential}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'offline')
  }
  const data = await res.json().catch(() => null)
  const code = (data as { error?: string } | null)?.error ?? 'server'
  if (res.status === 401 && code === 'bad-token') credentialRejected()
  if (!res.ok) throw new ApiError(res.status, code)
  return data as T
}
