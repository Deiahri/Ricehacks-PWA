import { useCallback, useEffect, useRef, useState } from 'react'
import { isStandalone, storage } from '../platform'

export interface GeoFix {
  lat: number
  lng: number
  acc: number
}

export type LocationStatus = 'idle' | 'requesting' | 'active' | 'error'
/** 'prompt' = iOS, compass permission not asked yet. 'unsupported' = no permission needed (or no compass). */
export type CompassState = 'unsupported' | 'prompt' | 'granted' | 'denied'

type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number }
type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

const orientationCtor = () => window.DeviceOrientationEvent as OrientationCtor | undefined

/** Smallest absolute difference between two compass angles, in degrees (0–180). */
export const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

function geoErrorMessage(e: GeolocationPositionError): string {
  switch (e.code) {
    case e.PERMISSION_DENIED:
      return isStandalone()
        ? 'Location access is off. Open Settings → Privacy & Security → Location Services → Safari Websites → While Using the App, then reopen the app.'
        : 'Location access was denied. In Safari tap aA → Website Settings → Location → Allow, then try again.'
    case e.POSITION_UNAVAILABLE:
      return "Couldn't get a location fix. Check that Location Services are on, then try again."
    default:
      return "Couldn't get a location fix in time. Try again."
  }
}

/** Set after the first fix, so a relaunch can resume where the Permissions API is missing or misreports (iOS PWAs). */
const GEO_OK_KEY = 'geo-granted'

/**
 * GPS position + compass heading (degrees clockwise from north).
 * `enable()` and `enableCompass()` must each be called from their own tap: iOS ties each permission prompt to a
 * user gesture, and a home-screen app silently drops the Location prompt if it comes after the compass one.
 * Once Location has been granted, the watch resumes by itself on mount (no gesture needed); `resuming` is true
 * while that silent resume waits for its first fix.
 */
export function useLiveLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const [position, setPosition] = useState<GeoFix | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [compass, setCompass] = useState<CompassState>(() => (orientationCtor()?.requestPermission ? 'prompt' : 'unsupported'))
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopRef.current?.(), [])

  const enable = useCallback((auto = false) => {
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
    setResuming(auto)

    let gotFix = false
    let lastHeading: number | null = null
    let hasCompass = false
    // Deviceorientation fires ~60×/s; only re-render on a visible change.
    const pushHeading = (h: number) => {
      const r = Math.round(h) % 360
      if (lastHeading !== null && angleDiff(r, lastHeading) < 2) return
      lastHeading = r
      setHeading(r)
    }

    // On iOS these only fire once enableCompass() is granted; elsewhere they fire right away.
    const onOrientation = (e: Event) => {
      const ev = e as CompassEvent
      let h: number | null = null
      if (typeof ev.webkitCompassHeading === 'number' && ev.webkitCompassHeading >= 0) h = ev.webkitCompassHeading // iOS
      else if ((e.type === 'deviceorientationabsolute' || ev.absolute) && ev.alpha !== null) h = 360 - ev.alpha // Android / Chrome
      if (h === null) return
      hasCompass = true
      pushHeading((h + (screen.orientation?.angle ?? 0) + 360) % 360)
    }

    // No await before this: the Location prompt must be requested inside the tap.
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        if (!gotFix) storage.set(GEO_OK_KEY, '1')
        gotFix = true
        setStatus('active')
        setError(null)
        setResuming(false)
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy })
        const h = p.coords.heading
        if (!hasCompass && h !== null && !Number.isNaN(h) && (p.coords.speed ?? 0) > 0.5) pushHeading(h)
      },
      (err) => {
        // Once we have a fix, the watch keeps retrying through timeouts. Before that, stop so the button works again.
        if (gotFix && err.code !== err.PERMISSION_DENIED) return
        if (err.code === err.PERMISSION_DENIED) storage.remove(GEO_OK_KEY)
        setResuming(false)
        setStatus('error')
        setError(geoErrorMessage(err))
        stopRef.current?.()
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)

    stopRef.current = () => {
      navigator.geolocation.clearWatch(watchId)
      window.removeEventListener('deviceorientationabsolute', onOrientation)
      window.removeEventListener('deviceorientation', onOrientation)
      stopRef.current = null
    }
  }, [])

  // Already granted? Resume the watch without waiting for a tap (watchPosition only needs a gesture to prompt).
  useEffect(() => {
    let cancelled = false
    let perm: PermissionStatus | null = null
    const onChange = () => {
      if (perm?.state === 'granted') enable(true)
    }
    const fromStorage = () => {
      if (!cancelled && storage.get(GEO_OK_KEY) === '1') enable(true)
    }
    if (!navigator.permissions?.query) {
      fromStorage()
      return () => { cancelled = true }
    }
    navigator.permissions.query({ name: 'geolocation' }).then(
      (p) => {
        if (cancelled) return
        perm = p
        p.addEventListener('change', onChange)
        if (p.state === 'granted') enable(true)
        else if (p.state === 'prompt') fromStorage() // iOS home-screen apps can report 'prompt' after a grant
      },
      fromStorage,
    )
    return () => {
      cancelled = true
      perm?.removeEventListener('change', onChange)
    }
  }, [enable])

  const enableCompass = useCallback(async () => {
    const Ctor = orientationCtor()
    if (!Ctor?.requestPermission) return
    try {
      setCompass((await Ctor.requestPermission()) === 'granted' ? 'granted' : 'denied')
    } catch {
      setCompass('denied') // GPS heading still works while walking.
    }
  }, [])

  return { status, error, resuming, position, heading, compass, enable, enableCompass }
}
