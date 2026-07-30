export const trustPoints = [
  { value: '01', title: 'Diagnóstico primero', copy: 'Revisamos la causa antes de ofrecer una pieza.' },
  { value: '02', title: 'Precio autorizado', copy: 'Sabes cuánto cuesta antes de iniciar el trabajo.' },
  { value: '03', title: 'Seguimiento real', copy: 'Tu reparación queda registrada con un folio.' },
  { value: '04', title: 'Garantía clara', copy: 'El alcance se explica y queda por escrito.' },
];

export const services = [
  { code: 'SCR', title: 'Pantalla y display', description: 'Táctil, imagen, brillo, marco y compatibilidad de la refacción.', chip: 'Frecuente · mismo día*' },
  { code: 'PWR', title: 'Batería y carga', description: 'Consumo, batería, conector, flex y entrada de voltaje.', chip: 'Medición previa' },
  { code: 'AUD', title: 'Audio y micrófono', description: 'Bocinas, auricular, micrófonos y calidad de llamada.', chip: 'Prueba funcional' },
  { code: 'CAM', title: 'Cámara y sensores', description: 'Enfoque, estabilización, proximidad, biometría y módulos.', chip: 'Según modelo' },
  { code: 'SYS', title: 'Software y soporte', description: 'Actualización, restablecimiento, respaldo y diagnóstico del sistema.', chip: 'Con autorización' },
  { code: 'NET', title: 'Liberación y red', description: 'Revisión de compatibilidad, desbloqueo permitido y configuración de conectividad.', chip: 'Caso por caso' },
  { code: 'WTR', title: 'Humedad y placa', description: 'Limpieza técnica, corrosión, corto y diagnóstico electrónico.', chip: 'Atención prioritaria' },
  { code: 'PRT', title: 'Protección y accesorios', description: 'Micas, fundas, cables, cargadores y accesorios de uso diario.', chip: 'Instalación en tienda' },
];

export const featuredProducts = [
  { title: 'Micas y protectores', description: 'Cristal templado, privacidad y protección según medida del equipo.', tag: 'Instalación limpia' },
  { title: 'Fundas y cables', description: 'Accesorios de uso diario elegidos para proteger el teléfono y cuidar la carga.', tag: 'Disponibilidad local' },
  { title: 'Audífonos', description: 'Opciones alámbricas y Bluetooth para llamadas, música y trabajo.', tag: 'Prueba en tienda' },
  { title: 'Teléfonos seleccionados', description: 'Equipos de oportunidad y modelos de alto movimiento, sujetos a inventario.', tag: 'Pregunta por stock' },
];

export const processSteps = [
  ['01', 'Recibimos', 'Registramos tu equipo, la falla reportada y sus condiciones visibles.', '5–10 min'],
  ['02', 'Diagnosticamos', 'Probamos funciones y aislamos la causa antes de cambiar componentes.', 'Según falla'],
  ['03', 'Cotizamos', 'Te explicamos opciones, precio, tiempo y garantía. Tú decides.', 'Sin sorpresas'],
  ['04', 'Reparamos', 'Trabajamos únicamente después de recibir tu autorización.', 'Mismo día*'],
  ['05', 'Probamos y entregamos', 'Validamos el resultado contigo y documentamos el servicio.', 'Con folio'],
] as const;

export const quoteIssues = [
  'Pantalla o display',
  'Batería',
  'No carga',
  'Daño por agua',
  'Cámara',
  'Audio o micrófono',
  'Software',
  'Instalar mica',
  'Otra falla',
];

