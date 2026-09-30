import { clamp, motionLimits } from './parameters.js';
import { sampleFlow } from './flowField.js';

const WIDTH = 32, HEIGHT = 20;
const MAP_W = 256, MAP_H = 160;
const CELL = 0.9, COLS = Math.ceil(WIDTH / CELL), ROWS = Math.ceil(HEIGHT / CELL);
const TAU = Math.PI * 2;

export function createSimulation({ params, count = 9000, random = Math.random }) {
  // All decisions use the previous state. Write into separate buffers, then swap.
  let positions = new Float32Array(count * 3), velocities = new Float32Array(count * 3);
  let nextPositions = new Float32Array(count * 3), nextVelocities = new Float32Array(count * 3);
  const steering = new Float32Array(count * 3);
  const activity = new Float32Array(count);
  const homes = new Float32Array(count * 3), wander = new Float32Array(count);
  const heads = new Int32Array(COLS * ROWS), links = new Int32Array(count);
  let trail = new Float32Array(MAP_W * MAP_H), nextTrail = new Float32Array(trail.length);
  const deposit = new Float32Array(trail.length);
  const flow = new Float32Array(2);
  let tick = 0, vibrationPhase = 0;

  function reset() {
    trail.fill(0); nextTrail.fill(0); deposit.fill(0); steering.fill(0);
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      // A wide starting volume. Homes are targets for a charged release,
      // while resting agents are free to travel through the flow field.
      positions[k] = homes[k] = (random() - 0.5) * 29;
      positions[k + 1] = homes[k + 1] = (random() - 0.5) * 17;
      positions[k + 2] = homes[k + 2] = (random() - 0.5) * 5;
      wander[i] = random() * TAU;
      sampleFlow(positions[k], positions[k + 1], params.field, params.tension, flow);
      velocities[k] = flow[0] * 6;
      velocities[k + 1] = flow[1] * 6;
      velocities[k + 2] = 0;
      activity[i] = random() * 0.4;
    }
    nextPositions.set(positions); nextVelocities.set(velocities);
    tick = 0; vibrationPhase = 0; params.charge = 0; params.pulse = 0; params.rebound = 0; params.spreadBurst = false; params.localHit = false;
  }

  function sampleTrail(x, y) {
    // Bilinear perception of the shared XY chemical substrate.
    const fx = clamp((x / WIDTH + 0.5) * (MAP_W - 1), 0, MAP_W - 1);
    const fy = clamp((y / HEIGHT + 0.5) * (MAP_H - 1), 0, MAP_H - 1);
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const rx = fx - ix, ry = fy - iy;
    const right = Math.min(ix + 1, MAP_W - 1), top = Math.min(iy + 1, MAP_H - 1);
    return (trail[iy * MAP_W + ix] * (1 - rx) + trail[iy * MAP_W + right] * rx) * (1 - ry)
      + (trail[top * MAP_W + ix] * (1 - rx) + trail[top * MAP_W + right] * rx) * ry;
  }

  function step(delta) {
    const dt = clamp(delta, 0, 1 / 30) * (params.suspend ? 0.045 : 1);
    if (dt === 0) return;
    const tension = clamp(params.tension, 0, 1), bond = clamp(params.bond, 0, 1);
    const memory = clamp(params.memory, 0, 1);
    const limits = motionLimits(params), maxSpeed = limits.speed, maxForce = limits.force;
    const perception = 0.45 + bond * 0.42, radius2 = perception * perception;
    const sensorDistance = 0.28 + memory * 0.58, sensorAngle = 0.42 + tension * 0.65;
    const chemWeight = params.field === 3 ? 2.1 + memory * 0.32 : 0.025 + memory * 0.09;
    const responding = params.gather || params.pointer.active || params.pulse > 0.015 || params.rebound > 0.1;
    const response = 1 - Math.exp(-dt * (params.vibrate ? 90 : responding ? 65 : 8));
    vibrationPhase = params.vibrate ? vibrationPhase + dt * TAU * clamp(2 / params.rhythm.beatSeconds,2,9) : 0;
    // The hand opens an oscillating flow. Agents steer into it and reverse
    // their velocities; this never translates a camera or writes positions.
    const vibrationX = Math.sin(vibrationPhase), vibrationY = Math.cos(vibrationPhase) * 0.45;
    params.charge = params.gather ? Math.min(1,params.charge + dt / (params.rhythm.beatSeconds * 0.85)) : Math.max(0,params.charge - dt * 3);
    heads.fill(-1); deposit.fill(0);
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      const cx = clamp(Math.floor((positions[k] + WIDTH / 2) / CELL), 0, COLS - 1);
      const cy = clamp(Math.floor((positions[k + 1] + HEIGHT / 2) / CELL), 0, ROWS - 1);
      const cell = cy * COLS + cx;
      links[i] = heads[cell]; heads[cell] = i;
    }

    for (let i = 0; i < count; i++) {
      const k = i * 3, x = positions[k], y = positions[k + 1], z = positions[k + 2];
      const vx = velocities[k], vy = velocities[k + 1], vz = velocities[k + 2];
      const cx = clamp(Math.floor((x + WIDTH / 2) / CELL), 0, COLS - 1);
      const cy = clamp(Math.floor((y + HEIGHT / 2) / CELL), 0, ROWS - 1);
      let ax = 0, ay = 0, az = 0, neighbors = 0, inspected = 0;
      let px = 0, py = 0, pz = 0, avx = 0, avy = 0, avz = 0, sx = 0, sy = 0, sz = 0;
      // Bounded local neighborhood. Rotating cell order avoids a preferred direction.
      // In dense cells, inspect different portions of the linked list on each step.
      const offset = (i + tick) % 9;
      for (let cellIndex = 0; cellIndex < 9 && inspected < 72 && neighbors < 24; cellIndex++) {
        const n = (cellIndex + offset) % 9;
        const nx = cx + n % 3 - 1, ny = cy + Math.floor(n / 3) - 1;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        let j = heads[ny * COLS + nx];
        for (let skip = (tick + i) % 5; skip > 0 && j !== -1; skip--) j = links[j];
        while (j !== -1 && inspected < 72 && neighbors < 24) {
          inspected++;
          if (j !== i) {
            const q = j * 3, dx = x - positions[q], dy = y - positions[q + 1], dz = z - positions[q + 2];
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < radius2 && d2 > 0.000001) {
              neighbors++;
              px += positions[q]; py += positions[q + 1]; pz += positions[q + 2];
              avx += velocities[q]; avy += velocities[q + 1]; avz += velocities[q + 2];
              if (d2 < 0.075) {
                const strength = 1 / Math.max(0.008, d2);
                sx += dx * strength; sy += dy * strength; sz += dz * strength;
              }
            }
          }
          j = links[j];
        }
      }
      // Reynolds: desired velocity minus current velocity, with a bounded response.
      const addSteering = (dx, dy, dz, weight, arrive = false) => {
        const length = Math.hypot(dx, dy, dz);
        if (length < 0.00001 || weight === 0) return;
        const speed = arrive ? maxSpeed * Math.min(1, length / 2.2) : maxSpeed;
        ax += (dx / length * speed - vx) * weight;
        ay += (dy / length * speed - vy) * weight;
        az += (dz / length * speed - vz) * weight;
      };
      sampleFlow(x, y, params.field, tension, flow);
      // Third dimension is a flow direction, not a forced position animation.
      const flowZ = (Math.sin(x * 0.36) * Math.cos(y * 0.42) * (params.field === 1 ? 5 : 2.2) - z) * 0.55;
      addSteering(flow[0], flow[1], flowZ * 0.3, params.field === 3 ? 0.16 : 3.1);
      // Reynolds wander adds local uncertainty. It is an agent decision, not
      // a changing music score or a preprogrammed animation of its position.
      wander[i] += (random() - 0.5) * dt * (1.5 + tension * 4);
      addSteering(Math.cos(wander[i]),Math.sin(wander[i]),Math.sin(wander[i] * 1.3) * 0.15,params.field === 3 ? 0.12 : 0.09 + tension * 0.08);
      const hx = homes[k] - x, hy = homes[k + 1] - y, hz = homes[k + 2] - z;
      if (!params.gather) addSteering(0,0,hz,0.12,true);
      if (!params.gather && params.pulse < 0.18 && params.rebound > 0.02) addSteering(hx,hy,hz,params.rebound * 8,true);
      if (neighbors) {
        addSteering(avx / neighbors, avy / neighbors, avz / neighbors, bond * 1.3);
        addSteering(px / neighbors - x, py / neighbors - y, pz / neighbors - z, bond * 0.38, true);
        addSteering(sx, sy, sz, 0.3 + (1 - bond) * 0.22);
      }
      // Physarum: forward / left / right sensors and finite turning angle.
      const heading = Math.atan2(vy, vx);
      const front = sampleTrail(x + Math.cos(heading) * sensorDistance, y + Math.sin(heading) * sensorDistance);
      const left = sampleTrail(x + Math.cos(heading + sensorAngle) * sensorDistance, y + Math.sin(heading + sensorAngle) * sensorDistance);
      const right = sampleTrail(x + Math.cos(heading - sensorAngle) * sensorDistance, y + Math.sin(heading - sensorAngle) * sensorDistance);
      let turn = 0;
      if (front < left || front < right) {
        turn = left === right ? (random() < 0.5 ? -1 : 1) : (left > right ? 1 : -1);
      }
      const sensedHeading = heading + turn * (0.14 + tension * 0.26);
      addSteering(Math.cos(sensedHeading), Math.sin(sensedHeading), 0, chemWeight);
      if (params.gather) {
        const lane = ((i * 0.61803398875) % 1) - 0.5;
        addSteering(lane * 0.16 - x,homes[k + 1] * 0.42 - y,lane * 0.3 - z,26,true);
      }
      if (params.pointer.active) {
        const dx = params.pointer.x - x, dy = params.pointer.y - y, d = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - d / 9);
        const sign = params.pointer.repel ? -1 : 1;
        addSteering(dx * sign, dy * sign, -z * (sign > 0 ? 1 : 0), influence * 13, sign > 0);
        // The moving hand describes a local direction: agents can ride the stroke.
        if (!params.pointer.repel) addSteering(params.pointer.vx,params.pointer.vy,Math.sin(i * 1.7) * 2,influence * 4);
      }
      if (params.pulse > 0) {
        const seedAngle = ((i * 0.61803398875) % 1) * TAU;
        const local = params.localHit;
        const dx = params.spreadBurst ? hx * 1.8 : local ? x - params.pulseX + Math.cos(seedAngle) * 2.5 : params.hitDirection * 6;
        const dy = params.spreadBurst ? hy : local ? y - params.pulseY + Math.sin(seedAngle) * 2.5 : homes[k + 1] * 0.12 - y;
        const dz = params.spreadBurst ? hz * 1.6 : Math.sin(seedAngle * 3) * 3.5;
        addSteering(dx,dy,dz,params.pulse * 26);
      }
      if (params.vibrate) addSteering(vibrationX,vibrationY,Math.sin(vibrationPhase * 0.5) * 0.08,80);
      // Boundary avoidance is also steering. No bouncing, teleporting, or respawn.
      if (Math.abs(x) > WIDTH / 2 - 2) addSteering(-Math.sign(x), 0, 0, (Math.abs(x) - WIDTH / 2 + 2) * 14);
      if (Math.abs(y) > HEIGHT / 2 - 2) addSteering(0, -Math.sign(y), 0, (Math.abs(y) - HEIGHT / 2 + 2) * 14);
      if (Math.abs(z) > 5) addSteering(0, 0, -Math.sign(z), (Math.abs(z) - 5) * 18);
      const force = Math.hypot(ax, ay, az);
      if (force > maxForce) { const s = maxForce / force; ax *= s; ay *= s; az *= s; }
      // Ease the steering response, rather than teleporting or smoothing positions.
      // Human hits and vibration retain a fast attack; resting turns have inertia.
      ax = steering[k] + (ax - steering[k]) * response;
      ay = steering[k + 1] + (ay - steering[k + 1]) * response;
      az = steering[k + 2] + (az - steering[k + 2]) * response;
      const easedForce = Math.hypot(ax,ay,az);
      if (easedForce > maxForce) { const s = maxForce / easedForce; ax *= s; ay *= s; az *= s; }
      steering[k] = ax; steering[k + 1] = ay; steering[k + 2] = az;
      let nvx = vx + ax * dt, nvy = vy + ay * dt, nvz = vz + az * dt;
      const speed = Math.hypot(nvx, nvy, nvz);
      if (speed > maxSpeed) { const s = maxSpeed / speed; nvx *= s; nvy *= s; nvz *= s; }
      nextVelocities[k] = nvx; nextVelocities[k + 1] = nvy; nextVelocities[k + 2] = nvz;
      nextPositions[k] = x + nvx * dt; nextPositions[k + 1] = y + nvy * dt; nextPositions[k + 2] = z + nvz * dt;
      const targetActivity = clamp(easedForce / maxForce * 0.65 + speed / maxSpeed * 0.2 + neighbors / 24 * 0.15, 0, 1);
      activity[i] += (targetActivity - activity[i]) * (1 - Math.exp(-dt * 7));
      const tx = clamp(Math.floor((nextPositions[k] / WIDTH + 0.5) * MAP_W), 0, MAP_W - 1);
      const ty = clamp(Math.floor((nextPositions[k + 1] / HEIGHT + 0.5) * MAP_H), 0, MAP_H - 1);
      deposit[ty * MAP_W + tx] += dt * 1.6;
    }
    [positions, nextPositions] = [nextPositions, positions];
    [velocities, nextVelocities] = [nextVelocities, velocities];
    // Shared environmental memory: deposit, diffusion, then evaporation.
    const decay = Math.exp(-dt * (1.65 * (1 - memory) + 0.045));
    const diffusion = Math.min(0.22, dt * 8);
    for (let y = 0; y < MAP_H; y++) {
      const up = Math.max(y - 1, 0) * MAP_W, down = Math.min(y + 1, MAP_H - 1) * MAP_W;
      const row = y * MAP_W;
      for (let x = 0; x < MAP_W; x++) {
        const i = row + x;
        const around = (trail[up + x] + trail[down + x] + trail[row + Math.max(0, x - 1)] + trail[row + Math.min(MAP_W - 1, x + 1)]) * 0.25;
        nextTrail[i] = Math.min(12, (trail[i] * (1 - diffusion) + around * diffusion + deposit[i]) * decay);
      }
    }
    [trail, nextTrail] = [nextTrail, trail];
    params.pulse = Math.max(0, params.pulse - dt / params.pulseDuration);
    if (params.pulse < 0.18) params.rebound = Math.max(0,params.rebound - dt / (params.rhythm.beatSeconds * 0.65));
    tick++;
  }

  reset();
  return {
    count, step, reset,
    get positions() { return positions; }, get velocities() { return velocities; },
    get previousPositions() { return nextPositions; },
    get activity() { return activity; }, get trail() { return trail; },
    sampleTrail, bounds: { width: WIDTH, height: HEIGHT },
  };
}
