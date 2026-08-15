/**
 * Lightweight board silhouettes. Inline SVG rather than images so they
 * inherit colour, stay crisp at any size and cost no extra requests.
 */
export default function BoardArt({ chip = '', size = 64, lit = false }) {
  const name = String(chip).toLowerCase();
  const pins = name.includes('8266') ? 8 : name.includes('arduino') ? 7 : 9;
  const accent = lit ? '#22C55E' : '#94A3B8';

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={chip ? `${chip} board` : 'Microcontroller board'}
      className="shrink-0"
    >
      {/* PCB */}
      <rect x="8" y="10" width="48" height="44" rx="4" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1.5" />

      {/* USB connector */}
      <rect x="24" y="6" width="16" height="7" rx="1.5" fill="#CBD5E1" />
      <rect x="26.5" y="8" width="11" height="3" rx="0.8" fill="#94A3B8" />

      {/* Shielded module */}
      <rect x="16" y="18" width="32" height="18" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1.2" />
      <g fill="#93C5FD" opacity="0.7">
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={i} x={19 + i * 5} y="20.5" width="2.6" height="1.6" rx="0.5" />
        ))}
      </g>

      {/* Chip label bar */}
      <rect x="21" y="25" width="22" height="6" rx="1" fill="#60A5FA" opacity="0.55" />

      {/* Status LED */}
      <circle cx="44" cy="42" r="3" fill={accent}>
        {lit && <animate attributeName="opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite" />}
      </circle>
      <circle cx="44" cy="42" r="5.5" fill={accent} opacity={lit ? 0.22 : 0} />

      {/* Buttons */}
      <rect x="13" y="40" width="7" height="5" rx="1.2" fill="#CBD5E1" />
      <rect x="23" y="40" width="7" height="5" rx="1.2" fill="#CBD5E1" />

      {/* Header pins */}
      <g fill="#94A3B8">
        {Array.from({ length: pins }).map((_, i) => (
          <rect key={`t${i}`} x={11 + i * (42 / pins)} y="11.5" width="2" height="3.5" rx="0.6" />
        ))}
        {Array.from({ length: pins }).map((_, i) => (
          <rect key={`b${i}`} x={11 + i * (42 / pins)} y="49" width="2" height="3.5" rx="0.6" />
        ))}
      </g>
    </svg>
  );
}
