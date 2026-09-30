import { clamp } from './parameters.js';
import { sampleFlow } from './flowField.js';

const WIDTH = 32, HEIGHT = 20;
const MAP_W = 256, MAP_H = 160;
const CELL = 0.9, COLS = Math.ceil(WIDTH / CELL), ROWS = Math.ceil(HEIGHT / CELL);
const TAU = Math.PI * 2;

export function createSimulation({ params, count = 9000, random = Math.random }) {
  // All decisions use the previous state. Write into separate buffers, then swap.
  let positions = new Float32Array(count * 3), velocities = new Float32Array(count * 3);
  let nextPositions = new Float32Array(count * 3), nextVelocities = new Float32Array(count * 3);
  const activity = new Float32Array(count);
  const heads = new Int32Array(COLS * ROWS), links = new Int32Array(count);
  let trail = new Float32Array(MAP_W * MAP_H), nextTrail = new Float32Array(trail.length);
  const deposit = new Float32Array(trail.length);
  const flow = new Float32Array(2);
  let tick = 0;

  function reset() {
    trail.fill(0); nextTrail.fill(0); deposit.fill(0);
    for (let i = 0; i < count; i++) {
      const k = i * 3, angle = random() * TAU;
      const radius = 2.2 + Math.sqrt(random()) * 5;
      positions[k] = Math.cos(angle) * radius * 1.35;
      positions[k + 1] = Math.sin(angle) * radius * 0.74;
      positions[k + 2] = (random() - 0.5) * 1.4;
      sampleFlow(positions[k], positions[k + 1], params.field, params.tension, flow);
      velocities[k] = flow[0] * 1.2;
      velocities[k + 1] = flow[1] * 1.2;
      velocities[k + 2] = 0;
      activity[i] = random() * 0.4;
    }
    tick = 0;
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
    const dt = clamp(delta, 0, 1 / 30) * (params.suspend ? 0.16 : 1);
    if (dt === 0) return;
    const tension = clamp(params.tension, 0, 1), bond = clamp(params.bond, 0, 1);
    const memory = clamp(params.memory, 0, 1);
    const maxSpeed = 0.9 + tension * 4.7, maxForce = 2.1 + tension * 12;
    const perception = 0.45 + bond * 0.42, radius2 = perception * perception;
    const sensorDistance = 0.28 + memory * 0.58, sensorAngle = 0.42 + tension * 0.65;
    const chemWeight = (params.field === 3 ? 1.9 : 0.14) + memory * 0.6;
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
      const flowZ = (Math.sin(x * 0.36) * Math.cos(y * 0.42) * (0.7 + tension * 1.3) - z) * 0.55;
      addSteering(flow[0], flow[1], flowZ, params.field === 3 ? 0.25 : 0.85);
      if (neighbors) {
        addSteering(avx / neighbors, avy / neighbors, avz / neighbors, bond * 1.15);
        addSteering(px / neighbors - x, py / neighbors - y, pz / neighbors - z, bond * 0.9, true);
        addSteering(sx, sy, sz, 0.52 + (1 - bond) * 0.9);
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
      if (params.gather) addSteering(-x, -y, -z, 2.6, true);
      if (params.pointer.active) {
        const dx = params.pointer.x - x, dy = params.pointer.y - y, d = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - d / 7);
        const sign = params.pointer.repel ? -1 : 1;
        addSteering(dx * sign, dy * sign, -z * (sign > 0 ? 1 : 0), influence * 4.5, sign > 0);
      }
      if (params.pulse > 0) {
        const dx = x - params.pulseX, dy = y - params.pulseY;
        const d = Math.hypot(dx, dy);
        addSteering(dx, dy, z * 0.6, params.pulse * Math.max(0, 1 - d / 14) * 4.5);
      }
      // Boundary avoidance is also steering. No bouncing, teleporting, or respawn.
      if (Math.abs(x) > WIDTH / 2 - 2) addSteering(-Math.sign(x), 0, 0, (Math.abs(x) - WIDTH / 2 + 2) * 2);
      if (Math.abs(y) > HEIGHT / 2 - 2) addSteering(0, -Math.sign(y), 0, (Math.abs(y) - HEIGHT / 2 + 2) * 2);
      if (Math.abs(z) > 3) addSteering(0, 0, -Math.sign(z), 2);
      const force = Math.hypot(ax, ay, az);
      if (force > maxForce) { const s = maxForce / force; ax *= s; ay *= s; az *= s; }
      let nvx = vx + ax * dt, nvy = vy + ay * dt, nvz = vz + az * dt;
      const speed = Math.hypot(nvx, nvy, nvz);
      if (speed > maxSpeed) { const s = maxSpeed / speed; nvx *= s; nvy *= s; nvz *= s; }
      nextVelocities[k] = nvx; nextVelocities[k + 1] = nvy; nextVelocities[k + 2] = nvz;
      nextPositions[k] = x + nvx * dt; nextPositions[k + 1] = y + nvy * dt; nextPositions[k + 2] = z + nvz * dt;
      activity[i] = clamp(force / maxForce * 0.7 + neighbors / 24 * 0.3, 0, 1);
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
    params.pulse = Math.max(0, params.pulse - dt * 1.7);
    tick++;
  }

  reset();
  return {
    count, step, reset,
    get positions() { return positions; }, get velocities() { return velocities; },
    get activity() { return activity; }, get trail() { return trail; },
    sampleTrail, bounds: { width: WIDTH, height: HEIGHT },
  };
}
