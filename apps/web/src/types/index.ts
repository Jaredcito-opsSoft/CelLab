// ─────────────────────────────────────────────────────────────────────────────
// CelLab Tuxtla · TypeScript Interfaces & Mock Data
// ─────────────────────────────────────────────────────────────────────────────

// ── Repair Order ─────────────────────────────────────────────────────────────

export type RepairStatus =
  | 'recibido'
  | 'diagnostico'
  | 'en_reparacion'
  | 'esperando_refaccion'
  | 'listo'
  | 'entregado';

export interface RepairOrder {
  folio: string;
  device: string;
  brand: string;
  model: string;
  issue: string;
  status: RepairStatus;
  statusLabel: string;
  estimatedDate?: string;
  techNote?: string;
  createdAt: string;
}

export const MOCK_ORDERS: Record<string, RepairOrder> = {
  'REP-0001': {
    folio: 'REP-0001',
    device: 'Smartphone',
    brand: 'Samsung',
    model: 'Galaxy A54',
    issue: 'Pantalla rota',
    status: 'listo',
    statusLabel: 'Listo para entregar',
    estimatedDate: '2026-06-20',
    techNote: 'Pantalla reemplazada. Garantía 30 días.',
    createdAt: '2026-06-18',
  },
  'REP-0042': {
    folio: 'REP-0042',
    device: 'Smartphone',
    brand: 'iPhone',
    model: 'iPhone 13',
    issue: 'Batería agotada',
    status: 'en_reparacion',
    statusLabel: 'En reparación',
    estimatedDate: '2026-06-21',
    techNote: 'Batería en sustitución. Tiempo estimado: 2 horas.',
    createdAt: '2026-06-20',
  },
  'REP-0099': {
    folio: 'REP-0099',
    device: 'Smartphone',
    brand: 'Motorola',
    model: 'Moto G84',
    issue: 'No carga',
    status: 'diagnostico',
    statusLabel: 'En diagnóstico',
    estimatedDate: '2026-06-22',
    techNote: 'Revisando puerto USB-C y placa base.',
    createdAt: '2026-06-20',
  },
};

// ── FAQ ───────────────────────────────────────────────────────────────────────

