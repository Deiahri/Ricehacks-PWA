import { IDENTITY, PRESENCE_URL } from './usePresence'

/** The presence server's HTTP side (same host as the WebSocket unless VITE_API_URL says otherwise). */
export const API_BASE = (import.meta.env.VITE_API_URL || PRESENCE_URL.replace(/^ws/, 'http')).replace(/\/+$/, '')

/** A failed API call. status 0 = no connection; code is the server's short reason ('taken', 'insufficient-bp', …). */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
  }
}

/** JSON call as this device (the device id is the credential until real sign-in exists). */
export async function api<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${IDENTITY.userId}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'offline')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'server')
  return data as T
}
