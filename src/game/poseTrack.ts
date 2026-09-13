import type { PoseEventPayload } from '../camera/types'
import { SKELETON, VIS_THRESHOLD } from '../logic/pose'

/**
 * Pose tracks: a compact recording of a set for the replay screen. Frames sit on a fixed grid (10 fps, or 5 fps for
 * sets over a minute). Each frame is the TRACK_JOINTS as (x, y) bytes across the camera image: 0-254, 255 = not seen.
 * A 5-minute set is ~39 KB (~52 KB as base64). The server checks the same shape (trackFrom in server.mjs).
 */

/** The nose (for the head) plus every joint the skeleton draws (BlazePose ids). */
export const TRACK_JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] as const
/** SKELETON, as indices into TRACK_JOINTS. */
export const TRACK_BONES: [number, number][] = SKELETON.map(([a, b]) => [
  TRACK_JOINTS.indexOf(a as (typeof TRACK_JOINTS)[number]),
  TRACK_JOINTS.indexOf(b as (typeof TRACK_JOINTS)[number]),
])
const STRIDE = TRACK_JOINTS.length * 2
const UNSEEN = 255

export const trackFps = (durationS: number) => (durationS <= 60 ? 10 : 5)

/** What the app sends and the server stores. */
export interface PoseTrack {
  v: 1
  fps: number
  joints: number
  /** Camera image width / height. */
  aspect: number
  /** Front camera: drawn flipped, like the live view. */
  mirrored: boolean
  /** base64 of frames × joints × (x, y) bytes. */
  frames: string
}

type Frame = Pick<PoseEventPayload, 'landmarks' | 'imageWidth' | 'imageHeight' | 'timestampMs' | 'mirrored'>

const quantize = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 254)

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Records camera frames between startMs and endMs (performance.now() ms) onto the fixed grid. */
export class PoseTrackRecorder {
  private readonly buf: Uint8Array
  private readonly max: number
  private n = 0
  private next: number
  private aspect = 0
  private mirrored = false

  constructor(private readonly startMs: number, endMs: number, readonly fps: number) {
    this.max = Math.max(0, Math.ceil(((endMs - startMs) / 1000) * fps))
    this.buf = new Uint8Array(this.max * STRIDE)
    this.next = startMs
  }

  get frames() {
    return this.n
  }

  push(p: Frame) {
    if (p.timestampMs < this.startMs || this.n >= this.max) return
    if (!this.aspect && p.imageWidth && p.imageHeight) {
      this.aspect = p.imageWidth / p.imageHeight
      this.mirrored = p.mirrored
    }
    // Fill every grid slot up to this frame (a stalled camera repeats its last pose).
    while (this.next <= p.timestampMs && this.n < this.max) {
      const o = this.n * STRIDE
      TRACK_JOINTS.forEach((j, k) => {
        const lm = p.landmarks[j]
        const seen = lm !== undefined && lm.visibility >= VIS_THRESHOLD
        this.buf[o + 2 * k] = seen ? quantize(lm.x) : UNSEEN
        this.buf[o + 2 * k + 1] = seen ? quantize(lm.y) : UNSEEN
      })
      this.n++
      this.next += 1000 / this.fps
    }
  }

  /** The recording so far, or null if nothing was captured. */
  encode(): PoseTrack | null {
    if (!this.n || !this.aspect) return null
    return {
      v: 1, fps: this.fps, joints: TRACK_JOINTS.length, aspect: Math.round(this.aspect * 1000) / 1000,
      mirrored: this.mirrored, frames: toBase64(this.buf.subarray(0, this.n * STRIDE)),
    }
  }
}

/** A point in display units: x across the image (flipped if mirrored) scaled by the aspect ratio, y down, image height = 1. */
export type Pt = readonly [number, number]
export interface Bounds { x: number; y: number; w: number; h: number }
export interface DecodedTrack { buf: Uint8Array; fps: number; aspect: number; mirrored: boolean }

export function decodeTrack(t: PoseTrack): DecodedTrack {
  const bin = atob(t.frames)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return { buf, fps: t.fps, aspect: t.aspect, mirrored: t.mirrored }
}

export const frameCount = (t: DecodedTrack) => Math.floor(t.buf.length / STRIDE)

function point(t: DecodedTrack, frame: number, joint: number): Pt | null {
  const o = frame * STRIDE + 2 * joint
  const qx = t.buf[o], qy = t.buf[o + 1]
  if (qx === UNSEEN || qy === UNSEEN) return null
  const x = qx / 254
  return [(t.mirrored ? 1 - x : x) * t.aspect, qy / 254]
}

/** The pose `sec` seconds into the track, blended between neighbouring frames. One entry per TRACK_JOINTS. */
export function poseAt(t: DecodedTrack, sec: number): (Pt | null)[] {
  const n = frameCount(t)
  if (!n) return []
  const f = Math.min(n - 1, Math.max(0, sec * t.fps))
  const i = Math.floor(f), j = Math.min(n - 1, i + 1), frac = f - i
  return TRACK_JOINTS.map((_, k) => {
    const a = point(t, i, k), b = point(t, j, k)
    if (!a) return frac > 0.5 ? b : null
    if (!b) return frac > 0.5 ? null : a
    return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac] as const
  })
}

/** A box around every seen joint in the whole track (padded), so the replay fills its frame. */
export function trackBounds(t: DecodedTrack): Bounds | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let f = 0; f < frameCount(t); f++) {
    for (let k = 0; k < TRACK_JOINTS.length; k++) {
      const p = point(t, f, k)
      if (!p) continue
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0])
      y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1])
    }
  }
  if (x0 === Infinity) return null
  const pad = Math.max(x1 - x0, y1 - y0, 0.2) * 0.15
  const w = Math.max(x1 - x0, 0.2) + 2 * pad, h = Math.max(y1 - y0, 0.2) + 2 * pad
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }
}
