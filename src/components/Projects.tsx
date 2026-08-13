import SectionHeading from "./SectionHeading";
import ProjectCard from "./ProjectCard";
import { projects } from "../data/portfolio";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
const asWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Computed from the data instead of hardcoded, so this line can't go stale
// the next time a project is added or removed.
const liveCount = projects.filter((p) => !p.isDemo).length;
const demoCount = projects.filter((p) => p.isDemo).length;

const genaiProjects = projects.filter((p) => p.category === "genai");
const webdevProjects = projects.filter((p) => p.category === "webdev");

export default function Projects() {
  return (
    <section id="work" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Selected Work"
          title="Live projects, built solo end to end"
          description={capitalize(
            `${asWord(liveCount)} live business${liveCount === 1 ? "" : "es"} and ${asWord(demoCount)} AI demo${demoCount === 1 ? "" : "s"} I designed, built and shipped by myself — from idea to a real, live URL. Proof I can take a freelance project the whole way.`,
          )}
        />

        <p className="mt-14 font-mono text-xs uppercase tracking-[0.2em] text-cyan">
          GenAI Engineering
        </p>
        <p className="mt-2 max-w-xl text-sm text-mist">
          Where I differentiate — agents and RAG systems doing real work, not chat demos.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {genaiProjects.map((project, i) => (
            <ProjectCard key={project.name} project={project} index={i} />
          ))}
        </div>

        <p className="mt-16 font-mono text-xs uppercase tracking-[0.2em] text-mist">
          Web Development
        </p>
        <p className="mt-2 max-w-xl text-sm text-mist">
          Full-stack builds — the same end-to-end delivery, general-purpose.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {webdevProjects.map((project, i) => (
            <ProjectCard key={project.name} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
