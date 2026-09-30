import { clamp } from './parameters.js';

// These actions are called by real key/pointer events. They change shared
// conditions; they never edit agent positions, read audio, or schedule a hit.
export function registerManualPulse(params, time) {
  if (!Number.isFinite(time)) return;
  const rhythm = params.rhythm;
  if (rhythm.lastTap !== null) {
    const interval = time - rhythm.lastTap;
    if (interval >= 0.22 && interval <= 1.2) {
      rhythm.intervals.push(interval);
      if (rhythm.intervals.length > 4) rhythm.intervals.shift();
      const ordered = [...rhythm.intervals].sort((a,b) => a - b);
      const middle = Math.floor(ordered.length / 2);
      rhythm.beatSeconds = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
      rhythm.measured = true;
    } else if (interval > 1.2) {
      // A phrase gap starts a fresh estimate, never an automatic pulse.
      rhythm.intervals.length = 0;
    } else {
      return; // Ignore duplicate/too-close taps without shifting the reference.
    }
  }
  rhythm.lastTap = time;
}

export function strike(params, power = 1, spread = false, time) {
  if (!spread && time !== undefined) registerManualPulse(params,time);
  params.pulse = clamp(power,0,1);
  params.spreadBurst = spread;
  params.localHit = !spread && params.pointer.active;
  params.pulseDuration = clamp(params.rhythm.beatSeconds * (spread ? 0.68 : 0.44),0.12,spread ? 0.42 : 0.28);
  params.rebound = spread ? 0 : params.pulse;
  if (!spread) params.hitDirection *= -1;
  params.hitSerial = (params.hitSerial + 1) % 1024;
  params.pulseX = params.pointer.active ? params.pointer.x : 0;
  params.pulseY = params.pointer.active ? params.pointer.y : 0;
}

export function releaseCharge(params) {
  const charge = params.charge;
  params.charge = 0;
  if (charge > 0.05) strike(params,0.35 + charge * 0.65,true);
}
