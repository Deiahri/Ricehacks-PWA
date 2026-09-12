import { useCallback, useEffect, useRef, useState } from 'react'
import { storage } from '../platform'
import { angleDiff, type GeoFix } from './useLiveLocation'

export interface RemotePlayer {
  id: string
  name: string
  shirt: string
  lat: number
  lng: number
  heading: number | null
  acc: number | null
  ts: number
}

export const PRESENCE_URL = import.meta.env.VITE_PRESENCE_URL || `ws://${location.hostname}:8787`

const SHIRTS = ['#e98a8a', '#7fb0e0', '#b98be0', '#f0a040', '#6fd0a8', '#e0c050', '#e07fb8']
const SEND_EVERY_MS = 250 // at most 4 position updates/s
const KEEPALIVE_MS = 20_000 // re-send while standing still; the server drops players silent for 60 s

// Name + shirt stick across launches; the id is per tab so two tabs show up as two players.
function makeIdentity() {
  let name = storage.get('presence.name')
  if (!name) {
    name = `Player-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    storage.set('presence.name', name)
  }
  let shirt = storage.get('presence.shirt')
  if (!shirt || !/^#[0-9a-f]{6}$/i.test(shirt)) {
    shirt = SHIRTS[Math.floor(Math.random() * SHIRTS.length)]
    storage.set('presence.shirt', shirt)
  }
  const id = crypto.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  return { id, name, shirt }
}
export const IDENTITY = makeIdentity()

/** Metres between two fixes (equirectangular; fine at walking distances). */
function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const x = ((b.lng - a.lng) * Math.PI) / 180 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180)
  const y = ((b.lat - a.lat) * Math.PI) / 180
  return Math.hypot(x, y) * 6_371_000
}

/** Streams my position to the presence server and returns everyone else's. */
export function usePresence(position: GeoFix | null, heading: number | null) {
  const [connected, setConnected] = useState(false)
  const [others, setOthers] = useState<RemotePlayer[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const latest = useRef({ position, heading })
  const lastSent = useRef<{ lat: number; lng: number; heading: number | null; t: number } | null>(null)
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const ws = wsRef.current
    const { position: p, heading: h } = latest.current
    if (!ws || ws.readyState !== WebSocket.OPEN || !p) return
    ws.send(JSON.stringify({ type: 'pos', lat: p.lat, lng: p.lng, heading: h, acc: p.acc }))
    lastSent.current = { lat: p.lat, lng: p.lng, heading: h, t: Date.now() }
  }, [])

  // Connection lifetime: connect, say hello, reconnect with backoff.
  useEffect(() => {
    let closed = false
    let retries = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      const ws = new WebSocket(PRESENCE_URL)
      wsRef.current = ws
      ws.onopen = () => {
        retries = 0
        setConnected(true)
        ws.send(JSON.stringify({ type: 'hello', ...IDENTITY }))
        flush()
      }
      ws.onmessage = (e) => {
        let msg: { type?: string; players?: RemotePlayer[] }
        try {
          msg = JSON.parse(String(e.data))
        } catch {
          return
        }
        if (msg.type === 'players' && Array.isArray(msg.players)) {
          setOthers(msg.players.filter((p) => p.id !== IDENTITY.id))
        }
      }
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        setConnected(false)
        if (closed) return
        retryTimer = setTimeout(connect, Math.min(10_000, 1000 * 2 ** retries++))
      }
    }
    connect()
    const keepAlive = setInterval(flush, KEEPALIVE_MS)

    return () => {
      closed = true
      clearTimeout(retryTimer)
      clearInterval(keepAlive)
      if (pending.current) clearTimeout(pending.current)
      wsRef.current?.close()
      wsRef.current = null
      setOthers([])
    }
  }, [flush])

  // Throttled position updates: only when I moved >1 m or turned >5°.
  useEffect(() => {
    latest.current = { position, heading }
    if (!position) return
    const last = lastSent.current
    if (last) {
      const moved = metres(last, position) > 1
      const turned =
        (heading === null) !== (last.heading === null) ||
        (heading !== null && last.heading !== null && angleDiff(heading, last.heading) > 5)
      if (!moved && !turned) return
    }
    if (pending.current) return
    const wait = last ? SEND_EVERY_MS - (Date.now() - last.t) : 0
    if (wait <= 0) flush()
    else
      pending.current = setTimeout(() => {
        pending.current = null
        flush()
      }, wait)
  }, [position, heading, flush])

  return { connected, others }
}
