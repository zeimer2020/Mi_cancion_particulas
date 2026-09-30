export const PRESETS = [
  { name: 'Riff', subtitle: 'Corrientes rojas que cruzan el espacio', field: 0, tension: 0.63, bond: 0.18, memory: 0.3, palette: 0 },
  { name: 'Vértigo', subtitle: 'Corrientes en profundidad', field: 1, tension: 0.76, bond: 0.35, memory: 0.24, palette: 1 },
  { name: 'Avalancha', subtitle: 'Fragmentos contra el espacio', field: 2, tension: 1, bond: 0.05, memory: 0.09, palette: 2 },
  { name: 'Ceniza', subtitle: 'La memoria después del golpe', field: 3, tension: 0.16, bond: 0.28, memory: 0.88, palette: 3 },
];

export const PARTICLE_COUNT = { min: 1000, max: 20000, step: 500, initial: 4500 };

export function normalizeParticleCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return PARTICLE_COUNT.initial;
  return Math.max(PARTICLE_COUNT.min, Math.min(PARTICLE_COUNT.max,
    Math.round(number / PARTICLE_COUNT.step) * PARTICLE_COUNT.step));
}

export function createParameters() {
  return {
    ...PRESETS[0], preset: 0,
    pointer: { x: 0, y: 0, vx: 0, vy: 0, active: false, repel: false },
    gather: false, suspend: false, vibrate: false, hey: false, pulse: 0, charge: 0,
    pulseX: 0, pulseY: 0, spreadBurst: false, hitSerial: 0,
    pulseDuration: 0.19, rebound: 0, hitDirection: 1, localHit: false,
    rhythm: { beatSeconds: 60 / 139, lastTap: null, intervals: [], measured: false },
  };
}

export function applyPreset(params, index) {
  Object.assign(params, PRESETS[index], { preset: index });
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Short boosts are triggered by human gestures, never by the soundtrack.
export function motionLimits(params) {
  const tension = clamp(params.tension,0,1), accent = clamp(params.pulse,0,1);
  return {
    speed: (2.5 + tension * 11.5) * (1 + accent * 3.4 + (params.gather ? 3.2 : 0) + (params.pointer.active ? 0.35 : 0) + (params.vibrate ? 2.4 : 0)),
    force: (12 + tension * 32) * (1 + accent * 16 + (params.gather ? 9.5 : 0) + (params.pointer.active ? 1.2 : 0) + (params.vibrate ? 20 : 0)),
  };
}
