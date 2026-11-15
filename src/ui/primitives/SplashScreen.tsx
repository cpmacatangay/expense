export function SplashScreen() {
  return (
    <main className="splash" aria-busy="true">
      <svg className="splash-mark" viewBox="0 0 256 256" aria-hidden="true">
        <g transform="translate(128 128) scale(1.35) translate(-128 -120)">
          <path
            fill="currentColor"
            d="M184 50 L104 50 A42 42 0 0 0 104 134 L152 134 A14 14 0 0 1 152 162 L72 162 A14 14 0 0 0 72 190 L152 190 A42 42 0 0 0 152 106 L104 106 A14 14 0 0 1 104 78 L184 78 A14 14 0 0 0 184 50 Z"
          />
        </g>
      </svg>
      <p>Loading Salo…</p>
    </main>
  );
}
