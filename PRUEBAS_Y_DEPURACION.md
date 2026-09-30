# Verificación del instrumento

Ejecuta `npm test` para comprobar:

- Los cuatro entornos mantienen posiciones finitas y velocidades dentro del límite durante gestos sostenidos.
- Cambiar de preset conserva las posiciones hasta que cada agente calcula su respuesta.
- El puntero, Vínculo y Suspender tienen consecuencias en la trayectoria.
- Los agentes depositan rastro químico acotado y R lo elimina.
- Un delta cero no mueve agentes; los campos producen direcciones normalizadas sin audio ni reloj.

`npm run build` verifica la compilación de producción. `npm run preview` sirve ese resultado para comprobar las rutas de recursos con `base: './'`.

## Prueba de presentación

1. Prueba los cuatro pads y los tres faders. La simulación debe responder sin saltar inmediatamente a una forma nueva.
2. Mantén y suelta W/E; pulsa Q una vez. Al salir de la pestaña o abrir un diálogo ningún gesto debe quedar pegado.
3. Arrastra y luego mantén Mayús. Prueba el botón derecho para orbitar.
4. Abre Música. Conecta YouTube y pulsa Reproducir; puede necesitar otro clic por las políticas del navegador. Prueba también un archivo local.
5. Cierra Música y comprueba que puedes seguir tocando. M controla el transporte; P solo la imagen.
6. En Partitura, marca una entrada con audio conectado, cierra y vuelve a abrir. Exporta el JSON. Ninguna entrada debe provocar un preset por sí sola.
7. F abre pantalla completa; H oculta controles. H o Escape permiten volver.
8. Prueba el ancho de teléfono y el escritorio. La consola debe seguir accesible.

## Rendimiento y diagnóstico

Se usan pasos fijos de 1/60 s y máximo dos pasos por frame para evitar recuperaciones largas al volver a una pestaña. No se acumula el tiempo de ausencia. La calidad ligera tiene 4.500 agentes; equilibrada, 9.000; densa, 16.000. Elegir calidad reinicia agentes y memoria; hazlo antes de presentar.

Si el rendimiento cae de forma sostenida, el instrumento sugiere calidad ligera sin cambiar el estado automáticamente. Activa aceleración gráfica y cierra tareas pesadas. Si se pierde el contexto WebGL, aparece un aviso para recargar. La consola del navegador permite distinguir errores de GPU de restricciones de YouTube.

YouTube puede introducir anuncios, pedir interacción o bloquear el iframe. El MP3 incluido y la carga local evitan esa dependencia. Un fallo de música no detiene la simulación. `public/audio/not-ok.mp3` contiene la canción elegida y se copia al build de producción.
