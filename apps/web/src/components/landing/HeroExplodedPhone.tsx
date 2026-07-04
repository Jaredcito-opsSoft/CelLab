import type { CSSProperties, PointerEvent } from 'react';

type PhoneStyle = CSSProperties & {
  '--rx': string;
  '--ry': string;
  '--mx': string;
  '--my': string;
};

export function HeroExplodedPhone() {
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      window.matchMedia('(max-width: 1023px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    target.style.setProperty('--rx', `${((0.5 - y) * 4.5).toFixed(2)}deg`);
    target.style.setProperty('--ry', `${((x - 0.5) * 6.5).toFixed(2)}deg`);
    target.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    target.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  };

  const resetPointer = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
    event.currentTarget.style.setProperty('--mx', '64%');
    event.currentTarget.style.setProperty('--my', '48%');
  };

  return (
    <div
      className="lp-phone-stage"
      style={{ '--rx': '0deg', '--ry': '0deg', '--mx': '64%', '--my': '48%' } as PhoneStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      aria-label="Ilustración técnica de un celular desarmado en capas: vidrio, display, placa lógica, batería, conectores y chasis."
    >
      <div className="lp-phone-stage__meta" aria-hidden="true">
        <span>Despiece técnico</span>
        <span>6 capas alineadas</span>
      </div>

      <svg className="lp-phone-svg" viewBox="0 0 760 680" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="lpMetal" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#eef5f1" />
            <stop offset="52%" stopColor="#9fb3ad" />
            <stop offset="100%" stopColor="#314742" />
          </linearGradient>
          <linearGradient id="lpDisplay" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f3940" />
            <stop offset="55%" stopColor="#071d22" />
            <stop offset="100%" stopColor="#02090b" />
          </linearGradient>
          <linearGradient id="lpBoard" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#1c6971" />
            <stop offset="100%" stopColor="#083034" />
          </linearGradient>
          <linearGradient id="lpBattery" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#e8dfce" />
            <stop offset="100%" stopColor="#b9a98f" />
          </linearGradient>
          <filter id="lpPremiumShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="28" stdDeviation="24" floodColor="#00080a" floodOpacity=".42" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#9fcdbf" floodOpacity=".08" />
          </filter>
          <filter id="lpGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="11" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="lp-phone-light" filter="url(#lpGlow)">
          <ellipse cx="444" cy="358" rx="178" ry="260" fill="#9fcdbf" opacity=".075" />
          <ellipse cx="448" cy="520" rx="210" ry="44" fill="#000" opacity=".22" />
        </g>

        <g className="lp-phone-layer lp-layer-chassis" filter="url(#lpPremiumShadow)">
          <rect x="315" y="114" width="214" height="430" rx="48" fill="url(#lpMetal)" stroke="#dce8e2" strokeWidth="4" opacity=".92" />
          <rect x="337" y="148" width="170" height="354" rx="30" fill="#0a2024" stroke="#70837d" strokeWidth="3" opacity=".62" />
          <circle cx="422" cy="518" r="15" fill="none" stroke="#d8e8e1" strokeWidth="4" opacity=".7" />
          <path d="M379 132h86M378 558h88" stroke="#e3eee9" strokeWidth="5" strokeLinecap="round" opacity=".72" />
        </g>

        <g className="lp-phone-layer lp-layer-board">
          <path d="M352 164h142c14 0 26 12 26 26v102c0 14-12 26-26 26H352c-14 0-26-12-26-26V190c0-14 12-26 26-26Z" fill="url(#lpBoard)" stroke="#b9d3cb" strokeWidth="3" />
          <rect x="350" y="190" width="54" height="48" rx="8" fill="#b9d3cb" opacity=".88" />
          <rect x="421" y="188" width="58" height="22" rx="5" fill="#e66a43" opacity=".9" />
          <rect x="421" y="224" width="42" height="24" rx="5" fill="#e5eee9" opacity=".84" />
          <rect x="474" y="224" width="22" height="52" rx="5" fill="#6f8f86" />
          <path d="M338 270h58v56M500 288h50M376 164v-42M462 164v-48M348 250h-54" stroke="#9fcdbf" strokeWidth="4" strokeLinecap="round" />
          <circle cx="504" cy="202" r="8" fill="#9fcdbf" />
          <circle cx="333" cy="210" r="7" fill="#e66a43" />
        </g>

        <g className="lp-phone-layer lp-layer-battery">
          <rect x="370" y="334" width="116" height="160" rx="16" fill="url(#lpBattery)" stroke="#f0eadc" strokeWidth="3" />
          <rect x="400" y="318" width="56" height="16" rx="5" fill="#202d2a" />
          <path d="M394 388h68M394 416h68M394 444h46" stroke="#c25a39" strokeWidth="6" strokeLinecap="round" />
          <text x="428" y="474" textAnchor="middle" fill="#24332f" fontSize="15" fontFamily="monospace" fontWeight="700">Li-ion</text>
        </g>

        <g className="lp-phone-layer lp-layer-shields">
          <rect x="268" y="194" width="74" height="82" rx="10" fill="#d7e2dd" stroke="#ffffff" strokeWidth="2" opacity=".86" />
          <rect x="532" y="208" width="72" height="70" rx="10" fill="#c3d0ca" stroke="#ffffff" strokeWidth="2" opacity=".78" />
          <path d="M286 222h38M286 246h28M550 234h34M550 256h22" stroke="#5b706a" strokeWidth="4" strokeLinecap="round" opacity=".55" />
        </g>

        <g className="lp-phone-layer lp-layer-connectors">
          <path d="M318 310c-82 0-116 36-116 92v32M524 312c88 0 120 36 120 92v34M338 486h-80c-44 0-74 28-74 72M508 486h82c46 0 76 28 76 72" fill="none" stroke="#8fbab0" strokeWidth="3" strokeDasharray="9 12" strokeLinecap="round" opacity=".78" />
          <rect x="178" y="430" width="52" height="28" rx="10" fill="#dbe8e2" stroke="#93aaa3" strokeWidth="3" />
          <rect x="622" y="432" width="52" height="28" rx="10" fill="#dbe8e2" stroke="#93aaa3" strokeWidth="3" />
          <rect x="156" y="558" width="62" height="30" rx="10" fill="#dbe8e2" stroke="#93aaa3" strokeWidth="3" />
          <rect x="642" y="558" width="62" height="30" rx="10" fill="#dbe8e2" stroke="#93aaa3" strokeWidth="3" />
        </g>

        <g className="lp-phone-layer lp-layer-display">
          <rect x="289" y="100" width="244" height="468" rx="56" fill="url(#lpDisplay)" stroke="#6d8580" strokeWidth="5" />
          <rect x="314" y="136" width="194" height="388" rx="35" fill="#061316" stroke="#244249" strokeWidth="2" />
          <path d="M334 170h154M334 206h154M334 242h126M334 278h154M334 314h108" stroke="#183f45" strokeWidth="2" opacity=".65" />
          <path d="M346 170v170M384 146v252M460 146v300" stroke="#183f45" strokeWidth="2" opacity=".38" />
        </g>

        <g className="lp-phone-layer lp-layer-glass">
          <rect x="278" y="86" width="268" height="496" rx="62" fill="rgba(226,245,239,.17)" stroke="#d8f0e8" strokeWidth="3" />
          <rect x="306" y="128" width="212" height="410" rx="38" fill="rgba(255,255,255,.045)" stroke="rgba(255,255,255,.22)" strokeWidth="2" />
          <path d="M378 111h70" stroke="#d8f0e8" strokeWidth="6" strokeLinecap="round" opacity=".74" />
          <path className="lp-glass-sheen" d="M325 152 494 486" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" opacity=".28" />
        </g>
      </svg>

      <div className="lp-phone-stage__caption" aria-hidden="true">
        <span /> Reparación explicada antes de trabajar
      </div>
    </div>
  );
}