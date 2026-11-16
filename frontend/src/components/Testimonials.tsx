import { motion } from "framer-motion";
import { Quote, User } from "lucide-react";
import SectionHeading from "./SectionHeading";
import SpotlightCard from "./SpotlightCard";
import { testimonials } from "../data/portfolio";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Testimonials"
          title="What clients say"
          description="Feedback from the people I've worked with."
          align="center"
        />

        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="w-full sm:w-[360px]"
            >
              <SpotlightCard className="relative flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet/40">
                {t.isSample && (
                  <span className="absolute right-4 top-4 rounded-full glass px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    Sample content
                  </span>
                )}
                <Quote size={22} className="text-violet" />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/90">
                  {t.quote}
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan text-xs font-semibold text-white">
                    {t.isSample ? <User size={16} /> : initials(t.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {t.name}
                    </p>
                    <p className="text-xs leading-snug text-mist">{t.role}</p>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
