interface LogoIconProps {
  size?: number;
  className?: string;
  inverted?: boolean;
}

/** Monograma CelLab: un teléfono abierto convertido en una C y una pista en L. */
export function LogoIcon({ size = 38, className = '', inverted = false }: LogoIconProps) {
  const surface = inverted ? '#F1F4F1' : '#17201D';
  const trace = inverted ? '#17201D' : '#F1F4F1';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="10" fill={surface} />
      <path
        d="M39 15H25C19.477 15 15 19.477 15 25V39C15 44.523 19.477 49 25 49H39"
        stroke={trace}
        strokeWidth="7"
        strokeLinecap="square"
      />
      <path d="M36 22V42H49" stroke="#9ED7C1" strokeWidth="6" strokeLinecap="square" />
      <rect x="44" y="12" width="8" height="8" fill="#F06432" />
      <circle cx="49" cy="49" r="3" fill={trace} />
    </svg>
  );
}