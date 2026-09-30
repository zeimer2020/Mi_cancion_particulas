export const PRESETS = [
  { name: 'Latente', subtitle: 'Un nudo que respira', field: 0, tension: 0.28, bond: 0.67, memory: 0.35, palette: 0 },
  { name: 'Corriente', subtitle: 'Seguir una dirección', field: 1, tension: 0.5, bond: 0.43, memory: 0.42, palette: 1 },
  { name: 'Fractura', subtitle: 'Separarse sin desaparecer', field: 2, tension: 0.88, bond: 0.14, memory: 0.18, palette: 2 },
  { name: 'Huella', subtitle: 'Lo que queda del movimiento', field: 3, tension: 0.18, bond: 0.48, memory: 0.94, palette: 3 },
];

export const QUALITY = { low: 4500, medium: 9000, high: 16000 };

export function createParameters() {
  return {
    ...PRESETS[0], preset: 0,
    pointer: { x: 0, y: 0, active: false, repel: false },
    gather: false, suspend: false, pulse: 0,
    pulseX: 0, pulseY: 0,
  };
}

export function applyPreset(params, index) {
  Object.assign(params, PRESETS[index], { preset: index });
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
