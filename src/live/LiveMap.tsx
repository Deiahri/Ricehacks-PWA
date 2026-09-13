import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Map as MapLibre, Marker, setWorkerUrl, type MarkerOptions } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre builds its worker URL at runtime, which Vite can't see; bundle the worker explicitly instead.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import CharacterSprite from '../components/CharacterSprite'
import UnverifiedTag from '../components/UnverifiedTag'
import type { Player } from '../App'
import { skinColors } from '../config/appearance'
import { loadStylizedStyle } from './mapStyle'
import type { GeoFix } from './useLiveLocation'
import type { RemotePlayer } from './usePresence'

setWorkerUrl(maplibreWorkerUrl)

// Where the camera sits before the first GPS fix (Rice University).
const DEFAULT_CENTER: [number, number] = [-95.4018, 29.7174]
const FOLLOW = 0.15 // per-frame easing toward the target centre/bearing

interface Props {
  me: Player
  position: GeoFix | null
  heading: number | null
  others: RemotePlayer[]
  onSelect: (p: RemotePlayer) => void
}

/** A MapLibre marker whose content is rendered by React. Options are read once, at creation. */
function MapMarker({ map, lngLat, rotation, options, children }: {
  map: MapLibre
  lngLat: [number, number]
  rotation?: number
  options?: Omit<MarkerOptions, 'element'>
  children: ReactNode
}) {
  const [el] = useState(() => document.createElement('div'))
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    const m = new Marker({ element: el, ...options }).setLngLat(lngLat).addTo(map)
    markerRef.current = m
    return () => {
      m.remove()
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el])
  useEffect(() => { markerRef.current?.setLngLat(lngLat) }, [lngLat[0], lngLat[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (rotation !== undefined) markerRef.current?.setRotation(rotation) }, [rotation])

  return createPortal(children, el)
}

// Flat on the ground, pointing north at rotation 0 — MapLibre rotates it to the heading.
function HeadingCone({ color, size = 120 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ display: 'block', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={`cone-${color.slice(1)}`} cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.75" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M0 0 L-24 -44 A50 50 0 0 1 24 -44 Z" fill={`url(#cone-${color.slice(1)})`} />
      <circle r="9" fill={color} stroke="#fff" strokeWidth="3" />
    </svg>
  )
}

