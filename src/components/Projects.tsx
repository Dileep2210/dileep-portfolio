import SectionHeading from "./SectionHeading";
import ProjectReel from "./ProjectReel";
import { projects } from "../data/portfolio";

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

        <p className="mt-14 font-mono text-xs uppercase tracking-[0.2em] text-cyan">
          GenAI Engineering
        </p>
        <p className="mt-2 max-w-xl text-sm text-mist">
          Where I differentiate — agents and RAG systems doing real work, not chat demos.
        </p>
        <div className="mt-6">
          <ProjectReel projects={genaiProjects} direction="left" speed={30} />
        </div>

        <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-mist">
          Web Development
        </p>
        <p className="mt-2 max-w-xl text-sm text-mist">
          Full-stack builds — the same end-to-end delivery, general-purpose.
        </p>
        <div className="mt-6 space-y-5">
          <ProjectReel projects={webdevRowA} direction="right" speed={38} />
          <ProjectReel projects={webdevRowB} direction="left" speed={44} />
        </div>
      </div>
    </section>
  );
}
