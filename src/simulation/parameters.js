import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';

// Cada gesto modifica fuerzas o tiempo de integración.
// Ningún control escribe posiciones directamente.
export function createParameters() {
  return {
    // TIEMPO Y MATERIA
    dt: uniform(1 / 60),
    movementSpeed: uniform(1.0),
    slowFactor: uniform(1.0),
    initialSpeed: uniform(1.75),
    maxSpeed: uniform(13.0),
    particleSize: uniform(0.022),
    activeCount: uniform(65536),
    masterIntensity: uniform(1.2),
    spawnRadius: uniform(3.7),

    // COHESIÓN
    cohesionEnabled: uniform(1.0),
    cohesionStrength: uniform(0.22),

    // FLUJO AUTÓNOMO
    flowEnabled: uniform(1.0),
    flowStrength: uniform(1.05),
    flowScale: uniform(0.82),
    flowPhase: uniform(0.0),

    // RATÓN
    mouseEnabled: uniform(1.0),
    pointerPresent: uniform(0.0),
    pointerPressed: uniform(0.0),

    attractor: uniform(
      new THREE.Vector3(0, 0, 0)
    ),

    pointerVelocity: uniform(
      new THREE.Vector3(0, 0, 0)
    ),

    pointerWake: uniform(10.5),
    pointerRadius: uniform(4.35),
    singularityStrength: uniform(23.0),
    vortexStrength: uniform(14.0),
    softening: uniform(0.42),

    // CAMPO DE FORMA
    shapeEnabled: uniform(1.0),

    shapeWeights: uniform(
      new THREE.Vector3(1, 0, 0)
    ),

    shapeRadius: uniform(3.15),
    shapeDepth: uniform(1.05),
    shapeStrength: uniform(4.6),

    // Q: GOLPE RESPIRATORIO
    breathFlash: uniform(0.0),
    breathImpulseStrength: uniform(8.5),
    breathImpulseVariation: uniform(0.28),

    // W: VIBRACIÓN
    vibrationEnvelope: uniform(0.0),
    vibrationPhase: uniform(0.0),
    vibrationStrength: uniform(82.0),

    // FRICCIÓN
    dragEnabled: uniform(1.0),
    dragCoefficient: uniform(0.17),

    // LÍMITE ESPACIAL
    limitEnabled: uniform(1.0),
    limitRadius: uniform(6.4),
    limitStrength: uniform(3.1),
    limitDamping: uniform(0.72),

    // DOBLE CLIC
    impulseStrength: uniform(7.4),
    impulseRadius: uniform(4.8)
  };
}