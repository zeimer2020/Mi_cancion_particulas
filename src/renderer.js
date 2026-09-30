import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const palettes = [
  ['#b81812', '#ffc1a0'], ['#d51e28', '#f9d5c5'],
  ['#ea160b', '#fff0d1'], ['#843751', '#e8abb6'],
];
const vertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export function createStage(mount, simulation, params) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor('#050405', 1);
  renderer.autoClear = false;
  renderer.domElement.className = 'particle-canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Escenario de partículas. Arrastra para atraer; Mayús y arrastre para separar.');
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
  const positionAttribute = new THREE.BufferAttribute(simulation.positions, 3).setUsage(THREE.DynamicDrawUsage);
  const activityAttribute = new THREE.BufferAttribute(simulation.activity, 1).setUsage(THREE.DynamicDrawUsage);
  const seeds = new Float32Array(simulation.count);
  for (let i = 0; i < seeds.length; i++) seeds[i] = (i * 0.61803398875) % 1;
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('activity', activityAttribute);
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: { cold: { value: new THREE.Color(palettes[0][0]) }, hot: { value: new THREE.Color(palettes[0][1]) }, pointScale: { value: 1 } },
    vertexShader: `attribute float activity; attribute float seed; varying float vActivity; varying float vSeed; uniform float pointScale;
      void main() { vActivity = activity; vSeed = seed; vec4 p = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp((1.5 + seed * 1.6 + activity * 1.0) * pointScale * 27.0 / -p.z, 1.0, 8.0);
      gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform vec3 cold; uniform vec3 hot; varying float vActivity; varying float vSeed;
      void main() { vec2 p = gl_PointCoord - 0.5; float r = dot(p,p); if(r > 0.25) discard;
      float core = exp(-r * 40.0); float glow = exp(-r * 13.0) * 0.18;
      vec3 c = mix(cold, hot, pow(vActivity, 2.8) * 0.7 + step(0.985,vSeed) * 0.3);
      gl_FragColor = vec4(c, (core + glow) * (0.24 + vActivity * 0.16)); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
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
  const screenMaterial = new THREE.ShaderMaterial({
    uniforms: { image: { value: null }, pixel: { value: new THREE.Vector2() } }, vertexShader: vertex,
    fragmentShader: `uniform sampler2D image; uniform vec2 pixel; varying vec2 vUv;
      void main() { vec3 c = texture2D(image,vUv).rgb; vec3 glow = vec3(0.0);
      glow += texture2D(image,vUv+vec2(pixel.x*3.0,0.0)).rgb;
      glow += texture2D(image,vUv-vec2(pixel.x*3.0,0.0)).rgb;
      glow += texture2D(image,vUv+vec2(0.0,pixel.y*3.0)).rgb;
      glow += texture2D(image,vUv-vec2(0.0,pixel.y*3.0)).rgb;
      float vignette = 1.0 - smoothstep(0.25,0.85,length((vUv-0.5)*vec2(1.05,1.0)));
      c = (c + glow * 0.085) * vignette;
      gl_FragColor = vec4(pow(c,vec3(0.88)) + vec3(0.013,0.01,0.014),1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const screenScene = new THREE.Scene(); screenScene.add(new THREE.Mesh(quadGeometry, screenMaterial));
  let read, write;
  const targetCold = new THREE.Color(), targetHot = new THREE.Color();

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
    camera.position.set(0, -2.7, Math.max(29, horizontalFit));
    camera.updateProjectionMatrix(); orbit.update();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    read?.dispose(); write?.dispose();
    read = new THREE.WebGLRenderTarget(size.x, size.y, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    write = read.clone();
    screenMaterial.uniforms.pixel.value.set(1 / size.x, 1 / size.y);
    particleMaterial.uniforms.pointScale.value = renderer.getPixelRatio();
    clear();
  }
  function draw(delta, frozen = false) {
    orbit.update();
    targetCold.set(palettes[params.palette][0]); targetHot.set(palettes[params.palette][1]);
    particleMaterial.uniforms.cold.value.lerp(targetCold, Math.min(1, delta * 4));
    particleMaterial.uniforms.hot.value.lerp(targetHot, Math.min(1, delta * 4));
    if (!frozen) {
      positionAttribute.array = simulation.positions; positionAttribute.needsUpdate = true;
      activityAttribute.needsUpdate = true;
      historyMaterial.uniforms.history.value = read.texture;
      historyMaterial.uniforms.decay.value = Math.exp(-delta / (0.11 + params.memory * 1.45));
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
  return { canvas: renderer.domElement, draw, resize, clear, projectPointer,
    dispose() { orbit.dispose(); geometry.dispose(); particleMaterial.dispose(); historyMaterial.dispose(); screenMaterial.dispose(); quadGeometry.dispose(); read.dispose(); write.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
