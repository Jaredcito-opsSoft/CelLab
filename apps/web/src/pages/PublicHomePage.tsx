import { useEffect, useRef, useState } from 'react';
import { LogoIcon } from '../components/LogoIcon';
import { RepairTracker } from '../components/RepairTracker';
import { ChatbotWidget } from '../components/ChatbotWidget';
import type { FaqCategory } from '../types';
import { FAQ_ITEMS } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PHONE = '9612858828';
const WA_LINK = `https://wa.me/52${PHONE}?text=Hola%20CelLab%20Tuxtla%2C%20necesito%20ayuda%20con%20mi%20celular`;
const PHONE_LINK = `tel:+52${PHONE}`;
const MAPS_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d486.4!2d-93.1159879!3d16.750452!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85ecd9051c8b815f%3A0x477c592a9da4479e!2sTuxAccesorios!5e0!3m2!1ses!2smx!4v1718870400000!5m2!1ses!2smx';

// ── Data ──────────────────────────────────────────────────────────────────────

const services = [
  { code: 'DIS', title: 'Pantalla y display', description: 'Cambio de pantalla con opciones originales y compatibles de alta calidad para iPhone, Samsung, Motorola, Huawei y más.', time: 'Entrega frecuente el mismo día' },
  { code: 'BAT', title: 'Batería', description: 'Recuperamos la autonomía de tu equipo con una batería adecuada, instalación limpia y garantía incluida.', time: 'Prueba de carga y consumo' },
  { code: 'H₂O', title: 'Daño por agua', description: 'Limpieza ultrasónica de placa, evaluación de componentes y recuperación de información cuando el equipo lo permite.', time: 'Atención prioritaria' },
  { code: 'USB', title: 'Centro de carga', description: 'Diagnóstico y reparación de conectores USB-C, Micro USB y Lightning, sin cambiar piezas antes de comprobar la falla.', time: 'Diagnóstico sin costo' },
  { code: 'OS', title: 'Software', description: 'Actualización, limpieza, restauración, liberación de red y solución de errores en Android y iOS.', time: 'Android · iOS' },
  { code: 'ACC', title: 'Protección y carga', description: 'Micas, fundas, cables certificados y cargadores elegidos para proteger el equipo y cuidar su batería.', time: 'Accesorios seleccionados' },
];

const promises = [
  ['01', 'Primero revisamos', 'El diagnóstico va antes que el presupuesto. Te explicamos la falla sin rodeos.'],
  ['02', 'Tú autorizas', 'Confirmamos solución, piezas, costo y tiempo antes de intervenir tu equipo.'],
  ['03', 'Probamos y entregamos', 'Revisamos funciones, documentamos el servicio y entregamos garantía por escrito.'],
];

const quoteIssues = [
  'Pantalla o display', 'Batería', 'No carga', 'Daño por agua',
  'Cámara', 'Audio o micrófono', 'Software', 'Otra falla',
];

