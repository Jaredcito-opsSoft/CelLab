import { ArrowIcon } from './icons';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

const warrantySteps = [
  ['01', 'Queda por escrito', 'La cobertura aplicable se registra en tu nota según el servicio y la pieza instalada.'],
  ['02', 'La revisamos contigo', 'Si algo falla dentro de la vigencia, primero verificamos que esté relacionado con el trabajo realizado.'],
  ['03', 'Te damos seguimiento', 'Documentamos la revisión y te explicamos el resultado antes de cualquier trabajo adicional.'],
] as const;

export function WarrantySection() {
  const { profile } = useBusinessProfile();
  const whatsappLink = buildWhatsappLink(
    profile,
    'Hola CelLab Tuxtla, quiero consultar la garantía de una reparación. Tengo mi folio y nota de servicio.',
  ) ?? '#contacto';

  return (
    <section className="lp-warranty" id="garantias" aria-labelledby="warranty-title">
      <div className="lp-warranty__intro" data-reveal>
        <p className="lp-eyebrow">Garantía CelLab</p>
        <h2 id="warranty-title">La garantía también forma parte del servicio.</h2>
        <p>
          Cada caso se valida con tu nota de servicio, el estado del equipo y la cobertura indicada al momento de la entrega.
        </p>
        <a
          className="lp-button lp-button--ghost"
          href={whatsappLink}
          target={whatsappLink.startsWith('http') ? '_blank' : undefined}
          rel={whatsappLink.startsWith('http') ? 'noreferrer' : undefined}
        >
          Consultar una garantía <ArrowIcon />
        </a>
      </div>

      <div className="lp-warranty__content" data-reveal>
        <div className="lp-warranty__steps">
          {warrantySteps.map(([number, title, copy]) => (
            <article className="lp-warranty__step" key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="lp-warranty__coverage">
          <div>
            <span className="lp-warranty__marker lp-warranty__marker--yes" aria-hidden="true">✓</span>
            <h3>Puede cubrir</h3>
            <p>Fallas relacionadas con el servicio realizado o la pieza instalada, dentro de la vigencia escrita en tu nota.</p>
          </div>
          <div>
            <span className="lp-warranty__marker" aria-hidden="true">—</span>
            <h3>No cubre automáticamente</h3>
            <p>Nuevos golpes, humedad posterior, manipulación de terceros o fallas distintas a la reparación original.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