export default function LiveMap({ me, position, heading, others, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibre | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const target = useRef<{ center: [number, number] | null; bearing: number }>({ center: null, bearing: 0 })

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    let instance: MapLibre | null = null
    loadStylizedStyle()
      .then((style) => {
        if (cancelled || !containerRef.current) return
        instance = new MapLibre({
          container: containerRef.current,
          style,
          center: DEFAULT_CENTER,
          zoom: 18,
          pitch: 60,
          maxPitch: 70,
          attributionControl: false,
          dragPan: false, // the camera follows you
          dragRotate: false, // the compass rotates the map
          touchPitch: false,
          keyboard: false,
        })
        instance.touchZoomRotate.disableRotation()
        const m = instance
        // Put "me" ~65% down the screen like the old art, so more of what's ahead is visible.
        const pad = () => m.setPadding({ top: m.getContainer().clientHeight * 0.3, bottom: 0, left: 0, right: 0 })
        pad()
        m.on('resize', pad)
        m.on('load', () => setMap(m))
      })
      .catch((e) => setMapError(`Couldn't load the map: ${e instanceof Error ? e.message : String(e)}`))
    return () => {
      cancelled = true
      instance?.remove()
      setMap(null)
    }
  }, [])

  useEffect(() => { if (position) target.current.center = [position.lng, position.lat] }, [position])
  useEffect(() => { if (heading !== null) target.current.bearing = heading }, [heading])

  // Follow camera: ease centre + bearing toward the latest fix / compass heading every frame.
  useEffect(() => {
    if (!map) return
    let raf = 0
    const tick = () => {
      const t = target.current
      const next: { center?: [number, number]; bearing?: number } = {}
      const bearing = map.getBearing()
      const dBearing = ((t.bearing - bearing + 540) % 360) - 180
      if (Math.abs(dBearing) > 0.05) next.bearing = bearing + dBearing * FOLLOW
      if (t.center) {
        const c = map.getCenter()
        const dLng = t.center[0] - c.lng
        const dLat = t.center[1] - c.lat
        if (Math.abs(dLng) > 0.003 || Math.abs(dLat) > 0.003) next.center = t.center // far away (first fix): jump
        else if (Math.abs(dLng) > 1e-7 || Math.abs(dLat) > 1e-7) next.center = [c.lng + dLng * FOLLOW, c.lat + dLat * FOLLOW]
      }
      if (next.center || next.bearing !== undefined) map.jumpTo(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [map])

  const myBearing = heading ?? 0

  return (
    <div className="live-map absolute inset-0" style={{ background: '#48c878' }}>
      {/* Inline position: maplibre-gl.css sets .maplibregl-map { position: relative }, which would beat a class. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {mapError && (
        <div className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-2xl bg-white/95 p-4 text-center font-game text-sm font-bold" style={{ color: '#1a2b4a' }}>
          {mapError}
        </div>
      )}

      {map && position && (
        <>
          {heading !== null && (
            <MapMarker map={map} lngLat={[position.lng, position.lat]} rotation={heading}
              options={{ rotationAlignment: 'map', pitchAlignment: 'map' }}>
              <HeadingCone color="#ffd700" size={140} />
            </MapMarker>
          )}
          <MapMarker map={map} lngLat={[position.lng, position.lat]} options={{ anchor: 'bottom' }}>
            <div className="flex flex-col items-center" style={{ pointerEvents: 'none' }}>
              {/* What others see over my head until I verify */}
              {me.verified === false && <div style={{ marginBottom: 2 }}><UnverifiedTag verified={false} size="xs"/></div>}
              <div style={{
                lineHeight: 0,
                filter: 'drop-shadow(1px 0 0 #ffd700) drop-shadow(-1px 0 0 #ffd700) drop-shadow(0 1px 0 #ffd700) drop-shadow(0 -1px 0 #ffd700) drop-shadow(0 0 4px rgba(255,215,0,0.6))',
              }}>
                <CharacterSprite size="md" animate {...me.appearance} equipped={me.equipment} />
              </div>
            </div>
          </MapMarker>
        </>
      )}

      {map && others.map((p) => {
        // Face the sprite left when the player is heading toward the left of my screen.
        const rel = p.heading === null ? 0 : (p.heading - myBearing + 360) % 360
        return (
          <OtherPlayer key={p.id} map={map} player={p} me={me} flip={rel > 180} onSelect={onSelect} />
        )
      })}
    </div>
  )
}

function OtherPlayer({ map, player, me, flip, onSelect }: {
  map: MapLibre
  player: RemotePlayer
  me: Player
  flip: boolean
  onSelect: (p: RemotePlayer) => void
}) {
  const lngLat: [number, number] = [player.lng, player.lat]
  return (
    <>
      {player.heading !== null && (
        <MapMarker map={map} lngLat={lngLat} rotation={player.heading}
          options={{ rotationAlignment: 'map', pitchAlignment: 'map' }}>
          <HeadingCone color={player.shirt} size={100} />
        </MapMarker>
      )}
      <MapMarker map={map} lngLat={lngLat} options={{ anchor: 'bottom' }}>
        <button
          data-player-id={player.id}
          className="flex flex-col items-center active:scale-90"
          style={{ transition: 'transform 0.15s', transformOrigin: 'bottom center' }}
          onClick={() => onSelect(player)}
        >
          {player.verified === false && <div style={{ marginBottom: 2 }}><UnverifiedTag verified={false} size="xs"/></div>}
          <div
            className="font-game font-black px-2 py-0.5 rounded-full shadow text-[11px] whitespace-nowrap"
            style={{ background: player.shirt, color: '#fff', border: '1.5px solid rgba(255,255,255,0.6)', marginBottom: -10, position: 'relative', zIndex: 1 }}
          >
            {player.name}
          </div>
          <div style={{ lineHeight: 0 }}>
            <CharacterSprite size="md" flip={flip} eye={me.appearance.eye} {...skinColors(player.skin)} shirt={player.shirt} equipped={player.equipped} />
          </div>
        </button>
      </MapMarker>
    </>
  )
}
