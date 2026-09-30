// Direction maps are sampled locally. Human gestures change the conditions;
// only bounded steering integrates an agent's motion. No song clock is read.
export function sampleFlow(x, y, field, tension, out) {
  if (field === 0) {
    // Broad circulating lanes cross the screen and bend back at its edges.
    // The stream function makes the turns continuous without wrapping agents.
    const nx = x / 16, ny = y / 10;
    out[0] = (1 - nx * nx) * (1 - 3 * ny * ny) * 1.5 + Math.sin(y * 0.35 + x * 0.12) * 0.1;
    out[1] = 1.25 * nx * ny * (1 - ny * ny) + Math.cos(x * 0.2) * 0.08;
  } else if (field === 1) {
    // Long diagonal folds; Z steering gives the passing lanes depth.
    out[0] = Math.cos(y * 0.19 + x * 0.08) * 1.6;
    out[1] = Math.sin(x * 0.17 - y * 0.1) * 0.8;
  } else if (field === 2) {
    // More energetic folds still have continuous spatial curvature.
    const frequency = 0.25 + tension * 0.14;
    out[0] = Math.cos(y * frequency + Math.sin(x * 0.16) * 0.8) * 2;
    out[1] = Math.sin(x * frequency - y * 0.15) * 1.2;
  } else {
    // Weak curls leave room for the three Physarum sensors to lead.
    out[0] = Math.cos(y * 0.55) * 0.45 - Math.sin(x * 0.24) * 0.2;
    out[1] = Math.sin(x * 0.55) * 0.45 + Math.cos(y * 0.24) * 0.2;
  }
  let length = Math.hypot(out[0], out[1]);
  if (length < 0.00001) { out[0] = 1; out[1] = 0; length = 1; }
  out[0] /= length; out[1] /= length;
  return out;
}
