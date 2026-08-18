import { motion } from "framer-motion";
import { Bot, Code2, Rocket, Sparkles } from "lucide-react";
import SectionHeading from "./SectionHeading";
import SpotlightCard from "./SpotlightCard";
import { learningItems, profile } from "../data/portfolio";

const learningNames = learningItems.map((item) => item.name).join(", ");

const pillars = [
  {
    icon: Code2,
    title: "Full Stack Craft",
    body: "React, TypeScript and modern tooling on the front end, Python APIs with FastAPI and Flask on the back end.",
  },
  {
    icon: Bot,
    title: "GenAI Native",
    body: "I build with LLMs day to day — RAG pipelines, LangChain/LangGraph agents, embeddings and vector search.",
  },
  {
    icon: Rocket,
    title: "Ship Fast",
    body: "Vite-powered workflows and pragmatic architecture so ideas turn into working products quickly.",
  },
  {
    icon: Sparkles,
    title: "Always Learning",
    body: `Everything else in my stack is production-tested — right now I'm actively deepening my skills in ${learningNames}.`,
  },
];

export default function About() {
  return (
    <section id="about" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="About"
          title="Turning LLMs into real products"
          description="A snapshot of how I like to work: dependable engineering fundamentals paired with a genuine curiosity for what generative AI can unlock."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="glass relative overflow-hidden rounded-3xl p-8"
          >
            <div className="animate-blob absolute -top-16 -right-16 h-56 w-56 rounded-full bg-violet/20 blur-3xl" />
            <p className="relative font-mono text-xs uppercase tracking-[0.2em] text-cyan">
              Who I am
            </p>
            <p className="relative mt-4 text-lg leading-relaxed text-white/90">
              {profile.bio}
            </p>
            <div className="relative mt-8 flex flex-wrap gap-3">
              {["React", "TypeScript", "FastAPI", "LangChain", "RAG"].map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
                  whileHover={{ y: -2, borderColor: "rgba(124,58,237,0.5)" }}
                  className="rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-mist"
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2">
            {pillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <SpotlightCard className="rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40 hover:bg-surface-2">
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.08 }}
                    transition={{ duration: 0.5 }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 text-cyan"
                  >
                    <pillar.icon size={20} />
                  </motion.div>
                  <h3 className="mt-4 font-display text-base font-semibold text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">
                    {pillar.body}
                  </p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