export const brands = [
  {
    id: 'samsung',
    name: 'Samsung',
    family: 'Galaxy A · S · Z',
    note: 'Series A comunes, Galaxy S y plegables según disponibilidad.',
    models: ['Galaxy A05', 'Galaxy A06', 'Galaxy A07', 'Galaxy A15', 'Galaxy A16', 'Galaxy A17', 'Galaxy A25', 'Galaxy A35', 'Galaxy A55', 'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S24', 'Galaxy S25', 'Otro Galaxy'],
  },
  {
    id: 'iphone',
    name: 'iPhone',
    family: 'SE · 11 · 12 · 13 · 14 · 15 · 16 · 17 · Normal · Plus · Pro · Pro Max',
    note: 'Pantalla, batería, cámaras, centro de carga y diagnóstico general.',
    models: ['iPhone SE', 'iPhone 11', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 16', 'iPhone 16 Pro', 'iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max', 'Otro iPhone'],
  },
  {
    id: 'motorola',
    name: 'Motorola',
    family: 'Moto G · Edge · Razr',
    note: 'Modelos de alto movimiento en Tuxtla para pantalla, batería y carga.',
    models: ['Moto E13', 'Moto E14', 'Moto G14', 'Moto G24', 'Moto G34', 'Moto G54', 'Moto G84', 'Moto G85', 'Edge 40', 'Edge 50', 'Razr', 'Otro Motorola'],
  },
  {
    id: 'xiaomi',
    name: 'Redmi / Xiaomi',
    family: 'Redmi · Note · POCO',
    note: 'Revisión de display, software, batería, cámara y centro de carga.',
    models: ['Redmi 12', 'Redmi 13', 'Redmi 14C', 'Redmi Note 11', 'Redmi Note 12', 'Redmi Note 13', 'Redmi Note 14', 'POCO M6', 'POCO M7', 'POCO X6', 'POCO X7', 'Xiaomi 13', 'Xiaomi 14', 'Otro Xiaomi'],
  },
  {
    id: 'oppo',
    name: 'OPPO',
    family: 'A · Reno · Find',
    note: 'Cotización por versión exacta para asegurar disponibilidad de pieza.',
    models: ['OPPO A18', 'OPPO A38', 'OPPO A58', 'OPPO A60', 'OPPO A78', 'OPPO A79', 'Reno 8', 'Reno 10', 'Reno 11', 'Reno 12', 'Reno 13', 'Find X5', 'Find X6', 'Otro OPPO'],
  },
  {
    id: 'otros',
    name: 'Otros',
    family: 'Honor · Vivo · Realme · ZTE',
    note: 'Si no aparece tu equipo, lo revisamos por modelo y versión exacta.',
    models: ['Honor X6', 'Honor X7', 'Honor X8', 'Honor X9', 'Vivo Y17s', 'Vivo Y27', 'Vivo V30', 'Realme C55', 'Realme C67', 'ZTE Blade A54', 'ZTE Blade V50', 'Otro modelo'],
  },
];

export const faqs = [
  ['garantia', '¿Dan garantía?', 'Sí. La garantía se entrega por escrito y depende del servicio y de la pieza instalada.'],
  ['tiempo', '¿Cuánto tarda una reparación?', 'Depende del modelo y disponibilidad. Pantallas, baterías o centros de carga frecuentes pueden salir el mismo día.'],
  ['revision', '¿Revisan antes de cobrar?', 'Sí. Primero diagnosticamos y te explicamos la falla. No cambiamos piezas sin autorización.'],
  ['anticipo', '¿Necesito dejar anticipo?', 'Solo cuando se debe apartar una refacción especial o pedir una pieza específica para tu modelo.'],
  ['marcas', '¿Atienden todas las marcas?', 'Atendemos las marcas más comunes y revisamos otros modelos según disponibilidad de refacciones.'],
  ['datos', '¿Se pierden mis datos?', 'En reparaciones físicas normalmente no. Si el servicio implica software, te avisamos el riesgo antes de trabajar.'],
  ['agua', '¿Qué hago si se mojó mi celular?', 'No lo cargues. Apágalo si puedes y tráelo cuanto antes para limpieza y revisión de placa.'],
  ['pieza', '¿Usan piezas originales?', 'Te explicamos opciones disponibles: original, compatible premium o alternativa según presupuesto y modelo.'],
  ['folio', '¿Puedo rastrear mi equipo?', 'Sí. Cuando tu equipo entra al taller, se genera un folio para consultar el avance.'],
] as const;

export const capabilityGroups = [
  {
    title: 'Reparamos',
    items: ['Pantalla y táctil', 'Batería y carga', 'Cámaras y sensores', 'Audio y micrófonos'],
  },
  {
    title: 'Recuperamos',
    items: ['Daño por humedad', 'Fallas de placa', 'Equipos que no encienden', 'Errores de sistema'],
  },
  {
    title: 'Configuramos',
    items: ['Actualización y respaldo', 'Liberación compatible', 'Red y conectividad', 'Transferencia de información'],
  },
] as const;
