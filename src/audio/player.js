// Local transport only. No network player, audio analysis, or simulation dependency.
export function createPlayer({ onChange, onError }) {
  const audio = new Audio(); audio.preload = 'metadata';
  let objectUrl, source = 'none';
  const state = () => ({
    source, ready: !!audio.src,
    playing: !audio.paused && !audio.ended,
    time: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
  });
  for (const event of ['play','pause','ended','loadedmetadata']) audio.addEventListener(event, () => onChange(state()));
  audio.addEventListener('error', () => onError('No se pudo reproducir el archivo. Prueba con un MP3, WAV u OGG válido.'));
  function pause() { audio.pause(); }
  function unload() {
    pause();
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; }
  }
  function loadFile(file) {
    unload(); objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl; source = 'local'; onChange(state());
  }
  function loadTrack(url) { unload(); audio.src = url; source = 'track'; onChange(state()); }
  async function toggle() {
    if (!audio.src) { onError('Carga un audio para acompañar tu interpretación.'); return; }
    if (state().playing) pause();
    else { try { await audio.play(); } catch { onError('Pulsa de nuevo Reproducir para iniciar el audio.'); } }
  }
  function seek(time) {
    if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0,Math.min(audio.duration,time));
  }
  return { state,loadFile,loadTrack,toggle,seek,pause,dispose:unload };
}
