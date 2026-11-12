export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={`brand-mark${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}
