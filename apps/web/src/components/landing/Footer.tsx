import { LogoIcon } from '../LogoIcon';
import { ArrowIcon } from './icons';
import { buildPhoneLink, buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

function compactLocation(parts: Array<string | null | undefined>) {
  const uniqueParts = parts.reduce<string[]>((items, value) => {
    const part = value?.trim();
    if (!part) return items;
    const normalized = part.toLowerCase();
    if (items.some((item) => item.toLowerCase().includes(normalized))) return items;
    return [...items, part];
  }, []);

  return uniqueParts.join(', ') || 'Tuxtla Gutiérrez, Chiapas';
}

export function Footer() {
  const { profile, phoneLabel } = useBusinessProfile();
  const phoneLink = buildPhoneLink(profile) ?? '#contacto';
  const whatsappLink = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero cotizar una reparación.') ?? phoneLink;
  const location = compactLocation([profile?.address, profile?.city, profile?.state]);
  const businessName = profile?.businessName ?? 'CelLab Tuxtla';
  const year = new Date().getFullYear();

  return (
    <footer className="lp-footer" id="contacto">
      <div className="lp-footer__top" data-reveal>
        <div className="lp-footer__brand">
          <LogoIcon size={44} inverted />
          <div>
            <strong>{businessName}</strong>
            <span>Servicio técnico local · {profile?.city ?? 'Tuxtla Gutiérrez'}, {profile?.state ?? 'Chiapas'}</span>
          </div>
        </div>
        <div className="lp-footer__availability">
          <span aria-hidden="true" />
          Atención local y directa
        </div>
      </div>

      <div className="lp-footer__statement" data-reveal>
        <div>
          <span>Tu equipo merece una respuesta clara</span>
          <h2>Reparamos con proceso, evidencia y seguimiento.</h2>
        </div>
        <a className="lp-footer__cta" href={whatsappLink} target={whatsappLink.startsWith('http') ? '_blank' : undefined} rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}>
          Cotizar reparación <ArrowIcon />
        </a>
      </div>

      <div className="lp-footer__grid" data-reveal>
        <nav className="lp-footer__links" aria-label="Links de pie de página">
          <span>Explorar</span>
          <a href="#servicios">Servicios</a>
          <a href="#proceso">Proceso</a>
          <a href="#marcas">Marcas</a>
          <a href="#casos">Casos reales</a>
        </nav>
        <nav className="lp-footer__links" aria-label="Soporte y condiciones">
          <span>Soporte</span>
          <a href="#rastrear">Rastrear equipo</a>
          <a href="#garantias">Garantías</a>
          <a href="#faq">Preguntas frecuentes</a>
          <a href="#terminos">Términos y condiciones</a>
        </nav>
        <address className="lp-footer__contact">
          <span>Visítanos</span>
          <p>{location}</p>
          {phoneLabel ? <a href={phoneLink}>{phoneLabel}</a> : <p>Teléfono por configurar</p>}
          <a href={whatsappLink} target={whatsappLink.startsWith('http') ? '_blank' : undefined} rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}>
            Abrir WhatsApp
          </a>
        </address>
        <div className="lp-footer__promise" aria-label="Compromisos del taller">
          <span>Trabajamos así</span>
          <p><b>01</b> Precio antes de reparar</p>
          <p><b>02</b> Rastreo por folio</p>
          <p><b>03</b> Garantía por escrito</p>
        </div>
      </div>

      <div className="lp-footer__bottom">
        <span>© {year} {businessName} · Tuxtla Gutiérrez</span>
        <span className="lp-footer__atria">CelLab es una marca de <strong>ATRIA</strong></span>
        <a href="#inicio">Volver arriba <ArrowIcon /></a>
      </div>
    </footer>
  );
}
