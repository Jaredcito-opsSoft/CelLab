import { BatteryCharging, Droplets, ShieldQuestion } from 'lucide-react';

const cases = [
  {
    icon: Droplets,
    signal: 'Se mojó',
    title: 'No lo conectes. Cada minuto cuenta.',
    copy: 'Desconectamos batería, revisamos corrosión y medimos placa antes de prometer una recuperación.',
    action: 'Atención prioritaria',
  },
  {
    icon: BatteryCharging,
    signal: 'No carga',
    title: 'No siempre es el centro de carga.',
    copy: 'Probamos cable, consumo, batería, flex y conector para cambiar solamente lo que realmente falló.',
    action: 'Diagnóstico eléctrico',
  },
  {
    icon: ShieldQuestion,
    signal: 'Equipo administrado',
    title: 'PayJoy o MacroPay con soporte autorizado.',
    copy: 'Orientamos recuperación y regularización cuando existe titularidad comprobable. No retiramos bloqueos sin autorización.',
    action: 'Validación requerida',
  },
] as const;

export function CaseStoriesSection() {
  return (
    <section className="lp-section lp-cases" id="casos" aria-labelledby="cases-title">
      <div className="lp-section-head lp-section-head--split" data-reveal>
        <div>
          <p className="lp-eyebrow">Situaciones reales</p>
          <h2 id="cases-title">No todas las fallas empiezan igual.</h2>
        </div>
        <p>Por eso no damos respuestas automáticas. Cada síntoma abre una ruta de revisión distinta.</p>
      </div>
      <div className="lp-case-grid">
        {cases.map(({ icon: Icon, signal, title, copy, action }, index) => (
          <article className="lp-case-card" data-reveal key={signal} style={{ transitionDelay: `${index * 70}ms` }}>
            <div className="lp-case-card__signal"><Icon size={20} strokeWidth={1.7} /><span>{signal}</span></div>
            <h3>{title}</h3>
            <p>{copy}</p>
            <a href="#marcas">{action}<span aria-hidden="true">↗</span></a>
          </article>
        ))}
      </div>
    </section>
  );
}
