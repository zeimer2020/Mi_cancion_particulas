function formatValue(
  key,
  value,
  step
) {
  if (key === 'activeCount') {
    return Math
      .round(value)
      .toLocaleString('es-CO');
  }

  if (key === 'movementSpeed') {
    return `${value.toFixed(2)}×`;
  }

  if (key === 'particleSize') {
    return value.toFixed(3);
  }

  return value.toFixed(
    step < 0.05 ? 2 : 1
  );
}

function rangeRow(
  parent,
  label,
  params,
  key,
  min,
  max,
  step
) {
  const wrap =
    document.createElement('div');

  wrap.className = 'row';

  const lab =
    document.createElement('label');

  const name =
    document.createElement('span');

  const value =
    document.createElement('span');

  value.className = 'value';
  name.textContent = label;

  lab.append(name, value);

  const input =
    document.createElement('input');

  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);

  const syncFromParameter = () => {
    input.value =
      String(params[key].value);

    value.textContent =
      formatValue(
        key,
        Number(params[key].value),
        step
      );
  };

  input.addEventListener(
    'input',
    () => {
      params[key].value =
        Number(input.value);

      value.textContent =
        formatValue(
          key,
          Number(input.value),
          step
        );
    }
  );

  syncFromParameter();

  wrap.append(lab, input);
  parent.append(wrap);

  return {
    refresh: syncFromParameter
  };
}

function button(
  parent,
  label,
  onClick
) {
  const element =
    document.createElement('button');

  element.type = 'button';
  element.textContent = label;

  element.addEventListener(
    'click',
    onClick
  );

  parent.append(element);

  return element;
}

const TESTS = [
  [
    'inertia',
    '1 · Inercia',
    'Sin fuerzas, la nube conserva su velocidad inicial y se expande.'
  ],
  [
    'flow',
    '2 · Flujo',
    'El campo continuo curva la nube sin imponerle una trayectoria fija.'
  ],
  [
    'singularity',
    '3 · Epicentro',
    'Mantén clic: el ratón atrae y hace girar la materia cercana.'
  ],
  [
    'pulse',
    '4 · Onda',
    'Haz doble clic: una fuerza breve expulsa partículas desde el ratón.'
  ],
  [
    'shape',
    '5 · Campo de forma',
    'R cambia el contorno; la nube oscila y converge mediante una fuerza elástica.'
  ]
];

export function createLabPanel({
  params,
  initialMode = 'LAB',
  onReset,
  onTest,
  onRestore,
  onModeChange,
  onPauseChange,
  onCycleShape,
  onNotify
}) {
  const refreshers = [];

  const panel =
    document.createElement('aside');

  panel.className = 'panel';

  panel.innerHTML = `
    <h1>Marea Viva 3D · LAB</h1>
    <p>
      La nube nace con velocidad.
      Clic izquierdo interpreta;
      clic derecho orbita la cámara.
      Predice, prueba y conduce.
    </p>
  `;

  // PRUEBAS --------------------------------------------------------------

  const tests =
    document.createElement('div');

  tests.className = 'group';

  tests.innerHTML =
    '<h2>Pruebas de comportamiento</h2>';

  const prediction =
    document.createElement('p');

  prediction.className =
    'prediction';

  for (
    const [
      id,
      label,
      expected
    ] of TESTS
  ) {
    button(
      tests,
      label,
      () => {
        prediction.innerHTML =
          `<strong>Predicción:</strong> ${expected}`;

        onTest(id);
      }
    );
  }

  prediction.innerHTML =
    `<strong>Predicción:</strong> ${TESTS[1][2]}`;

  tests.append(prediction);

  button(
    tests,
    'Restaurar instrumento completo',
    onRestore
  );

  panel.append(tests);

  // MATERIA Y RITMO ------------------------------------------------------

  const matter =
    document.createElement('div');

  matter.className = 'group';

  matter.innerHTML =
    '<h2>Materia y ritmo</h2>';

  refreshers.push(
    rangeRow(
      matter,
      'Cantidad de partículas',
      params,
      'activeCount',
      16384,
      131072,
      8192
    )
  );

  refreshers.push(
    rangeRow(
      matter,
      'Velocidad base',
      params,
      'movementSpeed',
      0.35,
      2.0,
      0.05
    )
  );

  refreshers.push(
    rangeRow(
      matter,
      'Tamaño de partícula',
      params,
      'particleSize',
      0.008,
      0.065,
      0.001
    )
  );

  panel.append(matter);

  // PARÁMETROS DE FUERZAS ------------------------------------------------

  const tuning =
    document.createElement('div');

  tuning.className = 'group';

  tuning.innerHTML =
    '<h2>Tres parámetros centrales</h2>';

  refreshers.push(
    rangeRow(
      tuning,
      'Agitación del flujo',
      params,
      'flowStrength',
      0,
      3,
      0.05
    )
  );

  refreshers.push(
    rangeRow(
      tuning,
      'Fuerza del epicentro',
      params,
      'singularityStrength',
      4,
      30,
      0.2
    )
  );

  refreshers.push(
    rangeRow(
      tuning,
      'Fricción',
      params,
      'dragCoefficient',
      0.04,
      0.75,
      0.01
    )
  );

  panel.append(tuning);

  // LECTURA --------------------------------------------------------------

  const reading =
    document.createElement('div');

  reading.className =
    'group readings';

  reading.innerHTML =
    '<h2>Lectura</h2>';

  const status =
    document.createElement('p');

  status.textContent =
    'Forma CÍRCULO · gesto libre · tiempo 1.00×';

  reading.append(status);
  panel.append(reading);

  // ACCIONES -------------------------------------------------------------

  const actions =
    document.createElement('div');

  actions.className =
    'group actions';

  actions.innerHTML =
    '<h2>Acciones</h2>';

  button(
    actions,
    'Reiniciar',
    onReset
  );

  const pauseButton = button(
    actions,
    'Pausar',
    onPauseChange
  );

  button(
    actions,
    'R · Cambiar forma',
    onCycleShape
  );

  button(
    actions,
    'Activar aviso',
    onNotify
  );

  button(
    actions,
    'Abrir PERFORMANCE',
    () => {
      onModeChange(
        'PERFORMANCE'
      );
    }
  );

  panel.append(actions);

  document.body.append(panel);

  // API DEL PANEL --------------------------------------------------------

  function setMode(mode) {
    panel.classList.toggle(
      'hidden',
      mode !== 'LAB'
    );
  }

  setMode(initialMode);

  return {
    element: panel,

    setMode,

    setVisible(visible) {
      panel.classList.toggle(
        'hidden',
        !visible
      );
    },

    setPaused(paused) {
      pauseButton.textContent =
        paused
          ? 'Continuar'
          : 'Pausar';
    },

    setPerformanceState({
      shape,
      gestures,
      timeFactor
    }) {
      status.textContent =
        `Forma ${shape} · ` +
        `${gestures || 'gesto libre'} · ` +
        `tiempo ${timeFactor.toFixed(2)}×`;
    },

    refresh() {
      for (
        const refresher of refreshers
      ) {
        refresher.refresh();
      }
    },

    dispose() {
      panel.remove();
    }
  };
}