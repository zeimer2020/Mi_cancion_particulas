export const SONG_URL = 'https://www.youtube.com/watch?v=-qNW-jD4dsY';

// Transport only. No analyser, beat detector, microphone, or simulation dependency.
export function createPlayer({ onChange, onError }) {
  const audio = new Audio(); audio.preload = 'metadata';
  let objectUrl, youtube, source = 'none', youtubeReady = false;
  let youtubeState = -1, youtubeLoading, youtubeError = false;
  const isAudio = () => source === 'local' || source === 'track';
  const state = () => ({
    source, error: source === 'youtube' && youtubeError, ready: isAudio() ? !!audio.src : youtubeReady,
    playing: isAudio() ? !audio.paused : youtubeState === 1,
    time: isAudio() ? audio.currentTime : (youtubeReady ? youtube.getCurrentTime() : 0),
    duration: isAudio() ? (Number.isFinite(audio.duration) ? audio.duration : 0) : (youtubeReady ? youtube.getDuration() : 0),
  });
  for (const event of ['play', 'pause', 'ended', 'loadedmetadata']) audio.addEventListener(event, () => onChange(state()));
  audio.addEventListener('error', () => onError('No se pudo reproducir el archivo. Prueba con un MP3, WAV u OGG válido.'));
  function pause() {
    audio.pause();
    if (youtubeReady) youtube.pauseVideo();
  }
  async function loadYoutube() {
    pause(); source = 'youtube';
    if (youtubeReady) { onChange(state()); return; }
    if (youtubeLoading) return youtubeLoading;
    youtubeError = false;
    youtubeLoading = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No se pudo conectar con YouTube. Usa un archivo local o abre la canción en otra pestaña.')), 18000);
      function initialize() {
        if (youtube) {
          youtube.destroy();
          const host = document.createElement('div'); host.id = 'youtube-player';
          document.querySelector('#youtube-container').replaceChildren(host);
        }
        youtube = new window.YT.Player('youtube-player', {
          videoId: '-qNW-jD4dsY', width: '100%', height: '100%',
          playerVars: { playsinline: 1, rel: 0, origin: location.origin },
          events: {
            onReady() { clearTimeout(timeout); youtubeReady = !youtubeError; onChange(state()); resolve(); },
            onStateChange(event) { youtubeState = event.data; if (source === 'youtube') onChange(state()); },
            onError() {
              clearTimeout(timeout); youtubeError = true; youtubeReady = false; youtubeLoading = undefined;
              const message = 'YouTube no permite reproducir aquí este video. Usa Abrir canción o carga un archivo local.';
              if (source === 'youtube') { onChange(state()); onError(message); }
              reject(new Error(message));
            },
          },
        });
      }
      if (window.YT?.Player) initialize();
      else {
        window.onYouTubeIframeAPIReady = initialize;
        if (!document.querySelector('script[data-youtube]')) {
          const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.dataset.youtube = 'true';
          script.onerror = () => { clearTimeout(timeout); reject(new Error('YouTube no está disponible. Puedes cargar un archivo local.')); };
          document.head.append(script);
        }
      }
    }).catch(error => { youtubeLoading = undefined; youtubeError = true; onChange(state()); onError(error.message); throw error; });
    return youtubeLoading;
  }
  function loadFile(file) {
    pause(); if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file); audio.src = objectUrl; source = 'local';
    onChange(state());
  }
  function loadTrack(url) {
    pause(); if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined; }
    audio.src = url; source = 'track'; onChange(state());
  }
  async function toggle() {
    if (source === 'none') { onError('Elige YouTube o carga un archivo de audio para acompañar tu interpretación.'); return; }
    if (state().playing) pause();
    else if (isAudio()) { try { await audio.play(); } catch { onError('Pulsa de nuevo Reproducir para iniciar el audio.'); } }
    else if (youtubeReady) youtube.playVideo();
    else onError('YouTube no está disponible dentro del instrumento. Abre la canción en otra pestaña o carga un audio local.');
  }
  function seek(time) {
    if (isAudio() && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, time));
    else if (youtubeReady) youtube.seekTo(time, true);
  }
  return { state, loadYoutube, loadFile, loadTrack, toggle, seek, pause,
    dispose() { pause(); if (objectUrl) URL.revokeObjectURL(objectUrl); youtube?.destroy(); },
  };
}
