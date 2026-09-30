import './styles.css';
import { applyPreset, createParameters, QUALITY } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { createStage } from './renderer.js';
import { createLabPanel } from './ui/labPanel.js';
import { createPlayer } from './audio/player.js';

const mount = document.querySelector('#app'), params = createParameters();
let simulation, stage, panel, player;
let paused = false, performing = false, noticeTimer, lastTime = 0, accumulator = 0;
let statsTime = 0, frameCount = 0, measureTime = 0, quality = innerWidth < 700 ? 'low' : 'medium';
let degraded = false, slowSeconds = 0;
const heldKeys = new Set(), heldPads = new Set();

function notify(message) {
  const notice = document.querySelector('#notice'); notice.textContent = message; notice.classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('visible'),6000);
}
function updateGesture() {
  panel?.setGesture([params.pulse > 0.1 && 'Fractura', params.gather && 'Reunir', params.suspend && 'Suspender', params.pointer.active && (params.pointer.repel ? 'Separar' : 'Atraer')].filter(Boolean).join(' + ') || 'Gesto libre');
}
function pulse() {
  params.pulse = 1;
  params.pulseX = params.pointer.active ? params.pointer.x : 0;
  params.pulseY = params.pointer.active ? params.pointer.y : 0;
}
function gesture(name, active, source = 'pad') {
  const set = source === 'keyboard' ? heldKeys : heldPads;
  if (active) set.add(name); else set.delete(name);
  if (name === 'pulse' && active) pulse();
  params.gather = heldKeys.has('gather') || heldPads.has('gather');
  params.suspend = heldKeys.has('suspend') || heldPads.has('suspend');
  updateGesture();
}
function release() {
  params.pointer.active = false; params.gather = false; params.suspend = false;
  heldKeys.clear(); heldPads.clear();
  document.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
  updateGesture();
}
function preset(index) { release(); applyPreset(params,index); panel.refresh(); }
function perform() { release(); performing = !performing; panel.setPerformance(performing); notify(performing ? 'H para volver a los controles · F para pantalla completa' : 'Controles visibles'); }
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { notify('El navegador no permitió pantalla completa. Prueba con F11.'); }
}
function pause() { release(); paused = !paused; accumulator = 0; panel.setPaused(paused); mount.dataset.paused = String(paused); }
function reset() { release(); params.pulse = 0; simulation.reset(); stage.clear(); notify('Agentes reiniciados · rastros borrados'); }

function bindCanvas() {
  const canvas = stage.canvas;
  function point(event) {
    const point = stage.projectPointer(event.clientX,event.clientY);
    if (point) { params.pointer.x = point.x; params.pointer.y = point.y; params.pointer.repel = event.shiftKey; }
    updateGesture();
  }
  canvas.addEventListener('contextmenu',event => event.preventDefault());
  canvas.addEventListener('pointerdown',event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId); params.pointer.active = true; point(event);
  });
  canvas.addEventListener('pointermove',event => { if (params.pointer.active) point(event); });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,() => { params.pointer.active = false; updateGesture(); });
  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault(); paused = true; panel?.setPaused(true); mount.dataset.status = 'context-lost';
    notify('La conexión con la GPU se perdió. Recarga la página para recuperar el escenario.');
  });
}
function initializeStage(nextQuality, announce = true) {
  release(); stage?.dispose(); quality = nextQuality;
  simulation = createSimulation({params,count:QUALITY[quality]});
  stage = createStage(mount,simulation,params); bindCanvas(); accumulator = 0;
  mount.dataset.agents = String(simulation.count); mount.dataset.status = 'running';
  panel?.setQuality(quality);
  if (announce) notify(`Calidad ${quality === 'high' ? 'densa' : quality === 'medium' ? 'equilibrada' : 'ligera'} · nuevos agentes`);
}

try {
  player = createPlayer({onChange: state => panel?.updateAudio(state),onError:notify});
  panel = createLabPanel({params,callbacks:{
    preset,perform,fullscreen,pause,reset,gesture,release,notify,
    quality: value => { degraded = true; initializeStage(value); },
    youtube: async () => { panel.updateAudio({source:'youtube',ready:false,playing:false}); try { await player.loadYoutube(); } catch { /* The player reports the error. */ } },
    track: () => player.loadTrack(`${import.meta.env.BASE_URL}audio/not-ok.mp3`),
    audioFile: file => { player.loadFile(file); panel.updateAudio(player.state(),file.name); },
    audioToggle: () => void player.toggle(), seek: time => player.seek(time), audioState: () => player.state(),
  }});
  initializeStage(quality,false);
  player.loadTrack(`${import.meta.env.BASE_URL}audio/not-ok.mp3`);
  const controls = {Digit1:()=>preset(0),Digit2:()=>preset(1),Digit3:()=>preset(2),Digit4:()=>preset(3),KeyF:fullscreen,KeyH:perform,KeyP:pause,KeyR:reset,KeyM:()=>void player.toggle()};
  const gestures = {KeyQ:'pulse',KeyW:'gather',KeyE:'suspend'};
  window.addEventListener('keydown',event => {
    if (event.code === 'Escape') { release(); if (performing) { performing = false; panel.setPerformance(false); } return; }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { params.pointer.repel = true; updateGesture(); }
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
    if (panel.modalOpen) {
      if (event.code === 'KeyM' && !event.repeat) { event.preventDefault(); void player.toggle(); }
      return;
    }
    if (event.key === '?' && !event.repeat) { panel.open('#help-dialog'); return; }
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
    if (!paused) {
      // Fixed steps keep behavior independent of refresh rate. Limit catch-up work.
      accumulator = Math.min(accumulator + delta,2 / 60);
      while (accumulator >= 1 / 60) { simulation.step(1 / 60); accumulator -= 1 / 60; }
    }
    stage.draw(delta,paused);
    frameCount++; measureTime += elapsed; statsTime += elapsed;
    if (statsTime > 0.5) {
      const fps = Math.round(frameCount / measureTime); panel.setStats(fps,simulation.count);
      panel.updateTime(player.state()); updateGesture();
      mount.dataset.fps = String(fps); mount.dataset.preset = String(params.preset);
      if (fps < 26 && !document.hidden && !paused) slowSeconds += statsTime; else slowSeconds = 0;
      if (slowSeconds > 8 && !degraded && quality !== 'low') {
        degraded = true; notify('Para ganar fluidez, puedes elegir calidad ligera en Cómo tocar. Cambiar calidad reinicia los agentes.');
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
