import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import './styles.css';

import { createParameters } from './simulation/parameters.js';
import { createSimulation } from './simulation/createSimulation.js';
import { createLabPanel } from './ui/labPanel.js';

const PARTICLE_COUNT = 131072;
const SHAPES = ['CÍRCULO', 'TRIÁNGULO', 'CUADRADO'];

function approach(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function isTextEntry(element) {
  if (!element) return false;

  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  if (
    element instanceof HTMLElement &&
    element.isContentEditable
  ) {
    return true;
  }

  if (!(element instanceof HTMLInputElement)) {
    return false;
  }

  return [
    'text',
    'search',
    'email',
    'number',
    'password',
    'url',
    'tel'
  ].includes(element.type);
}

async function main() {
  const mount = document.querySelector('#app');

  if (!mount) {
    throw new Error('No existe el contenedor #app.');
  }

  if (!WebGPU.isAvailable()) {
    mount.appendChild(WebGPU.getErrorMessage());

    throw new Error(
      'Este proyecto requiere WebGPU para ejecutar compute shaders.'
    );
  }

  // ESCENA 3D ------------------------------------------------------------

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050607');

  const camera = new THREE.PerspectiveCamera(
    50,
    innerWidth / innerHeight,
    0.05,
    100
  );

  camera.position.set(0, 2.2, 11.5);

  const renderer = new THREE.WebGPURenderer({
    antialias: true
  });

  renderer.setPixelRatio(
    Math.min(devicePixelRatio, 2)
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.domElement.style.touchAction = 'none';

  mount.appendChild(
    renderer.domElement
  );

  await renderer.init();

  // NAVEGACIÓN 3D --------------------------------------------------------

  const canvas = renderer.domElement;

  const orbit = new OrbitControls(
    camera,
    canvas
  );

  orbit.enableDamping = true;
  orbit.dampingFactor = 0.075;
  orbit.enablePan = false;
  orbit.minDistance = 5.2;
  orbit.maxDistance = 22;
  orbit.target.set(0, 0, 0);

  // El clic izquierdo pertenece al instrumento.
  orbit.mouseButtons.LEFT = null;

  // Clic derecho para navegar alrededor.
  orbit.mouseButtons.RIGHT =
    THREE.MOUSE.ROTATE;

  orbit.mouseButtons.MIDDLE =
    THREE.MOUSE.DOLLY;

  // SIMULACIÓN -----------------------------------------------------------

  const params =
    createParameters();

  const simulation =
    createSimulation({
      renderer,
      scene,
      params,
      count: PARTICLE_COUNT
    });

  // AYUDAS VISUALES DEL MODO LAB ----------------------------------------

  const attractorHelper =
    new THREE.Mesh(
      new THREE.RingGeometry(
        0.09,
        0.13,
        28
      ),

      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        side: THREE.DoubleSide
      })
    );

  scene.add(attractorHelper);

  const axes =
    new THREE.AxesHelper(1.4);

  const grid =
    new THREE.GridHelper(
      14,
      28,
      '#344052',
      '#171b22'
    );

  grid.position.y = -4.25;

  scene.add(axes, grid);

  // INTERACCIÓN DEL PUNTERO ---------------------------------------------

  const pointerNdc =
    new THREE.Vector2();

  const raycaster =
    new THREE.Raycaster();

  const interactionPlane =
    new THREE.Plane();

  const cameraDirection =
    new THREE.Vector3();

  const origin =
    new THREE.Vector3();

  const hit =
    new THREE.Vector3();

  const previousPointer =
    new THREE.Vector3();

  const instantPointerVelocity =
    new THREE.Vector3();

  // FORMAS ---------------------------------------------------------------

  const shapeTargetVector =
    new THREE.Vector3(1, 0, 0);

  let shapeIndex = 0;

  // ESTADO ---------------------------------------------------------------

  const clock =
    new THREE.Clock();

  let lastPointerAt = 0;
  let paused = false;
  let notificationState = 'pendiente';
  let notificationSent = false;
  let hudAt = 0;
  let panel;

  const gestures = {
    w: false,
    e: false
  };

  let mode =
    new URLSearchParams(
      location.search
    )
      .get('mode')
      ?.toLowerCase() === 'performance'
      ? 'PERFORMANCE'
      : 'LAB';

  // PUNTERO EN COORDENADAS 3D ------------------------------------------

  function pointFieldAt(
    clientX,
    clientY
  ) {
    const rect =
      canvas.getBoundingClientRect();

    pointerNdc.x =
      ((clientX - rect.left) /
        rect.width) *
        2 -
      1;

    pointerNdc.y =
      -(
        (clientY - rect.top) /
        rect.height
      ) *
        2 +
      1;

    raycaster.setFromCamera(
      pointerNdc,
      camera
    );

    camera.getWorldDirection(
      cameraDirection
    );

    interactionPlane.setFromNormalAndCoplanarPoint(
      cameraDirection,
      origin
    );

    if (
      !raycaster.ray.intersectPlane(
        interactionPlane,
        hit
      )
    ) {
      return;
    }

    const now =
      performance.now();

    if (lastPointerAt > 0) {
      const dt =
        THREE.MathUtils.clamp(
          (now - lastPointerAt) /
            1000,
          0.008,
          0.08
        );

      instantPointerVelocity
        .copy(hit)
        .sub(previousPointer)
        .multiplyScalar(1 / dt);

      params.pointerVelocity.value.lerp(
        instantPointerVelocity,
        0.32
      );
    }

    params.attractor.value.copy(hit);

    previousPointer.copy(hit);

    attractorHelper.position.copy(
      hit
    );

    params.pointerPresent.value = 1;

    lastPointerAt = now;
  }

  function releasePointer() {
    params.pointerPressed.value = 0;
  }

  function leavePointer() {
    releasePointer();

    params.pointerPresent.value = 0;

    params.pointerVelocity.value.set(
      0,
      0,
      0
    );

    lastPointerAt = 0;
  }

  // CAMBIO DE FORMA ------------------------------------------------------

  function cycleShape() {
    shapeIndex =
      (shapeIndex + 1) %
      SHAPES.length;

    updateHud();
  }

  // Q: GOLPE RESPIRATORIO ------------------------------------------------

  function triggerBreathImpact() {
    // Modifica la velocidad una sola vez.
    simulation.applyBreathImpact();

    // Activa el brillo durante un segundo.
    params.breathFlash.value = 1.0;

    updateHud();
  }

  // PRUEBAS DEL MODO LAB -------------------------------------------------

  function applyTest(id) {
    releasePointer();

    params.cohesionEnabled.value = 0;
    params.flowEnabled.value = 0;
    params.mouseEnabled.value = 0;
    params.dragEnabled.value = 0;
    params.limitEnabled.value = 0;
    params.shapeEnabled.value = 0;

    if (id === 'flow') {
      params.cohesionEnabled.value = 1;
      params.flowEnabled.value = 1;
      params.dragEnabled.value = 1;
      params.limitEnabled.value = 1;
    }

    if (
      id === 'singularity' ||
      id === 'pulse'
    ) {
      params.mouseEnabled.value = 1;
      params.dragEnabled.value = 1;
      params.limitEnabled.value = 1;
    }

    if (id === 'shape') {
      params.shapeEnabled.value = 1;
      params.dragEnabled.value = 1;
      params.limitEnabled.value = 1;
    }

    simulation.reset();

    if (id === 'pulse') {
      simulation.applyImpulse();
    }

    panel?.refresh();
  }

  function restoreInstrument() {
    params.cohesionEnabled.value = 1;
    params.flowEnabled.value = 1;
    params.mouseEnabled.value = 1;
    params.dragEnabled.value = 1;
    params.limitEnabled.value = 1;
    params.shapeEnabled.value = 1;

    releasePointer();
    simulation.reset();
    panel?.refresh();
  }

  // HUD ------------------------------------------------------------------

  const hud =
    document.createElement('div');

  hud.className = 'hud';

  document.body.append(hud);

  const modeToggle =
    document.createElement('button');

  modeToggle.type = 'button';
  modeToggle.className = 'mode-toggle';
  modeToggle.textContent = 'LAB';

  modeToggle.addEventListener(
    'click',
    () => {
      setMode('LAB');
    }
  );

  document.body.append(
    modeToggle
  );

  function gestureLabel() {
    return [
      params.breathFlash.value >
        0.02 &&
        'Q BOOM',

      gestures.w &&
        'W VIBRA',

      gestures.e &&
        'E LENTO'
    ]
      .filter(Boolean)
      .join(' · ');
  }

  function updateHud() {
    hud.innerHTML =
      `<strong>${mode}</strong> · ` +
      `Q golpe respiratorio · ` +
      `W vibrar · ` +
      `E lento · ` +
      `R forma (${SHAPES[
        shapeIndex
      ].toLowerCase()})<br>` +
      `Clic izq.: epicentro · ` +
      `doble clic: onda · ` +
      `clic der.: orbitar · ` +
      `rueda: zoom<br>` +
      `${Math.round(
        params.activeCount.value
      ).toLocaleString(
        'es-CO'
      )} partículas · ` +
      `${gestureLabel() ||
        'gesto libre'} · ` +
      `aviso ${notificationState} · ` +
      `sin análisis de audio`;
  }

  // MODOS ----------------------------------------------------------------

  function setMode(nextMode) {
    mode = nextMode;

    releasePointer();

    const lab =
      mode === 'LAB';

    axes.visible = lab;
    grid.visible = lab;
    attractorHelper.visible = lab;
    modeToggle.hidden = lab;

    panel?.setMode(mode);

    const url =
      new URL(location.href);

    url.searchParams.set(
      'mode',
      mode.toLowerCase()
    );

    history.replaceState(
      {},
      '',
      url
    );

    updateHud();
  }

  // NOTIFICACIÓN OPCIONAL ------------------------------------------------

  function playReadyChime() {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audio =
      new AudioContextClass();

    const gain =
      audio.createGain();

    gain.gain.setValueAtTime(
      0.0001,
      audio.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.12,
      audio.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audio.currentTime + 0.48
    );

    gain.connect(
      audio.destination
    );

    [659.25, 880].forEach(
      (frequency, index) => {
        const oscillator =
          audio.createOscillator();

        oscillator.frequency.value =
          frequency;

        oscillator.connect(gain);

        oscillator.start(
          audio.currentTime +
            index * 0.13
        );

        oscillator.stop(
          audio.currentTime +
            0.34 +
            index * 0.13
        );
      }
    );

    setTimeout(() => {
      void audio.close();
    }, 700);
  }

  async function enableNotification() {
    if (notificationSent) {
      return;
    }

    if (!('Notification' in window)) {
      notificationState =
        'no disponible';

      updateHud();
      return;
    }

    let permission =
      Notification.permission;

    if (permission === 'default') {
      permission =
        await Notification.requestPermission();
    }

    if (permission === 'denied') {
      notificationState =
        'bloqueada';

      updateHud();
      return;
    }

    if (permission === 'granted') {
      notificationSent = true;
      notificationState = 'activa';

      new Notification(
        'Campo de Fuerzas listo',
        {
          body:
            'Marea Viva 3D está activa. Ya puede interpretar con el ratón y Q/W/E/R.',

          tag:
            'marea-viva-ready'
        }
      );

      playReadyChime();
      updateHud();
    }
  }

  // PANEL LAB ------------------------------------------------------------

  panel = createLabPanel({
    params,
    initialMode: mode,

    onReset: () => {
      simulation.reset();
    },

    onTest: applyTest,

    onRestore:
      restoreInstrument,

    onModeChange: setMode,

    onPauseChange: () => {
      paused = !paused;

      panel.setPaused(paused);
    },

    onCycleShape:
      cycleShape,

    onNotify: () => {
      void enableNotification();
    }
  });

  // EVENTOS DEL RATÓN ----------------------------------------------------

  canvas.addEventListener(
    'contextmenu',
    (event) => {
      event.preventDefault();
    }
  );

  canvas.addEventListener(
    'pointerenter',
    (event) => {
      if (
        (event.buttons & 2) === 0
      ) {
        pointFieldAt(
          event.clientX,
          event.clientY
        );
      }
    }
  );

  canvas.addEventListener(
    'pointermove',
    (event) => {
      // Mientras se orbita con clic derecho,
      // el ratón no altera las partículas.
      if (
        (event.buttons & 2) !== 0
      ) {
        params.pointerPresent.value = 0;
        return;
      }

      pointFieldAt(
        event.clientX,
        event.clientY
      );
    }
  );

  canvas.addEventListener(
    'pointerleave',
    leavePointer
  );

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) {
        return;
      }

      canvas.setPointerCapture(
        event.pointerId
      );

      pointFieldAt(
        event.clientX,
        event.clientY
      );

      params.pointerPressed.value = 1;
    }
  );

  canvas.addEventListener(
    'dblclick',
    (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();

      pointFieldAt(
        event.clientX,
        event.clientY
      );

      simulation.applyImpulse();
    }
  );

  addEventListener(
    'pointerup',
    releasePointer
  );

  addEventListener(
    'pointercancel',
    releasePointer
  );

  // EVENTOS DEL TECLADO --------------------------------------------------

  addEventListener(
    'keydown',
    (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTextEntry(
          document.activeElement
        )
      ) {
        return;
      }

      // Q se activa una sola vez por pulsación.
      if (
        event.code === 'KeyQ' &&
        !event.repeat
      ) {
        triggerBreathImpact();
      }

      if (
        event.code === 'KeyW'
      ) {
        gestures.w = true;
      }

      if (
        event.code === 'KeyE'
      ) {
        gestures.e = true;
      }

      if (
        event.code === 'KeyR' &&
        !event.repeat
      ) {
        cycleShape();
      }

      if (
        event.code === 'KeyP' &&
        !event.repeat
      ) {
        setMode(
          mode === 'LAB'
            ? 'PERFORMANCE'
            : 'LAB'
        );
      }

      updateHud();
    }
  );

  addEventListener(
    'keyup',
    (event) => {
      if (
        event.code === 'KeyW'
      ) {
        gestures.w = false;
      }

      if (
        event.code === 'KeyE'
      ) {
        gestures.e = false;
      }

      updateHud();
    }
  );

  addEventListener(
    'blur',
    () => {
      leavePointer();

      gestures.w = false;
      gestures.e = false;
    }
  );

  addEventListener(
    'resize',
    () => {
      camera.aspect =
        innerWidth /
        innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        innerWidth,
        innerHeight
      );
    }
  );

  // INICIO ---------------------------------------------------------------

  simulation.reset();
  setMode(mode);

  // BUCLE PRINCIPAL ------------------------------------------------------

  renderer.setAnimationLoop(() => {
    const delta = Math.min(
      clock.getDelta(),
      1 / 30
    );

    // El brillo comienza en 1 y llega a 0
    // después de aproximadamente un segundo.
    params.breathFlash.value =
      Math.max(
        0,
        params.breathFlash.value -
          delta
      );

    // W: vibración sostenida.
    params.vibrationEnvelope.value =
      approach(
        params.vibrationEnvelope.value,
        gestures.w ? 1 : 0,
        gestures.w ? 14 : 9,
        delta
      );

    // E: cámara lenta sostenida.
    params.slowFactor.value =
      approach(
        params.slowFactor.value,
        gestures.e ? 0.18 : 1,
        gestures.e ? 8 : 5,
        delta
      );

    params.vibrationPhase.value +=
      delta *
      Math.PI *
      2 *
      9;

    params.flowPhase.value +=
      delta *
      0.78 *
      params.slowFactor.value;

    params.dt.value = delta;

    params.pointerVelocity.value.multiplyScalar(
      Math.exp(-7.5 * delta)
    );

    // Transición gradual entre formas.
    shapeTargetVector.set(
      shapeIndex === 0 ? 1 : 0,
      shapeIndex === 1 ? 1 : 0,
      shapeIndex === 2 ? 1 : 0
    );

    params.shapeWeights.value.lerp(
      shapeTargetVector,
      1 -
        Math.exp(
          -delta / 0.55
        )
    );

    if (!paused) {
      simulation.stepSimulation();
    }

    orbit.update();

    attractorHelper.quaternion.copy(
      camera.quaternion
    );

    renderer.render(
      scene,
      camera
    );

    const now =
      performance.now();

    if (now - hudAt > 180) {
      panel.setPerformanceState({
        shape:
          SHAPES[shapeIndex],

        gestures:
          gestureLabel(),

        timeFactor:
          params.slowFactor.value
      });

      updateHud();
      hudAt = now;
    }
  });
}

main().catch((error) => {
  console.error(error);

  const pre =
    document.createElement('pre');

  pre.style.cssText =
    'position:fixed;' +
    'inset:16px;' +
    'white-space:pre-wrap;' +
    'color:#fff;' +
    'z-index:50';

  pre.textContent =
    String(
      error?.stack ||
      error
    );

  document.body.append(pre);
});