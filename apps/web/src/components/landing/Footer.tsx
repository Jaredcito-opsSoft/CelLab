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
      <div className="lp-footer__top">
        <div className="lp-footer__brand">
          <LogoIcon size={44} inverted />
          <div>
            <strong>{businessName}</strong>
            <span>Servicio técnico local · {profile?.city ?? 'Tuxtla Gutiérrez'}, {profile?.state ?? 'Chiapas'}</span>
          </div>
        </div>
        <a className="lp-footer__cta" href={whatsappLink} target={whatsappLink.startsWith('http') ? '_blank' : undefined} rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}>
          Cotizar reparación <ArrowIcon />
        </a>
      </div>

      <div className="lp-footer__statement">
        <span>Ficha de cierre</span>
        <p>Reparamos con folio, diagnóstico claro y garantía por escrito antes de entregar tu equipo.</p>
      </div>

      <div className="lp-footer__grid">
        <nav className="lp-footer__links" aria-label="Links de pie de página">
          <span>Navegación</span>
          <a href="#servicios">Servicios</a>
          <a href="#proceso">Proceso</a>
          <a href="#rastrear">Rastreo</a>
          <a href="#marcas">Marcas</a>
          <a href="#faq">FAQ</a>
        </nav>
        <address className="lp-footer__contact">
          <span>Contacto</span>
          <p>{location}</p>
          {phoneLabel ? <a href={phoneLink}>{phoneLabel}</a> : <p>Teléfono por configurar</p>}
        </address>
        <div className="lp-footer__promise" aria-label="Compromisos del taller">
          <span>Compromiso</span>
          <p>Precio antes de reparar</p>
          <p>Rastreo por folio</p>
          <p>Garantía según servicio</p>
        </div>
      </div>

      <div className="lp-footer__bottom">
        <span>© {year} {businessName}</span>
        <a href="#inicio">Volver arriba <ArrowIcon /></a>
      </div>
    </footer>
  );
}
