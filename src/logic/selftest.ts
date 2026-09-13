/**
 * Replays synthetic side-view poses through the rep/score engine (same scenarios as Findings §3a).
 *
 *     npm run test:logic            # run the checks
 *     npm run test:logic -- --dump  # print the frames as JSON (to cross-check against prototype/exercises.py)
 */
import { EXERCISES, Exercise, ExerciseName } from './exercises';
import { Pose, SIDES, Vec } from './pose';
import { avgForm, formatClock, repQuality, totalScore } from '../game/scoring';
import { ComboTracker, type ComboEvent } from '../game/combo';
import { DURATIONS } from '../game/types';
import { COSMETICS, wornItems } from '../config/cosmetics';
import { COACH } from '../config/coach';
import { freshMemory, nextCoachEvent, projectedReps, setDoneMessage, statsMessage, verdict, type SetSnapshot } from '../coach/triggers';

const FPS = 30;
const rad = (deg: number) => (deg * Math.PI) / 180;

function blankPose(): { pts: number[][]; vis: number[] } {
  return { pts: Array.from({ length: 33 }, () => [0, 0]), vis: Array(33).fill(1) };
}

/** Side view: shin vertical, thigh at `knee` degrees, torso leaning `lean` degrees from vertical. */
function squatPose(knee: number, lean: number): Pose {
  const { pts, vis } = blankPose();
  for (const s of [SIDES.left, SIDES.right]) {
    const kneeP = [300, 300];
    const hip = [kneeP[0] - 100 * Math.sin(rad(knee)), kneeP[1] + 100 * Math.cos(rad(knee))];
    pts[s.ankle] = [300, 400];
    pts[s.knee] = kneeP;
    pts[s.hip] = hip;
    pts[s.shoulder] = [hip[0] + 150 * Math.sin(rad(lean)), hip[1] - 150 * Math.cos(rad(lean))];
  }
  return new Pose(pts, pts, vis);
}

/** Side-view plank: forearm vertical, upper arm at `elbow` degrees, hip dropped `sag` px below the line. */
function pushupPose(elbow: number, sag: number): Pose {
  const { pts, vis } = blankPose();
  for (const s of [SIDES.left, SIDES.right]) {
    const elbowP = [200, 340];
    const sh = [elbowP[0] - 60 * Math.sin(rad(elbow)), elbowP[1] + 60 * Math.cos(rad(elbow))];
    pts[s.wrist] = [200, 400];
    pts[s.elbow] = elbowP;
    pts[s.shoulder] = sh;
    pts[s.hip] = [sh[0] + 150, sh[1] + sag];
    pts[s.knee] = [sh[0] + 225, sh[1] + sag / 2];
    pts[s.ankle] = [sh[0] + 300, sh[1]];
  }
  return new Pose(pts, pts, vis);
}

/** Primary-angle trajectory: rest at the top, ease down to `bottom`, hold, ease back up; `reps` times. */
function trajectory(bottom: number, reps: number, top = 175): number[] {
  const angles: number[] = Array(15).fill(top);
  for (let r = 0; r < reps; r++) {
    for (let i = 1; i <= 20; i++) angles.push(top + (bottom - top) * (1 - Math.cos((Math.PI * i) / 20)) / 2);
    for (let i = 0; i < 10; i++) angles.push(bottom);
    for (let i = 1; i <= 20; i++) angles.push(bottom + (top - bottom) * (1 - Math.cos((Math.PI * i) / 20)) / 2);
    for (let i = 0; i < 15; i++) angles.push(top);
  }
  return angles;
}

type Scenario = {
  name: string;
  exercise: ExerciseName;
  frames: (Pose | null)[];
  check: (ex: Exercise) => string | null; // null = pass, otherwise the failure reason
};

const squat = (bottom: number, reps: number, lean = 20) => trajectory(bottom, reps).map((a) => squatPose(a, lean));
const pushup = (bottom: number, reps: number, sag = 0) => trajectory(bottom, reps).map((a) => pushupPose(a, sag));

const expect = (cond: boolean, why: string) => (cond ? null : why);
const scores = (ex: Exercise) => ex.reps.map((r) => r.score);
const cues = (ex: Exercise) => ex.reps.flatMap((r) => r.cues).join(' | ');
const near = (x: number, target: number, tol: number) => Math.abs(x - target) <= tol;

