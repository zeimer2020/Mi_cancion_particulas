# Verificación de Muro de choque

`npm test` ejecuta catorce pruebas de simulación y gestos:

- Los cuatro estados mantienen posiciones finitas y respetan límites de velocidad con gestos sostenidos.
- Cambiar de entorno conserva agentes y posiciones hasta que calculan su respuesta.
- Puntero, Vínculo y Vacío alteran las trayectorias.
- Un delta cero conserva posiciones; reiniciar elimina memoria química.
- Los campos describen direcciones normalizadas sin audio ni reloj musical.
- Ráfagas repetidas y arrastres rápidos respetan los límites temporales.
- Un golpe produce desplazamiento físico mayor que el movimiento de reposo, sin teletransportar.
- W comprime el ancho del muro y soltar recupera un volumen amplio.
- Una descarga sin carga no produce un golpe automático; el golpe localizado usa la posición de la mano.
- V mueve el volumen entero con inversiones repetidas de dirección y amplitud perceptible, respeta los límites y no activa el acento luminoso. Al soltar recupera los límites normales.
- En reposo, la mayoría de agentes recorren regiones amplias con cambios graduales de dirección. El estado anterior para interpolación coincide con el paso previo real y se limpia correctamente al reiniciar.
- Los intervalos de pulsaciones humanas cambian las duraciones, sin retrasar el ataque ni programar golpes al dejar de tocar. Una frase nueva puede fijar otro pulso.
- Una carga de aproximadamente un pulso compacta el volumen; soltar una carga corta produce menos fuerza que soltar una completa.
- Q alterna físicamente el ataque lateral; un clic conserva su origen localizado después de soltar el ratón.

`npm run build` verifica producción. `npm run preview` permite revisar el MP3 y las rutas relativas del resultado.

## Ensayo en navegador

1. M inicia la canción. P oculta/muestra controles; el botón pequeño funciona en ambas vistas.
2. Q produce un golpe; mantener Espacio muestra HEY instantáneamente detrás de los agentes. Soltar elimina la palabra sin rastro, también con Memoria alta y con B pausado. La música sigue independiente.
3. Mantén W al menos un segundo y suelta: debe verse compresión y descarga. Perder foco o abrir un diálogo cancela la carga, sin lanzar materia accidentalmente.
4. E corta la luz y ralentiza la simulación; soltarlo recupera el escenario. No debe quedar un gesto pegado.
5. Clic breve golpea desde la mano. Arrastra para conducir y usa Mayús para abrir una grieta. El botón derecho cambia la vista.
6. Prueba 1–4 y los faders sin reiniciar; los agentes se adaptan progresivamente.
7. Mantén V o el botón Vibrar: todo el volumen tiembla, con el color conservado. Soltar o perder foco cancela el gesto. R y el botón Reiniciar funcionan sin aviso.
8. F presenta en pantalla completa. Comprueba los controles compactos en un ancho pequeño: no hay botones ni diálogos de Partitura o Cómo tocar. El deslizador Partículas muestra la cifra al moverlo y aplica al soltar; verifica mínimos, máximos y vuelta a 4.500. P y Espacio funcionan con el control enfocado. Abrir Música o perder foco retira HEY y los gestos sostenidos.
9. Deja Riff recorrer la pantalla: las curvas deben ser continuas y los puntos deben formar corrientes. Prueba Q y la descarga de W con alta densidad: el acento debe conservar tonos rojos, sin una nube blanca. La imagen se interpola entre pasos fijos.
10. Marca tres o cuatro Q a un ritmo regular. Pulso manual debe reflejar tus intervalos; W carga más rápido con un pulso rápido y V toma sus subdivisiones. Deja de tocar: no debe aparecer ningún golpe nuevo. Espacio sigue mostrando HEY exclusivamente mientras se sostiene.

## Límites prácticos

Se usan pasos fijos de 1/60 s y máximo dos pasos por frame. La cantidad inicial es de 4.500 agentes; el deslizador admite de 1.000 a 20.000 en pasos de 500. Cambiar cantidad reinicia agentes y rastro silenciosamente; elige antes de presentar. El sistema nunca cambia cantidad por sí solo.

Physarum se calcula en XY aunque los agentes y vecinos tienen profundidad. La búsqueda de vecinos está acotada a 72 inspecciones y 24 vecinos por agente. Los puntos se dibujan como fragmentos con la dirección de su velocidad, con mezcla normal y exposición que conserva su tono. Un acento fuerte modifica ligeramente la luz roja durante un intervalo corto y exclusivamente por un gesto humano.

El MP3 es local y no alimenta las reglas. Si la GPU pierde contexto, aparece un aviso para recargar. Revisa la consola para errores de WebGL o de carga del archivo. La compilación puede avisar del tamaño de Three.js; no es un fallo de ejecución.
