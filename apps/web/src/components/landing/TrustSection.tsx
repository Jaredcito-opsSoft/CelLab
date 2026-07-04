import { trustPoints } from './landingData';

export function TrustSection() {
  return (
    <section className="lp-trust" aria-label="Confianza inmediata">
      {trustPoints.map((point, index) => (
        <article className="lp-trust__item" data-reveal key={point} style={{ transitionDelay: `${index * 45}ms` }}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{point}</strong>
        </article>
      ))}
    </section>
  );
}
