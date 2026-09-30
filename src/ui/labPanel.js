import { PRESETS, PARTICLE_COUNT, normalizeParticleCount } from '../simulation/parameters.js';

const playIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z" fill="currentColor"/></svg>';
const pauseIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zm5 0h3v12h-3z" fill="currentColor"/></svg>';
const controlsIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3v14M10 3v14M16 3v14M2 7h4M8 13h4M14 8h4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

const timeLabel = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export function createLabPanel({ params, callbacks }) {
  const root = document.querySelector('#interface');
  root.innerHTML = `
    <header class="topbar">
      <div class="identity"><span class="mark" aria-hidden="true">N<span>/</span>O</span><div><strong>NOT / OK</strong><small>INSTRUMENTO VISUAL · 01</small></div></div>
      <nav aria-label="Herramientas"><button id="music-button">Música <span class="live-dot"></span></button><button id="fullscreen-button" title="Pantalla completa (F)" aria-label="Pantalla completa">⛶</button><button id="perform-button" class="perform">Presentar <span>↗</span></button></nav>
    </header>
    <div class="stage-caption"><span class="eyebrow">CARGA. SUELTA. GOLPEA.</span><h1 id="state-name">Riff</h1><p id="state-description">Un muro de materia eléctrica</p></div>
    <div class="stage-side"><span>AGENTES AUTÓNOMOS</span><span>INTERPRETACIÓN HUMANA</span></div>
    <section class="console" aria-label="Controles del instrumento">
      <div class="console-top"><span class="eyebrow">CAMPO / ESTADO</span><span id="gesture-label" role="status">Listo para el golpe</span><button id="pause-button" aria-pressed="false">Pausar imagen <kbd>B</kbd></button><button id="reset-button" title="Reiniciar agentes y borrar rastros">Reiniciar <kbd>R</kbd></button><div class="particle-amount"><label for="particle-count">Partículas <output id="particle-count-value" for="particle-count">4.500</output></label><input id="particle-count" type="range" aria-label="Cantidad de partículas" min="${PARTICLE_COUNT.min}" max="${PARTICLE_COUNT.max}" step="${PARTICLE_COUNT.step}" value="${PARTICLE_COUNT.initial}"></div></div>
      <div class="console-body">
        <div class="pads" aria-label="Estados manuales">${PRESETS.map((p, i) => `<button class="pad ${i === 0 ? 'selected' : ''}" data-preset="${i}" aria-pressed="${i === 0}"><span class="pad-number">0${i + 1}</span><span>${p.name}</span><kbd>${i + 1}</kbd></button>`).join('')}</div>
        <div class="faders">${[['tension','Tensión','Reposo','Ruptura'],['bond','Vínculo','Individuo','Enjambre'],['memory','Memoria','Instante','Rastro']].map(([key,label,left,right]) => `<div class="fader"><label for="${key}">${label}<output id="${key}-value">0</output></label><input id="${key}" type="range" min="0" max="100" value="${Math.round(params[key] * 100)}" aria-label="${label}"><div class="range-extremes"><span>${left}</span><span>${right}</span></div></div>`).join('')}</div>
      </div>
      <div class="console-bottom"><div class="gestures"><button data-gesture="pulse" title="Q: golpe inmediato; marca tu pulso"><kbd>Q</kbd> Pulso</button><button data-gesture="gather" title="Comprime y suelta en la entrada que escuchas"><kbd>W</kbd> Comprimir / soltar</button><button data-gesture="suspend"><kbd>E</kbd> Vacío</button><button data-gesture="vibrate" title="Mantén V: temblor siguiendo el pulso que marcas con Q"><kbd>V</kbd> Vibrar</button><button data-gesture="hey" title="Mantén Espacio para mostrar HEY"><kbd>Espacio</kbd> HEY</button></div><div class="readouts"><span id="manual-pulse">Q marca tu pulso</span><span id="stats">Preparando escenario…</span></div></div>
    </section>
    <div class="stage-tools"><button id="quick-audio-button" aria-label="Reproducir canción" title="Reproducir canción (M)" aria-pressed="false">${playIcon}</button><button id="return-button" class="return-button" hidden aria-label="Mostrar controles" title="Mostrar controles (P)">${controlsIcon}</button></div>
    <dialog id="music-dialog" aria-labelledby="music-title"><div class="dialog-header"><span class="eyebrow">ACOMPAÑAMIENTO</span><button data-close aria-label="Cerrar música">×</button></div><h2 id="music-title">NOT OK</h2><p class="song-artist">5 Seconds of Summer</p><p>Tu MP3 está preparado. Pulsa M o el botón pequeño de la esquina para reproducir o pausar, incluso con la interfaz oculta.</p><div class="audio-sources"><button id="track-button">Usar tu MP3 incluido</button><label class="file-button">Cargar otro audio<input id="audio-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a"></label></div><p id="audio-source" class="audio-source">MP3 local</p><div class="transport"><button id="play-button">Reproducir <kbd>M</kbd></button><button id="restart-audio">Desde el inicio</button><span id="audio-time">0:00 / 0:00</span></div><input id="audio-progress" type="range" aria-label="Posición de la canción" min="0" max="100" value="0"><p class="small-note">La canción se reproduce desde el proyecto. Si cargas otro archivo, permanece en tu navegador. La música acompaña; tú conduces los agentes.</p></dialog>

  `;
  const $ = selector => root.querySelector(selector);
  const dialogs = [...root.querySelectorAll('dialog')];
  function open(id) { callbacks.release(); $(id).showModal(); }
  $('#music-button').onclick = () => open('#music-dialog');
  root.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
  for (const dialog of dialogs) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  $('#perform-button').onclick = callbacks.perform;
  $('#return-button').onclick = callbacks.perform;
  $('#quick-audio-button').onclick = callbacks.audioToggle;
  $('#fullscreen-button').onclick = callbacks.fullscreen;
  $('#pause-button').onclick = callbacks.pause;
  $('#reset-button').onclick = callbacks.reset;
  root.querySelectorAll('[data-preset]').forEach(button => button.onclick = () => callbacks.preset(Number(button.dataset.preset)));
  for (const key of ['tension','bond','memory']) {
    $(`#${key}`).addEventListener('input', event => { params[key] = Number(event.target.value) / 100; refresh(); });
  }
  root.querySelectorAll('[data-gesture]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      button.setPointerCapture(event.pointerId); callbacks.gesture(button.dataset.gesture, true); button.classList.add('held');
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { callbacks.gesture(button.dataset.gesture, false); button.classList.remove('held'); });
    button.addEventListener('keydown', event => { if (event.code === 'Enter' && !event.repeat) { event.preventDefault(); callbacks.gesture(button.dataset.gesture, true); button.classList.add('held'); } });
    button.addEventListener('keyup', event => { if (event.code === 'Enter') { event.preventDefault(); callbacks.gesture(button.dataset.gesture, false); button.classList.remove('held'); } });
  });
  const particleCount = $('#particle-count'), countValue = $('#particle-count-value');
  particleCount.addEventListener('input', () => { countValue.textContent = normalizeParticleCount(particleCount.value).toLocaleString('es-CO'); });
  particleCount.addEventListener('change', () => callbacks.particleCount(particleCount.value));
  $('#track-button').onclick = callbacks.track;
  $('.file-button').tabIndex = 0; $('.file-button').setAttribute('role','button');
  $('.file-button').addEventListener('keydown',event => { if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); $('#audio-file').click(); } });
  $('#audio-file').onchange = event => { const file = event.target.files[0]; if (file) callbacks.audioFile(file); event.target.value = ''; };
  $('#play-button').onclick = callbacks.audioToggle;
  $('#restart-audio').onclick = () => callbacks.seek(0);
  $('#audio-progress').addEventListener('input', event => callbacks.seek(Number(event.target.value)));
  function refresh() {
    $('#state-name').textContent = params.name; $('#state-description').textContent = params.subtitle;
    root.querySelectorAll('[data-preset]').forEach(button => { const selected = Number(button.dataset.preset) === params.preset; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); });
    for (const key of ['tension','bond','memory']) { const value = Math.round(params[key] * 100); $(`#${key}`).value = value; $(`#${key}-value`).textContent = `${value}%`; }
  }
  function updateAudio(state, filename) {
    $('#play-button').innerHTML = `${state.playing ? 'Pausar audio' : 'Reproducir'} <kbd>M</kbd>`;
    const quick = $('#quick-audio-button');
    quick.innerHTML = state.playing ? pauseIcon : playIcon;
    quick.setAttribute('aria-label',state.playing ? 'Pausar canción' : 'Reproducir canción');
    quick.setAttribute('aria-pressed',String(state.playing)); quick.title = `${state.playing ? 'Pausar' : 'Reproducir'} canción (M)`;
    quick.disabled = !state.ready;
    if (filename) $('#audio-source').textContent = `Archivo local: ${filename}`;
    else if (state.source === 'track') $('#audio-source').textContent = 'Tu MP3 · NOT OK — 5 Seconds of Summer';
    $('.live-dot').classList.toggle('on',state.playing);
  }
  function updateTime(state) {
    $('#audio-time').textContent = `${timeLabel(state.time)} / ${timeLabel(state.duration)}`;
    const input = $('#audio-progress'); input.max = state.duration || 1;
    if (document.activeElement !== input) input.value = state.time;
    input.disabled = !state.ready;
  }
  refresh();
  return {
    refresh, updateAudio, updateTime,
    get modalOpen() { return dialogs.some(dialog => dialog.open); },
    setPerformance(value) { root.classList.toggle('performing',value); $('#return-button').hidden = !value; },
    setPaused(value) { $('#pause-button').innerHTML = `${value ? 'Continuar imagen' : 'Pausar imagen'} <kbd>B</kbd>`; $('#pause-button').setAttribute('aria-pressed',String(value)); },
    closeDialogs() { dialogs.forEach(dialog => { if (dialog.open) dialog.close(); }); },
    setStats(fps,count) { $('#stats').textContent = `${count.toLocaleString('es-CO')} agentes · ${fps} fps`; },
    setParticleCount(value) { particleCount.value = value; countValue.textContent = value.toLocaleString('es-CO'); },
    setGesture(text) {
      $('#gesture-label').textContent = text;
      $('#manual-pulse').textContent = params.rhythm.measured ? `Pulso manual · ${Math.round(60 / params.rhythm.beatSeconds)} / min` : 'Q marca tu pulso';
      $('[data-gesture=gather]').classList.toggle('held',params.gather);
      $('[data-gesture=suspend]').classList.toggle('held',params.suspend);
      $('[data-gesture=vibrate]').classList.toggle('held',params.vibrate);
      $('[data-gesture=hey]').classList.toggle('held',params.hey);
    },
  };
}
