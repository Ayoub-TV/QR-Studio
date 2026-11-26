export function LogoMark({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  const bg = inverted ? '#ffffff' : '#0a0a0b';
  const fg = inverted ? '#0a0a0b' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill={bg} />
      <g fill={fg}>
        <rect x="14" y="14" width="14" height="14" rx="2.5" />
        <rect x="36" y="14" width="14" height="14" rx="2.5" />
        <rect x="14" y="36" width="14" height="14" rx="2.5" />
        <rect x="36" y="36" width="6" height="6" rx="1.4" />
        <rect x="44" y="44" width="6" height="6" rx="1.4" />
        <rect x="36" y="44" width="6" height="6" rx="1.4" />
        <rect x="44" y="36" width="6" height="6" rx="1.4" />
      </g>
      <g fill={bg}>
        <rect x="18" y="18" width="6" height="6" rx="1" />
        <rect x="40" y="18" width="6" height="6" rx="1" />
        <rect x="18" y="40" width="6" height="6" rx="1" />
      </g>
    </svg>
  );
}

export function Logo({ inverted = false, size = 28 }: { inverted?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} inverted={inverted} />
      <span
        className={`text-[15px] font-semibold tracking-[-0.02em] ${
          inverted ? 'text-ink' : 'text-ink'
        }`}
      >
        QR Studio
      </span>
    </span>
  );
}
