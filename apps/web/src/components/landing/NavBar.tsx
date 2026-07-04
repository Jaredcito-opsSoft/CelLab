import { useState } from 'react';
import { LogoIcon } from '../LogoIcon';
import { ArrowIcon } from './icons';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

const links = [
  ['Servicios', '#servicios'],
  ['Proceso', '#proceso'],
  ['Productos', '#productos'],
  ['Rastrear', '#rastrear'],
  ['Marcas', '#marcas'],
  ['FAQ', '#faq'],
] as const;

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { profile } = useBusinessProfile();
  const whatsappLink = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero hacer un diagnóstico por WhatsApp.') ?? '#contacto';

  return (
    <header className="lp-nav">
      <a className="lp-nav__brand" href="#inicio" aria-label="CelLab Tuxtla, inicio">
        <LogoIcon size={40} />
        <span>CelLab <b>Tuxtla</b></span>
      </a>
      <nav className={open ? 'lp-nav__links is-open' : 'lp-nav__links'} aria-label="Navegación principal">
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
      </nav>
      <a className="lp-nav__cta" href={whatsappLink} target={whatsappLink.startsWith('http') ? '_blank' : undefined} rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}>
        Diagnóstico por WhatsApp <ArrowIcon />
      </a>
      <button className="lp-nav__menu" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span /><span />
      </button>
    </header>
  );
}
