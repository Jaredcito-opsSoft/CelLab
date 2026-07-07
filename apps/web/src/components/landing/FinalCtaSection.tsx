import { WhatsAppIcon } from './icons';
import { buildPhoneLink, buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

export function FinalCtaSection() {
  const { profile, phoneLabel } = useBusinessProfile();
  const whatsappLink = buildWhatsappLink(profile, 'Hola CelLab Tuxtla, quiero cotizar una reparación de celular.') ?? '#contacto';
  const phoneLink = buildPhoneLink(profile) ?? '#contacto';

  return (
    <section className="lp-final-cta" aria-labelledby="final-cta-title">
      <p className="lp-eyebrow">Antes de cambiarlo</p>
      <h2 id="final-cta-title">Tu celular tiene solución. Cotiza antes de reemplazarlo.</h2>
      <div className="lp-final-cta__actions">
        <a className="lp-button lp-button--primary" href={whatsappLink} target={whatsappLink.startsWith('http') ? '_blank' : undefined} rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}>
          <WhatsAppIcon /> Cotizar por WhatsApp
        </a>
        <a className="lp-button lp-button--ghost" href={phoneLink}>
          {phoneLabel ? `Llamar al ${phoneLabel}` : 'Teléfono por configurar'}
        </a>
      </div>
    </section>
  );
}
