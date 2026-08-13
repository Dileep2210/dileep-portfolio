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

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {projects.map((project, i) => (
            <ProjectCard key={project.name} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
