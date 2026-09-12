import { useCallback, useEffect, useRef, useState } from 'react';

import { getLandmarker, type Model } from './camera/landmarker';
import { getCameraStream, type Facing } from './camera/stream';
import type { Landmark, PoseEventPayload } from './camera/types';
import { usePoseCamera } from './camera/usePoseCamera';
import { EXERCISES, type ExerciseName, type RepResult } from './logic/exercises';
import { SKELETON, VIS_THRESHOLD, poseFromLandmarks } from './logic/pose';
import { cameraErrorMessage, isIOS, isStandalone, storage, useElementSize, useWakeLock } from './platform';

type Settings = { exercise: ExerciseName; model: Model; facing: Facing };

type SessionSummary = {
  exercise: ExerciseName;
  model: string;
  delegate: string;
  cameraFacing: Facing;
  standalone: boolean;
  userAgent: string;
  repsCounted: number;
  partialReps: number;
  avgScore: number;
  subscoreKeys: string[];
  reps: RepResult[];
  stats: {
    frames: number;
    seconds: number;
    avgFps: number;
    avgInferenceMs: number;
    avgPreprocessMs: number;
    poseDetectedPct: number;
  };
};

const PLACEMENT: Record<ExerciseName, string> = {
  squat: 'Prop the phone up, stand side-on (or at 45°), whole body in frame.',
  pushup: 'Phone at floor height, side-on, head to ankles in frame.',
};

const scoreColor = (s: number) => (s >= 80 ? '#3ddc84' : s >= 60 ? '#ffc53d' : '#ff5c5c');
const round1 = (x: number) => Math.round(x * 10) / 10;

export default function App() {
  const [settings, setSettings] = useState<Settings>({ exercise: 'squat', model: 'full', facing: 'front' });
  const [screen, setScreen] = useState<'home' | 'camera' | 'summary'>('home');
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState('');
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [starting, setStarting] = useState(false);

  // Start downloading the model while the user is still on the home screen.
  useEffect(() => {
    getLandmarker(settings.model).catch(() => {});
  }, [settings.model]);

  // Screens are plain React state: no router, no URL/hash changes (those re-prompt for the camera on iOS).
  const start = async (exercise: ExerciseName) => {
    setError('');
    setStarting(true);
    try {
      await getCameraStream(settings.facing);
    } catch (e) {
      setError(cameraErrorMessage(e));
      setCameraBlocked(isStandalone());
      return;
    } finally {
      setStarting(false);
    }
    setCameraBlocked(false);
    setSettings((s) => ({ ...s, exercise }));
    setScreen('camera');
  };

  if (screen === 'camera') {
    return (
      <CameraScreen
        settings={settings}
        onEnd={(s) => {
          setSummary(s);
          setSettings((prev) => ({ ...prev, facing: s.cameraFacing }));
          setScreen('summary');
        }}
      />
    );
  }
  if (screen === 'summary' && summary) {
    return <SummaryScreen summary={summary} onAgain={() => setScreen('camera')} onHome={() => setScreen('home')} />;
  }
  return (
    <HomeScreen
      settings={settings}
      onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
      onStart={start}
      starting={starting}
      error={error}
      cameraBlocked={cameraBlocked}
    />
  );
}

// --- Home ---------------------------------------------------------------------