const brands = [
  {
    id: 'apple', code: 'AP', name: 'Apple', devices: 'iPhone · iPad',
    support: 'Pantalla, batería, cámaras, audio y centro de carga',
    models: ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16', 'iPhone SE', 'Otro iPhone'],
  },
  {
    id: 'samsung', code: 'SM', name: 'Samsung', devices: 'Galaxy A · S · Note · Z',
    support: 'Display, batería, software, carga y cámaras',
    models: ['Galaxy A05', 'Galaxy A05s', 'Galaxy A06', 'Galaxy A07', 'Galaxy A15', 'Galaxy A16', 'Galaxy A17', 'Galaxy A25', 'Galaxy A35', 'Galaxy A55', 'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S24', 'Otro Galaxy'],
  },
  {
    id: 'motorola', code: 'MO', name: 'Motorola', devices: 'Moto G · Edge · Razr',
    support: 'Pantalla, batería, conectores y sistema',
    models: ['Moto G14', 'Moto G24', 'Moto G34', 'Moto G54', 'Moto G84', 'Moto G85', 'Edge 40', 'Edge 50', 'Razr', 'Otro Motorola'],
  },
  {
    id: 'xiaomi', code: 'MI', name: 'Xiaomi', devices: 'Xiaomi · Redmi · POCO',
    support: 'Display, carga, batería, cámaras y software',
    models: ['Redmi Note 11', 'Redmi Note 12', 'Redmi Note 13', 'Redmi Note 14', 'Redmi 12', 'Redmi 13', 'POCO X6', 'POCO X7', 'POCO M6', 'POCO M7', 'Xiaomi 13', 'Xiaomi 14', 'Xiaomi 15', 'Otro Xiaomi'],
  },
  {
    id: 'huawei', code: 'HW', name: 'Huawei', devices: 'P · Mate · Nova · Y',
    support: 'Pantalla, batería, software y componentes',
    models: ['P30 Lite', 'P40', 'P50', 'P60', 'Nova 9', 'Nova 10', 'Nova 11', 'Nova 12', 'Nova 13', 'Mate 40', 'Mate 50', 'Mate 60', 'Y9', 'Otro Huawei'],
  },
  {
    id: 'oppo', code: 'OP', name: 'OPPO', devices: 'Reno · A · Find',
    support: 'Display, carga, batería y diagnóstico general',
    models: ['OPPO A18', 'OPPO A38', 'OPPO A58', 'OPPO A60', 'OPPO A78', 'Reno 8', 'Reno 10', 'Reno 11', 'Reno 12', 'Reno 13', 'Find X5', 'Find X6', 'Find X7', 'Otro OPPO'],
  },
  {
    id: 'vivo', code: 'VI', name: 'vivo', devices: 'V · Y · X',
    support: 'Pantalla, batería, software y conectores',
    models: ['vivo Y17s', 'vivo Y27', 'vivo Y36', 'vivo Y100', 'vivo V25', 'vivo V29', 'vivo V30', 'vivo V40', 'vivo X90', 'vivo X100', 'vivo X200', 'Otro vivo'],
  },
  {
    id: 'otros', code: '+', name: 'Otra marca', devices: 'Honor · Realme · Nokia · LG y más',
    support: 'Confirma modelo y disponibilidad directamente con el técnico',
    models: ['Honor X6', 'Honor X7', 'Honor X8', 'Honor X9', 'Realme C55', 'Realme C67', 'Nokia G series', 'LG K series', 'LG Q series', 'OnePlus Nord', 'Otro modelo'],
  },
];
const successCases = [
  {
    before: 'Pantalla con crack total',
    after: 'Display original restaurado',
    device: 'iPhone 14 Pro',
    description: 'Caída desde 1.5m. Pantalla rota con táctil inoperante. Reemplazo con display OEM, calibración táctil y prueba de colores.',
    tag: 'Pantalla',
    time: '1.5 horas',
  },
  {
    before: 'Batería al 43% en 3 horas',
    after: 'Autonomía de día completo',
    device: 'Samsung Galaxy S21',
    description: 'Batería hinchada con cierre del panel trasero. Sustitución con celda compatible de alta densidad y diagnóstico de consumo.',
    tag: 'Batería',
    time: '45 min',
  },
  {
    before: 'Equipo sumergido 10 min',
    after: 'Datos y funciones recuperados',
    device: 'Motorola G84',
    description: 'Caída en lavabo. Limpieza ultrasónica de placa, secado controlado y restauración de conectores internos afectados por oxidación.',
    tag: 'Daño por agua',
    time: '24 horas',
  },
  {
    before: 'Puerto de carga flojo',
    after: 'Carga estable al 100%',
    device: 'Xiaomi Redmi Note 12',
    description: 'Conector USB-C doblado con contacto intermitente. Diagnóstico confirmó falla mecánica. Cambio de conector y prueba de carga rápida.',
    tag: 'Centro de carga',
    time: '2 horas',
  },
  {
    before: 'Sistema en bootloop continuo',
    after: 'Android funcionando al 100%',
    device: 'Huawei P30 Lite',
    description: 'Actualización fallida dejó el sistema en bucle. Restauración TWRP, flash de ROM limpia y recuperación de datos del usuario.',
    tag: 'Software',
    time: '3 horas',
  },
  {
    before: 'Cámara trasera sin imagen',
    after: 'Fotos y video perfectos',
    device: 'iPhone 13',
    description: 'Sensor trasero con imagen negra tras caída lateral. Conector de flex de cámara desconectado. Reconexión y prueba en todos los modos.',
    tag: 'Hardware',
    time: '1 hora',
  },
];

