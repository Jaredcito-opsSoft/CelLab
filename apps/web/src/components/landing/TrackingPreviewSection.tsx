import { ArrowIcon } from './icons';

export function TrackingPreviewSection() {
  return (
    <section className="lp-section lp-tracking" id="rastrear" aria-labelledby="tracking-title">
      <div className="lp-tracking__copy" data-reveal>
        <p className="lp-eyebrow">Seguimiento por folio</p>
        <h2 id="tracking-title">Una reparación también necesita trazabilidad.</h2>
        <p>
          El flujo operativo ya está preparado para que el cliente consulte estados con folio. Esta vista muestra
          cómo se verá la experiencia pública cuando conectemos el rastreo real.
        </p>
        <a className="lp-link" href="#faq">
          Ver preguntas frecuentes <ArrowIcon />
        </a>
      </div>

      <div className="lp-ticket" data-reveal aria-label="Vista conceptual de seguimiento REP-00027">
        <div className="lp-ticket__top">
          <span>REP-00027</span>
          <b>En diagnóstico</b>
        </div>
        <div className="lp-ticket__device">
          <span>Equipo</span>
          <strong>Samsung Galaxy A15</strong>
          <small>Falla reportada: no carga</small>
        </div>
        <div className="lp-ticket__steps">
          <span className="is-done">Recibido</span>
          <span className="is-active">Diagnóstico</span>
          <span>Cotización</span>
          <span>Reparación</span>
          <span>Entrega</span>
        </div>
        <div className="lp-ticket__next">
          <span>Próximo paso</span>
          <strong>Confirmar cotización por WhatsApp</strong>
        </div>
      </div>
    </section>
  );
}
