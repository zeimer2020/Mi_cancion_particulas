// The environment describes directions. Only the agent's steering rule moves it.
// Fields are static until a human changes a preset or its tension. No music clock.
export function sampleFlow(x, y, field, tension, out) {
  const r = Math.hypot(x, y) + 0.001;
  if (field === 0) {
    // Vortex with a soft radial correction: two coherent, folded currents.
    const desiredRadius = 5.3 + 1.5 * Math.sin(Math.atan2(y, x) * 3);
    const difference = desiredRadius - r;
    const radial = Math.sign(difference) * Math.max(0, Math.abs(difference) - 0.9) * 0.34;
    out[0] = -y / r + x / r * radial;
    out[1] = x / r + y / r * radial;
  } else if (field === 1) {
    // Direction field from the curl of a scalar potential plus a common drift.
    out[0] = 1.1 + Math.cos(y * 0.7 + Math.sin(x * 0.22)) * 0.8;
    out[1] = Math.sin(x * 0.43) * 0.9 + Math.sin(y * 0.35) * 0.3;
  } else if (field === 2) {
    // A saddle and local curls create competing routes, rather than an explosion force.
    out[0] = Math.sin(y * (0.55 + tension * 0.4)) * 1.6 + x * 0.065;
    out[1] = Math.cos(x * 0.65) * 1.4 - y * 0.08;
  } else {
    out[0] = Math.cos(y * 0.55) * 0.45 - y / r * 0.35;
    out[1] = Math.sin(x * 0.55) * 0.45 + x / r * 0.35;
  }
  let length = Math.hypot(out[0], out[1]);
  if (length < 0.00001) { out[0] = 1; out[1] = 0; length = 1; }
  out[0] /= length;
  out[1] /= length;
  return out;
}