const SCENARIOS: Scenario[] = [
  {
    name: 'Squat: 3 good reps', exercise: 'squat', frames: squat(85, 3),
    check: (ex) => expect(ex.reps.length === 3 && scores(ex).every((s) => s === 100), 'expected 3 x 100%'),
  },
  {
    name: 'Squat: shallow (135°)', exercise: 'squat', frames: squat(135, 1),
    check: (ex) => expect(ex.reps.length === 0 && ex.partialReps === 1, 'expected 0 reps, 1 partial'),
  },
  {
    name: 'Squat: 105° depth', exercise: 'squat', frames: squat(105, 1),
    check: (ex) => expect(ex.reps.length === 1 && near(ex.reps[0].score, 80, 3) && cues(ex).includes('Go deeper'),
      'expected 1 rep ~80% with "Go deeper"'),
  },
  {
    name: 'Squat: 65° torso lean', exercise: 'squat', frames: squat(85, 1, 65),
    check: (ex) => expect(ex.reps.length === 1 && near(ex.reps[0].score, 80, 1) && cues(ex).includes('Keep your chest up'),
      'expected 1 rep ~80% with "Keep your chest up"'),
  },
  {
    name: 'Push-up: 3 good reps', exercise: 'pushup', frames: pushup(85, 3),
    check: (ex) => expect(ex.reps.length === 3 && scores(ex).every((s) => s === 100), 'expected 3 x 100%'),
  },
  {
    name: 'Push-up: hips sagging', exercise: 'pushup', frames: pushup(85, 1, 45),
    check: (ex) => expect(ex.reps.length === 1 && near(ex.reps[0].score, 60, 1) && cues(ex).includes('Hips sagging'),
      'expected 1 rep ~60% with "Hips sagging"'),
  },
  {
    name: 'Push-up: shallow (115°)', exercise: 'pushup', frames: pushup(115, 1),
    check: (ex) => expect(ex.reps.length === 0 && ex.partialReps === 1, 'expected 0 reps, 1 partial'),
  },
  {
    name: 'No person in frame', exercise: 'squat', frames: Array(10).fill(null),
    check: (ex) => expect(ex.reps.length === 0 && ex.status === 'Body not fully visible', 'expected "Body not fully visible"'),
  },
  {
    name: 'Push-up: standing up', exercise: 'pushup', frames: squat(175, 0),
    check: (ex) => expect(ex.state === 'waiting' && ex.status.startsWith('Get into a plank'), 'expected "Get into a plank"'),
  },
];

// Combo streaks (src/game/combo.ts): reps at these ms times → the events each rep produced.
const RULES = { startAt: 3, gapMs: 2500, maxLevel: 5 };
function comboRun(times: number[]): { tracker: ComboTracker; events: ComboEvent[][] } {
  const tracker = new ComboTracker(RULES);
  return { tracker, events: times.map((t) => tracker.rep(t)) };
}
const steps = (evs: ComboEvent[][]) => evs.map((e) => e.filter((x) => x.type === 'step').map((x) => (x.type === 'step' ? x.level : 0)).join('')).join(',');
const comboChecks = (): [string, boolean][] => {
  const three = comboRun([0, 1000, 2000]);
  const ten = comboRun(Array.from({ length: 10 }, (_, i) => i * 1000));
  const gap = comboRun([0, 1000, 3600]);
  const brk = comboRun([0, 1000, 2000]).tracker;
  const beforeGap = brk.expire(2000 + 2499);
  const atGap = brk.expire(2000 + 2500);
  const two = comboRun([0, 1000]).tracker;
  return [
    ['combo: starts on the 3rd quick rep (pitch 1)', steps(three.events) === ',,1'],
    ['combo: pitch climbs to 5 and holds', steps(ten.events) === ',,1,2,3,4,5,5,5,5' && ten.tracker.count === 10],
    ['combo: a 2.5 s gap resets the streak', steps(gap.events) === ',,'],
    ['combo: lost after 2.5 s without a rep → sad sound', beforeGap === null && atGap?.type === 'break' && brk.count === 0],
    ['combo: no sad sound before a combo started', two.expire(5000) === null],
  ];
};

