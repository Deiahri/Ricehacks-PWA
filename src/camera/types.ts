/** Normalized to the un-mirrored camera image: x, y in 0..1, z relative depth. */
export type Landmark = { x: number; y: number; z: number; visibility: number };

/** Metres, hip-centred (BlazePose world coordinates). */
export type WorldLandmark = { x: number; y: number; z: number };

/** Same shape as the native PoseCameraView's onPose event, so the app logic ports 1:1. */
export type PoseEventPayload = {
  /** 33 BlazePose landmarks, or empty when no person was detected in the frame. */
  landmarks: Landmark[];
  worldLandmarks: WorldLandmark[];
  imageWidth: number;
  imageHeight: number;
  /** Time spent in detectForVideo for this frame. */
  inferenceMs: number;
  /** Always 0 on web: the video element is handed to MediaPipe directly. */
  preprocessMs: number;
  timestampMs: number;
  /** True when the preview is mirrored (front camera): flip x to draw over it. */
  mirrored: boolean;
  delegate: 'GPU' | 'CPU';
  model: 'lite' | 'full';
};
