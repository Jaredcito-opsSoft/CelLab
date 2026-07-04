import { LogoIcon } from '../LogoIcon';
import { ArrowIcon } from './icons';
import { buildPhoneLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

export function Footer() {
  const { profile, phoneLabel } = useBusinessProfile();
  const phoneLink = buildPhoneLink(profile) ?? '#contacto';
  const location = [profile?.address, profile?.city, profile?.state].filter(Boolean).join(', ') || 'Tuxtla Gutiérrez, Chiapas';

  return (
    <footer className="lp-footer" id="contacto">
      <div className="lp-footer__brand">
        <LogoIcon size={48} inverted />
        <div>
          <strong>{profile?.businessName ?? 'CelLab Tuxtla'}</strong>
          <span>Servicio técnico local · {profile?.city ?? 'Tuxtla Gutiérrez'}, {profile?.state ?? 'Chiapas'}</span>
        </div>
      </div>
      <nav className="lp-footer__links" aria-label="Links de pie de página">
        <a href="#servicios">Servicios</a>
        <a href="#proceso">Cómo trabajamos</a>
        <a href="#rastrear">Rastrear equipo</a>
        <a href="#marcas">Marcas</a>
        <a href="#faq">FAQ</a>
      </nav>
      <address className="lp-footer__contact">
        <span>{location}</span>
        {phoneLabel ? <a href={phoneLink}>{phoneLabel}</a> : <span>Teléfono por configurar</span>}
        <a href="#inicio">Volver arriba <ArrowIcon /></a>
      </address>
      <div className="lp-footer__bottom">
        <span>© {new Date().getFullYear()} {profile?.businessName ?? 'CelLab Tuxtla'}</span>
        <span>Diagnóstico claro · precio antes de reparar · garantía por escrito</span>
      </div>
    </footer>
  );
}
