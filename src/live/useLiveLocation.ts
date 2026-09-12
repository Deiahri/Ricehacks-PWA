import { useCallback, useEffect, useRef, useState } from 'react'

export interface GeoFix {
  lat: number
  lng: number
  acc: number
}

export type LocationStatus = 'idle' | 'requesting' | 'active' | 'error'

type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

/** Smallest absolute difference between two compass angles, in degrees (0–180). */
export const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

function geoErrorMessage(e: GeolocationPositionError): string {
  switch (e.code) {
    case e.PERMISSION_DENIED:
      return 'Location access was denied. In Safari tap aA → Website Settings → Location → Allow, then try again.'
    case e.POSITION_UNAVAILABLE:
      return "Couldn't get a location fix. Check that Location Services are on."
    default:
      return 'Getting your location is taking a while…'
  }
}

/**
 * GPS position + compass heading (degrees clockwise from north).
 * `enable()` must be called from a tap: iOS only grants compass access inside a user gesture.
 */
export function useLiveLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<GeoFix | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopRef.current?.(), [])

  const enable = useCallback(async () => {
    if (stopRef.current) return
    if (!window.isSecureContext) {
      setStatus('error')
      setError('Location needs a secure (https://) connection. Open the https link.')
      return
    }
    if (!('geolocation' in navigator)) {
      setStatus('error')
      setError('This browser has no location support.')
      return
    }
    setStatus('requesting')
    setError(null)

    // Keep this the first await: iOS forgets the tap gesture after unrelated awaits.
    const Ctor = window.DeviceOrientationEvent as OrientationCtor | undefined
    if (Ctor?.requestPermission) {
      try {
        await Ctor.requestPermission()
      } catch {
        // No compass then; GPS heading still works while walking.
      }
    }

    let lastHeading: number | null = null
    let hasCompass = false
    // Deviceorientation fires ~60×/s; only re-render on a visible change.
    const pushHeading = (h: number) => {
      const r = Math.round(h) % 360
      if (lastHeading !== null && angleDiff(r, lastHeading) < 2) return
      lastHeading = r
      setHeading(r)
    }

    const onOrientation = (e: Event) => {
      const ev = e as CompassEvent
      let h: number | null = null
      if (typeof ev.webkitCompassHeading === 'number' && ev.webkitCompassHeading >= 0) h = ev.webkitCompassHeading // iOS
      else if ((e.type === 'deviceorientationabsolute' || ev.absolute) && ev.alpha !== null) h = 360 - ev.alpha // Android / Chrome
      if (h === null) return
      hasCompass = true
      pushHeading((h + (screen.orientation?.angle ?? 0) + 360) % 360)
    }
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)

    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        setStatus('active')
        setError(null)
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy })
        const h = p.coords.heading
        if (!hasCompass && h !== null && !Number.isNaN(h) && (p.coords.speed ?? 0) > 0.5) pushHeading(h)
      },
      (err) => {
        setError(geoErrorMessage(err))
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('error')
          stopRef.current?.()
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )

    stopRef.current = () => {
      navigator.geolocation.clearWatch(watchId)
      window.removeEventListener('deviceorientationabsolute', onOrientation)
      window.removeEventListener('deviceorientation', onOrientation)
      stopRef.current = null
    }
  }, [])

  return { status, error, position, heading, enable }
}
