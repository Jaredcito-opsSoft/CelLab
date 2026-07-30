import { useState, type PointerEvent } from 'react';
import { LogoIcon } from '../LogoIcon';
import { ArrowIcon } from './icons';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

const links = [
  ['Servicios', '#servicios'],
  ['Casos reales', '#casos'],
  ['PayJoy / MacroPay', '#recuperacion'],
  ['Marcas', '#marcas'],
  ['Rastrear equipo', '#rastrear'],
] as const;

export function NavBar() {
  const [open, setOpen] = useState(false);
  const { profile } = useBusinessProfile();
  const whatsappLink = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero hacer un diagnóstico por WhatsApp.') ?? '#contacto';
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--nav-x', `${event.clientX - rect.left}px`);
  };

  return (
    <header className="lp-nav" onPointerMove={handlePointerMove}>
      <a className="lp-nav__brand" href="#inicio" aria-label="CelLab Tuxtla, inicio">
        <LogoIcon size={40} />
        <span><b>CelLab</b><small>Tuxtla</small></span>
      </a>
      <nav className={open ? 'lp-nav__links is-open' : 'lp-nav__links'} aria-label="Navegación principal">
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <a
          className="lp-nav__mobile-cta"
          href={whatsappLink}
          target={whatsappLink.startsWith('http') ? '_blank' : undefined}
          rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}
          onClick={() => setOpen(false)}
        >
          Cotizar por WhatsApp <ArrowIcon />
        </a>
      </nav>
      <a className="lp-nav__cta" href={whatsappLink} target={whatsappLink.startsWith('http') ? '_blank' : undefined} rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}>
        Cotizar ahora <ArrowIcon />
      </a>
      <button className={open ? 'lp-nav__menu is-open' : 'lp-nav__menu'} type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span /><span />
      </button>
    </header>
  );
}
