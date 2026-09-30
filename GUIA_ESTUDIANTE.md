# Cómo explicar NOT / OK

## Estado y percepción

Cada agente tiene posición y velocidad tridimensionales. Lee su propia velocidad, una dirección del campo en su ubicación, hasta 24 vecinos locales y tres sensores de rastro en XY. No conoce la canción, la partitura, el conjunto completo de agentes ni su futuro.

La cuadrícula espacial limita la búsqueda: se revisan como máximo 72 candidatos en nueve celdas, con un radio de 0,45–0,87 unidades y distancia 3D. En regiones muy densas esto es una aproximación local acotada, no un cálculo exhaustivo de todos los vecinos.

Los sensores Physarum están entre 0,28 y 0,86 unidades delante del agente. Se compara el frente con muestras a izquierda y derecha (ángulo 0,42–1,07 radianes). Si el frente pierde, se orienta hacia el lado con más rastro; empates laterales se resuelven aleatoriamente. La decisión se convierte en steering y se combina con las demás reglas.

## Acción

```text
vecinos cercanos → separación + alineación + cohesión
campo en la posición → dirección deseada
tres sensores → dirección hacia el rastro
gestos humanos → objetivos de llegada o huida
                      ↓
       velocidad deseada − velocidad actual
                      ↓
            combinar y limitar steering
                      ↓
       velocidad nueva limitada → posición nueva
                      ↓
         depósito → difusión → evaporación
```

Todos leen el estado anterior y escriben en buffers distintos. Después se intercambian los buffers. Así, el orden de actualización no permite a unos agentes conocer decisiones nuevas que otros aún no han tomado.

La fuerza de steering combinada está limitada a 2,1–14,1 unidades/s²; la velocidad, a 0,9–5,6 unidades/s. Son límites comunes controlados por Tensión. Los bordes se evitan con steering, sin rebotes ni aparición de agentes nuevos. La cámara muestra profundidad; el rastro químico permanece en un plano.

## Qué aporta la combinación

- **Campo:** organiza rutas y vórtices. Un campo no mueve partículas por sí mismo: `sampleFlow` entrega una dirección y `addSteering` calcula cómo aproximarse a esa velocidad.
- **Flocking:** la separación evita aglomeración extrema, la alineación comparte orientación y la cohesión reúne grupos cercanos. No se busca un centro global salvo cuando el intérprete mantiene W.
- **Physarum:** el entorno recuerda dónde pasaron los agentes. Cada agente deposita; otros leen ese depósito; la realimentación produce caminos compartidos. El mapa usa difusión local y evaporación exponencial. El acotamiento a 12 evita valores sin límite.
- **Steering interactivo:** el puntero, W y Q transforman los objetivos comunes. La respuesta permanece limitada y calculada por cada agente.

La estela de pantalla es una acumulación gráfica independiente del mapa químico. Memoria controla ambas permanencias para relacionar lo que se ve con lo que perciben los agentes, pero borrar solo el framebuffer no elimina el rastro que leen. R sí borra ambos y reinicia agentes.

## Explorar durante el ensayo

1. Mantén Latente y baja Vínculo: observa cómo disminuye la organización vecinal.
2. Cambia a Corriente sin reiniciar: distingue el entorno cambiado de la adaptación progresiva de los agentes.
3. Pasa a Huella y sube Memoria: busca caminos reforzados por el rastro anterior.
4. Mantén W, suelta y observa el retraso. El gesto no fija posiciones.
5. Marca Q una vez. La huida temporal modifica velocidad mediante steering; no aplica un impulso balístico.

## Control humano

`src/audio/player.js` solo reproduce y ofrece un reloj a la interfaz. `createSimulation.js` no importa audio. El score almacena tiempos para recordar entradas y no tiene scheduler. Las transiciones de estado solo ocurren al pulsar un pad, 1–4 o «Tocar…» en la partitura. La emergencia es autónoma; la conducción expresiva es humana.
