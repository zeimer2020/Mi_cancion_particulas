import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createHeyMask } from './heyBackdrop.js';

const palettes = [
  ['#bd1116', '#f44824'], ['#b70e22', '#ed4934'],
  ['#c9160c', '#f34a1c'], ['#70223c', '#ba3652'],
];
const vertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createStage(mount, simulation, params) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor('#050405', 1);
  renderer.autoClear = false;
  renderer.domElement.className = 'particle-canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Muro de partículas. Mantén Espacio para HEY; Q para golpear; W para cargar y soltar; V para vibrar; arrastra para cortar corrientes.');
  mount.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, -2.7, 29);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, -1.5, 0);
  orbit.enableDamping = true; orbit.enablePan = false; orbit.enableZoom = false;
  orbit.mouseButtons.LEFT = null; orbit.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  orbit.minPolarAngle = Math.PI * 0.34; orbit.maxPolarAngle = Math.PI * 0.66;
  orbit.minAzimuthAngle = -0.55; orbit.maxAzimuthAngle = 0.55;
  orbit.touches.ONE = null; orbit.touches.TWO = null;

  const geometry = new THREE.BufferGeometry();
  const renderPositions = simulation.positions.slice();
  const positionAttribute = new THREE.BufferAttribute(renderPositions, 3).setUsage(THREE.DynamicDrawUsage);
  const activityAttribute = new THREE.BufferAttribute(simulation.activity, 1).setUsage(THREE.DynamicDrawUsage);
  const velocityAttribute = new THREE.BufferAttribute(simulation.velocities, 3).setUsage(THREE.DynamicDrawUsage);
  const seeds = new Float32Array(simulation.count);
  for (let i = 0; i < seeds.length; i++) seeds[i] = (i * 0.61803398875) % 1;
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('activity', activityAttribute);
  geometry.setAttribute('velocity', velocityAttribute);
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: { cold: { value: new THREE.Color(palettes[0][0]) }, hot: { value: new THREE.Color(palettes[0][1]) }, pointScale: { value: 1 }, accent: { value: 0 }, charge: { value: 0 }, vibration: { value: 0 }, viewport: { value: new THREE.Vector2(1,1) } },
    vertexShader: `attribute float activity; attribute float seed; attribute vec3 velocity;
      varying float vActivity; varying float vSeed; varying vec2 vDirection; varying float vSize;
      uniform float pointScale; uniform float accent; uniform vec2 viewport;
      void main() { vActivity = activity; vSeed = seed; vec4 p = modelViewMatrix * vec4(position, 1.0);
      vec4 head = projectionMatrix * p;
      vec4 tail = projectionMatrix * (modelViewMatrix * vec4(position - velocity * 0.03,1.0));
      vec2 direction = (head.xy / head.w - tail.xy / tail.w) * viewport;
      vDirection = length(direction) > 0.001 ? normalize(direction) : vec2(1.0,0.0);
      vSize = clamp((2.6 + seed * 1.6 + length(velocity) * 0.95 + accent * 4.0) * pointScale * 27.0 / -p.z, 2.0, 38.0);
      gl_PointSize = vSize; gl_Position = head; }`,
    fragmentShader: `uniform vec3 cold; uniform vec3 hot; uniform float accent; uniform float charge; uniform float vibration;
      varying float vActivity; varying float vSeed; varying vec2 vDirection; varying float vSize;
      void main() { vec2 p = (gl_PointCoord - 0.5) * vec2(1.0,-1.0);
      float along = dot(p,vDirection), across = dot(p,vec2(-vDirection.y,vDirection.x));
      if(abs(along) > 0.47) discard;
      float width = max(0.022,(0.55 + accent * 0.2) / vSize);
      float core = exp(-pow(across / width,2.0) * 1.8);
      float glow = exp(-pow(across / (width * 2.8),2.0)) * 0.05;
      float edge = 1.0 - smoothstep(0.25,0.47,abs(along));
      float warmth = (vActivity * 0.18 + step(0.975,vSeed) * 0.1) * (1.0 - vibration * 0.95);
      vec3 c = mix(cold,hot,clamp(warmth + accent * 0.22 + charge * 0.12,0.0,0.65));
      gl_FragColor = vec4(c,(core + glow) * edge * (0.52 + vActivity * 0.13 + accent * 0.08)); }`,
    transparent: true, blending: THREE.NormalBlending, depthTest: false, depthWrite: false,
  });
  const points = new THREE.Points(geometry, particleMaterial);
  points.frustumCulled = false; scene.add(points);
  const quadCamera = new THREE.Camera();
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const historyMaterial = new THREE.ShaderMaterial({
    uniforms: { history: { value: null }, decay: { value: 0.95 } }, vertexShader: vertex,
    fragmentShader: `uniform sampler2D history; uniform float decay; varying vec2 vUv;
      void main() { gl_FragColor = vec4(max(vec3(0.0),texture2D(history,vUv).rgb * decay - 0.0013),1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const historyScene = new THREE.Scene(); historyScene.add(new THREE.Mesh(quadGeometry, historyMaterial));
  const heyMask = new THREE.CanvasTexture(createHeyMask());
  heyMask.generateMipmaps = false; heyMask.minFilter = THREE.LinearFilter;
  const screenMaterial = new THREE.ShaderMaterial({
    uniforms: { image: { value: null }, pixel: { value: new THREE.Vector2() }, impact: { value: 0 }, cut: { value: 0 }, hit: { value: 0 }, hey: { value: 0 }, heyMask: { value: heyMask }, aspect: { value: 1 }, heyColor: { value: new THREE.Color('#d58162') } }, vertexShader: vertex,
    fragmentShader: `uniform sampler2D image; uniform vec2 pixel; uniform float impact; uniform float cut; uniform float hit;
      uniform sampler2D heyMask; uniform float hey; uniform float aspect; uniform vec3 heyColor; varying vec2 vUv;
      void main() { vec2 uv = vUv;
      // Optical tear belongs to a single manual hit. It never moves the agents.
      float strip = floor(uv.y * 36.0);
      uv.x += sin(strip * 127.1 + hit * 13.7) * impact * impact * 0.006;
      vec3 c = texture2D(image,uv).rgb; vec3 glow = vec3(0.0);
      glow += texture2D(image,uv+vec2(pixel.x*3.0,0.0)).rgb;
      glow += texture2D(image,uv-vec2(pixel.x*3.0,0.0)).rgb;
      glow += texture2D(image,uv+vec2(0.0,pixel.y*3.0)).rgb;
      glow += texture2D(image,uv-vec2(0.0,pixel.y*3.0)).rgb;
      float vignette = 1.0 - smoothstep(0.25,0.85,length((vUv-0.5)*vec2(1.05,1.0)));
      c = (c + glow * (0.05 + impact * 0.025)) * vignette * (1.0 + impact * 0.12);
      // A shared exposure shoulder preserves red hue in dense overlaps.
      float peak = max(c.r,max(c.g,c.b));
      vec3 foreground = c * (1.0 - exp(-peak * 2.8)) / max(peak,0.00001);
      foreground = pow(foreground,vec3(0.88));
      // Screen-space backdrop bypasses history: releasing the hand leaves no letters.
      vec2 heySize = vec2(0.94,0.94 * aspect / (1536.0 / 576.0));
      vec2 heyUv = (vUv - vec2(0.5,0.53)) / heySize + 0.5;
      float inside = step(0.0,heyUv.x) * step(heyUv.x,1.0) * step(0.0,heyUv.y) * step(heyUv.y,1.0);
      float lettering = texture2D(heyMask,clamp(heyUv,0.0,1.0)).a * inside * hey;
      float cover = clamp(max(foreground.r,max(foreground.g,foreground.b)),0.0,1.0);
      vec3 background = heyColor * lettering * 0.82 * (1.0 - cover);
      gl_FragColor = vec4((foreground + background + vec3(0.013,0.01,0.014)) * (1.0 - cut * 0.99),1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const screenScene = new THREE.Scene(); screenScene.add(new THREE.Mesh(quadGeometry, screenMaterial));
  let read, write;
  const targetCold = new THREE.Color(), targetHot = new THREE.Color();
  let presentation = true;

  function setPresentation(value) {
    presentation = value;
    const targetY = value ? 0 : -0.5;
    camera.position.y += targetY - orbit.target.y;
    orbit.target.y = targetY;
    orbit.update();
  }

  function clear() {
    for (const target of [read, write]) {
      if (!target) continue;
      renderer.setRenderTarget(target); renderer.clear();
    }
    renderer.setRenderTarget(null);
  }
  function resize() {
    const width = mount.clientWidth, height = mount.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    const horizontalFit = 17 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    orbit.target.set(0,presentation ? 0 : -0.5,0);
    camera.position.set(0, orbit.target.y - 1.2, Math.max(26, horizontalFit));
    camera.updateProjectionMatrix(); orbit.update();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    read?.dispose(); write?.dispose();
    read = new THREE.WebGLRenderTarget(size.x, size.y, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    write = read.clone();
    screenMaterial.uniforms.pixel.value.set(1 / size.x, 1 / size.y);
    screenMaterial.uniforms.aspect.value = width / height;
    particleMaterial.uniforms.pointScale.value = renderer.getPixelRatio();
    particleMaterial.uniforms.viewport.value.set(size.x,size.y);
    clear();
  }
  function draw(delta, frozen = false, interpolation = 1) {
    orbit.update();
    targetCold.set(palettes[params.palette][0]); targetHot.set(palettes[params.palette][1]);
    particleMaterial.uniforms.cold.value.lerp(targetCold, Math.min(1, delta * 4));
    particleMaterial.uniforms.hot.value.lerp(targetHot, Math.min(1, delta * 4));
    particleMaterial.uniforms.accent.value = params.pulse;
    particleMaterial.uniforms.charge.value = params.charge;
    particleMaterial.uniforms.vibration.value = params.vibrate ? 1 : 0;
    screenMaterial.uniforms.impact.value = params.pulse;
    screenMaterial.uniforms.cut.value = params.suspend ? 1 : 0;
    screenMaterial.uniforms.hit.value = params.hitSerial;
    screenMaterial.uniforms.hey.value = params.hey ? 1 : 0;
    screenMaterial.uniforms.heyColor.value.copy(particleMaterial.uniforms.cold.value).lerp(particleMaterial.uniforms.hot.value,0.35);
    if (!frozen) {
      const current = simulation.positions, previous = simulation.previousPositions;
      const alpha = THREE.MathUtils.clamp(interpolation,0,1);
      for (let i = 0; i < renderPositions.length; i++) renderPositions[i] = previous[i] + (current[i] - previous[i]) * alpha;
      positionAttribute.needsUpdate = true;
      activityAttribute.needsUpdate = true;
      velocityAttribute.array = simulation.velocities; velocityAttribute.needsUpdate = true;
      historyMaterial.uniforms.history.value = read.texture;
      const tail = (0.08 + params.memory * 0.36) * (1 - params.pulse * 0.65);
      historyMaterial.uniforms.decay.value = Math.exp(-delta / tail);
      renderer.setRenderTarget(write);
      renderer.render(historyScene, quadCamera); renderer.render(scene, camera);
      [read, write] = [write, read];
    }
    screenMaterial.uniforms.image.value = read.texture;
    renderer.setRenderTarget(null); renderer.render(screenScene, quadCamera);
  }
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  function projectPointer(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2), camera);
    return raycaster.ray.intersectPlane(plane, hit);
  }
  resize();
  return { canvas: renderer.domElement, draw, resize, clear, projectPointer, setPresentation,
    dispose() { orbit.dispose(); geometry.dispose(); particleMaterial.dispose(); historyMaterial.dispose(); screenMaterial.dispose(); heyMask.dispose(); quadGeometry.dispose(); read.dispose(); write.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
