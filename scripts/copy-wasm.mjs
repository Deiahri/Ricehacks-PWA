// Self-host the MediaPipe wasm runtime (no CDN at runtime, so the PWA works offline).
import { cpSync, mkdirSync } from 'node:fs';

const src = new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url);
const dest = new URL('../public/wasm/', import.meta.url);
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('copied MediaPipe wasm -> public/wasm/');