// Voice coach triggers (src/coach/triggers.ts) with the shipped config.
const snap = (scores: number[], elapsedS: number, durationS: number, recordReps: number | null, speaking = false): SetSnapshot => ({
  reps: scores.map((score) => ({ score, cue: score < 50 ? 'Go deeper' : undefined })), elapsedMs: elapsedS * 1000, durationS, recordReps, speaking,
});
const coachChecks = (): [string, boolean][] => {
  const mem = freshMemory();
  const bad = nextCoachEvent(COACH, snap([90, 40, 45, 30], 20, 60, null), mem);
  const cooldown = nextCoachEvent(COACH, snap([90, 40, 45, 30, 20], 22, 60, null), mem);
  const recovered = nextCoachEvent(COACH, snap([40, 40, 40, 90], 20, 60, null), freshMemory());
  const pace = (record: number | null, elapsedS: number, speaking = false) =>
    nextCoachEvent(COACH, snap([90, 90, 90, 90, 90, 90], elapsedS, 30, record, speaking), freshMemory());
  return [
    ['coach: consistently bad form → bad_form with the cue', bad?.type === 'bad_form' && bad.cue === 'Go deeper' && bad.bad === 3],
    ['coach: bad form respects the cooldown', cooldown === null],
    ['coach: no form alert once the latest rep is good', recovered === null],
    ['coach: projected reps', projectedReps(6, 12_000, 30) === 15],
    ['coach: ahead of the record → on_pace', pace(10, 12)?.type === 'on_pace'],
    ['coach: behind the record, no record, too early, or talking → quiet',
      pace(20, 12) === null && pace(null, 12) === null && pace(10, 5) === null && pace(10, 12, true) === null],
    ['coach: verdicts follow the rep colors', verdict(85) === 'good' && verdict(60) === 'sloppy' && verdict(30) === 'bad'],
    ['coach: stats carry the set verdict', statsMessage(snap([40, 40, 40], 10, 30, null), 12).includes('set_verdict=bad')],
    ['coach: a bad set is recapped as bad, with the shortfall and cue',
      /verdict=bad\. 3 reps.*short by 12.*Go deeper/.test(setDoneMessage(snap([40, 45, 30], 30, 30, 15))) && bad?.type === 'bad_form' && bad.form === 51],
    ['coach: a clean set with no record → good, no personal best',
      /verdict=good/.test(setDoneMessage(snap([90, 90], 30, 30, null))) && !setDoneMessage(snap([90, 90], 30, 30, null)).includes('personal best')],
  ];
};

const cosmeticChecks = (): [string, boolean][] => {
  const ids = COSMETICS.map((c) => c.id);
  const worn = wornItems({ head: 'warlock_hat', offhand: 'low_tier_shield', mainhand: 'gauntlet' }).map((c) => c.id);
  return [
    ['cosmetics: unique ids', new Set(ids).size === ids.length],
    ['cosmetics: drawn shield → weapon → hat', worn.join(',') === 'low_tier_shield,gauntlet,warlock_hat'],
    ['cosmetics: unknown or wrong-slot ids are ignored', wornItems({ head: 'nope', mainhand: 'warlock_hat' }).length === 0],
  ];
};

// Session scoring on top of the per-rep scores (src/game/scoring.ts; the server mirrors totalScore).
const UNIT_CHECKS: [string, boolean][] = [
  ['totalScore: sum/10, rounded', totalScore([80, 95, 40]) === 22 && totalScore([]) === 0],
  ['repQuality thresholds', repQuality(80) === 'green' && repQuality(79.9) === 'yellow' && repQuality(50) === 'yellow' && repQuality(49.9) === 'red'],
  ['avgForm', avgForm([80, 90]) === 85 && avgForm([]) === 0],
  ['formatClock', formatClock(125) === '2:05' && formatClock(0.2) === '0:01' && formatClock(-3) === '0:00'],
  ['15 s sets are offered', (DURATIONS as readonly number[]).includes(15)],
  ...comboChecks(),
  ...coachChecks(),
  ...cosmeticChecks(),
];

function run(s: Scenario): Exercise {
  const ex = EXERCISES[s.exercise]();
  s.frames.forEach((pose, i) => ex.update(pose, i / FPS));
  return ex;
}

const proc = (globalThis as unknown as { process?: { argv: string[]; exitCode?: number } }).process;

if (proc?.argv.includes('--dump')) {
  const round = (p: Vec) => p.map((v) => Math.round(v * 1000) / 1000);
  const out = SCENARIOS.map((s) => {
    const ex = run(s);
    return {
      name: s.name,
      exercise: s.exercise,
      frames: s.frames.map((p) => (p ? { pts: p.pts.map(round), vis: p.vis } : null)),
      ts: { reps: ex.reps, partialReps: ex.partialReps, status: ex.status, state: ex.state },
    };
  });
  console.log(JSON.stringify(out));
} else {
  let failed = 0;
  for (const s of SCENARIOS) {
    const ex = run(s);
    const err = s.check(ex);
    failed += err ? 1 : 0;
    const summary = `reps=${ex.reps.length} partial=${ex.partialReps} scores=[${scores(ex).join(', ')}]`
      + (ex.reps.length ? ` cues="${cues(ex)}"` : '') + (ex.status ? ` status="${ex.status}"` : '');
    console.log(`${err ? 'FAIL' : 'PASS'}  ${s.name.padEnd(26)} ${summary}${err ? `  <- ${err}` : ''}`);
  }
  for (const [name, ok] of UNIT_CHECKS) {
    failed += ok ? 0 : 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  }
  const total = SCENARIOS.length + UNIT_CHECKS.length;
  console.log(`\n${total - failed}/${total} passed`);
  if (proc && failed) proc.exitCode = 1;
}
