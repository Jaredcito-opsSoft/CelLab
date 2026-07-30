import { BadgeCheck, Clock3, MapPin, ShieldCheck } from 'lucide-react';

const reasons = [
  { icon: BadgeCheck, title: 'Explicación antes de intervenir', copy: 'Entiendes la falla, las opciones y el precio antes de autorizar.' },
  { icon: Clock3, title: 'Tiempo realista', copy: 'Te decimos si sale el mismo día o si requiere una prueba más larga.' },
  { icon: ShieldCheck, title: 'Servicio documentado', copy: 'Recibes folio y garantía aplicable, no una promesa de palabra.' },
  { icon: MapPin, title: 'Atención local', copy: 'Estamos en Tuxtla Gutiérrez y hablas directamente con el taller.' },
];

export function AboutSection() {
  return (
    <section className="lp-section lp-about" id="nosotros" aria-labelledby="about-title">
      <div className="lp-about__copy" data-reveal>
        <p className="lp-eyebrow">Por qué CelLab</p>
        <h2 id="about-title">Tu equipo se trata como herramienta de todos los días, no como un número.</h2>
        <p>
          CelLab es un taller local especializado en teléfonos. Combinamos diagnóstico técnico,
          comunicación directa y seguimiento para que puedas decidir con certeza.
        </p>
        <a className="lp-link" href="#contacto">Conoce cómo contactarnos <span aria-hidden="true">↗</span></a>
      </div>
      <div className="lp-about__reasons">
        {reasons.map(({ icon: Icon, title, copy }, index) => (
          <article data-reveal key={title} style={{ transitionDelay: `${index * 50}ms` }}>
            <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
