import { useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import SectionHeading from "./SectionHeading";
import ProjectReel from "./ProjectReel";
import { projects } from "../data/portfolio";

type ReelLabelProps = {
  eyebrow: string;
  eyebrowClassName: string;
  description: string;
};

function ReelLabel({ eyebrow, eyebrowClassName, description }: ReelLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <p className={`font-mono text-xs uppercase tracking-[0.2em] ${eyebrowClassName}`}>
        {eyebrow}
      </p>
      <p className="mt-2 max-w-xl text-sm text-mist">{description}</p>
    </motion.div>
  );
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const asWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Computed from the data instead of hardcoded, so this line can't go stale
// the next time a project is added or removed.
const liveCount = projects.filter((p) => !p.isDemo).length;
const demoCount = projects.filter((p) => p.isDemo).length;

const genaiProjects = projects.filter((p) => p.category === "genai");
const webdevProjects = projects.filter((p) => p.category === "webdev");
// Split into two rows so the reel reads as a dual film strip instead of
// one very long line — each half scrolls in the opposite direction.
const webdevMid = Math.ceil(webdevProjects.length / 2);
const webdevRowA = webdevProjects.slice(0, webdevMid);
const webdevRowB = webdevProjects.slice(webdevMid);

export default function Projects() {
  const [paused, setPaused] = useState(false);

  return (
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Selected Work"
          title="Live projects, built solo end to end"
          description={capitalize(
            `${asWord(liveCount)} live business${liveCount === 1 ? "" : "es"} and ${asWord(demoCount)} solo build${demoCount === 1 ? "" : "s"} — AI agents and demo sites alike — I designed, built and shipped by myself, from idea to a real, live URL. Proof I can take a freelance project the whole way.`,
          )}
        />

        <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
          <ReelLabel
            eyebrow="Web Development"
            eyebrowClassName="text-cyan"
            description="Full-stack builds — the same end-to-end delivery, general-purpose."
          />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium text-white transition-colors hover:border-white/30"
          >
            {paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
            {paused ? "Play project carousels" : "Pause project carousels"}
          </button>
        </div>
        <div className="mt-6 space-y-5">
          <ProjectReel projects={webdevRowA} direction="right" speed={38} paused={paused} />
          <ProjectReel projects={webdevRowB} direction="left" speed={44} paused={paused} />
        </div>

        <div className="mt-16">
          <ReelLabel
            eyebrow="GenAI Engineering"
            eyebrowClassName="text-mist"
            description="Where I differentiate — agents and RAG systems doing real work, not chat demos."
          />
        </div>
        <div className="mt-6">
          <ProjectReel projects={genaiProjects} direction="left" speed={30} paused={paused} />
        </div>
      </div>
    </section>
  );
}
