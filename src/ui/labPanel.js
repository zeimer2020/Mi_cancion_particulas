import { PRESETS } from '../simulation/parameters.js';
import { SONG_URL } from '../audio/player.js';

const passages = [
  ['Entrada', 'Dejar aparecer la inquietud', 'Latente. Tensión baja; deja respirar el nudo antes de intervenir.', 0],
  ['Primera sección vocal', 'Contener y sostener', 'Reúne brevemente con W. Sigue las frases con arrastres pequeños, sin marcar cada golpe.', 0],
  ['Crecimiento hacia el estribillo', 'Abrir una dirección', 'Pasa a Corriente y aumenta tensión gradualmente. Suelta el ratón para observar la respuesta.', 1],
  ['Estribillos', 'Liberar la tensión', 'Fractura. Marca solo algunos acentos con Q; separa con Mayús y arrastre. Alterna intervención y espera.', 2],
  ['Contraste / menor densidad', 'Dejar una memoria', 'Huella. Sostén E durante una pausa expresiva; conserva rastros y evita reiniciar.', 3],
  ['Último crecimiento y cierre', 'Volver a romper; dejar un residuo', 'Regresa a Fractura si lo pide la música. Para el cierre, Huella: baja tensión y deja decantar.', 3],
];
const timeLabel = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export function createLabPanel({ params, callbacks }) {
  const root = document.querySelector('#interface');
  root.innerHTML = `
    <header class="topbar">
      <div class="identity"><span class="mark" aria-hidden="true">N<span>/</span>O</span><div><strong>NOT / OK</strong><small>INSTRUMENTO VISUAL · 01</small></div></div>
      <nav aria-label="Herramientas"><button id="help-button">Cómo tocar <kbd>?</kbd></button><button id="score-button">Partitura</button><button id="music-button">Música <span class="live-dot"></span></button><button id="fullscreen-button" title="Pantalla completa (F)" aria-label="Pantalla completa">⛶</button><button id="perform-button" class="perform">Presentar <span>↗</span></button></nav>
    </header>
    <div class="stage-caption"><span class="eyebrow">ESCUCHA. INTERVIENE. DEJA RESPONDER.</span><h1 id="state-name">Latente</h1><p id="state-description">Un nudo que respira</p></div>
    <div class="stage-side"><span>AGENTES AUTÓNOMOS</span><span>INTERPRETACIÓN HUMANA</span></div>
    <section class="console" aria-label="Controles del instrumento">
      <div class="console-top"><span class="eyebrow">CAMPO / ESTADO</span><span id="gesture-label" role="status">Gesto libre</span><button id="pause-button" aria-pressed="false">Pausar <kbd>P</kbd></button><button id="reset-button" title="Reiniciar agentes y borrar rastros">Reiniciar <kbd>R</kbd></button></div>
      <div class="console-body">
        <div class="pads" aria-label="Estados manuales">${PRESETS.map((p, i) => `<button class="pad ${i === 0 ? 'selected' : ''}" data-preset="${i}" aria-pressed="${i === 0}"><span class="pad-number">0${i + 1}</span><span>${p.name}</span><kbd>${i + 1}</kbd></button>`).join('')}</div>
        <div class="faders">${[['tension','Tensión','Reposo','Ruptura'],['bond','Vínculo','Individuo','Enjambre'],['memory','Memoria','Instante','Rastro']].map(([key,label,left,right]) => `<div class="fader"><label for="${key}">${label}<output id="${key}-value">0</output></label><input id="${key}" type="range" min="0" max="100" value="${Math.round(params[key] * 100)}" aria-label="${label}"><div class="range-extremes"><span>${left}</span><span>${right}</span></div></div>`).join('')}</div>
      </div>
      <div class="console-bottom"><div class="gestures"><button data-gesture="pulse"><kbd>Q</kbd> Fracturar</button><button data-gesture="gather"><kbd>W</kbd> Reunir</button><button data-gesture="suspend"><kbd>E</kbd> Suspender</button><span>Arrastra: atraer <i>·</i> Mayús: separar</span></div><span id="stats">Preparando escenario…</span></div>
    </section>
    <button id="return-button" class="return-button" hidden>Mostrar controles <kbd>H</kbd></button>
    <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-header"><span class="eyebrow">EL INSTRUMENTO</span><button data-close aria-label="Cerrar ayuda">×</button></div><h2 id="help-title">Tú conduces.<br>El sistema responde.</h2><p>Escucha <em>NOT OK</em> y decide cuándo reunir, abrir, romper o sostener. Los agentes siguen calculando sus acciones: una intervención cambia las condiciones, y su respuesta tarda en emerger.</p>
      <div class="help-grid"><div><h3>Tres decisiones</h3><p><b>Tensión:</b> velocidad máxima, fuerza de steering y apertura de sensores.<br><b>Vínculo:</b> alcance de percepción, alineación y cohesión.<br><b>Memoria:</b> permanencia del rastro y seguimiento de Physarum.</p></div><div><h3>Gestos</h3><p><kbd>1–4</kbd> Cambiar campo y parámetros, conservando agentes.<br><kbd>Q</kbd> Un acento de huida radial.<br><kbd>W</kbd> Mantener para buscar el centro.<br><kbd>E</kbd> Mantener para suspender el tiempo.<br>Arrastre para atraer; <kbd>Mayús</kbd> para huir.<br>Botón derecho para cambiar el punto de vista.</p></div></div>
      <details><summary>Cómo decide cada agente</summary><p>Conoce su posición y velocidad. Percibe hasta 24 vecinos a menos de 0,45–0,87 unidades y tres muestras del rastro delante de él. Consulta el campo en su propia posición.</p><p><b>Steering:</b> velocidad deseada − velocidad actual. Combina separación, alineación, cohesión, campo, rastro y gestos; limita la fuerza a 2,1–14,1 y la velocidad a 0,9–5,6 unidades por segundo.</p><p><b>Physarum:</b> compara sensores izquierdo, frontal y derecho. Orienta su steering hacia el rastro; cada agente deposita materia y el mapa común se difunde y evapora. El rastro vive en el plano XY; los agentes y el campo tienen profundidad Z.</p><p>El campo aporta dirección, flocking aporta organización local y Physarum conserva decisiones anteriores. No hay coreografía preprogramada ni lectura del audio.</p></details>
      <div class="help-footer"><label>Calidad <select id="quality"><option value="low">4.500 agentes · ligera</option><option value="medium" selected>9.000 agentes · equilibrada</option><option value="high">16.000 agentes · densa</option></select></label><p>Cambiar calidad reinicia los agentes. Elige la densidad antes de presentar.</p><p><kbd>F</kbd> Pantalla completa <i>·</i> <kbd>H</kbd> Ocultar controles <i>·</i> <kbd>P</kbd> Pausa visual <i>·</i> <kbd>R</kbd> Reiniciar <i>·</i> <kbd>M</kbd> Audio</p></div>
    </dialog>
    <dialog id="music-dialog" aria-labelledby="music-title"><div class="dialog-header"><span class="eyebrow">ACOMPAÑAMIENTO</span><button data-close aria-label="Cerrar música">×</button></div><h2 id="music-title">NOT OK</h2><p class="song-artist">5 Seconds of Summer</p><p>El audio acompaña tu interpretación. Tú decides todos los cambios visuales.</p><div class="audio-sources"><button id="youtube-button">Conectar YouTube</button><label class="file-button">Cargar MP3 / audio<input id="audio-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a"></label></div><p id="audio-source" class="audio-source">Elige cómo escuchar.</p><div id="youtube-container" class="youtube-container" hidden><div id="youtube-player"></div></div><div class="transport"><button id="play-button">Reproducir <kbd>M</kbd></button><button id="restart-audio">Desde el inicio</button><span id="audio-time">0:00 / 0:00</span></div><input id="audio-progress" type="range" aria-label="Posición de la canción" min="0" max="100" value="0"><p class="small-note">YouTube necesita conexión y puede mostrar anuncios. Un archivo local permite ensayar sin conexión. El archivo permanece en tu navegador.</p><a href="${SONG_URL}" target="_blank" rel="noopener noreferrer">Abrir la canción en YouTube ↗</a></dialog>
    <dialog id="score-dialog" aria-labelledby="score-title"><div class="dialog-header"><span class="eyebrow">PARTITURA DE ENSAYO</span><button data-close aria-label="Cerrar partitura">×</button></div><h2 id="score-title">Una guía.<br>Deja espacio a la escucha.</h2><p>Esta propuesta organiza intenciones por pasajes, sin imponer tiempos. Durante el ensayo marca tus entradas con el audio conectado. Las marcas nunca cambian el instrumento.</p><div class="score-rows">${passages.map(([name,intent,action,preset],i)=>`<article class="score-row"><span class="cue-index">0${i+1}</span><div><h3>${name}</h3><strong>${intent}</strong><p>${action}</p><button data-score-preset="${preset}">Tocar ${PRESETS[preset].name} ↗</button></div><div class="cue-time"><label for="cue-${i}">Entrada</label><input id="cue-${i}" data-cue="${i}" type="text" placeholder="m:ss" maxlength="7" aria-label="Tiempo de ${name}"><button data-mark="${i}">Marcar ahora</button></div></article>`).join('')}</div><div class="score-actions"><button id="export-score">Guardar partitura JSON ↓</button><span>Las marcas se conservan en este navegador.</span></div></dialog>
  `;
  const $ = selector => root.querySelector(selector);
  const dialogs = [...root.querySelectorAll('dialog')];
  function open(id) { callbacks.release(); $(id).showModal(); }
  $('#help-button').onclick = () => open('#help-dialog');
  $('#score-button').onclick = () => open('#score-dialog');
  $('#music-button').onclick = () => open('#music-dialog');
  root.querySelectorAll('[data-close]').forEach(button => button.onclick = () => button.closest('dialog').close());
  for (const dialog of dialogs) dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  $('#perform-button').onclick = callbacks.perform;
  $('#return-button').onclick = callbacks.perform;
  $('#fullscreen-button').onclick = callbacks.fullscreen;
  $('#pause-button').onclick = callbacks.pause;
  $('#reset-button').onclick = callbacks.reset;
  root.querySelectorAll('[data-preset],[data-score-preset]').forEach(button => button.onclick = () => callbacks.preset(Number(button.dataset.preset ?? button.dataset.scorePreset)));
  for (const key of ['tension','bond','memory']) {
    $(`#${key}`).addEventListener('input', event => { params[key] = Number(event.target.value) / 100; refresh(); });
  }
  root.querySelectorAll('[data-gesture]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      button.setPointerCapture(event.pointerId); callbacks.gesture(button.dataset.gesture, true); button.classList.add('held');
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { callbacks.gesture(button.dataset.gesture, false); button.classList.remove('held'); });
    button.addEventListener('keydown', event => { if (['Enter','Space'].includes(event.code) && !event.repeat) { event.preventDefault(); callbacks.gesture(button.dataset.gesture, true); button.classList.add('held'); } });
    button.addEventListener('keyup', event => { if (['Enter','Space'].includes(event.code)) { event.preventDefault(); callbacks.gesture(button.dataset.gesture, false); button.classList.remove('held'); } });
  });
  $('#quality').onchange = event => callbacks.quality(event.target.value);
  const trackButton = document.createElement('button'); trackButton.type = 'button'; trackButton.textContent = 'Usar canción incluida'; trackButton.onclick = callbacks.track;
  $('.audio-sources').prepend(trackButton);
  $('.file-button').tabIndex = 0; $('.file-button').setAttribute('role','button');
  $('.file-button').addEventListener('keydown',event => { if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); $('#audio-file').click(); } });
  $('#youtube-button').onclick = callbacks.youtube;
  $('#audio-file').onchange = event => { const file = event.target.files[0]; if (file) callbacks.audioFile(file); event.target.value = ''; };
  $('#play-button').onclick = callbacks.audioToggle;
  $('#restart-audio').onclick = () => callbacks.seek(0);
  $('#audio-progress').addEventListener('input', event => callbacks.seek(Number(event.target.value)));
  let cues = [];
  try { cues = JSON.parse(localStorage.getItem('not-ok-cues') || '[]'); if (!Array.isArray(cues)) cues = []; } catch { cues = []; }
  function storeCues() { try { localStorage.setItem('not-ok-cues', JSON.stringify(cues)); } catch { /* Private browsing may disallow storage. */ } }
  root.querySelectorAll('[data-cue]').forEach(input => { input.value = typeof cues[input.dataset.cue] === 'string' ? cues[input.dataset.cue] : ''; input.onchange = () => { cues[Number(input.dataset.cue)] = input.value; storeCues(); }; });
  root.querySelectorAll('[data-mark]').forEach(button => button.onclick = () => {
    const state = callbacks.audioState();
    if (!state.ready) { callbacks.notify('Conecta YouTube o carga un audio antes de marcar la entrada.'); return; }
    const index = Number(button.dataset.mark); cues[index] = timeLabel(state.time); $(`#cue-${index}`).value = cues[index]; storeCues();
  });
  $('#export-score').onclick = () => {
    const content = { song: 'NOT OK — 5 Seconds of Summer', url: SONG_URL, automatic: false, passages: passages.map(([passage,intention,intervention],i) => ({ passage,intention,intervention,time: cues[i] || null })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'NOT-OK-partitura.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  function refresh() {
    $('#state-name').textContent = params.name; $('#state-description').textContent = params.subtitle;
    root.querySelectorAll('[data-preset]').forEach(button => { const selected = Number(button.dataset.preset) === params.preset; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); });
    for (const key of ['tension','bond','memory']) { const value = Math.round(params[key] * 100); $(`#${key}`).value = value; $(`#${key}-value`).textContent = `${value}%`; }
  }
  function updateAudio(state, filename) {
    $('#play-button').innerHTML = `${state.playing ? 'Pausar audio' : 'Reproducir'} <kbd>M</kbd>`;
    if (filename) $('#audio-source').textContent = `Archivo local: ${filename}`;
    else if (state.source === 'track') $('#audio-source').textContent = 'Canción preparada · NOT OK — 5 Seconds of Summer';
    else if (state.source === 'youtube') $('#audio-source').textContent = state.error ? 'YouTube no disponible aquí · abre la canción o carga un audio' : state.ready ? 'YouTube conectado · NOT OK' : 'Conectando YouTube…';
    $('#youtube-container').hidden = state.source !== 'youtube';
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
    refresh, updateAudio, updateTime, open,
    get modalOpen() { return dialogs.some(dialog => dialog.open); },
    setPerformance(value) { root.classList.toggle('performing',value); $('#return-button').hidden = !value; },
    setPaused(value) { $('#pause-button').innerHTML = `${value ? 'Continuar' : 'Pausar'} <kbd>P</kbd>`; $('#pause-button').setAttribute('aria-pressed',String(value)); },
    setStats(fps,count) { $('#stats').textContent = `${count.toLocaleString('es-CO')} agentes · ${fps} fps`; },
    setQuality(value) { $('#quality').value = value; },
    setGesture(text) { $('#gesture-label').textContent = text; },
  };
}
