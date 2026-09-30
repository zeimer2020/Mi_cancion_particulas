import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation/createSimulation.js';
import { createParameters, applyPreset } from '../src/simulation/parameters.js';
import { sampleFlow } from '../src/simulation/flowField.js';

function seeded(seed = 1234) { return () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function instrument(count = 300) { const params = createParameters(); return { params, sim: createSimulation({params,count,random:seeded()}) }; }

test('All four environments stay finite and obey speed limits across sustained gestures', () => {
  for (let preset = 0; preset < 4; preset++) {
    const {params,sim} = instrument(); applyPreset(params,preset);
    for (let t = 0; t < 180; t++) {
      params.pointer.active = t < 40; params.pointer.repel = t < 20; params.pointer.x = 4;
      params.gather = t > 80 && t < 110;
      if (t === 55) params.pulse = 1;
      sim.step(1/60);
      for (let i = 0; i < sim.count; i++) {
        const k = i*3;
        assert.ok(Number.isFinite(sim.positions[k]) && Number.isFinite(sim.positions[k+1]) && Number.isFinite(sim.positions[k+2]));
        assert.ok(Math.hypot(...sim.velocities.subarray(k,k+3)) <= 0.9 + params.tension * 4.7 + 0.00001);
      }
    }
    assert.ok(sim.trail.some(value => value > 0), 'Agents must deposit a sensed chemical trail');
    assert.ok(sim.trail.every(value => Number.isFinite(value) && value >= 0 && value <= 12));
  }
});
test('Changing an environment preserves identity and positions until agents act', () => {
  const {params,sim} = instrument(); const before = sim.positions.slice();
  applyPreset(params,2); assert.deepEqual(sim.positions,before);
  sim.step(1/60); assert.notDeepEqual(sim.positions,before);
});
test('Pointer and flocking controls alter actions, and suspension slows travel', () => {
  const a = instrument(), b = instrument(), c = instrument();
  b.params.pointer.active = true; b.params.pointer.x = 3;
  c.params.suspend = true;
  const before = a.sim.positions.slice();
  for (const state of [a,b,c]) state.sim.step(1/60);
  assert.notDeepEqual(a.sim.positions,b.sim.positions);
  const distance = state => state.sim.positions.reduce((sum,v,i)=>sum+(v-before[i])**2,0);
  assert.ok(distance(c) < distance(a) * 0.1);
  const d = instrument(); d.params.bond = 0;
  d.sim.step(1/60); assert.notDeepEqual(a.sim.velocities,d.sim.velocities);
});
test('Zero delta and reset do not retain hidden movement or chemical history', () => {
  const {sim} = instrument(); const before = sim.positions.slice(); sim.step(0);
  assert.deepEqual(sim.positions,before); sim.step(1/60); assert.ok(sim.trail.some(v=>v>0));
  sim.reset(); assert.ok(sim.trail.every(v=>v===0));
});
test('Fields describe normalized local directions without a soundtrack or clock', () => {
  const out = new Float32Array(2);
  for (let field=0; field<4; field++) for (const [x,y] of [[0,0],[8,4],[-6,3]]) {
    sampleFlow(x,y,field,0.5,out); assert.ok(Math.abs(Math.hypot(...out)-1)<0.00001);
  }
});