export type FaqCategory = 'diagnostico' | 'cotizacion' | 'antes_de_reparar' | 'garantia' | 'refacciones';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  categoryLabel: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico',
    question: '¿El diagnóstico tiene costo?',
    answer:
      'No. El diagnóstico de tu equipo es completamente gratuito. Te decimos exactamente qué tiene y cuánto costaría repararlo, sin ningún compromiso de tu parte.',
  },
  {
    id: 'faq-2',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico',
    question: '¿Cuánto tiempo tarda el diagnóstico?',
    answer:
      'En la mayoría de los casos el diagnóstico toma entre 15 y 30 minutos. Para fallas complejas de placa o daño por agua puede extenderse hasta 2 horas.',
  },
  {
    id: 'faq-3',
    category: 'garantia',
    categoryLabel: 'Garantías',
    question: '¿Cuánto tiempo de garantía tienen las reparaciones?',
    answer:
      'Todas nuestras reparaciones incluyen garantía mínima de 15 días. Cambios de pantalla y batería tienen garantía de 30 días. Servicios de micro-soldadura cuentan con 7 días. La garantía cubre exactamente el servicio realizado.',
  },
  {
    id: 'faq-4',
    category: 'garantia',
    categoryLabel: 'Garantías',
    question: '¿Qué cubre y qué no cubre la garantía?',
    answer:
      'La garantía cubre fallas derivadas directamente del servicio que realizamos. No cubre daños por nuevas caídas, contacto con líquidos posteriores a la reparación, o desperfectos causados por terceros. Cada nota de servicio especifica exactamente qué está cubierto.',
  },
  {
    id: 'faq-5',
    category: 'refacciones',
    categoryLabel: 'Refacciones',
    question: '¿Usan refacciones originales?',
    answer:
      'Trabajamos con tres categorías de refacciones: originales de fábrica (OEM), compatibles de alta calidad y genéricas económicas. Te informamos antes de reparar qué tipo de refacción se usará y cómo afecta al precio y garantía. Tú decides.',
  },
  {
    id: 'faq-6',
    category: 'refacciones',
    categoryLabel: 'Refacciones',
    question: '¿Tienen refacciones para todas las marcas?',
    answer:
      'Contamos con refacciones para iPhone, Samsung, Motorola, Huawei, Xiaomi, LG y más. Para modelos muy recientes o poco comunes podemos pedirlas con tiempo de entrega de 24 a 72 horas.',
  },
  {
    id: 'faq-7',
    category: 'diagnostico',
    categoryLabel: 'Diagnóstico',
    question: '¿Qué pasa si decido no reparar?',
    answer:
      'Ningún problema. Si recibimos tu equipo y decides no repararlo después del diagnóstico, te lo devolvemos sin costo alguno. El diagnóstico siempre es gratuito.',
  },
  {
    id: 'faq-8',
    category: 'cotizacion',
    categoryLabel: 'Cotización',
    question: '¿Cuánto cuesta cambiar la pantalla de mi celular?',
    answer: 'El precio depende del modelo exacto y del tipo de refacción disponible. Selecciona tu marca, modelo y falla en el cotizador para preparar un mensaje; te confirmaremos opciones antes de reparar.',
  },
  {
    id: 'faq-9',
    category: 'cotizacion',
    categoryLabel: 'Cotización',
    question: '¿Qué datos necesitan para cotizar por WhatsApp?',
    answer: 'Marca, modelo exacto y falla principal. Si la pantalla está rota, una foto ayuda a identificar el daño. Nunca envíes contraseñas, códigos de desbloqueo ni información personal por WhatsApp.',
  },
  {
    id: 'faq-10',
    category: 'cotizacion',
    categoryLabel: 'Cotización',
    question: '¿Pueden darme un precio exacto sin revisar el equipo?',
    answer: 'Podemos darte una referencia con el modelo y la falla, pero el precio definitivo se confirma después del diagnóstico. Así evitamos cobrarte una pieza cuando la causa real es otra.',
  },
  {
    id: 'faq-11',
    category: 'cotizacion',
    categoryLabel: 'Cotización',
    question: '¿El precio puede cambiar después del diagnóstico?',
    answer: 'Si encontramos una falla distinta, te explicamos el motivo y enviamos un nuevo presupuesto. No continuamos con trabajos adicionales hasta que tú los autorices.',
  },
  {
    id: 'faq-12',
    category: 'cotizacion',
    categoryLabel: 'Cotización',
    question: '¿Cuánto tiempo tardará la reparación?',
    answer: 'Pantallas, baterías y centros de carga comunes suelen resolverse el mismo día cuando hay refacción. Daño por agua, placa y fallas intermitentes requieren más tiempo de diagnóstico.',
  },
  {
    id: 'faq-13',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Voy a perder mis fotos o información?',
    answer: 'Una reparación física normalmente no borra información, pero ningún equipo dañado está libre de riesgo. Si todavía enciende, haz un respaldo antes de entregarlo. Te avisaremos si el servicio requiere restaurar el sistema.',
  },
  {
    id: 'faq-14',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Debo hacer una copia de seguridad?',
    answer: 'Sí, siempre que el equipo lo permita. Guarda fotos, contactos y archivos importantes en una computadora o servicio de nube antes de cualquier intervención.',
  },
  {
    id: 'faq-15',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Qué hago si mi celular se mojó?',
    answer: 'Apágalo, no lo conectes a cargar y no intentes encenderlo repetidamente. No uses arroz ni calor directo. Llévalo cuanto antes para desconectar la batería y evaluar corrosión interna.',
  },
  {
    id: 'faq-16',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Necesitan mi contraseña o patrón?',
    answer: 'Sólo puede ser necesario para probar funciones después de reparar. Puedes retirarlo temporalmente, crear un código provisional o desbloquear el equipo al recogerlo. Nunca compartas contraseñas de cuentas.',
  },
  {
    id: 'faq-17',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Pueden revisar un celular que ya abrió otro técnico?',
    answer: 'Sí, podemos diagnosticarlo. Indícanos qué trabajo se intentó y qué piezas se cambiaron; esto ayuda a revisar conectores, tornillería, sellos y posibles daños previos.',
  },
  {
    id: 'faq-18',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Puedo llevar mi propia refacción?',
    answer: 'Consúltalo antes de ir. Primero debemos revisar compatibilidad y estado de la pieza. La garantía puede cambiar cuando la refacción no fue suministrada por el taller.',
  },
  {
    id: 'faq-19',
    category: 'antes_de_reparar',
    categoryLabel: 'Antes de traerlo',
    question: '¿Necesito hacer cita?',
    answer: 'Escríbenos antes de ir para confirmar horario, carga de trabajo y disponibilidad de la refacción de tu modelo. Así evitamos que hagas una vuelta innecesaria.',
  },];

// ── Chatbot Flow ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  options?: ChatOption[];
  waLink?: string;
}

export interface ChatOption {
  label: string;
  value: string;
  emoji?: string;
}

export type ChatStep =
  | 'welcome'
  | 'select_intent'
  | 'select_brand'
  | 'select_service'
  | 'guarantee_info'
  | 'tech_transfer'
  | 'done';

export interface ChatFlowNode {
  step: ChatStep;
  message: string;
  options?: ChatOption[];
}

export const BRANDS: ChatOption[] = [
  { label: 'iPhone', value: 'iPhone', emoji: '🍎' },
  { label: 'Samsung', value: 'Samsung', emoji: '📱' },
  { label: 'Motorola', value: 'Motorola', emoji: '📲' },
  { label: 'Huawei', value: 'Huawei', emoji: '📡' },
  { label: 'Xiaomi', value: 'Xiaomi', emoji: '📟' },
  { label: 'Otro', value: 'Otro', emoji: '📦' },
];

export const SERVICES: ChatOption[] = [
  { label: 'Pantalla rota', value: 'cambio de pantalla', emoji: '🖥️' },
  { label: 'Batería', value: 'cambio de batería', emoji: '🔋' },
  { label: 'No carga', value: 'reparación de puerto de carga', emoji: '🔌' },
  { label: 'Daño por agua', value: 'reparación por daño de agua', emoji: '💧' },
  { label: 'Software/Sistema', value: 'reparación de software', emoji: '⚙️' },
  { label: 'Otro problema', value: 'diagnóstico general', emoji: '🔧' },
];
