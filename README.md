# NOT / OK · Muro de choque

Instrumento visual para interpretar **NOT OK, de 5 Seconds of Summer**. Corrientes tridimensionales de partículas recorren la pantalla, se comprimen, salen disparadas y dejan memoria según tus gestos. Los rojos profundos sobre negro conservan la referencia del concierto, con acentos rojos y poco halo. La materia son puntos y fragmentos orientados por su velocidad. Mantener Espacio añade un HEY hecho de puntos al fondo, exclusivamente por tu decisión.

## Ejecutar

En esta misma carpeta de proyecto:

```sh
npm install
npm run dev
```

Abre la dirección de Vite en Chrome o Edge con aceleración gráfica. Utiliza WebGL y Three.js. Para comprobar producción:

```sh
npm test
npm run build
npm run preview
```

Se conservan `base: './'`, el workflow de GitHub Pages y los archivos ignorados del proyecto. Revisa los cambios en VS Code y haz tu commit desde GitHub Desktop.

## Interpretar

El escenario abre con la interfaz oculta. Pulsa **M** para tu MP3 y **F** para pantalla completa. **P** muestra u oculta los controles. El botón pequeño de la esquina reproduce o pausa la canción en cualquier vista.

| Gesto | Consecuencia perceptible |
| --- | --- |
| Mantener Espacio | HEY grande de puntos al fondo, inmediato y sin rastro al soltar. Funciona también con la interfaz oculta. |
| Q | Pulso inmediato: compacta hacia una banda y alterna el ataque izquierda/derecha. Cada pulsación produce un acento; sus intervalos ajustan las duraciones al pulso que tú marcas. |
| Mantener W | Comprime rápidamente hacia una columna mediante llegada. Puede cargar en aproximadamente un pulso; una pulsación corta produce una descarga menor. |
| Soltar W | Dispara la materia hacia su volumen de origen. La descarga ocurre al soltar, por tu decisión. |
| Mantener E | Vacío: corta la luz y ralentiza al 4,5% el tiempo de los agentes y del rastro químico. Suelta para volver. |
| Mantener V | Vibración de todo el volumen: steering alterna la dirección en subdivisiones del pulso marcado con Q. Movimiento rojo, sin añadir un golpe de luz. Suelta para detener el temblor. |
| Clic breve en el escenario | Golpe desde la posición de tu mano. |
| Arrastrar | Atrae y añade la dirección del trazo al steering local: corta y conduce corrientes. |
| Mayús + arrastrar | Huida local: abre y desgarra el volumen. |
| Botón derecho + arrastrar | Cambia el punto de vista 3D. |
| 1 / Riff | Corrientes amplias que cruzan la pantalla y giran gradualmente cerca de los bordes. |
| 2 / Vértigo | Carriles opuestos con mayor profundidad Z. |
| 3 / Avalancha | Pliegues más intensos, velocidad alta y menor cohesión. |
| 4 / Ceniza | Predomina Physarum, movimiento contenido y memoria larga. |
| Tensión / Vínculo / Memoria | Intervienen velocidad y fuerza, organización local y permanencia del rastro. |
| P / H | Muestra u oculta la interfaz. |
| B | Pausa visual; Espacio puede mostrar HEY incluso con los agentes pausados. |
| M | Reproduce / pausa la canción. |
| F / R | Pantalla completa / reiniciar agentes y rastros sin mensaje. |

Prueba primero **M → F → mantener W un segundo → soltar → Q en un acento → arrastre diagonal**. Mantén Espacio cuando quieras acompañar un «hey» y suelta al terminar. Escucha para elegir los momentos. Reservar algún vacío o una espera hace que la siguiente descarga pese más.

Para encajar los gestos con NOT OK, marca tres o cuatro pulsos regulares con Q mientras escuchas. El indicador Pulso manual muestra tu cuenta: no mide el audio. Se usan los últimos cuatro intervalos válidos para ajustar la duración corta de Q, la carga de W y el temblor de V. Tras una pausa entre frases, las siguientes pulsaciones pueden fijar una cuenta nueva. Cada acento entra en cuanto pulsas, sin esperar una cuadrícula ni generar golpes automáticamente. El valor inicial orienta las duraciones, no programa eventos.

Prueba **Q → Q → W sostenida durante un pulso → soltar en una entrada → V durante una frase → soltar**. Escucha para decidir cuándo hacerlo: Q comprime y retorna brevemente para separar golpes; W sirve para preparar una entrada mayor; la mano dibuja el contorno de las frases; Espacio acompaña el «hey» solo mientras la sostienes.

