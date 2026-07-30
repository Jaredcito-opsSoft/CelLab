import { useEffect, useRef, useState, type PointerEvent } from 'react';

const frames = Array.from({ length: 6 }, (_, index) => `/hero-frames/frame-${index + 1}.webp`);
const labels = ['Escaneo', 'Apertura', 'Inspección', 'Componentes', 'Despiece', 'Validación'];

export function HeroFrameSequence() {
  const [frame, setFrame] = useState(0);
  const [manual, setManual] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) {
      setFrame(5);
      return;
    }

    const timer = window.setInterval(() => {
      setFrame((current) => manual ? current : (current + 1) % frames.length);
    }, 720);
    return () => window.clearInterval(timer);
  }, [manual]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia('(max-width: 1023px)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const progress = Math.min(0.999, Math.max(0, (event.clientX - rect.left) / rect.width));
    setManual(true);
    setFrame(Math.floor(progress * frames.length));
    event.currentTarget.style.setProperty('--pointer-x', `${progress * 100}%`);
  };

  return (
    <div
      className="lp-frame-stage"
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setManual(false)}
      aria-hidden="true"
    >
      <div className="lp-frame-stage__viewport">
        {frames.map((src, index) => (
          <img
            className={index === frame ? 'lp-frame-img is-active' : 'lp-frame-img'}
            src={src}
            alt=""
            width="640"
            height="640"
            loading={index < 2 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            key={src}
          />
        ))}
        <div className="lp-frame-stage__scan" />
        <div className="lp-frame-stage__reticle"><span /><span /><span /><span /></div>
      </div>

      <div className="lp-frame-stage__topline">
        <span>CEL-LAB / DIAGNÓSTICO</span>
        <b>{String(frame + 1).padStart(2, '0')} / 06</b>
      </div>
      <div className="lp-frame-stage__status">
        <span className="lp-frame-stage__pulse" />
        <strong>{labels[frame]}</strong>
        <small>{manual ? 'Control manual' : 'Secuencia activa'}</small>
      </div>
      <div className="lp-frame-stage__rail">
        {frames.map((src, index) => (
          <span className={index === frame ? 'is-active' : ''} key={src} />
        ))}
      </div>
      <p className="lp-frame-stage__hint">Mueve el cursor para inspeccionar</p>
    </div>
  );
}
