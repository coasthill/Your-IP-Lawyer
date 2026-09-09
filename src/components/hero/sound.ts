"use client";

/**
 * Optional, procedurally generated sound design (no audio files, nothing autoplays).
 *   - low room tone (filtered noise)
 *   - cloth movement swells tied to scroll velocity
 *   - gear rumble in the mechanical scenes
 *   - one gavel impact
 * Everything is created lazily on the first user gesture that enables sound.
 */

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  room: GainNode;
  cloth: GainNode;
  gears: GainNode;
  gearOsc: OscillatorNode;
};

let engine: Engine | null = null;
let enabled = false;
const listeners = new Set<(on: boolean) => void>();

function noiseBuffer(ctx: AudioContext, seconds = 2) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // brown-ish noise
    data[i] = last * 3.5;
  }
  return buffer;
}

function build(): Engine {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Room tone
  const room = ctx.createGain();
  room.gain.value = 0.05;
  const roomSrc = ctx.createBufferSource();
  roomSrc.buffer = noiseBuffer(ctx, 3);
  roomSrc.loop = true;
  const roomFilter = ctx.createBiquadFilter();
  roomFilter.type = "lowpass";
  roomFilter.frequency.value = 180;
  roomSrc.connect(roomFilter).connect(room).connect(master);
  roomSrc.start();

  // Cloth (band-passed noise, gain driven by scroll velocity)
  const cloth = ctx.createGain();
  cloth.gain.value = 0;
  const clothSrc = ctx.createBufferSource();
  clothSrc.buffer = noiseBuffer(ctx, 2);
  clothSrc.loop = true;
  const clothFilter = ctx.createBiquadFilter();
  clothFilter.type = "bandpass";
  clothFilter.frequency.value = 900;
  clothFilter.Q.value = 0.6;
  clothSrc.connect(clothFilter).connect(cloth).connect(master);
  clothSrc.start();

  // Gears (low oscillator + noise, gain driven by scene)
  const gears = ctx.createGain();
  gears.gain.value = 0;
  const gearOsc = ctx.createOscillator();
  gearOsc.type = "sawtooth";
  gearOsc.frequency.value = 38;
  const gearFilter = ctx.createBiquadFilter();
  gearFilter.type = "lowpass";
  gearFilter.frequency.value = 140;
  gearOsc.connect(gearFilter).connect(gears).connect(master);
  gearOsc.start();

  return { ctx, master, room, cloth, gears, gearOsc };
}

export const sound = {
  isEnabled: () => enabled,
  subscribe(cb: (on: boolean) => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  async toggle() {
    enabled = !enabled;
    if (enabled) {
      engine ??= build();
      if (engine.ctx.state === "suspended") await engine.ctx.resume();
      engine.master.gain.cancelScheduledValues(engine.ctx.currentTime);
      engine.master.gain.linearRampToValueAtTime(0.9, engine.ctx.currentTime + 0.8);
    } else if (engine) {
      engine.master.gain.cancelScheduledValues(engine.ctx.currentTime);
      engine.master.gain.linearRampToValueAtTime(0, engine.ctx.currentTime + 0.4);
    }
    try {
      localStorage.setItem("yil-sound", enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    for (const l of listeners) l(enabled);
  },
  /** Called every frame by renderers: progress 0–1 and |velocity| */
  update(progress: number, velocity: number) {
    if (!engine || !enabled) return;
    const t = engine.ctx.currentTime;
    const cloth = progress > 0.08 && progress < 0.36 ? Math.min(0.35, Math.abs(velocity) * 260) : 0;
    engine.cloth.gain.setTargetAtTime(cloth, t, 0.12);
    const mech = progress > 0.4 && progress < 0.9 ? 0.06 + Math.min(0.12, Math.abs(velocity) * 120) : 0;
    engine.gears.gain.setTargetAtTime(mech, t, 0.25);
    engine.gearOsc.frequency.setTargetAtTime(34 + Math.abs(velocity) * 4000, t, 0.3);
  },
  gavel() {
    if (!engine || !enabled) return;
    const { ctx, master } = engine;
    const t = ctx.currentTime;
    // Impact: short noise burst + low thud
    const burst = ctx.createBufferSource();
    burst.buffer = noiseBuffer(ctx, 0.3);
    const bf = ctx.createBiquadFilter();
    bf.type = "lowpass";
    bf.frequency.value = 1200;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.9, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    burst.connect(bf).connect(bg).connect(master);
    burst.start(t);
    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(140, t);
    thud.frequency.exponentialRampToValueAtTime(42, t + 0.4);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(1, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    thud.connect(tg).connect(master);
    thud.start(t);
    thud.stop(t + 0.8);
  },
};
