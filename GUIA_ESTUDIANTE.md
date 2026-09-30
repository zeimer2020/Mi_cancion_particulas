# Cómo explicar Muro de choque

## Qué percibe y recuerda un agente

Tiene posición y velocidad 3D, una orientación de wander y una región de origen dentro del muro. Percibe hasta 24 vecinos a 0,45–0,87 unidades, la dirección del campo en su posición y tres muestras de rastro químico en XY. El radio local depende de Vínculo. Los sensores químicos se adelantan 0,28–0,86 unidades; su apertura depende de Tensión.

No conoce la canción, la partitura ni el estado completo del enjambre. Recibe las condiciones comunes que tú cambias: campo, parámetros, puntero, columna de carga, golpe, vacío o dirección de vibración.

## Cómo calcula su acción

```text
campo local + wander + vecinos + sensores + objetivos del gesto
                           ↓
            velocidades deseadas − velocidad actual
                           ↓
            suma ponderada y límite de fuerza
                           ↓
            integración y límite de velocidad
                           ↓
             nueva posición + depósito de rastro
```

Wander perturba suavemente la orientación con una variación acotada; no es una secuencia musical. En reposo domina un campo de corrientes largas y los agentes recorren la pantalla sin una correa hacia su origen. Ese origen se utiliza durante la descarga de W para abrir de nuevo el volumen. Los bordes se evitan mediante steering.

La velocidad base es `2,5 + 11,5 × Tensión`, y la fuerza base, `12 + 32 × Tensión`. El golpe, la carga, el puntero y la vibración amplían temporalmente estos límites. La fuerza de steering cambia gradualmente en reposo y responde más rápido a los gestos. La fuerza total y la velocidad se limitan en cada paso; también se evita salir del espacio mediante steering, sin rebotes ni teletransporte. El bucle integra pasos de 1/60 s y limita el trabajo acumulado. El renderer interpola entre los dos últimos estados para dibujar movimiento continuo sin alterar la simulación.

## Qué aporta cada regla

- **Steering:** llegada reúne en la columna; Q propone una banda compacta y alterna el ataque lateral, con retorno breve hacia el origen; huida produce el golpe localizado y el desgarro. Wander introduce incertidumbre local. La mano propone una dirección, cada agente calcula cómo seguirla.
- **Flow fields:** mapas estáticos de direcciones producen pliegues, carriles y contrastes locales. Cambiar el mapa no mueve directamente las posiciones.
- **Flocking:** separación impide amontonamientos; alineación produce fragmentos compartidos; cohesión mantiene vínculos locales. Vínculo cambia su alcance y peso.
- **Physarum:** sensores frontal, izquierdo y derecho comparan materia depositada. Cada agente deja un rastro que se difunde y evapora; los siguientes recorridos dependen de acciones anteriores. Ceniza da mayor peso a esta memoria.

El campo organiza el volumen, los vecinos forman grupos y la química conserva historia. Su combinación produce rutas distintas incluso bajo condiciones comunes.

## Por qué sigue siendo una interpretación

Q dispara un único golpe por pulsación y registra el tiempo de la acción humana. La mediana de los últimos cuatro intervalos válidos ajusta duraciones; no lee la canción ni retrasa el golpe a una cuadrícula. El ataque es breve, compacta hacia una banda y alterna la dirección lateral; un retorno corto permite distinguir el siguiente acento. Mantener W cambia el objetivo hacia una columna y carga en aproximadamente un pulso manual; soltarlo dispara una descarga proporcional a la carga. Mantener E ralentiza y corta la luz; soltarlo vuelve a mostrar el estado que continuaba calculándose lentamente. Perder foco o abrir un diálogo cancela la carga para evitar una descarga accidental.

El renderer orienta cada fragmento según su velocidad. Un golpe también acentúa luz y bandas ópticas, sin mover agentes por shader. La música se reproduce en un transporte separado: no hay FFT, detección de beats ni presets programados en la aplicación.

Espacio sostenida muestra HEY al fondo como escenografía de puntos. No es un comportamiento de los agentes: se compone fuera de su memoria y desaparece al soltar. La entrada siempre es humana. El deslizador Partículas cambia el número real de agentes entre 1.000 y 20.000; aplica al soltar y reinicia su estado, sin interrumpir el audio.

Mantener V abre un campo común que alterna su dirección en subdivisiones del pulso marcado por Q, con límites de frecuencia. Cada agente calcula steering hacia esa dirección con fuerza acotada: vibra la materia, sin mover la cámara ni escribir posiciones. Cambiar el pulso conserva la fase del temblor. V por sí sola no dispara luz blanca. Al soltar, desaparece esa contribución y regresan los límites habituales.

El documento SCORE_VISUAL.md propone momentos aproximados y posibles acciones fuera de la aplicación. Puedes adelantarte, esperar, sostener un estado o cambiar de decisión al escuchar y observar. La interfaz no incluye paneles de partitura ni instrucciones.

## Demostración breve

1. Muestra Riff y explica qué calcula un agente.
2. Mantén W un segundo: compara la columna con el volumen inicial.
3. Suelta W: la materia abre el espacio por steering; no cambia de posición de golpe.
4. Pulsa Q, arrastra en diagonal y abre una grieta con Mayús. Mantén Espacio para una entrada HEY y suelta para retirarla.
5. Mantén V para hacer temblar todo el volumen, suelta y compara. Mantén E y suelta para demostrar el contraste entre vacío y golpe.
6. Pasa a Ceniza y aumenta Memoria; observa la historia del rastro.
7. Explica cómo decidiste estos gestos al escuchar NOT OK.
