import { services } from './landingData';

export function ServicesSection() {
  return (
    <section className="lp-section lp-services" id="servicios" aria-labelledby="services-title">
      <div className="lp-section-head" data-reveal>
        <p className="lp-eyebrow">Servicios de taller</p>
        <h2 id="services-title">Lo que hacemos en el banco de trabajo.</h2>
        <p>No empezamos por cambiar piezas. Empezamos por encontrar la causa y darte opciones claras.</p>
      </div>

      <div className="lp-service-grid">
        {services.map((service, index) => (
          <article className="lp-service-card" data-reveal key={service.title} style={{ transitionDelay: `${index * 45}ms` }}>
            <span className="lp-service-card__chip">{service.chip}</span>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
