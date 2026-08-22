"use client";

const MUTE_KEY = "batch16_baaji_mute";

let audioCtx: AudioContext | null = null;

function ctx() {
  if (typeof window === "undefined") return null;
  try {
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

export function readBaajiMute(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function writeBaajiMute(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.1,
  slide?: number,
) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + duration);
  }
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration: number, gain = 0.06) {
  const c = ctx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g);
  g.connect(c.destination);
  src.start();
}

export function playBaajiSound(
  kind: "kickoff" | "win" | "highWin" | "create",
  muted: boolean,
) {
  if (muted || typeof window === "undefined") return;
  try {
    void ctx()?.resume();

    switch (kind) {
      case "kickoff":
        tone(220, 0.12, "triangle", 0.09);
        setTimeout(() => tone(330, 0.18, "triangle", 0.08), 100);
        setTimeout(() => noise(0.15, 0.05), 180);
        break;
      case "create":
        tone(400, 0.1, "sine", 0.07);
        setTimeout(() => tone(520, 0.12, "sine", 0.06), 90);
        break;
      case "win":
        tone(392, 0.12, "triangle", 0.09);
        setTimeout(() => tone(523, 0.14, "triangle", 0.08), 120);
        setTimeout(() => tone(659, 0.22, "triangle", 0.07), 240);
        break;
      case "highWin":
        tone(196, 0.2, "sawtooth", 0.08, 120);
        setTimeout(() => tone(392, 0.15, "triangle", 0.1), 150);
        setTimeout(() => tone(523, 0.15, "triangle", 0.09), 280);
        setTimeout(() => tone(784, 0.35, "triangle", 0.08), 420);
        setTimeout(() => noise(0.35, 0.08), 200);
        break;
    }
  } catch {
    // Autoplay / AudioContext failures must never break the page.
  }
}
