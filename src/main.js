import './styles.css';
import { applyPreset, createParameters, PARTICLE_COUNT, normalizeParticleCount } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { strike, releaseCharge } from './simulation/gestures.js';
import { createStage } from './renderer.js';
import { createLabPanel } from './ui/labPanel.js';
import { createPlayer } from './audio/player.js';

const mount = document.querySelector('#app'), params = createParameters();
let simulation, stage, panel, player;
let paused = false, performing = true, noticeTimer, lastTime = 0, accumulator = 0;
let lastPointerAt = 0, previousPointerX = 0, previousPointerY = 0;
let statsTime = 0, frameCount = 0, measureTime = 0, particleCount = PARTICLE_COUNT.initial;
let degraded = false, slowSeconds = 0;
const heldKeys = new Set(), heldPads = new Set();

function notify(message) {
  const notice = document.querySelector('#notice'); notice.textContent = message; notice.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('visible'),6000);
}
function updateGesture() {
  mount.dataset.vibrating = String(params.vibrate);
  mount.dataset.hey = String(params.hey);
  mount.dataset.hit = String(params.hitSerial);
  panel?.setGesture([params.hey && 'HEY', params.pulse > 0.1 && 'Golpe', params.gather && `Carga ${Math.round(params.charge * 100)}%`, params.suspend && 'Vacío', params.vibrate && 'Vibración', params.pointer.active && (params.pointer.repel ? 'Desgarrar' : 'Cortar corriente')].filter(Boolean).join(' + ') || 'Listo para el golpe');
}
function pulse(power = 1, spread = false, markBeat = false) {
  strike(params,power,spread,markBeat ? performance.now() / 1000 : undefined);
  updateGesture();
}
function gesture(name, active, source = 'pad') {
  const wasGathering = params.gather;
  const set = source === 'keyboard' ? heldKeys : heldPads;
  if (active) set.add(name); else set.delete(name);
  if (name === 'pulse' && active) pulse(1,false,true);
  params.gather = heldKeys.has('gather') || heldPads.has('gather');
  params.suspend = heldKeys.has('suspend') || heldPads.has('suspend');
  params.vibrate = heldKeys.has('vibrate') || heldPads.has('vibrate');
  params.hey = heldKeys.has('hey') || heldPads.has('hey');
  if (wasGathering && !params.gather) {
    releaseCharge(params);
  }
  updateGesture();
}
function release() {
  params.pointer.active = false; params.gather = false; params.suspend = false; params.vibrate = false; params.hey = false; params.charge = 0;
  params.pointer.vx = 0; params.pointer.vy = 0; lastPointerAt = 0;
  heldKeys.clear(); heldPads.clear();
  document.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
  updateGesture();
}
function preset(index) { release(); applyPreset(params,index); panel.refresh(); }
function perform() {
  release(); panel.closeDialogs(); performing = !performing;
  panel.setPerformance(performing); stage?.setPresentation(performing);
  mount.dataset.interface = performing ? 'hidden' : 'visible';
  document.querySelector('#notice').classList.remove('visible');
}
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { notify('El navegador no permitió pantalla completa. Prueba con F11.'); }
}
function pause() { release(); paused = !paused; accumulator = 0; panel.setPaused(paused); mount.dataset.paused = String(paused); }
function reset() { release(); params.pulse = 0; params.rebound = 0; simulation.reset(); stage.clear(); }

function bindCanvas() {
  const canvas = stage.canvas;
  let pressX = 0, pressY = 0, pressAt = 0, dragged = false;
  function point(event) {
    const point = stage.projectPointer(event.clientX,event.clientY);
    if (point) {
      const now = performance.now();
      if (lastPointerAt) {
        const dt = Math.max(0.008, Math.min(0.12,(now - lastPointerAt) / 1000));
        params.pointer.vx = Math.max(-95,Math.min(95,(point.x - previousPointerX) / dt));
        params.pointer.vy = Math.max(-95,Math.min(95,(point.y - previousPointerY) / dt));
      }
      params.pointer.x = point.x; params.pointer.y = point.y; params.pointer.repel = event.shiftKey;
      previousPointerX = point.x; previousPointerY = point.y; lastPointerAt = now;
    }
    updateGesture();
  }
  canvas.addEventListener('contextmenu',event => event.preventDefault());
  canvas.addEventListener('pointerdown',event => {
    if (event.button !== 0) return;
    pressX = event.clientX; pressY = event.clientY; pressAt = performance.now(); dragged = false;
    canvas.setPointerCapture(event.pointerId); params.pointer.active = true; point(event);
  });
  canvas.addEventListener('pointermove',event => { if (params.pointer.active) {
    if (Math.hypot(event.clientX - pressX,event.clientY - pressY) > 8) dragged = true;
    point(event);
  } });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,type => {
    if (type.type === 'pointerup' && type.button === 0 && params.pointer.active && !dragged && performance.now() - pressAt < 240) pulse();
    params.pointer.active = false; params.pointer.vx = 0; params.pointer.vy = 0; lastPointerAt = 0; updateGesture();
  });
  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault(); paused = true; panel?.setPaused(true); mount.dataset.status = 'context-lost';
    notify('La conexión con la GPU se perdió. Recarga la página para recuperar el escenario.');
  });
}
function initializeStage(nextCount) {
  release(); stage?.dispose(); particleCount = normalizeParticleCount(nextCount);
  simulation = createSimulation({params,count:particleCount});
  stage = createStage(mount,simulation,params); bindCanvas(); accumulator = 0;
  stage.setPresentation(performing);
  mount.dataset.agents = String(simulation.count); mount.dataset.status = 'running';
  panel?.setParticleCount(particleCount);
}

