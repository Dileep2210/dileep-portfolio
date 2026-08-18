import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import SpotlightCard from "./SpotlightCard";
import { techStack } from "../data/portfolio";

export default function TechStack() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = techStack[activeIndex];

  return (
    <section id="stack" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Tech Stack"
          title="Tools I reach for"
          description="A living toolkit spanning the front end, the back end and the GenAI layer that ties them together."
        />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.8 }}
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="mt-10 flex flex-wrap gap-2"
        >
          {techStack.map((category, i) => (
            <motion.button
              key={category.title}
              type="button"
              onClick={() => setActiveIndex(i)}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-300 ${
                activeIndex === i
                  ? "text-ink"
                  : "text-mist hover:text-white"
              }`}
            >
              {activeIndex === i && (
                <motion.span
                  layoutId="stack-tab"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan to-violet"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative">{category.title}</span>
            </motion.button>
          ))}
        </motion.div>

        <p className="mt-4 font-mono text-xs text-mist">{active.blurb}</p>

        <div className="relative mt-8 min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {active.items.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                >
                  <SpotlightCard className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-4 transition-colors duration-300 hover:border-white/20">
                    <motion.div
                      whileHover={{ rotate: [0, -8, 8, -4, 0] }}
                      transition={{ duration: 0.5 }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${item.color}1a`,
                        color: item.color,
                      }}
                    >
                      <item.icon size={22} />
                    </motion.div>
                    <span className="text-sm font-medium text-white/90">
                      {item.name}
                    </span>
                  </SpotlightCard>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
