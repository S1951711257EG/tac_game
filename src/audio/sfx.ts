/**
 * Sound effects synthesized at runtime with the Web Audio API — no audio
 * files, no third-party samples. All sounds are original. Volume/mute come
 * from the app settings store; a missing AudioContext (SSR, tests) is a
 * silent no-op.
 */
import { useAppStore } from "@/state/appStore";

export type SfxName =
  | "select"
  | "move"
  | "attack"
  | "capture"
  | "error"
  | "turn"
  | "victory"
  | "defeat"
  | "click";

type AudioCtor = { new (): AudioContext };

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function blip(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
): void {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  amp.gain.setValueAtTime(0.0001, ac.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), ac.currentTime + start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

const RECIPES: Record<SfxName, Array<[number, number, number, OscillatorType, number]>> = {
  // [freq, startOffset, duration, wave, gain]
  select: [[660, 0, 0.07, "sine", 0.16]],
  click: [[880, 0, 0.05, "sine", 0.12]],
  move: [
    [330, 0, 0.06, "sine", 0.14],
    [392, 0.06, 0.07, "sine", 0.14],
  ],
  attack: [
    [140, 0, 0.14, "sawtooth", 0.22],
    [96, 0.02, 0.12, "square", 0.16],
  ],
  capture: [
    [523, 0, 0.09, "sine", 0.16],
    [659, 0.09, 0.09, "sine", 0.16],
    [784, 0.18, 0.14, "sine", 0.18],
  ],
  error: [[180, 0, 0.1, "square", 0.12]],
  turn: [
    [440, 0, 0.08, "sine", 0.13],
    [330, 0.09, 0.1, "sine", 0.13],
  ],
  victory: [
    [523, 0, 0.12, "sine", 0.18],
    [659, 0.12, 0.12, "sine", 0.18],
    [784, 0.24, 0.12, "sine", 0.18],
    [1047, 0.36, 0.22, "sine", 0.2],
  ],
  defeat: [
    [392, 0, 0.14, "sine", 0.16],
    [311, 0.15, 0.14, "sine", 0.16],
    [262, 0.3, 0.24, "sine", 0.18],
  ],
};

export function playSfx(name: SfxName): void {
  const { volume, muted } = useAppStore.getState().settings;
  if (muted || volume <= 0) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const master = Math.min(1, volume) * 0.9;
    for (const [freq, start, dur, type, gain] of RECIPES[name]) {
      blip(ac, freq, start, dur, type, gain * master);
    }
  } catch {
    // Audio must never break gameplay.
  }
}
