export type FaqCategory = 'diagnostico' | 'cotizacion' | 'antes_de_reparar' | 'garantia' | 'refacciones';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  categoryLabel: string;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  { id: 'faq-1', category: 'diagnostico', categoryLabel: 'Diagnóstico', question: '¿El diagnóstico tiene costo?', answer: 'No. El diagnóstico de tu equipo es gratuito. Te decimos qué tiene y cuánto costaría repararlo antes de trabajar.' },
  { id: 'faq-2', category: 'diagnostico', categoryLabel: 'Diagnóstico', question: '¿Cuánto tiempo tarda el diagnóstico?', answer: 'En la mayoría de los casos toma entre 15 y 30 minutos. Fallas de placa, humedad o fallas intermitentes pueden requerir más tiempo.' },
  { id: 'faq-3', category: 'garantia', categoryLabel: 'Garantías', question: '¿Cuánto tiempo de garantía tienen las reparaciones?', answer: 'La garantía depende del servicio y de la pieza instalada. Se deja por escrito en la nota para que sepas exactamente qué cubre.' },
  { id: 'faq-4', category: 'garantia', categoryLabel: 'Garantías', question: '¿Qué cubre y qué no cubre la garantía?', answer: 'Cubre fallas relacionadas con el servicio realizado. No cubre nuevas caídas, humedad posterior, manipulación de terceros o daños ajenos a la reparación.' },
  { id: 'faq-5', category: 'refacciones', categoryLabel: 'Refacciones', question: '¿Usan refacciones originales?', answer: 'Te explicamos las opciones disponibles para tu modelo: original, compatible premium o alternativa económica. Tú decides antes de reparar.' },
  { id: 'faq-6', category: 'refacciones', categoryLabel: 'Refacciones', question: '¿Tienen refacciones para todas las marcas?', answer: 'Trabajamos con las marcas más comunes. En modelos recientes o poco frecuentes podemos cotizar la pieza por pedido.' },
  { id: 'faq-7', category: 'diagnostico', categoryLabel: 'Diagnóstico', question: '¿Qué pasa si decido no reparar?', answer: 'No hay problema. Si después del diagnóstico no autorizas el trabajo, te devolvemos el equipo sin hacer cambios.' },
  { id: 'faq-8', category: 'cotizacion', categoryLabel: 'Cotización', question: '¿Cuánto cuesta cambiar la pantalla de mi celular?', answer: 'Depende del modelo exacto y del tipo de refacción. Podemos darte una referencia por WhatsApp y confirmar al revisar el equipo.' },
  { id: 'faq-9', category: 'cotizacion', categoryLabel: 'Cotización', question: '¿Qué datos necesitan para cotizar por WhatsApp?', answer: 'Marca, modelo exacto y falla principal. Si la pantalla está rota, una foto ayuda a identificar el daño.' },
  { id: 'faq-10', category: 'cotizacion', categoryLabel: 'Cotización', question: '¿Pueden darme un precio exacto sin revisar el equipo?', answer: 'Podemos darte una referencia, pero el precio definitivo se confirma después del diagnóstico para evitar cambiar piezas innecesarias.' },
  { id: 'faq-11', category: 'cotizacion', categoryLabel: 'Cotización', question: '¿El precio puede cambiar después del diagnóstico?', answer: 'Si encontramos una falla distinta, te explicamos el motivo y no seguimos sin tu autorización.' },
  { id: 'faq-12', category: 'cotizacion', categoryLabel: 'Cotización', question: '¿Cuánto tiempo tardará la reparación?', answer: 'Pantallas, baterías y centros de carga comunes suelen resolverse el mismo día si hay pieza. Placa, humedad o fallas intermitentes tardan más.' },
  { id: 'faq-13', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Voy a perder mis fotos o información?', answer: 'Una reparación física normalmente no borra información, pero si el equipo enciende te recomendamos hacer respaldo antes de entregarlo.' },
  { id: 'faq-14', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Debo hacer una copia de seguridad?', answer: 'Sí, siempre que el equipo lo permita. Guarda fotos, contactos y archivos importantes antes de cualquier intervención.' },
  { id: 'faq-15', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Qué hago si mi celular se mojó?', answer: 'Apágalo, no lo conectes y no intentes encenderlo repetidamente. Tráelo cuanto antes para revisar batería, placa y corrosión.' },
  { id: 'faq-16', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Necesitan mi contraseña o patrón?', answer: 'Solo puede ser necesario para probar funciones después de reparar. Puedes retirarlo temporalmente o desbloquear el equipo al recogerlo.' },
  { id: 'faq-17', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Pueden revisar un celular que ya abrió otro técnico?', answer: 'Sí. Indícanos qué trabajo se intentó y qué piezas se cambiaron para revisar conectores, tornillería y posibles daños previos.' },
  { id: 'faq-18', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Puedo llevar mi propia refacción?', answer: 'Consúltalo antes de ir. Primero revisamos compatibilidad y estado de la pieza; la garantía puede cambiar si la pieza no la suministra el taller.' },
  { id: 'faq-19', category: 'antes_de_reparar', categoryLabel: 'Antes de traerlo', question: '¿Necesito hacer cita?', answer: 'Escríbenos antes de ir para confirmar horario, carga de trabajo y disponibilidad de refacción para tu modelo.' },
];

export interface ChatOption {
  label: string;
  value: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  options?: ChatOption[];
}

export type ChatStep = 'welcome' | 'select_intent' | 'select_brand' | 'select_service' | 'guarantee_info' | 'tech_transfer' | 'done';

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
