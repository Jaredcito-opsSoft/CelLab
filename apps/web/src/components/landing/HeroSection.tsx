import { HeroExplodedPhone } from './HeroExplodedPhone';
import { ArrowIcon, WhatsAppIcon } from './icons';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

export function HeroSection() {
  const { profile } = useBusinessProfile();
  const quoteLink = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero cotizar una reparación de celular.') ?? '#contacto';

  return (
    <section className="lp-hero lp-hero--scene" id="inicio" aria-labelledby="hero-title">
      <div className="lp-hero__background" aria-hidden="true" />
      <div className="lp-hero__visual lp-hero-enter-5" aria-hidden="true">
        <HeroExplodedPhone />
      </div>
      <div className="lp-hero__overlay" aria-hidden="true" />
      <div className="lp-hero__content">
        <p className="lp-eyebrow lp-hero-enter-1">Servicio técnico local · Tuxtla Gutiérrez</p>
        <h1 className="lp-hero-enter-2" id="hero-title">
          Diagnóstico claro.{' '}
          <span>Reparación confiable.</span>
        </h1>
        <p className="lp-hero__lead lp-hero-enter-3">
          Revisamos tu celular, te explicamos la falla y confirmamos el precio antes de trabajar.
        </p>
        <div className="lp-hero__actions lp-hero-enter-4">
          <a className="lp-button lp-button--hero" href={quoteLink} target={quoteLink.startsWith('http') ? '_blank' : undefined} rel={quoteLink.startsWith('http') ? 'noreferrer' : undefined}>
            <WhatsAppIcon /> Cotizar por WhatsApp
          </a>
          <a className="lp-button lp-button--hero-secondary" href="#rastrear">
            Rastrear mi equipo <ArrowIcon />
          </a>
        </div>
        <div className="lp-hero__service-line lp-hero-enter-5">
          Pantallas · baterías · centros de carga · bocinas · accesorios
        </div>
      </div>
    </section>
  );
}
