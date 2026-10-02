import { initials } from "../lib/format";

export function ProductImage({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-line font-display text-2xl font-bold text-muted ${className}`} aria-label={name} role="img">
        {initials(name)}
      </div>
    );
  }
  return <img src={src} alt={name} loading="lazy" className={`object-cover ${className}`} />;
}