function HomeScreen(props: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onStart: (exercise: ExerciseName) => void;
  starting: boolean;
  error: string;
  cameraBlocked: boolean;
}) {
  const { settings, onChange, onStart, starting, error, cameraBlocked } = props;
  return (
    <main className="page home">
      <InstallHint />
      <h1 className="title">CV Exercise</h1>
      <p className="subtitle">Pick an exercise. Reps are counted and each rep gets a form score. Video never leaves the phone.</p>

      {(['squat', 'pushup'] as ExerciseName[]).map((name) => (
        <button key={name} className="card" disabled={starting} onClick={() => onStart(name)}>
          <span className="card-title">{name === 'squat' ? 'Squat' : 'Push-up'}</span>
          <span className="card-hint">{PLACEMENT[name]}</span>
        </button>
      ))}

      <Segmented
        label="Model"
        options={[['full', 'Full (accurate)'], ['lite', 'Lite (fast)']]}
        value={settings.model}
        onChange={(model) => onChange({ model: model as Model })}
      />
      <Segmented
        label="Camera"
        options={[['front', 'Front'], ['back', 'Back']]}
        value={settings.facing}
        onChange={(facing) => onChange({ facing: facing as Facing })}
      />
      {starting ? <p className="muted">Starting camera…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {cameraBlocked ? <OpenInSafariCard /> : null}
    </main>
  );
}

function Segmented(props: { label: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="segment-row">
      <span className="segment-label">{props.label}</span>
      <div className="segment" role="radiogroup" aria-label={props.label}>
        {props.options.map(([value, text]) => (
          <button
            key={value}
            role="radio"
            aria-checked={props.value === value}
            className={props.value === value ? 'segment-item active' : 'segment-item'}
            onClick={() => props.onChange(value)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** iOS has no install prompt API, so tell Safari users how to add the app to the home screen. */
function InstallHint() {
  const [show, setShow] = useState(() => isIOS() && !isStandalone() && storage.get('installHintDismissed') !== '1');
  if (!show) return null;
  return (
    <div className="banner">
      <span>
        Install: tap <b>Share</b> then <b>Add to Home Screen</b>.
      </span>
      <button
        className="banner-close"
        aria-label="Dismiss"
        onClick={() => {
          storage.set('installHintDismissed', '1');
          setShow(false);
        }}
      >
        ×
      </button>
    </div>
  );
}

/** Fallback when iOS blocks the camera for the home-screen app: Safari mode works the same. */
function OpenInSafariCard() {
  const [copied, setCopied] = useState(false);
  const url = location.origin + location.pathname;
  return (
    <div className="card warn">
      <span className="card-title">Camera blocked in home-screen mode</span>
      <span className="card-hint">
        iOS sometimes blocks the camera for home-screen apps. Open the same page in Safari, where everything works the same way.
      </span>
      <div className="row">
        <a className="button outline" href={url} target="_blank" rel="noreferrer">
          Open in Safari
        </a>
        <button
          className="button outline"
          onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

// --- Camera -------------------------------------------------------------------

type Frame = {
  landmarks: Landmark[];
  imageWidth: number;
  imageHeight: number;
  mirrored: boolean;
};

function CameraScreen({ settings, onEnd }: { settings: Settings; onEnd: (s: SessionSummary) => void }) {
  useWakeLock();
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(boxRef);
  const [facing, setFacing] = useState<Facing>(settings.facing);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [perf, setPerf] = useState({ fps: 0, inferenceMs: 0, delegate: '', model: settings.model as string });
  const [error, setError] = useState('');
  const [, setTick] = useState(0);

  const exRef = useRef(EXERCISES[settings.exercise]());
  const stats = useRef({ frames: 0, detected: 0, inferSum: 0, preSum: 0, fps: 0, last: 0, begin: 0 });
  const ex = exRef.current;

  const onPose = useCallback((p: PoseEventPayload) => {
    const s = stats.current;
    const now = performance.now();
    if (s.begin === 0) s.begin = now;
    if (s.last) {
      const dt = (now - s.last) / 1000;
      if (dt > 0) s.fps = s.fps === 0 ? 1 / dt : 0.9 * s.fps + 0.1 / dt;
    }
    s.last = now;
    s.frames += 1;
    s.detected += p.landmarks.length ? 1 : 0;
    s.inferSum += p.inferenceMs;
    s.preSum += p.preprocessMs;

    const pose = poseFromLandmarks(p.landmarks, p.imageWidth, p.imageHeight);
    const rep = exRef.current.update(pose, p.timestampMs / 1000);
    if (rep) console.log(`Rep ${rep.number}: ${rep.score}%  ${rep.cues.join(', ')}`);

    setFrame({ landmarks: p.landmarks, imageWidth: p.imageWidth, imageHeight: p.imageHeight, mirrored: p.mirrored });
    setPerf({ fps: s.fps, inferenceMs: p.inferenceMs, delegate: p.delegate, model: p.model });
  }, []);

  const onError = useCallback((e: unknown) => {
    console.error(e);
    setError(cameraErrorMessage(e));
  }, []);

  const phase = usePoseCamera(videoRef, { model: settings.model, facing, onPose, onError });

  const end = () => {
    const s = stats.current;
    const e = exRef.current;
    const seconds = s.begin ? (performance.now() - s.begin) / 1000 : 0;
    const summary: SessionSummary = {
      exercise: settings.exercise,
      model: perf.model,
      delegate: perf.delegate,
      cameraFacing: facing,
      standalone: isStandalone(),
      userAgent: navigator.userAgent,
      repsCounted: e.reps.length,
      partialReps: e.partialReps,
      avgScore: round1(e.avgScore),
      subscoreKeys: Object.keys(e.weights),
      reps: e.reps,
      stats: {
        frames: s.frames,
        seconds: round1(seconds),
        avgFps: seconds ? round1(s.frames / seconds) : 0,
        avgInferenceMs: round1(s.inferSum / Math.max(s.frames, 1)),
        avgPreprocessMs: round1(s.preSum / Math.max(s.frames, 1)),
        poseDetectedPct: round1((100 * s.detected) / Math.max(s.frames, 1)),
      },
    };
    console.log(`SESSION_SUMMARY ${JSON.stringify(summary)}`);
    onEnd(summary);
  };

  const reset = () => {
    exRef.current = EXERCISES[settings.exercise]();
    stats.current = { frames: 0, detected: 0, inferSum: 0, preSum: 0, fps: 0, last: 0, begin: 0 };
    setTick((t) => t + 1);
  };

  const last = ex.reps.at(-1);
  const loading = phase === 'camera' ? 'Starting camera…' : phase === 'model' ? 'Loading pose model… (first run downloads ~15 MB)' : '';

  return (
    <div className="camera" ref={boxRef}>
      <video ref={videoRef} className={facing === 'front' ? 'video mirrored' : 'video'} playsInline muted autoPlay />
      {frame && size.width > 0 ? <SkeletonOverlay frame={frame} width={size.width} height={size.height} /> : null}

      <div className="hud">
        <div className="hud-title">
          {ex.label.toUpperCase()} <span className="hud-big">{ex.reps.length}</span> reps
          <span className="hud-dim"> (partial {ex.partialReps})</span>
        </div>
        <div className="hud-text">
          angle {ex.angle !== null ? `${Math.round(ex.angle)}°` : '–'} · {ex.state}
        </div>
        {last ? (
          <div className="hud-text">
            last <b style={{ color: scoreColor(last.score) }}>{Math.round(last.score)}%</b>
            {'   '}avg <b style={{ color: scoreColor(ex.avgScore) }}>{Math.round(ex.avgScore)}%</b>
          </div>
        ) : null}
        {last ? <div className="cue">{last.cues.join('  ·  ')}</div> : null}
        {ex.notice ? <div className="notice">{ex.notice}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </div>

      {loading && !error ? <div className="loading">{loading}</div> : null}

      <div className="bottom">
        {ex.status && phase === 'running' ? <div className="status">{ex.status}</div> : null}
        <div className="perf">
          {perf.fps.toFixed(0)} FPS · {perf.inferenceMs.toFixed(0)} ms · {perf.model}
          {perf.delegate ? `/${perf.delegate}` : ''}
        </div>
        <div className="row">
          <button className="button" onClick={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}>
            Flip
          </button>
          <button className="button" onClick={reset}>
            Reset
          </button>
          <button className="button primary" onClick={end}>
            End session
          </button>
        </div>
      </div>
    </div>
  );
}

/** Landmarks are normalized to the camera image; the video fills the view with object-fit: cover. */
function SkeletonOverlay({ frame, width, height }: { frame: Frame; width: number; height: number }) {
  const { landmarks, imageWidth: w, imageHeight: h, mirrored } = frame;
  if (landmarks.length === 0 || !w || !h) return null;
  const scale = Math.max(width / w, height / h);
  const dx = (width - w * scale) / 2;
  const dy = (height - h * scale) / 2;
  const pt = (i: number) => {
    const x = landmarks[i].x * w * scale + dx;
    return { x: mirrored ? width - x : x, y: landmarks[i].y * h * scale + dy };
  };
  const visible = (i: number) => landmarks[i].visibility >= VIS_THRESHOLD;
  const joints = [...new Set(SKELETON.flat())];

  return (
    <svg className="overlay" width={width} height={height}>
      {SKELETON.filter(([a, b]) => visible(a) && visible(b)).map(([a, b]) => {
        const p = pt(a), q = pt(b);
        return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="white" strokeWidth={4} strokeLinecap="round" />;
      })}
      {joints.map((i) => {
        const p = pt(i);
        return <circle key={i} cx={p.x} cy={p.y} r={6} fill={visible(i) ? '#3ddc84' : '#ff5c5c'} />;
      })}
    </svg>
  );
}

// --- Summary ------------------------------------------------------------------

function SummaryScreen({ summary, onAgain, onHome }: { summary: SessionSummary; onAgain: () => void; onHome: () => void }) {
  const { stats, subscoreKeys: keys } = summary;
  const label = summary.exercise === 'squat' ? 'Squat' : 'Push-up';
  const json = JSON.stringify(summary);
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');
  const copy = () => navigator.clipboard.writeText(json).then(() => setCopied('ok'), () => setCopied('fail'));

  return (
    <main className="page summary">
      <h1 className="title">{label} session</h1>
      <div className="stat-row">
        <Stat label="Reps" value={String(summary.repsCounted)} />
        <Stat label="Partial" value={String(summary.partialReps)} />
        <Stat
          label="Avg form"
          value={summary.reps.length ? `${Math.round(summary.avgScore)}%` : '–'}
          color={summary.reps.length ? scoreColor(summary.avgScore) : undefined}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {['#', 'score', ...keys, 'secs', 'cues'].map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.reps.map((r) => (
              <tr key={r.number}>
                <td>{r.number}</td>
                <td style={{ color: scoreColor(r.score), fontWeight: 700 }}>{r.score.toFixed(0)}%</td>
                {keys.map((k) => (
                  <td key={k}>{k in r.subscores ? r.subscores[k].toFixed(0) : '–'}</td>
                ))}
                <td>{r.durationS.toFixed(1)}</td>
                <td className="wide">{r.cues.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.reps.length === 0 ? <p className="empty">No reps counted.</p> : null}
      </div>

      <p className="perf-summary">
        {stats.avgFps} FPS avg · {stats.avgInferenceMs} ms inference
        <br />
        pose found in {stats.poseDetectedPct}% of {stats.frames} frames · {stats.seconds}s
        <br />
        model {summary.model} / {summary.delegate} · {summary.cameraFacing} camera · {summary.standalone ? 'home-screen app' : 'browser'}
      </p>

      <div className="row">
        <button className="button primary dark" onClick={onAgain}>
          Go again
        </button>
        <button className="button outline" onClick={onHome}>
          Change exercise
        </button>
      </div>

      <details className="json">
        <summary>Session data (JSON)</summary>
        <button className="button outline small" onClick={copy}>
          {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed: select the text below' : 'Copy JSON'}
        </button>
        <pre>{json}</pre>
      </details>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat">
      <span className="stat-value" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
