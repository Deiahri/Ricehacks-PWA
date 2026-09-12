/**
 * One camera stream per app launch, shared across screens.
 *
 * iOS doesn't persist camera permission for home-screen (standalone) web apps, so every
 * getUserMedia call can re-prompt. We acquire once and keep the stream across
 * Home -> Camera -> Summary -> Go again; only Flip swaps it. It is released when the page
 * is hidden (iOS interrupts capture in the background anyway) and re-acquired on return.
 */
export type Facing = 'front' | 'back';

let current: { stream: MediaStream; facing: Facing } | null = null;
let pending: { facing: Facing; promise: Promise<MediaStream> } | null = null;

const isLive = (s: MediaStream) => s.getVideoTracks().some((t) => t.readyState === 'live');

export function getCameraStream(facing: Facing): Promise<MediaStream> {
  if (current && current.facing === facing && isLive(current.stream)) return Promise.resolve(current.stream);
  if (pending?.facing === facing) return pending.promise;
  releaseCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('Camera API unavailable (the page must be served over HTTPS).');
    err.name = 'InsecureContextError';
    return Promise.reject(err);
  }
  const promise = navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: { facingMode: facing === 'front' ? 'user' : 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    })
    .then((stream) => {
      if (current && current.stream !== stream) releaseCamera();
      current = { stream, facing };
      return stream;
    })
    .finally(() => {
      if (pending?.promise === promise) pending = null;
    });
  pending = { facing, promise };
  return promise;
}

export function releaseCamera(): void {
  current?.stream.getTracks().forEach((t) => t.stop());
  current = null;
}

/** Pause/resume frames without giving up the permission (used when leaving the camera screen). */
export function setCameraActive(active: boolean): void {
  current?.stream.getVideoTracks().forEach((t) => (t.enabled = active));
}

addEventListener('pagehide', releaseCamera);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') releaseCamera();
});
