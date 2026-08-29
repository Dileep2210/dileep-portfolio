import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { techStack } from "../data/portfolio";

export default function TechStack() {
  return (
    <section id="stack" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Tech Stack"
          title="Tools I reach for"
          description="A living toolkit spanning the front end, the back end and the GenAI layer that ties them together — every category, in one place."
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass relative mt-14 overflow-hidden rounded-3xl p-6 sm:p-9"
        >
          <div
            aria-hidden
            className="animate-blob absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet/10 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-blob absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan/10 blur-3xl"
            style={{ animationDelay: "-9s" }}
          />

          <div className="relative space-y-7">
            {techStack.map((category, ci) => (
              <motion.div
                key={category.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                variants={{ show: { transition: { staggerChildren: 0.03 } } }}
                className={ci > 0 ? "border-t border-border/60 pt-7" : ""}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-violet to-cyan shadow-[0_0_8px_#7c3aed]" />
                    <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-white">
                      {category.title}
                    </h3>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] leading-none text-mist">
                      {category.items.length}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-mist">{category.blurb}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {category.items.map((item) => (
                    <motion.div
                      key={item.name}
                      variants={{
                        hidden: { opacity: 0, y: 10, scale: 0.92 },
                        show: { opacity: 1, y: 0, scale: 1 },
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      whileHover={{ y: -3 }}
                      className="group flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${item.color}22`, color: item.color }}
                      >
                        <item.icon size={15} />
                      </span>
                      <span className="truncate text-xs font-medium text-white/85">
                        {item.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
