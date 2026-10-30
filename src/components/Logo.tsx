export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="dap-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="color-mix(in srgb, var(--accent) 45%, #8b5cf6)" />
        </linearGradient>
      </defs>
      <path d="M4.5 3.5h6.2a8.5 8.5 0 0 1 0 17H4.5z" fill="url(#dap-g)" />
      <path d="M8.2 7.4h2.4a4.6 4.6 0 0 1 0 9.2H8.2z" fill="var(--logo-hole, #0b0f19)" />
    </svg>
  );
}
