import { capabilityGroups, services } from './landingData';

export function ServicesSection() {
  return (
    <section className="lp-section lp-services" id="servicios" aria-labelledby="services-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Capacidad de taller</p>
          <h2 id="services-title">Solucionamos la falla, no solo el síntoma.</h2>
        </div>
        <p>Desde una mica hasta una reparación electrónica: primero aislamos el problema y después te presentamos una ruta clara.</p>
      </div>

      <div className="lp-service-grid">
        {services.map((service, index) => (
          <article className="lp-service-card" data-reveal key={service.title} style={{ transitionDelay: `${index * 45}ms` }}>
            <div className="lp-service-card__top">
              <span className="lp-service-card__code">{service.code}</span>
              <span className="lp-service-card__chip">{service.chip}</span>
            </div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <a href="#marcas">Consultar compatibilidad <span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>

      <div className="lp-capabilities" data-reveal>
        <div className="lp-capabilities__intro">
          <span>Una sola mesa técnica</span>
          <strong>Reparación, recuperación y configuración.</strong>
        </div>
        {capabilityGroups.map((group) => (
          <div className="lp-capabilities__group" key={group.title}>
            <h3>{group.title}</h3>
            <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="lp-service-note">* El tiempo depende del diagnóstico, modelo y disponibilidad de refacción.</p>
    </section>
  );
}
