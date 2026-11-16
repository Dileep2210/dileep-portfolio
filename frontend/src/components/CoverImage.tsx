import { useState } from "react";

/** Project/service/blog cover with a branded fallback when no image is set or it fails to load. */
export default function CoverImage({ src, title, className = "", eager = false }: { src?: string; title: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${title} cover`}
        className={`flex items-center justify-center bg-gradient-to-br from-violet/30 via-indigo/20 to-cyan/25 ${className}`}
      >
        <span className="px-4 text-center font-display text-lg font-semibold text-white/80">{title}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${title} preview`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
