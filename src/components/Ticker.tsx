import { Sparkle } from "lucide-react";

const words = [
  "React",
  "TypeScript",
  "FastAPI",
  "LangChain",
  "LangGraph",
  "RAG Systems",
  "Claude",
  "Gemini",
  "PostgreSQL",
  "Vite",
  "Agentic AI",
  "Docker",
];

/**
 * A continuously scrolling editorial band — the kind of confident, always-
 * moving strip agency sites use as a section transition. Reuses the same
 * marquee-track utility ProjectReel relies on, just with text chips.
 */
export default function Ticker() {
  const track = [...words, ...words];

  return (
    <div className="relative border-y border-border/60 bg-surface/40 py-4">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="section-divider absolute inset-x-0 bottom-0" />
      <div className="reel-mask overflow-hidden">
        <div
          className="marquee-track flex w-max items-center gap-10"
          style={{ "--marquee-duration": "26s" } as React.CSSProperties}
        >
          {track.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em] text-mist/80"
            >
              {word}
              <Sparkle size={10} className="text-violet/60" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