// ── Shared icons ──────────────────────────────────────────────────────────────

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>;
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.3 23.6l6-1.6a11.8 11.8 0 0 0 5.6 1.4h.1A11.8 11.8 0 0 0 20.5 3.5Zm-8.5 18a9.7 9.7 0 0 1-5-1.4l-.4-.2-3.5.9.9-3.4-.2-.4a9.8 9.8 0 1 1 8.2 4.5Zm5.4-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2l-.9 1.1c-.2.2-.4.2-.7.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2.1-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5H7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.9 5.2 2.2.9 3.1 1 4.2.8.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.2-.3-.5-.4-1.2-.7Z" />
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="CelLab Tuxtla, inicio">
        <LogoIcon size={38} />
        <span className="brand-name">CelLab <b>Tuxtla</b></span>
      </a>
      <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Navegación principal">
        <a href="#servicios" onClick={() => setOpen(false)}>Servicios</a>
        <a href="#rastrear" onClick={() => setOpen(false)}>Rastrear equipo</a>
        <a href="#marcas" onClick={() => setOpen(false)}>Marcas</a>
        <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
        <a href="#ubicacion" onClick={() => setOpen(false)}>Ubicación</a>
      </nav>
      <a className="header-contact" href={WA_LINK} target="_blank" rel="noreferrer">
        <span>Diagnóstico por WhatsApp</span><ArrowIcon />
      </a>
      <button
        className="menu-button"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      >
        <span /><span />
      </button>
    </header>
  );
}

// ── Diagnostic visual ─────────────────────────────────────────────────────────