try {
  player = createPlayer({onChange: state => panel?.updateAudio(state),onError:notify});
  panel = createLabPanel({params,callbacks:{
    preset,perform,fullscreen,pause,reset,gesture,release,notify,
    particleCount: value => {
      const nextCount = normalizeParticleCount(value);
      if (nextCount !== particleCount) { degraded = true; initializeStage(nextCount); }
    },
    track: () => player.loadTrack(`${import.meta.env.BASE_URL}audio/not-ok.mp3`),
    audioFile: file => { player.loadFile(file); panel.updateAudio(player.state(),file.name); },
    audioToggle: () => void player.toggle(), seek: time => player.seek(time),
  }});
  initializeStage(particleCount);
  panel.setPerformance(performing); mount.dataset.interface = 'hidden';
  player.loadTrack(`${import.meta.env.BASE_URL}audio/not-ok.mp3`);
  const controls = {Digit1:()=>preset(0),Digit2:()=>preset(1),Digit3:()=>preset(2),Digit4:()=>preset(3),KeyF:fullscreen,KeyH:perform,KeyP:perform,KeyB:pause,KeyR:reset,KeyM:()=>void player.toggle()};
  const gestures = {Space:'hey',KeyQ:'pulse',KeyW:'gather',KeyE:'suspend',KeyV:'vibrate'};
  window.addEventListener('keydown',event => {
    if (event.defaultPrevented) return;
    if (event.code === 'Escape') {
      release(); if (panel.modalOpen) return;
      if (performing) perform(); return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { params.pointer.repel = true; updateGesture(); }
    const active = document.activeElement;
    const textEntry = active?.tagName === 'TEXTAREA' || (active?.tagName === 'INPUT' && !['range','button','file'].includes(active.type)) || active?.isContentEditable;
    if (event.ctrlKey || event.metaKey || event.altKey || textEntry) return;
    if (['KeyP','KeyH'].includes(event.code)) { event.preventDefault(); if (!event.repeat) perform(); return; }
    if (panel.modalOpen) {
      if (event.code === 'KeyM' && !event.repeat) { event.preventDefault(); void player.toggle(); }
      return;
    }
    if (controls[event.code] || gestures[event.code]) {
      event.preventDefault(); if (event.repeat) return;
      if (gestures[event.code]) gesture(gestures[event.code],true,'keyboard'); else controls[event.code]();
    }
  });
  window.addEventListener('keyup',event => {
    if (gestures[event.code]) gesture(gestures[event.code],false,'keyboard');
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { params.pointer.repel = false; updateGesture(); }
  });
  window.addEventListener('blur',release);
  document.addEventListener('visibilitychange',() => { release(); lastTime = 0; accumulator = 0; });
  window.addEventListener('resize',() => stage.resize());

  function frame(now) {
    const elapsed = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    const delta = Math.min(elapsed,1 / 15); lastTime = now;
    params.pointer.vx *= Math.exp(-delta * 14); params.pointer.vy *= Math.exp(-delta * 14);
    if (!paused) {
      // Fixed steps keep behavior independent of refresh rate. Limit catch-up work.
      accumulator = Math.min(accumulator + delta,2 / 60);
      while (accumulator >= 1 / 60) { simulation.step(1 / 60); accumulator -= 1 / 60; }
    }
    stage.draw(delta,paused,accumulator * 60);
    frameCount++; measureTime += elapsed; statsTime += elapsed;
    if (statsTime > 0.5) {
      const fps = Math.round(frameCount / measureTime); panel.setStats(fps,simulation.count);
      panel.updateTime(player.state()); updateGesture();
      mount.dataset.fps = String(fps); mount.dataset.preset = String(params.preset);
      if (fps < 26 && !document.hidden && !paused) slowSeconds += statsTime; else slowSeconds = 0;
      if (slowSeconds > 8 && !degraded && particleCount > PARTICLE_COUNT.initial) {
        degraded = true; notify('Para ganar fluidez, baja la cantidad de partículas en los controles.');
      }
      frameCount = 0; measureTime = 0; statsTime = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error); mount.dataset.status = 'error';
  mount.innerHTML = '<div class="startup-error"><h1>No se pudo abrir el escenario</h1><p>Este instrumento necesita WebGL. Activa la aceleración gráfica y prueba en Chrome o Edge actualizado.</p><button onclick="location.reload()">Volver a intentar</button></div>';
  notify(error.message);
}
