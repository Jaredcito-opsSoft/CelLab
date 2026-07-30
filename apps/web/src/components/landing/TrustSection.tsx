import { trustPoints } from './landingData';

export function TrustSection() {
  return (
    <section className="lp-trust" aria-label="Compromisos del servicio">
      {trustPoints.map((point, index) => (
        <article className="lp-trust__item" data-reveal key={point.title} style={{ transitionDelay: `${index * 45}ms` }}>
          <span>{point.value}</span>
          <div>
            <strong>{point.title}</strong>
            <p>{point.copy}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
