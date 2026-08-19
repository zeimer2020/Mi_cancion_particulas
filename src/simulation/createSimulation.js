import * as THREE from 'three/webgpu';

import {
  abs,
  Fn,
  If,
  color,
  cos,
  float,
  hash,
  instanceIndex,
  instancedArray,
  max,
  mix,
  sin,
  smoothstep,
  step,
  uint,
  uv,
  vec3,
  vec4
} from 'three/tsl';

export function createSimulation({
  renderer,
  scene,
  params,
  count = 131072
}) {
  const positionBuffer =
    instancedArray(count, 'vec3');

  const velocityBuffer =
    instancedArray(count, 'vec3');

  // INICIALIZACIÓN -------------------------------------------------------

  const initParticles = Fn(() => {
    const i = instanceIndex;
    const p = positionBuffer.element(i);
    const v = velocityBuffer.element(i);

    const r1 = hash(i.add(uint(11)));
    const r2 = hash(i.add(uint(23)));
    const r3 = hash(i.add(uint(37)));
    const r4 = hash(i.add(uint(53)));
    const r5 = hash(i.add(uint(71)));
    const r6 = hash(i.add(uint(89)));

    const angle =
      r1.mul(6.28318530718);

    const radius = r2
      .pow(0.5)
      .mul(params.spawnRadius)
      .mul(
        r3.mul(0.55).add(0.72)
      );

    const radial = vec3(
      cos(angle),
      sin(angle),
      0.0
    );

    const tangent = vec3(
      sin(angle).mul(-1.0),
      cos(angle),
      0.0
    );

    const warp =
      r4.mul(0.42).add(0.7);

    p.assign(
      vec3(
        radial.x
          .mul(radius)
          .mul(
            float(1.0).add(
              sin(
                angle.mul(3.0)
              ).mul(0.22)
            )
          ),

        radial.y
          .mul(radius)
          .mul(warp),

        r5
          .sub(0.5)
          .mul(0.75)
      )
    );

    v.assign(
      tangent
        .mul(params.initialSpeed)
        .mul(
          r6.mul(1.25).add(0.65)
        )
        .add(
          radial.mul(
            r5.sub(0.5).mul(1.2)
          )
        )
    );
  })()
    .compute(count)
    .setName('Initialize Living Tide');

  // ACTUALIZACIÓN --------------------------------------------------------

  const updateParticles = Fn(() => {
    const p = positionBuffer.element(
      instanceIndex
    );

    const v = velocityBuffer.element(
      instanceIndex
    );

    const dt = params.dt
      .mul(params.movementSpeed)
      .mul(params.slowFactor);

    const force = vec3(0.0).toVar();

    const individuality = hash(
      instanceIndex.add(uint(113))
    );

    // 1. COHESIÓN --------------------------------------------------------

    const breathing = sin(
      params.flowPhase
        .mul(0.7)
        .add(
          individuality.mul(
            6.28318530718
          )
        )
    )
      .mul(0.18)
      .add(0.82);

    force.addAssign(
      p
        .mul(params.cohesionStrength)
        .mul(breathing)
        .mul(params.cohesionEnabled)
        .mul(-1.0)
    );

    // 2. FLUJO AUTÓNOMO --------------------------------------------------

    const q =
      p.mul(params.flowScale);

    const phase =
      params.flowPhase;

    const flow = vec3(
      sin(
        q.y
          .mul(1.7)
          .add(phase)
          .add(
            individuality.mul(0.9)
          )
      ).add(
        cos(
          q.x
            .add(q.y)
            .mul(0.72)
            .sub(
              phase.mul(0.63)
            )
        )
      ),

      cos(
        q.x
          .mul(1.45)
          .sub(
            phase.mul(0.82)
          )
          .sub(individuality)
      ).sub(
        sin(
          q.y
            .sub(q.x)
            .mul(0.68)
            .add(
              phase.mul(0.54)
            )
        )
      ),

      sin(
        q.x
          .add(q.y)
          .mul(0.55)
          .add(
            phase.mul(0.4)
          )
      ).mul(0.35)
    );

    force.addAssign(
      flow
        .mul(params.flowStrength)
        .mul(params.flowEnabled)
    );

    // 3. CAMPO DE FORMA --------------------------------------------------

    const planarPosition = vec3(
      p.x,
      p.y,
      0.0
    );

    const planarRadius = max(
      planarPosition.length(),
      0.0001
    );

    const radialDirection =
      planarPosition.div(
        planarRadius
      );

    const shapeRadius =
      params.shapeRadius;

    // CÍRCULO
    const circleTarget =
      radialDirection.mul(
        shapeRadius
      );

    // CUADRADO
    const squareHalf =
      shapeRadius.mul(0.72);

    const squareDenominator = max(
      max(
        abs(p.x),
        abs(p.y)
      ),
      0.0001
    );

    const squareTarget =
      planarPosition.mul(
        squareHalf.div(
          squareDenominator
        )
      );

    // TRIÁNGULO
    const triangleRadius =
      shapeRadius.mul(1.05);

    const a = vec3(
      0.0,
      triangleRadius,
      0.0
    );

    const b = vec3(
      triangleRadius.mul(
        -0.8660254
      ),
      triangleRadius.mul(-0.5),
      0.0
    );

    const c = vec3(
      triangleRadius.mul(
        0.8660254
      ),
      triangleRadius.mul(-0.5),
      0.0
    );

    const ab = b.sub(a);
    const bc = c.sub(b);
    const ca = a.sub(c);

    const qAB = a.add(
      ab.mul(
        planarPosition
          .sub(a)
          .dot(ab)
          .div(ab.dot(ab))
          .clamp(0.0, 1.0)
      )
    );

    const qBC = b.add(
      bc.mul(
        planarPosition
          .sub(b)
          .dot(bc)
          .div(bc.dot(bc))
          .clamp(0.0, 1.0)
      )
    );

    const qCA = c.add(
      ca.mul(
        planarPosition
          .sub(c)
          .dot(ca)
          .div(ca.dot(ca))
          .clamp(0.0, 1.0)
      )
    );

    const triangleTarget =
      qAB.toVar();

    const bestTriangleDistance =
      planarPosition
        .sub(qAB)
        .length()
        .toVar();

    const distanceBC =
      planarPosition
        .sub(qBC)
        .length();

    const distanceCA =
      planarPosition
        .sub(qCA)
        .length();

    If(
      distanceBC.lessThan(
        bestTriangleDistance
      ),
      () => {
        triangleTarget.assign(qBC);

        bestTriangleDistance.assign(
          distanceBC
        );
      }
    );

    If(
      distanceCA.lessThan(
        bestTriangleDistance
      ),
      () => {
        triangleTarget.assign(qCA);
      }
    );

    const blendedTarget =
      circleTarget
        .mul(params.shapeWeights.x)
        .add(
          triangleTarget.mul(
            params.shapeWeights.y
          )
        )
        .add(
          squareTarget.mul(
            params.shapeWeights.z
          )
        );

    const targetZ =
      individuality
        .sub(0.5)
        .mul(params.shapeDepth);

    const shapeTarget = vec3(
      blendedTarget.x,
      blendedTarget.y,
      targetZ
    );

    force.addAssign(
      shapeTarget
        .sub(p)
        .mul(params.shapeStrength)
        .mul(params.shapeEnabled)
    );

    // 4. W: VIBRACIÓN ----------------------------------------------------

    const vibrationAngle =
      individuality.mul(
        106.81415
      );

    const vibrationWave = sin(
      params.vibrationPhase
        .add(
          individuality.mul(
            43.9823
          )
        )
        .add(
          float(instanceIndex).mul(
            0.031
          )
        )
    );

    const vibrationDirection = vec3(
      cos(vibrationAngle),
      sin(vibrationAngle),

      sin(
        vibrationAngle.mul(1.37)
      ).mul(0.72)
    );

    force.addAssign(
      vibrationDirection
        .mul(vibrationWave)
        .mul(params.vibrationStrength)
        .mul(params.vibrationEnvelope)
    );

    // 5. ESTELA DEL RATÓN ------------------------------------------------

    const toPointer =
      params.attractor.sub(p);

    const pointerDistance =
      toPointer.length();

    const pointerDirection =
      toPointer.div(
        max(
          pointerDistance,
          params.softening
        )
      );

    const pointerFalloff =
      float(1.0).sub(
        smoothstep(
          0.0,
          params.pointerRadius,
          pointerDistance
        )
      );

    const pointerLocal =
      pointerFalloff.mul(
        pointerFalloff
      );

    const mouseGate =
      params.mouseEnabled.mul(
        params.pointerPresent
      );

    const pointerSpeed =
      params.pointerVelocity
        .length()
        .clamp(0.0, 12.0);

    force.addAssign(
      params.pointerVelocity
        .mul(params.pointerWake)
        .mul(params.masterIntensity)
        .mul(pointerLocal)
        .mul(mouseGate)
        .mul(0.31)
    );

    const tangent = vec3(
      0.0,
      0.0,
      1.0
    ).cross(
      pointerDirection
    );

    force.addAssign(
      tangent
        .mul(pointerSpeed)
        .mul(pointerLocal)
        .mul(mouseGate)
        .mul(0.58)
    );

    force.addAssign(
      pointerDirection
        .mul(pointerSpeed)
        .mul(params.masterIntensity)
        .mul(pointerLocal)
        .mul(mouseGate)
        .mul(-0.48)
    );

    // 6. CLIC: EPICENTRO -------------------------------------------------

    const pressedGate =
      mouseGate.mul(
        params.pointerPressed
      );

    const attraction =
      params.singularityStrength
        .mul(params.masterIntensity)
        .mul(pointerLocal)
        .div(
          pointerDistance
            .mul(0.2)
            .add(0.3)
        );

    force.addAssign(
      pointerDirection
        .mul(attraction)
        .mul(pressedGate)
    );

    force.addAssign(
      tangent
        .mul(params.vortexStrength)
        .mul(params.masterIntensity)
        .mul(pointerLocal)
        .mul(pressedGate)
    );

    // 7. FRICCIÓN --------------------------------------------------------

    force.addAssign(
      v
        .mul(params.dragCoefficient)
        .mul(params.dragEnabled)
        .mul(-1.0)
    );

    // 8. LÍMITE SUAVE ----------------------------------------------------

    const distanceFromCenter =
      p.length();

    const outward = p.div(
      max(
        distanceFromCenter,
        0.0001
      )
    );

    const overshoot = max(
      distanceFromCenter.sub(
        params.limitRadius
      ),
      0.0
    );

    force.addAssign(
      outward
        .mul(
          overshoot.mul(
            overshoot
          )
        )
        .mul(params.limitStrength)
        .mul(params.limitEnabled)
        .mul(-1.0)
    );

    force.addAssign(
      v
        .mul(params.limitDamping)
        .mul(
          overshoot.clamp(
            0.0,
            1.0
          )
        )
        .mul(params.limitEnabled)
        .mul(-1.0)
    );

    // 9. INTEGRACIÓN -----------------------------------------------------

    v.addAssign(
      force.mul(dt)
    );

    const speed = v.length();

    If(
      speed.greaterThan(
        params.maxSpeed
      ),
      () => {
        v.assign(
          v
            .normalize()
            .mul(params.maxSpeed)
        );
      }
    );

    p.addAssign(
      v.mul(dt)
    );
  })()
    .compute(count)
    .setName('Update Living Tide');

  // DOBLE CLIC: ONDA LOCAL ----------------------------------------------

  const impulseParticles = Fn(() => {
    const p = positionBuffer.element(
      instanceIndex
    );

    const v = velocityBuffer.element(
      instanceIndex
    );

    const away =
      p.sub(params.attractor);

    const distance =
      away.length();

    const direction =
      away.div(
        max(
          distance,
          params.softening
        )
      );

    const local =
      float(1.0).sub(
        smoothstep(
          0.0,
          params.impulseRadius,
          distance
        )
      );

    v.addAssign(
      direction
        .mul(params.impulseStrength)
        .mul(params.masterIntensity)
        .mul(
          local.mul(local)
        )
    );
  })()
    .compute(count)
    .setName('Mouse Shockwave');

  // Q: GOLPE RESPIRATORIO ------------------------------------------------
  // Este compute modifica la velocidad una sola vez.
  // No asigna posiciones ni ejecuta una animación predeterminada.

  const breathImpactParticles = Fn(() => {
    const p = positionBuffer.element(
      instanceIndex
    );

    const v = velocityBuffer.element(
      instanceIndex
    );

    const distance = max(
      p.length(),
      0.0001
    );

    const outward =
      p.div(distance);

    const individuality = hash(
      instanceIndex.add(
        uint(197)
      )
    );

    // Evita que todas las partículas salgan
    // con exactamente la misma velocidad.
    const variation = individuality
      .sub(0.5)
      .mul(2.0)
      .mul(
        params.breathImpulseVariation
      )
      .add(1.0);

    v.addAssign(
      outward
        .mul(
          params.breathImpulseStrength
        )
        .mul(variation)
    );
  })()
    .compute(count)
    .setName('Breath Impact');

  // MATERIAL -------------------------------------------------------------

  const material =
    new THREE.SpriteNodeMaterial({
      blending:
        THREE.AdditiveBlending,

      depthWrite: false,
      transparent: true
    });

  material.positionNode =
    positionBuffer.toAttribute();

  const visibleParticle =
    float(1.0).sub(
      step(
        params.activeCount,
        float(instanceIndex)
      )
    );

  // El destello también agranda temporalmente
  // las partículas para reforzar el golpe.
  const flashAmount =
    params.breathFlash.clamp(
      0.0,
      1.0
    );

  const flashScale =
    flashAmount
      .mul(0.9)
      .add(1.0);

  material.scaleNode =
    params.particleSize
      .mul(visibleParticle)
      .mul(flashScale);

  material.colorNode = Fn(() => {
    const speed =
      velocityBuffer
        .toAttribute()
        .length();

    const t = speed
      .div(params.maxSpeed)
      .clamp(0.0, 1.0);

    const slow =
      color('#54ebff');

    const middle =
      color('#be70ff');

    const fast =
      color('#ffb45e');

    const coolMix = mix(
      slow,
      middle,
      t.mul(2.0).clamp(
        0.0,
        1.0
      )
    );

    const finalMix = mix(
      coolMix,
      fast,
      t
        .sub(0.5)
        .mul(2.0)
        .clamp(0.0, 1.0)
    );

    // Durante Q los colores se mezclan
    // con blanco-cian y vuelven progresivamente.
    const flashColor =
      color('#efffff');

    const illuminated = mix(
      finalMix,
      flashColor,
      flashAmount.mul(0.92)
    );

    return vec4(
      illuminated,
      1.0
    );
  })();

  material.opacityNode = step(
    uv()
      .xy
      .sub(0.5)
      .length(),
    0.5
  );

  const geometry =
    new THREE.PlaneGeometry(1, 1);

  const mesh =
    new THREE.InstancedMesh(
      geometry,
      material,
      count
    );

  mesh.frustumCulled = false;

  scene.add(mesh);

  // API ------------------------------------------------------------------

  return {
    count,
    positionBuffer,
    velocityBuffer,

    reset() {
      renderer.compute(
        initParticles
      );
    },

    stepSimulation() {
      renderer.compute(
        updateParticles
      );
    },

    applyImpulse() {
      renderer.compute(
        impulseParticles
      );
    },

    applyBreathImpact() {
      renderer.compute(
        breathImpactParticles
      );
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    }
  };
}