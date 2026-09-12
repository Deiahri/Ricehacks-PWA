/**
 * Web counterpart of the native PoseCameraView: camera stream -> <video> -> MediaPipe
 * detectForVideo, emitting the same PoseEventPayload per frame.
 *
 * One frame in flight (detectForVideo is synchronous), paced by requestVideoFrameCallback
 * with a requestAnimationFrame fallback. Timestamps are strictly increasing, as MediaPipe's
 * VIDEO mode requires.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

import { getLandmarker, markGpuBroken, type Model } from './landmarker';
import { getCameraStream, setCameraActive, type Facing } from './stream';
import type { PoseEventPayload } from './types';

export type CameraPhase = 'camera' | 'model' | 'running';

type Options = {
  model: Model;
  facing: Facing;
  onPose: (p: PoseEventPayload) => void;
  onError: (e: unknown) => void;
};

export function usePoseCamera(videoRef: RefObject<HTMLVideoElement | null>, opts: Options): CameraPhase {
  const { model, facing } = opts;
  const callbacks = useRef(opts);
  callbacks.current = opts;
  const [phase, setPhase] = useState<CameraPhase>('camera');
  const [visible, setVisible] = useState(document.visibilityState === 'visible');

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Pause the shared stream when leaving the camera screen (it's kept to avoid re-prompts).
  useEffect(() => () => setCameraActive(false), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !visible) return;
    let cancelled = false;
    let handle = 0;
    let usingVideoFrameCallback = false;

    const schedule = (fn: () => void) => {
      if ('requestVideoFrameCallback' in video) {
        usingVideoFrameCallback = true;
        handle = video.requestVideoFrameCallback(fn);
      } else {
        handle = requestAnimationFrame(fn);
      }
    };

    (async () => {
      try {
        setPhase('camera');
        const stream = await getCameraStream(facing);
        if (cancelled) return;
        setCameraActive(true);
        if (video.srcObject !== stream) video.srcObject = stream;
        video.muted = true;
        await video.play();
        if (cancelled) return;

        setPhase('model');
        let lm = await getLandmarker(model);
        if (cancelled) return;
        setPhase('running');

        let lastTs = 0;
        let lastVideoTime = -1;
        const tick = () => {
          if (cancelled) return;
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const ts = Math.max(performance.now(), lastTs + 1);
            lastTs = ts;
            const t0 = performance.now();
            let result;
            try {
              result = lm.landmarker.detectForVideo(video, ts);
            } catch (e) {
              if (lm.delegate !== 'GPU') {
                callbacks.current.onError(e);
                return;
              }
              markGpuBroken();
              getLandmarker(model).then(
                (next) => {
                  if (cancelled) return;
                  lm = next;
                  schedule(tick);
                },
                (err) => !cancelled && callbacks.current.onError(err),
              );
              return;
            }
            const inferenceMs = performance.now() - t0;
            const landmarks = result.landmarks[0] ?? [];
            const world = result.worldLandmarks[0] ?? [];
            callbacks.current.onPose({
              landmarks: landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 })),
              worldLandmarks: world.map((p) => ({ x: p.x, y: p.y, z: p.z })),
              imageWidth: video.videoWidth,
              imageHeight: video.videoHeight,
              inferenceMs,
              preprocessMs: 0,
              timestampMs: ts,
              mirrored: facing === 'front',
              delegate: lm.delegate,
              model,
            });
          }
          schedule(tick);
        };
        schedule(tick);
      } catch (e) {
        if (!cancelled) callbacks.current.onError(e);
      }
    })();

    return () => {
      cancelled = true;
      if (usingVideoFrameCallback) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, [videoRef, model, facing, visible]);

  return phase;
}
