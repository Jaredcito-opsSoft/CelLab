import { useState } from 'react';
import { faqs } from './landingData';

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.[0] ?? null);

  return (
    <section className="lp-section lp-faq" id="faq" aria-labelledby="faq-title">
      <div className="lp-section__heading">
        <p className="lp-eyebrow">Preguntas comunes</p>
        <h2 id="faq-title">Lo que normalmente preguntas antes de reparar.</h2>
      </div>
      <div className="lp-faq__list">
        {faqs.map(([id, question, answer]) => {
          const isOpen = openId === id;
          return (
            <article className="lp-faq__item" key={id}>
              <button type="button" onClick={() => setOpenId(isOpen ? null : id)} aria-expanded={isOpen} aria-controls={`faq-${id}`}>
                <span>{question}</span>
                <b aria-hidden="true">{isOpen ? '−' : '+'}</b>
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
