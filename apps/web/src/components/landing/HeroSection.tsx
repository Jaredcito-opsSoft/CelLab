import { HeroFrameSequence } from './HeroFrameSequence';
import { ArrowIcon, WhatsAppIcon } from './icons';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';
import { Clock3, MapPin, ShieldCheck } from 'lucide-react';

export function HeroSection() {
  const { profile } = useBusinessProfile();
  const quoteLink = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero cotizar una reparación de celular.') ?? '#contacto';

  return (
    <section className="lp-hero lp-hero--scene" id="inicio" aria-labelledby="hero-title">
      <div className="lp-hero__background" aria-hidden="true" />
      <div className="lp-hero__visual lp-hero-enter-5" aria-hidden="true">
        <HeroFrameSequence />
      </div>
      <div className="lp-hero__overlay" aria-hidden="true" />
      <div className="lp-hero__content">
        <p className="lp-hero__status lp-hero-enter-1"><span /> Diagnóstico técnico · Tuxtla Gutiérrez</p>
        <h1 className="lp-hero-enter-2" id="hero-title">
          No cambies tu celular.{' '}
          <span>Primero descubre qué tiene.</span>
        </h1>
        <p className="lp-hero__lead lp-hero-enter-3">
          Vemos lo que otros pasan por alto. Pantallas, baterías, carga, software,
          liberación compatible y recuperación autorizada de equipos.
        </p>
        <div className="lp-hero__actions lp-hero-enter-4">
          <a className="lp-button lp-button--hero" href={quoteLink} target={quoteLink.startsWith('http') ? '_blank' : undefined} rel={quoteLink.startsWith('http') ? 'noreferrer' : undefined}>
            <WhatsAppIcon /> Cuéntanos qué le pasa
          </a>
          <a className="lp-button lp-button--hero-secondary" href="#rastrear">
            Rastrear mi equipo <ArrowIcon />
          </a>
        </div>
        <div className="lp-hero__proof lp-hero-enter-5">
          <span><Clock3 size={17} /> Servicios frecuentes el mismo día*</span>
          <span><ShieldCheck size={17} /> Garantía según servicio</span>
          <span><MapPin size={17} /> Atención local y directa</span>
        </div>
      </div>
      <p className="lp-hero__fineprint">* Sujeto a diagnóstico y disponibilidad de refacción.</p>
    </section>
  );
}
