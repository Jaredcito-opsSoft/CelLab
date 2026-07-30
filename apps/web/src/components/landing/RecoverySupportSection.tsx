import { CheckCircle2, FileCheck2, MessageSquareText } from 'lucide-react';
import { buildWhatsappLink, useBusinessProfile } from '../../hooks/useBusinessProfile';

const requirements = [
  { icon: FileCheck2, label: 'Comprobante de titularidad o cuenta' },
  { icon: CheckCircle2, label: 'Equipo y contrato en condición verificable' },
  { icon: MessageSquareText, label: 'Revisión directa con el titular' },
];

export function RecoverySupportSection() {
  const { profile } = useBusinessProfile();
  const link = buildWhatsappLink(
    profile,
    'Hola CelLab Tuxtla. Necesito orientación autorizada para recuperar o regularizar un equipo administrado por PayJoy o MacroPay. Soy el titular y cuento con documentación.',
  ) ?? '#contacto';

  return (
    <section className="lp-recovery" id="recuperacion" aria-labelledby="recovery-title">
      <div className="lp-recovery__glow" aria-hidden="true" />
      <div className="lp-recovery__copy" data-reveal>
        <p className="lp-eyebrow">Soporte especializado</p>
        <h2 id="recovery-title">¿Tu equipo usa PayJoy o MacroPay?</h2>
        <p>
          Te orientamos para recuperar acceso o regularizar el dispositivo por la vía autorizada.
          Revisamos el caso con el titular y la documentación correspondiente.
        </p>
        <div className="lp-recovery__actions">
          <a className="lp-button lp-button--primary" href={link} target={link.startsWith('http') ? '_blank' : undefined} rel={link.startsWith('http') ? 'noreferrer' : undefined}>
            Revisar mi caso <span aria-hidden="true">↗</span>
          </a>
          <small>No se eliminan bloqueos ni controles sin autorización comprobable.</small>
        </div>
      </div>
      <div className="lp-recovery__checklist" data-reveal>
        <span className="lp-recovery__label">Antes de escribirnos</span>
        {requirements.map(({ icon: Icon, label }, index) => (
          <div key={label}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
            <p>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
