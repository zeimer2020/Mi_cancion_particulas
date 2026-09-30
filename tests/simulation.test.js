import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation/createSimulation.js';
import { createParameters, applyPreset, motionLimits } from '../src/simulation/parameters.js';
import { sampleFlow } from '../src/simulation/flowField.js';
import { strike, releaseCharge } from '../src/simulation/gestures.js';

function seeded(seed = 1234) { return () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
function instrument(count = 300) { const params = createParameters(); return { params, sim: createSimulation({params,count,random:seeded()}) }; }

test('All four environments stay finite and obey speed limits across sustained gestures', () => {
  for (let preset = 0; preset < 4; preset++) {
    const {params,sim} = instrument(); applyPreset(params,preset);
    for (let t = 0; t < 180; t++) {
      params.pointer.active = t < 40; params.pointer.repel = t < 20; params.pointer.x = 4;
      params.gather = t > 80 && t < 110;
      if (t === 55) params.pulse = 1;
      const speedLimit = motionLimits(params).speed;
      sim.step(1/60);
      for (let i = 0; i < sim.count; i++) {
        const k = i*3;
        assert.ok(Number.isFinite(sim.positions[k]) && Number.isFinite(sim.positions[k+1]) && Number.isFinite(sim.positions[k+2]));
        assert.ok(Math.hypot(...sim.velocities.subarray(k,k+3)) <= speedLimit + 0.00001);
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
  assert.deepEqual(sim.previousPositions,before,'Rendering must interpolate from the actual previous step');
  sim.reset(); assert.ok(sim.trail.every(v=>v===0));
  assert.deepEqual(sim.previousPositions,sim.positions,'Reset must not leave stale positions in the interpolated image');
});
test('Fields describe normalized local directions without a soundtrack or clock', () => {
  const out = new Float32Array(2);
  for (let field=0; field<4; field++) for (const [x,y] of [[0,0],[8,4],[-6,3]]) {
    sampleFlow(x,y,field,0.5,out); assert.ok(Math.abs(Math.hypot(...out)-1)<0.00001);
  }
});

test('Repeated manual bursts and fast hand strokes remain finite and bounded', () => {
  const {params,sim} = instrument(180); applyPreset(params,2);
  for (let frame = 0; frame < 300; frame++) {
    if (frame % 18 === 0) params.pulse = 1;
    params.pointer.active = frame % 50 < 25;
    params.pointer.x = Math.sin(frame * 0.09) * 12;
    params.pointer.y = Math.cos(frame * 0.07) * 7;
    params.pointer.vx = 32; params.pointer.vy = -32;
    params.gather = frame > 180;
    const limit = motionLimits(params).speed;
    sim.step(frame % 17 === 0 ? 0.5 : 1/60);
    assert.ok(sim.positions.every(Number.isFinite));
    for (let i = 0; i < sim.count; i++) {
      const k = i*3;
      assert.ok(Math.hypot(...sim.velocities.subarray(k,k+3)) <= limit + 0.00001);
    }
  }
});

test('A manual hit makes a large physical difference without teleporting agents', () => {
  const normal = instrument(), hit = instrument();
  const before = hit.sim.positions.slice();
  strike(hit.params);
  assert.deepEqual(hit.sim.positions,before);
  for (let frame=0; frame<12; frame++) { normal.sim.step(1/60); hit.sim.step(1/60); }
  const travel = sim => sim.positions.reduce((sum,value,i)=>sum+(value-before[i])**2,0);
  assert.ok(travel(hit.sim)>travel(normal.sim)*3,'A hit must move the agents, beyond a lighting change');
});

test('Holding charge compresses a wall and a human release opens it again', () => {
  const { params,sim } = instrument(420);
  const spreadX = () => {
    let sum=0, square=0;
    for (let i=0;i<sim.count;i++) { const x=sim.positions[i*3]; sum+=x; square+=x*x; }
    return Math.sqrt(square/sim.count-(sum/sim.count)**2);
  };
  params.gather=true;
  for(let frame=0;frame<100;frame++) sim.step(1/60);
  const compressed=spreadX();
  assert.ok(compressed<1,'Charging must visibly narrow the wall');
  assert.equal(params.charge,1);
  const before = sim.positions.slice();
  params.gather=false; releaseCharge(params);
  assert.deepEqual(sim.positions,before);
  assert.equal(params.spreadBurst,true);
  for(let frame=0;frame<24;frame++) sim.step(1/60);
  assert.ok(spreadX()>compressed*4+3,'The release must open a wide volume again');
});

test('An empty charge release does not create a hidden automatic hit', () => {
  const {params}=instrument();
  releaseCharge(params); assert.equal(params.pulse,0);
  params.pointer.active=true; params.pointer.x=5; params.pointer.y=-2;
  strike(params); assert.equal(params.pulseX,5); assert.equal(params.pulseY,-2);
});

test('Vibration moves the whole volume with repeated direction reversals and no light hit', () => {
  const vibrating=instrument(420), normal=instrument(420);
  const before=vibrating.sim.positions.slice();
  vibrating.params.vibrate=true;
  assert.deepEqual(vibrating.sim.positions,before);
  let changes=0, previousSign=0, minVelocity=Infinity, maxVelocity=-Infinity;
  let minCenter=Infinity, maxCenter=-Infinity;
  for(let frame=0;frame<180;frame++) {
    const limit=motionLimits(vibrating.params).speed;
    vibrating.sim.step(1/60); normal.sim.step(1/60);
    let velocity=0, center=0;
    for(let i=0;i<vibrating.sim.count;i++) {
      const k=i*3;
      velocity+=vibrating.sim.velocities[k]; center+=vibrating.sim.positions[k];
      assert.ok(Math.hypot(...vibrating.sim.velocities.subarray(k,k+3))<=limit+0.00001);
    }
    velocity/=vibrating.sim.count; center/=vibrating.sim.count;
    const sign=Math.sign(velocity);
    if(previousSign && previousSign!==sign) changes++;
    previousSign=sign;
    minVelocity=Math.min(minVelocity,velocity); maxVelocity=Math.max(maxVelocity,velocity);
    minCenter=Math.min(minCenter,center); maxCenter=Math.max(maxCenter,center);
  }
  assert.ok(changes>=25,'The wall must repeatedly reverse, not drift in one direction');
  assert.ok(minVelocity < -10 && maxVelocity > 10);
  assert.ok(maxCenter-minCenter>0.65,'The collective movement must have visible amplitude');
  for(let i=0;i<vibrating.sim.count;i++) {
    const k=i*3;
    assert.notDeepEqual(vibrating.sim.positions.subarray(k,k+3),normal.sim.positions.subarray(k,k+3));
  }
  assert.equal(vibrating.params.pulse,0); assert.equal(vibrating.params.hitSerial,0);
  vibrating.params.vibrate=false; vibrating.sim.step(1/60);
  const limit=motionLimits(vibrating.params).speed;
  for(let i=0;i<vibrating.sim.count;i++) assert.ok(Math.hypot(...vibrating.sim.velocities.subarray(i*3,i*3+3))<=limit+0.00001);
  assert.ok(vibrating.sim.positions.every(Number.isFinite));
});

test('Resting currents travel across the screen with continuous changes in direction', () => {
  const {sim}=instrument(600), start=sim.positions.slice();
  let continuity=0,samples=0;
  for(let frame=0;frame<720;frame++) {
    const velocity=sim.velocities.slice(), previous=sim.positions.slice();
    sim.step(1/60);
    assert.deepEqual(sim.previousPositions,previous);
    for(let i=0;i<sim.count;i++) {
      const k=i*3;
      assert.ok(Math.abs(sim.positions[k])<18 && Math.abs(sim.positions[k+1])<12);
      if(frame<=60) continue;
      const length=Math.hypot(...velocity.subarray(k,k+3))*Math.hypot(...sim.velocities.subarray(k,k+3));
      if(length>1) {
        continuity+=(velocity[k]*sim.velocities[k]+velocity[k+1]*sim.velocities[k+1]+velocity[k+2]*sim.velocities[k+2])/length;
        samples++;
      }
    }
  }
  let traveled=0;
  for(let i=0;i<sim.count;i++) {
    const k=i*3;
    if(Math.hypot(sim.positions[k]-start[k],sim.positions[k+1]-start[k+1])>10)traveled++;
  }
  assert.ok(traveled>sim.count*0.5,'Most agents should roam across broad regions rather than stay tethered to their origin');
  assert.ok(continuity/samples>0.99,'Resting currents should change direction gradually');
});

test('Manual pulse timings shape duration immediately and never schedule another hit', () => {
  const fast=instrument(), slow=instrument();
  const before=fast.sim.positions.slice();
  for(const time of [0,0.4,0.8]) strike(fast.params,1,false,time);
  for(const time of [0,0.8,1.6]) strike(slow.params,1,false,time);
  assert.equal(fast.params.pulse,1);
  assert.equal(slow.params.pulse,1);
  assert.ok(fast.params.pulseDuration<slow.params.pulseDuration*0.75);
  assert.equal(fast.params.rhythm.measured,true);
  const serial=fast.params.hitSerial;
  assert.deepEqual(fast.sim.positions,before);
  for(let frame=0;frame<180;frame++)fast.sim.step(1/60);
  assert.equal(fast.params.pulse,0); assert.equal(fast.params.rebound,0);
  assert.equal(fast.params.hitSerial,serial,'Silence from the performer must never trigger repeated beats');
  assert.equal(fast.params.rhythm.beatSeconds,0.4);
  strike(fast.params,1,false,8);
  strike(fast.params,1,false,8.6);
  assert.ok(Math.abs(fast.params.rhythm.beatSeconds-0.6)<1e-9,'A new phrase must be able to set a new pulse');
});

test('A one-beat charge compacts the volume and short releases have less force', () => {
  const short=instrument(420), full=instrument(420);
  const spread=sim=>{
    let sum=0,square=0;
    for(let i=0;i<sim.count;i++){const x=sim.positions[i*3];sum+=x;square+=x*x;}
    return Math.sqrt(square/sim.count-(sum/sim.count)**2);
  };
  const initial=spread(full.sim);
  for(const state of [short,full])state.params.gather=true;
  for(let frame=0;frame<24;frame++){
    full.sim.step(1/60); if(frame<8)short.sim.step(1/60);
  }
  assert.ok(spread(full.sim)<initial*0.2,'A musical beat should be enough to create a tight column');
  for(const state of [short,full]){state.params.gather=false;releaseCharge(state.params);}
  assert.ok(short.params.pulse>0 && short.params.pulse<full.params.pulse);
  assert.equal(full.params.pulse,1);
});

test('Successive hand accents pinch the volume in alternating directions and preserve local click origin', () => {
  const {params,sim}=instrument(420);
  const velocity=()=>{let sum=0;for(let i=0;i<sim.count;i++)sum+=sim.velocities[i*3];return sum/sim.count;};
  strike(params,1,false,0);
  for(let frame=0;frame<10;frame++)sim.step(1/60);
  assert.ok(velocity() < -5,'The first hit must have a physical leftward attack');
  for(let frame=0;frame<16;frame++)sim.step(1/60);
  strike(params,1,false,26/60);
  for(let frame=0;frame<10;frame++)sim.step(1/60);
  assert.ok(velocity() > 5,'The next hit must make a distinct rightward attack');
  params.pointer.active=true;params.pointer.x=5;params.pointer.y=-2;
  strike(params); params.pointer.active=false;
  assert.equal(params.localHit,true,'A mouse release must not lose the local nature of its accent');
  assert.equal(params.pulseX,5);assert.equal(params.pulseY,-2);
});
