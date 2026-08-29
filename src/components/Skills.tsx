import { useRef, type CSSProperties, type ComponentType } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  SiAnthropic,
  SiDocker,
  SiFastapi,
  SiLangchain,
  SiPostgresql,
  SiPython,
  SiReact,
  SiTypescript,
} from "react-icons/si";
import { TbBrain } from "react-icons/tb";
import SectionHeading from "./SectionHeading";
import SpotlightCard from "./SpotlightCard";
import { useCountUp } from "../hooks/useCountUp";
import { projects, skillProficiency, techStack, type SkillProficiency } from "../data/portfolio";

// Computed from the data instead of hardcoded, so these can't go stale the
// next time a project or a stack entry is added.
const stats = [
  { value: projects.length, suffix: "", label: "Projects shipped solo" },
  {
    value: projects.filter((p) => !p.isDemo).length,
    suffix: "",
    label: "Live businesses running",
  },
  {
    value: projects.filter((p) => p.category === "genai").length,
    suffix: "",
    label: "AI agents & RAG systems",
  },
  {
    value: techStack.reduce((sum, c) => sum + c.items.length, 0),
    suffix: "+",
    label: "Tools & frameworks",
  },
];

type OrbitItem = { icon: ComponentType<{ size?: number; className?: string }>; color: string; label: string };

const innerOrbit: OrbitItem[] = [
  { icon: SiReact, color: "#61DAFB", label: "React" },
  { icon: SiPython, color: "#3776AB", label: "Python" },
  { icon: SiTypescript, color: "#3178C6", label: "TypeScript" },
  { icon: SiFastapi, color: "#009688", label: "FastAPI" },
];

const outerOrbit: OrbitItem[] = [
  { icon: SiLangchain, color: "#3ECF8E", label: "LangChain" },
  { icon: SiAnthropic, color: "#D97757", label: "Claude" },
  { icon: TbBrain, color: "#A78BFA", label: "LLMs" },
  { icon: SiPostgresql, color: "#4169E1", label: "PostgreSQL" },
  { icon: SiDocker, color: "#2496ED", label: "Docker" },
];

type RingVars = CSSProperties & {
  "--orbit-duration"?: string;
  "--orbit-direction"?: "normal" | "reverse";
};

function OrbitRing({
  items,
  radius,
  duration,
  reverse,
}: {
  items: OrbitItem[];
  radius: number;
  duration: number;
  reverse?: boolean;
}) {
  const step = 360 / items.length;
  const ringStyle: RingVars = {
    "--orbit-duration": `${duration}s`,
    "--orbit-direction": reverse ? "reverse" : "normal",
  };
  const counterStyle: RingVars = {
    "--orbit-direction": reverse ? "normal" : "reverse",
  };

  return (
    <div className="orbit-spin absolute inset-0" style={ringStyle}>
      {items.map((item, i) => {
        const angle = step * i;
        return (
          <div
            key={item.label}
            className="absolute left-1/2 top-1/2 h-11 w-11"
            style={{
              transform: `rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg) translate(-50%, -50%)`,
            }}
          >
            <div
              className="orbit-spin glass flex h-11 w-11 items-center justify-center rounded-xl shadow-lg shadow-black/30"
              style={{ ...counterStyle, color: item.color }}
              title={item.label}
            >
              <item.icon size={18} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrbitVisual() {
  return (
    <div className="relative mx-auto h-[260px] w-[260px] sm:h-[320px] sm:w-[320px] lg:h-[380px] lg:w-[380px]">
      <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 scale-[0.68] sm:scale-[0.84] lg:scale-100">
        <div className="absolute inset-0 m-auto h-[190px] w-[190px] rounded-full border border-dashed border-white/10" />
        <div className="absolute inset-0 rounded-full border border-dashed border-white/[0.07]" />

        <OrbitRing items={innerOrbit} radius={95} duration={22} />
        <OrbitRing items={outerOrbit} radius={172} duration={34} reverse />

        {/* Core */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="pointer-events-none absolute inset-0 rounded-full border border-cyan/40 [animation:pulse-ring_3s_ease-out_infinite]" />
          <span className="pointer-events-none absolute inset-0 rounded-full border border-violet/40 [animation:pulse-ring_3s_ease-out_infinite_1.5s]" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet to-cyan opacity-50 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet via-indigo to-cyan text-white shadow-2xl shadow-violet/40">
            <Sparkles size={26} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  suffix,
  label,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const count = useCountUp(value, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, delay }}
    >
      <SpotlightCard className="rounded-2xl border border-border bg-surface/60 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-violet/40 sm:text-left">
        <p className="font-display text-3xl font-bold text-gradient sm:text-4xl">
          {count}
          {suffix}
        </p>
        <p className="mt-1 text-xs leading-snug text-mist">{label}</p>
      </SpotlightCard>
    </motion.div>
  );
}

function ProficiencyBar({ skill, delay }: { skill: SkillProficiency; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-white">{skill.label}</p>
        <p className="shrink-0 font-mono text-xs text-cyan">{skill.value}%</p>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${skill.value}%` } : { width: 0 }}
          transition={{ duration: 1.1, delay, ease: "easeOut" }}
          className="relative h-full rounded-full bg-gradient-to-r from-violet via-indigo to-cyan"
        >
          <span
            aria-hidden
            className="animate-shimmer absolute inset-0 bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.55)_50%,transparent_70%)] bg-[length:200%_100%]"
          />
        </motion.div>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-mist">{skill.note}</p>
    </div>
  );
}

export default function Skills() {
  return (
    <section id="skills" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Skills"
          title="Depth behind the demos"
          description="Not just a list of logos — here's the real weight of experience behind each part of the stack, and the tools I reach for most."
        />

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} delay={i * 0.08} />
          ))}
        </div>

        <div className="mt-16 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
          <div className="space-y-7">
            {skillProficiency.map((skill, i) => (
              <ProficiencyBar key={skill.label} skill={skill} delay={0.1 + i * 0.1} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <OrbitVisual />
            <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.2em] text-mist">
              The stack I orbit daily
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
