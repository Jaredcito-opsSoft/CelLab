import { useState } from 'react';
import { faqs } from './landingData';

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.[0] ?? null);

  return (
    <section className="lp-section lp-faq" id="faq" aria-labelledby="faq-title">
      <div className="lp-section__heading">
        <p className="lp-eyebrow">Preguntas comunes</p>
        <h2 id="faq-title">Antes de reparar, todo debe quedar claro.</h2>
        <p className="lp-faq__intro">
          Respuestas directas sobre tiempos, costos, datos, piezas y seguimiento.
        </p>
      </div>
      <div className="lp-faq__list">
        {faqs.map(([id, question, answer], index) => {
          const isOpen = openId === id;
          return (
            <article className="lp-faq__item" key={id}>
              <button type="button" onClick={() => setOpenId(isOpen ? null : id)} aria-expanded={isOpen} aria-controls={`faq-${id}`}>
                <small>{String(index + 1).padStart(2, '0')}</small>
                <span>{question}</span>
                <b className={isOpen ? 'is-open' : ''} aria-hidden="true" />
              </button>
              <div className={isOpen ? 'is-open' : ''} id={`faq-${id}`}>
                <div className="lp-faq__answer-inner">
                  <p>{answer}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