function DiagnosticVisual() {
  const [frame, setFrame] = useState(1);
  const interactingRef = useRef(false);
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sequence = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    const timeouts = sequence.map((nextFrame, index) =>
      window.setTimeout(() => {
        if (!interactingRef.current && !hasInteractedRef.current) setFrame(nextFrame);
      }, 700 + index * 145)
    );

    return () => timeouts.forEach(window.clearTimeout);
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const panel = event.currentTarget;
    const bounds = panel.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

    panel.style.setProperty('--pointer-x', (x * 100).toFixed(1) + '%');
    panel.style.setProperty('--pointer-y', (y * 100).toFixed(1) + '%');
    panel.style.setProperty('--tilt-x', ((0.5 - y) * 3).toFixed(2) + 'deg');
    panel.style.setProperty('--tilt-y', ((x - 0.5) * 4).toFixed(2) + 'deg');
    setFrame(Math.min(5, Math.max(1, Math.round(x * 4) + 1)));
  };

  const startInteraction = () => {
    interactingRef.current = true;
  };

  const endInteraction = (panel: HTMLDivElement) => {
    interactingRef.current = false;
    panel.style.setProperty('--pointer-x', '50%');
    panel.style.setProperty('--pointer-y', '50%');
    panel.style.setProperty('--tilt-x', '0deg');
    panel.style.setProperty('--tilt-y', '0deg');
    setFrame(1);
  };

  return (
    <div
      className="diagnostic"
      onPointerEnter={startInteraction}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => endInteraction(event.currentTarget)}
      onFocus={() => {
        startInteraction();
        setFrame(5);
      }}
      onBlur={(event) => endInteraction(event.currentTarget)}
      tabIndex={0}
      aria-label="Despiece interactivo de un celular. Mueve el cursor horizontalmente para explorar cinco etapas."
    >
      <div className="diagnostic-meta" aria-hidden="true">
        <span>Banco de inspección</span>
        <span>Despiece · {String(frame).padStart(2, '0')}/05</span>
      </div>
      <div className="tech-scan-line" aria-hidden="true" />
      <div className="frames-container" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((num) => (
          <img
            key={num}
            src={'/hero/frame_' + num + '.png'}
            alt=""
            className={frame === num ? 'frame-img active' : 'frame-img'}
            loading="eager"
            draggable={false}
          />
        ))}
      </div>
      <span className="diagnostic-hint" aria-hidden="true">
        <i /> Mueve el cursor para explorar
      </span>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <main className="hero" id="inicio">
      <div className="hero-copy-block">
        <p className="location-kicker"><span /> Servicio técnico local · Tuxtla Gutiérrez</p>
        <h1>Que no te<br />cambien el equipo.<br /><em>Que lo reparen bien.</em></h1>
        <p className="hero-lead">Reparamos celulares con diagnóstico claro, atención directa y garantía por escrito. Si no necesita una pieza, no te la vendemos.</p>
        <div className="hero-actions">
          <a className="button button-primary" href={WA_LINK} target="_blank" rel="noreferrer"><WhatsAppIcon /> Cotizar reparación</a>
          <a className="text-link" href="#rastrear">Rastrear mi equipo <ArrowIcon /></a>
        </div>
        <div className="open-strip"><span>HOY</span><b>Abierto de 9:00 a 19:00</b><i>Mercado Central Norte</i></div>
      </div>
      <DiagnosticVisual />
    </main>
  );
}

// ── Services ──────────────────────────────────────────────────────────────────

