/**
 * MediaPipe PoseLandmarker, loaded once and shared. Wasm + models are self-hosted under the
 * app's base path so the service worker can cache them for offline use.
 *
 * GPU first, CPU fallback (at creation and, via markGpuBroken, at runtime): the GPU delegate
 * has had bugs in iOS Safari. `?delegate=cpu` in the URL forces CPU for testing.
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export type Model = 'full' | 'lite';
export type Delegate = 'GPU' | 'CPU';
export type Loaded = { model: Model; landmarker: PoseLandmarker; delegate: Delegate };

const asset = (path: string) => new URL(path, document.baseURI).href;
const forcedCpu = new URLSearchParams(location.search).get('delegate')?.toLowerCase() === 'cpu';

let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
let loaded: { model: Model; promise: Promise<Loaded> } | null = null;
let gpuBroken = false;

async function create(model: Model, delegate: Delegate): Promise<PoseLandmarker> {
  fileset ??= FilesetResolver.forVisionTasks(asset('./wasm'));
  return PoseLandmarker.createFromOptions(await fileset, {
    baseOptions: { modelAssetPath: asset(`./models/pose_landmarker_${model}.task`), delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

async function load(model: Model): Promise<Loaded> {
  if (forcedCpu || gpuBroken) return { model, landmarker: await create(model, 'CPU'), delegate: 'CPU' };
  try {
    return { model, landmarker: await create(model, 'GPU'), delegate: 'GPU' };
  } catch (e) {
    console.warn('PoseLandmarker GPU init failed, falling back to CPU', e);
    gpuBroken = true;
    return { model, landmarker: await create(model, 'CPU'), delegate: 'CPU' };
  }
}

/**
 * The first visit downloads the wasm + model before the service worker takes control, so they
 * miss its runtime cache. Re-fetch them through the worker once it controls the page, so the next
 * launch works offline. This is normally served from the HTTP cache, so there's no second download.
 */
function warmOfflineCache(model: Model): void {
  if (!('serviceWorker' in navigator)) return;
  const paths = ['./wasm/vision_wasm_internal.js', './wasm/vision_wasm_internal.wasm', `./models/pose_landmarker_${model}.task`];
  const warm = () => paths.forEach((p) => fetch(asset(p)).catch(() => {}));
  navigator.serviceWorker.ready.then(() => {
    if (navigator.serviceWorker.controller) warm();
    else navigator.serviceWorker.addEventListener('controllerchange', warm, { once: true });
  });
}

export function getLandmarker(model: Model): Promise<Loaded> {
  if (loaded?.model === model) return loaded.promise;
  const prev = loaded?.promise;
  const promise = (async () => {
    (await prev?.catch(() => null))?.landmarker.close();
    const result = await load(model);
    warmOfflineCache(model);
    return result;
  })();
  loaded = { model, promise };
  promise.catch(() => {
    if (loaded?.promise === promise) loaded = null;
  });
  return promise;
}

/** A GPU error surfaced mid-session: drop the GPU landmarker so the next getLandmarker builds a CPU one. */
export function markGpuBroken(): void {
  console.warn('PoseLandmarker GPU error at runtime, switching to CPU');
  gpuBroken = true;
  const prev = loaded;
  loaded = null;
  prev?.promise.then((l) => l.landmarker.close(), () => {});
}