## Reglas y conducción humana

Solo steering behaviors, flow fields, flocking y Physarum calculan movimiento. Cada agente tiene posición, velocidad, una orientación de wander y una región de origen. Consulta el campo en su posición, hasta 24 vecinos locales y tres sensores químicos. Combina velocidades deseadas, limita la fuerza, integra la velocidad y limita también su velocidad final. Los gestos modifican objetivos y límites compartidos; nunca escriben posiciones ni teletransportan partículas.

El steering tiene una respuesta gradual en reposo y una respuesta rápida para los gestos. Los agentes recorren libremente el campo; su origen sirve de destino durante la descarga de W y el retorno breve de Q. El dibujo interpola entre los dos últimos pasos para evitar saltos en pantallas con alta frecuencia de actualización y utiliza la velocidad real para orientar cada fragmento. El rastro se acorta durante cada acento para distinguirlo del siguiente. La mezcla de partículas y la exposición conservan los rojos en acumulaciones densas; los golpes no cambian a crema o blanco. La luz y las bandas ópticas responden a un golpe humano; E oscurece la presentación. Estos recursos de renderizado no cambian el cálculo de los agentes. No hay ráfagas repetidas por temporizador ni cambios ligados al tiempo de la canción.

La simulación utiliza buffers dobles en CPU, vecinos mediante cuadrícula y dibujo en GPU. Physarum tiene un sustrato XY de 256 × 160: los agentes, vecinos y campo tienen Z, pero la percepción química es planar. Arranca con 4.500 agentes. El deslizador Partículas permite elegir entre 1.000 y 20.000 en pasos de 500. La cifra se actualiza mientras lo mueves y se aplica al soltar; cambiar cantidad reinicia agentes y rastros silenciosamente, conservando la canción y el estado visual seleccionado. El sistema nunca cambia cantidad por sí solo.

HEY es una capa de escenografía estática compuesta de puntos, detrás del enjambre. No mueve los agentes y se dibuja fuera de los buffers de memoria. Por eso aparece inmediatamente y desaparece al soltar, incluso con Memoria alta. No hay temporizador de letras ni reconocimiento de la canción.

## Música y preparación

`public/audio/not-ok.mp3` es una copia exacta del MP3 suministrado. Música permite buscar, reiniciar o cargar otro archivo local. No se usa reproductor de YouTube, micrófono ni análisis de audio en la aplicación. El transporte solo informa estado y tiempo a la interfaz; no se conecta con las reglas de movimiento.

Para diseñar esta versión se estudió fuera de la aplicación la energía del archivo de 3:26. Las referencias de tiempo son aproximadas y orientan el ensayo, sin disparar acciones. Consulta [SCORE_VISUAL.md](./SCORE_VISUAL.md) y [ANALISIS_MUSICAL.md](./ANALISIS_MUSICAL.md).

La aplicación ofrece únicamente la experiencia, sus controles compactos y el transporte musical. Las instrucciones y los documentos de preparación permanecen fuera del escenario; no hay paneles de Partitura ni Cómo tocar.

## Código

- `src/main.js`: teclado, puntero y ejecución.
- `src/simulation/gestures.js`: golpe y descarga manual, sin editar posiciones.
- `src/simulation/parameters.js`: estados, densidades y límites.
- `src/simulation/flowField.js`: mapas de direcciones.
- `src/simulation/createSimulation.js`: percepción y decisiones de cada agente.
- `src/renderer.js`: fragmentos orientados por velocidad, cámara, luz y memoria visual.
- `src/heyBackdrop.js`: máscara de HEY hecha de puntos para la escenografía manual.
- `src/ui/labPanel.js`, `src/styles.css`, `index.html`: controles compactos y transporte musical.
- `src/audio/player.js`: transporte del MP3 local.

## Referencias

- [The Nature of Code: Autonomous Agents](https://natureofcode.com/autonomous-agents/): percepción y steering.
- [Craig Reynolds: Steering Behaviors](https://www.red3d.com/cwr/steer/gdc99/): wander, arrive, flee, separación, alineación y cohesión.
- [Tyler Hobbs: Flow Fields](https://www.tylerxhobbs.com/words/flow-fields): campo como entorno consultado localmente.
- [Bleuje: Physarum](https://bleuje.com/physarum-explanation/): sensores, depósito, difusión y evaporación.
- [Referencia de concierto](https://www.youtube.com/watch?v=G0Ng-PrjDWM&t=152s): escala, contraste rojo/negro/crema y cambios contundentes, reinterpretados como partículas.