function Services() {
  return (
    <section className="section services" id="servicios">
      <div className="section-heading reveal">
        <p className="section-index">SERVICIOS / 06</p>
        <h2>Lo que hacemos<br />en el banco de trabajo.</h2>
        <p>No empezamos por cambiar piezas. Empezamos por encontrar la causa.</p>
      </div>
      <div className="service-list">
        {services.map((service) => (
          <article className="service-row reveal" key={service.code}>
            <span className="service-code">{service.code}</span>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <span className="service-note">{service.time}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Process ───────────────────────────────────────────────────────────────────

function Process() {
  return (
    <section className="section process" id="proceso">
      <div className="process-intro reveal">
        <p className="section-index">MÉTODO / SIN SORPRESAS</p>
        <h2>Tu equipo no entra<br />a una caja negra.</h2>
        <p>Sabes qué encontramos, qué vamos a hacer y cuánto cuesta antes de que comience la reparación.</p>
      </div>
      <div className="process-steps">
        {promises.map(([number, title, copy]) => (
          <article className="process-step reveal" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
        ))}
      </div>
    </section>
  );
}

// ── Brands & Success Cases ────────────────────────────────────────────────────

function BrandsAndSuccess() {
  const [activeBrandId, setActiveBrandId] = useState(brands[0].id);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedIssue, setSelectedIssue] = useState('');
  const activeBrand = brands.find((brand) => brand.id === activeBrandId) ?? brands[0];

  const selectBrand = (brandId: string) => {
    setActiveBrandId(brandId);
    setSelectedModel('');
    setSelectedIssue('');
  };

  const selectModel = (model: string) => {
    setSelectedModel(model);
    setSelectedIssue('');
  };

  const quoteMessage = selectedModel && selectedIssue
    ? 'Hola CelLab Tuxtla. Quiero cotizar una reparación.\n\nMarca: ' + activeBrand.name + '\nModelo: ' + selectedModel + '\nFalla: ' + selectedIssue + '\n\n¿Pueden confirmarme disponibilidad y opciones de refacción?'
    : '';
  const quoteLink = quoteMessage
    ? 'https://wa.me/52' + PHONE + '?text=' + encodeURIComponent(quoteMessage)
    : WA_LINK;

  return (
    <section className="brands-section" id="marcas" aria-labelledby="brands-heading">
      <div className="brands-heading reveal">
        <div>
          <p className="section-index">COTIZADOR / MARCA Y MODELO</p>
          <h2 id="brands-heading">Dinos qué equipo tienes.<br />Llegamos mejor preparados.</h2>
        </div>
        <p>Elige marca, modelo y falla. Prepararemos el mensaje para que el técnico pueda responderte con menos preguntas.</p>
      </div>

      <div className="brand-selector">
        <div className="brand-tabs" role="group" aria-label="Selecciona la marca de tu equipo">
          {brands.map((brand) => {
            const selected = activeBrand.id === brand.id;
            return (
              <button
                className={selected ? 'brand-tab is-active' : 'brand-tab'}
                key={brand.id}
                type="button"
                aria-pressed={selected}
                aria-controls="brand-detail"
                onClick={() => selectBrand(brand.id)}
              >
                <span className="brand-tab__code" aria-hidden="true">{brand.code}</span>
                <span>{brand.name}</span>
                <span className="brand-tab__arrow" aria-hidden="true">↗</span>
              </button>
            );
          })}
        </div>

        <div className="brand-detail brand-quote" id="brand-detail" role="region" aria-live="polite" aria-label={'Cotizador para ' + activeBrand.name}>
          <div className="brand-detail__index">{activeBrand.code}</div>
          <div className="brand-quote__head">
            <p className="brand-detail__label">EQUIPOS QUE RECIBIMOS</p>
            <h3>{activeBrand.devices}</h3>
            <p>{activeBrand.support}</p>
          </div>

          <div className="quote-progress" aria-label="Progreso de cotización">
            <span className="is-complete">01 Marca <b>{activeBrand.name}</b></span>
            <span className={selectedModel ? 'is-complete' : 'is-current'}>02 Modelo <b>{selectedModel || 'Elige uno'}</b></span>
            <span className={selectedIssue ? 'is-complete' : selectedModel ? 'is-current' : ''}>03 Falla <b>{selectedIssue || 'Pendiente'}</b></span>
          </div>

          <div className="quote-step">
            <div className="quote-step__heading">
              <span>02</span>
              <div><h4>¿Qué modelo es?</h4><p>Selecciona el más cercano. Puedes precisar variante y capacidad en WhatsApp.</p></div>
            </div>
            <div className="model-grid" role="group" aria-label={'Modelos comunes de ' + activeBrand.name}>
              {activeBrand.models.map((model) => (
                <button
                  type="button"
                  key={model}
                  className={selectedModel === model ? 'quote-option is-selected' : 'quote-option'}
                  aria-pressed={selectedModel === model}
                  onClick={() => selectModel(model)}
                >
                  {model}<span aria-hidden="true">+</span>
                </button>
              ))}
            </div>
          </div>

          {selectedModel && (
            <div className="quote-step quote-step--issue">
              <div className="quote-step__heading">
                <span>03</span>
                <div><h4>¿Qué le pasa?</h4><p>Elige la falla principal; el diagnóstico final se realiza en el taller.</p></div>
              </div>
              <div className="issue-grid" role="group" aria-label="Falla principal del equipo">
                {quoteIssues.map((issue) => (
                  <button
                    type="button"
                    key={issue}
                    className={selectedIssue === issue ? 'quote-option is-selected' : 'quote-option'}
                    aria-pressed={selectedIssue === issue}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    {issue}<span aria-hidden="true">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedIssue && (
            <div className="quote-ready" role="status">
              <div>
                <span>MENSAJE LISTO</span>
                <strong>{activeBrand.name} · {selectedModel} · {selectedIssue}</strong>
                <small>No envía nada hasta que confirmes en WhatsApp.</small>
              </div>
              <a className="button button-primary" href={quoteLink} target="_blank" rel="noreferrer">
                <WhatsAppIcon /> Cotizar este equipo
              </a>
            </div>
          )}

          <small className="brand-quote__note">Modelos frecuentes de consulta. La disponibilidad de refacciones se confirma por versión.</small>
        </div>
      </div>

      <div className="cases-block">
        <div className="section-heading reveal">
          <p className="section-index">CASOS / PRUEBA REAL</p>
          <h2>Equipo recibido.<br />Equipo entregado.</h2>
          <p>Trabajos que han pasado por nuestro banco y muestran el tipo de diagnóstico que realizamos.</p>
        </div>
        <div className="success-grid">
          {successCases.map((c) => (
            <article className="success-card reveal" key={c.device + c.tag}>
              <div className="success-card__before-after">
                <span>{c.before}</span><span className="success-card__arrow">→</span><span>{c.after}</span>
              </div>
              <h4>{c.device}</h4>
              <p>{c.description}</p>
              <span className="success-card__tag">{c.tag} · {c.time}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_CATEGORIES: { value: FaqCategory; label: string }[] = [
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'cotizacion', label: 'Cotización' },
  { value: 'antes_de_reparar', label: 'Antes de traerlo' },
  { value: 'garantia', label: 'Garantías' },
  { value: 'refacciones', label: 'Refacciones' },
];

function FaqSection() {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('diagnostico');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = FAQ_ITEMS.filter((f) => f.category === activeCategory);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section className="faq-section" id="faq" aria-labelledby="faq-heading">
      <div className="section-heading reveal faq-heading-compact">
        <p className="section-index">FAQ / PREGUNTAS</p>
        <h2 id="faq-heading">Lo que más nos preguntan<br />antes de traer el equipo.</h2>
        <p>Respuestas directas para que llegues con todo claro.</p>
      </div>

      {/* Category tabs */}
      <div className="faq-tabs" role="group" aria-label="Filtrar preguntas frecuentes">
        {FAQ_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`faq-tab${activeCategory === cat.value ? ' active' : ''}`}
            aria-pressed={activeCategory === cat.value}
            onClick={() => {
              setActiveCategory(cat.value);
              setOpenId(null);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div
        className="faq-list"
        role="region"
        aria-live="polite"
        aria-label={`Preguntas sobre ${activeCategory}`}
      >
        {filtered.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div className="faq-item" key={item.id}>
              <button
                className="faq-trigger"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-body-${item.id}`}
                id={`faq-trigger-${item.id}`}
              >
                {item.question}
                <span className="faq-icon" aria-hidden="true">+</span>
              </button>
              <div
                className={`faq-body${isOpen ? ' open' : ''}`}
                id={`faq-body-${item.id}`}
                role="region"
                aria-labelledby={`faq-trigger-${item.id}`}
              >
                <div className="faq-inner">
                  <p>{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Guarantee ─────────────────────────────────────────────────────────────────

function Guarantee() {
  return (
    <section className="guarantee" id="garantia">
      <div className="guarantee-stamp reveal" aria-hidden="true"><span>30—90</span><small>DÍAS DE<br />GARANTÍA</small></div>
      <div className="guarantee-copy reveal">
        <p className="section-index">RESPALDO / POR ESCRITO</p>
        <h2>Una reparación<br />debe dejar evidencia.</h2>
        <p>Recibes una nota con el servicio realizado, el costo acordado y la vigencia de tu garantía. Si algo atribuible a nuestra reparación falla dentro del periodo, lo solucionamos sin costo.</p>
        <ul>
          <li>Presupuesto autorizado antes de reparar</li>
          <li>Piezas originales o compatibles de calidad comprobada</li>
          <li>Pruebas funcionales antes de la entrega</li>
        </ul>
      </div>
    </section>
  );
}

// ── Location ──────────────────────────────────────────────────────────────────

function Location() {
  return (
    <section className="section location" id="ubicacion">
      <div className="location-copy reveal">
        <p className="section-index">VISÍTANOS / CENTRO</p>
        <h2>En el corazón<br />de Tuxtla.</h2>
        <p>Estamos en el Mercado Central Norte (Supermanzana), en el área de accesorios para celular.</p>
        <dl className="contact-data">
          <div><dt>Dirección</dt><dd>Mercado Central Norte, Supermanzana<br />Centro, Tuxtla Gutiérrez, Chiapas</dd></div>
          <div><dt>Horario</dt><dd>Lunes a sábado<br />9:00 am — 7:00 pm</dd></div>
          <div><dt>Teléfono / WhatsApp</dt><dd><a href={PHONE_LINK}>961 285 8828</a></dd></div>
        </dl>
        <a className="button button-dark" href={WA_LINK} target="_blank" rel="noreferrer"><WhatsAppIcon /> Escribir antes de ir</a>
      </div>
      <div className="map-frame reveal">
        <div className="map-label"><span>CEL·LAB</span><b>Mercado Central Norte</b></div>
        <iframe src={MAPS_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Mapa de CelLab Tuxtla en Mercado Central Norte" />
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="footer" id="contacto">
      <div className="footer-cta">
        <div className="footer-cta__brand">
          <LogoIcon size={58} inverted />
          <div><span>CEL·LAB TUXTLA</span><small>SERVICIO TÉCNICO LOCAL</small></div>
        </div>
        <h2>Antes de reemplazarlo,<br />déjanos revisarlo.</h2>
        <div className="footer-cta__actions">
          <a className="button footer-button-primary" href={WA_LINK} target="_blank" rel="noreferrer">
            <WhatsAppIcon /> Cotizar por WhatsApp
          </a>
          <a className="button footer-button-secondary" href={PHONE_LINK}>Llamar al 961 285 8828</a>
        </div>
      </div>

      <div className="footer-main">
        <div className="footer-promise">
          <p className="footer-label">NUESTRA FORMA DE TRABAJAR</p>
          <p>Diagnóstico claro, autorización antes de reparar y garantía por escrito.</p>
          <span className="footer-open"><i /> Lun—Sáb · 9:00—19:00</span>
        </div>
        <nav className="footer-links" aria-label="Navegación del pie de página">
          <p className="footer-label">RESOLVER</p>
          <a href="#servicios">Ver servicios</a>
          <a href="#rastrear">Rastrear reparación</a>
          <a href="#marcas">Consultar marcas</a>
          <a href="#faq">Preguntas frecuentes</a>
        </nav>
        <address className="footer-contact">
          <p className="footer-label">ENCUÉNTRANOS</p>
          <a href={PHONE_LINK}>961 285 8828</a>
          <span>Mercado Central Norte<br />Supermanzana, Centro<br />Tuxtla Gutiérrez, Chiapas</span>
          <a href="#ubicacion">Ver mapa <ArrowIcon /></a>
        </address>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} CelLab Tuxtla</span>
        <span>Reparación y accesorios para celulares</span>
        <a href="#inicio">Volver arriba ↑</a>
      </div>
    </footer>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function PublicHomePage() {
  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible'));
      },
      { threshold: 0.12 }
    );
    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <RepairTracker />
      <BrandsAndSuccess />
      <Process />
      <FaqSection />
      <Guarantee />
      <Location />
      <Footer />

      {/* WhatsApp FAB (hidden since ChatbotWidget occupies that corner) */}
      <a
        className="whatsapp-fab whatsapp-fab--stacked"
        href={WA_LINK}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <WhatsAppIcon /><span>WhatsApp</span>
      </a>

      {/* Chatbot widget */}
      <ChatbotWidget />
    </>
  );
}