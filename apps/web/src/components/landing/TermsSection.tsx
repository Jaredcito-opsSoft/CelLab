const terms = [
  {
    number: '01',
    title: 'Diagnóstico y autorización',
    copy: 'Revisamos el equipo y confirmamos el precio antes de intervenir. Si aparece una falla distinta, solicitamos una nueva autorización.',
  },
  {
    number: '02',
    title: 'Datos y respaldo',
    copy: 'Una reparación física no debería borrar información, pero recomendamos respaldar siempre que el equipo lo permita. Te avisamos si el servicio implica riesgo de datos.',
  },
  {
    number: '03',
    title: 'Piezas y anticipos',
    copy: 'La calidad, disponibilidad y garantía de cada pieza se informan antes de reparar. Los anticipos se solicitan únicamente para refacciones especiales o pedidos.',
  },
  {
    number: '04',
    title: 'Titularidad del equipo',
    copy: 'Liberaciones, recuperación de acceso y soporte PayJoy o MacroPay requieren al titular y documentación comprobable. No retiramos controles sin autorización.',
  },
] as const;

export function TermsSection() {
  return (
    <section className="lp-section lp-terms" id="terminos" aria-labelledby="terms-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Condiciones del servicio</p>
          <h2 id="terms-title">Reglas simples. Sin letras pequeñas escondidas.</h2>
        </div>
        <p>
          Estas son las bases generales del servicio. La cotización y la nota de recepción indican las condiciones específicas de tu equipo.
        </p>
      </div>

      <div className="lp-terms__grid">
        {terms.map((term, index) => (
          <article className="lp-terms__card" data-reveal key={term.number} style={{ transitionDelay: `${index * 55}ms` }}>
            <span>{term.number}</span>
            <h3>{term.title}</h3>
            <p>{term.copy}</p>
          </article>
        ))}
      </div>

      <p className="lp-terms__note">
        Al autorizar un servicio confirmas la cotización y las condiciones registradas en tu nota. Si tienes dudas, pregúntanos antes de dejar el equipo.
      </p>
    </section>
  );
}
