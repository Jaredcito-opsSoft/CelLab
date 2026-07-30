import type { CSSProperties } from 'react';
import { useProcessScroll } from '../../hooks/useProcessScroll';
import { processSteps } from './landingData';

type ProcessStyle = CSSProperties & {
  '--process-progress': string;
};

export function ProcessSection() {
  const { ref, progress } = useProcessScroll<HTMLDivElement>();

  return (
    <section className="lp-section lp-process" id="proceso" aria-labelledby="process-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Cómo trabajamos</p>
          <h2 id="process-title">Tu equipo no entra a una caja negra.</h2>
        </div>
        <p>Cada paso reduce incertidumbre: recibimos, comprobamos, explicamos, reparamos y validamos contigo.</p>
      </div>

      <div
        className="lp-process__timeline"
        ref={ref}
        style={{ '--process-progress': progress.toFixed(3) } as ProcessStyle}
      >
        {processSteps.map(([number, title, copy, time], index) => (
          <article className="lp-process__step" data-reveal key={number} style={{ transitionDelay: `${index * 55}ms` }}>
            <span>{number}</span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
            <small>{time}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
