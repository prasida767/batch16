"use client";

const MUTE_KEY = "batch16_dressing_room_mute";

let audioCtx: AudioContext | null = null;

function ctx() {
  try {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AC();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function readDressingMute(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function writeDressingMute(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

function blip(
  frequency: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.12,
  slideTo?: number,
) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      t0 + duration,
    );
  }
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noiseBurst(duration: number, gain = 0.08) {
  const c = ctx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

/** Tiny synthesized SFX — no asset downloads. */
export function playTauntSound(
  action: string,
  muted: boolean,
) {
  if (muted || typeof window === "undefined") return;
  try {
    void ctx()?.resume();

  switch (action) {
    case "slap":
      noiseBurst(0.06, 0.14);
      blip(220, 0.07, "square", 0.1, 80);
      break;
    case "kick":
      blip(90, 0.12, "sawtooth", 0.12, 40);
      noiseBurst(0.05, 0.1);
      break;
    case "tease":
      blip(520, 0.08, "sine", 0.07);
      setTimeout(() => blip(660, 0.08, "sine", 0.06), 90);
      break;
    case "laugh":
      blip(400, 0.06, "triangle", 0.08);
      setTimeout(() => blip(500, 0.06, "triangle", 0.07), 80);
      setTimeout(() => blip(350, 0.1, "triangle", 0.06), 160);
      break;
    case "bottle":
      blip(800, 0.15, "sine", 0.05, 200);
      setTimeout(() => noiseBurst(0.08, 0.12), 140);
      break;
    case "boo":
      blip(180, 0.35, "sawtooth", 0.07, 70);
      break;
    case "clap":
      noiseBurst(0.04, 0.1);
      setTimeout(() => noiseBurst(0.04, 0.08), 180);
      setTimeout(() => noiseBurst(0.05, 0.07), 400);
      break;
    case "roast":
      blip(140, 0.2, "sawtooth", 0.1, 60);
      setTimeout(() => blip(280, 0.15, "square", 0.08), 100);
      break;
    default:
      blip(300, 0.08, "sine", 0.06);
  }
  } catch {
    /* AudioContext can fail in locked browsers. */
  }
}
