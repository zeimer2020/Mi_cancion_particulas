# NOT / OK · Instrumento visual

Instrumento para interpretar **NOT OK, de 5 Seconds of Summer**, mediante agentes autónomos. La materia visual son puntos y rastros con profundidad: no se forman letras. La interpretación cambia el entorno y las reglas; cada agente calcula su respuesta. Los estados nunca se cambian por tiempo, volumen o análisis de audio.

## Ejecutar

Node.js 22.12 o superior recomendado. En la carpeta del proyecto:

```sh
npm install
npm run dev
```

Abre la dirección que imprime Vite en Chrome o Edge con aceleración gráfica. El escenario usa WebGL; ya no exige WebGPU. Para preparar GitHub Pages:

```sh
npm test
npm run build
npm run preview
```

La configuración conserva `base: './'` y el workflow de GitHub Pages del proyecto. `node_modules` y `dist` siguen ignorados. El código se modifica en esta misma carpeta, para revisar los cambios en VS Code y hacer tu commit desde GitHub Desktop.

## Tocar

| Control | Consecuencia |
| --- | --- |
| 1 / Latente | Corriente de vórtice en una banda; grupo contenido. |
| 2 / Corriente | Campo con dirección común y curvaturas; flujo abierto. |
| 3 / Fractura | Rutas en competencia, velocidad alta y menor cohesión. |
| 4 / Huella | Predomina la búsqueda del rastro depositado; memoria larga. |
| Tensión | Velocidad, fuerza máxima de steering y apertura de los sensores. |
| Vínculo | Radio local, peso de alineación y cohesión frente a separación. |
| Memoria | Evaporación del mapa Physarum, seguimiento del rastro y duración de la estela visual. |
| Arrastre izquierdo | Llegar hacia el puntero dentro de un radio local. |
| Mayús + arrastre | Huir del puntero. |
| Q / Fracturar | Acento manual: objetivo de huida radial temporal, limitado por steering. |
| Mantener W / Reunir | Llegar hacia el centro; soltar devuelve libertad. |
| Mantener E / Suspender | Avance lento, incluida la memoria química. |
| Botón derecho + arrastre | Cambiar el punto de vista en 3D. |
| F | Pantalla completa. |
| H / Presentar | Ocultar controles para presentar; H vuelve a mostrarlos. |
| P | Pausar solo la simulación visual. |
| M | Reproducir / pausar el acompañamiento conectado. |
| R | Reiniciar agentes y borrar sus rastros. |

Los presets cambian condiciones y color, conservando las posiciones, velocidades y memoria. El color y la estela son recursos de renderizado; no añaden otro algoritmo de movimiento. La interfaz ofrece también botones sostenibles para Q/W/E. Los gestos se liberan al perder foco, cambiar de estado o abrir un diálogo.

## Música y partitura

La canción está preparada en `public/audio/not-ok.mp3`: pulsa **M** para empezar. En **Música** puedes usar el MP3 incluido, conectar el [video elegido](https://www.youtube.com/watch?v=-qNW-jD4dsY) o cargar otro MP3, WAV, OGG o M4A local. YouTube requiere conexión, puede mostrar anuncios o rechazar la reproducción embebida. En ese caso existe un enlace para abrirlo en otra pestaña. La reproducción del MP3 incluido funciona sin esa dependencia.

La carga local usa una URL temporal del navegador y no envía el archivo a ningún servidor. No hay `AnalyserNode`, micrófono, FFT ni detección de golpes. El transporte solo informa tiempo y estado a la interfaz y a las marcas de ensayo; no se conecta con la simulación.

En **Partitura**, marca entradas mientras escuchas o escribe tiempos `m:ss`. Se guardan en este navegador y se pueden exportar a JSON. Las marcas son orientativas: no disparan presets, gestos ni parámetros. Cada botón «Tocar…» es una intervención humana explícita. Consulta [SCORE_VISUAL.md](./SCORE_VISUAL.md) para preparar el ensayo.

## Dónde modificar

- `src/main.js`: ejecución, teclado, ratón y límites del bucle de tiempo.
- `src/simulation/parameters.js`: los cuatro estados y las tres densidades.
- `src/simulation/flowField.js`: entornos de direcciones, independientes de los agentes.
- `src/simulation/createSimulation.js`: estado, percepción local, steering, flocking y Physarum.
- `src/renderer.js`: puntos en Three.js, cámara, colores y acumulación de estelas.
- `src/ui/labPanel.js`: controles, ayuda y partitura manual.
- `src/audio/player.js`: acompañamiento YouTube / archivo local.
- `src/styles.css` e `index.html`: presentación y estructura.

La simulación usa buffers en CPU y el dibujo usa GPU. El sustrato Physarum es un mapa XY de 256 × 160; las posiciones, velocidades, vecinos y el campo incluyen Z. Es una combinación de agentes 3D con percepción de rastro en un plano, no un Physarum volumétrico. La búsqueda local usa una cuadrícula y muestreo acotado en zonas densas para mantener respuesta inmediata. Elige 4.500, 9.000 o 16.000 agentes en **Cómo tocar** antes de presentar; cambiar calidad reinicia el sistema. Si baja el rendimiento, aparece una sugerencia, sin cambiar el instrumento automáticamente.

## Referencias

- [The Nature of Code: Autonomous Agents](https://natureofcode.com/autonomous-agents/): velocidad deseada, steering y percepción local.
- [Craig Reynolds: Steering Behaviors](https://www.red3d.com/cwr/steer/gdc99/): separación, alineación, cohesión, seek, flee y arrive.
- [Tyler Hobbs: Flow Fields](https://www.tylerxhobbs.com/words/flow-fields): campo como entorno de direcciones consultado por el agente.
- [Bleuje: explicación de Physarum](https://bleuje.com/physarum-explanation/): sensores, depósito, difusión y evaporación.
- [Bleuje: Interactive Physarum](https://github.com/Bleuje/interactive-physarum): material de estudio.
- [Referencia del concierto desde 2:32](https://www.youtube.com/watch?v=G0Ng-PrjDWM&t=152s): contraste rojo/negro y presencia escénica, reinterpretados como partículas.

Implementación propia a partir de los principios; no contiene código copiado de las referencias.
