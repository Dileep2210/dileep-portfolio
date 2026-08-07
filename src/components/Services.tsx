import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import SpotlightCard from "./SpotlightCard";
import Magnetic from "./Magnetic";
import { services } from "../data/portfolio";

export default function Services() {
  const featured = services.find((s) => s.featured);
  const rest = services.filter((s) => !s.featured);

  return (
    <section id="services" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="What I Can Build"
          title="Whatever you're building, I can ship it"
          description="Freelance-ready, end to end — from a business website to a production AI feature. Here's what that looks like in practice."
        />

        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="mt-14"
          >
            <SpotlightCard className="flex flex-col gap-6 rounded-3xl border border-violet/30 bg-gradient-to-br from-surface/80 to-surface-2/60 p-8 transition-all duration-300 hover:border-violet/50 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-cyan text-white">
                <featured.icon size={26} />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-semibold text-white">
                  {featured.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  {featured.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {featured.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-mist"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        )}

        <p className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-mist">
          AI / GenAI specialties
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {rest.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <SpotlightCard className="h-full rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40 hover:bg-surface-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 text-cyan transition-transform duration-300 group-hover:scale-110">
                  <service.icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  {service.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-white/5 px-3 py-1 text-xs text-mist"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 flex flex-col items-center justify-between gap-6 rounded-3xl glass p-8 text-center sm:flex-row sm:text-left"
        >
          <div>
            <p className="font-display text-lg font-semibold text-white">
              Have a project that fits one of these?
            </p>
            <p className="mt-1 text-sm text-mist">
              Tell me what you're building — I'll tell you honestly if it's a fit.
            </p>
          </div>
          <Magnetic strength={0.4}>
            <a
              href="#contact"
              className="group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition-transform duration-300 hover:scale-105"
            >
              Start a project
              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </Magnetic>
        </motion.div>
      </div>
    </section>
  );
}
