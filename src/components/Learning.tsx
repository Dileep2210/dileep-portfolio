import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { learningItems } from "../data/portfolio";

export default function Learning() {
  return (
    <section id="learning" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Currently Learning"
          title="Sharpening what's next"
          description="Everything else in my stack is production-tested. Here's what I'm actively deepening right now."
          align="center"
        />

        <div className="mx-auto mt-14 grid max-w-2xl gap-6 sm:grid-cols-2">
          {learningItems.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-surface/60 p-8"
            >
              <div
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-3xl transition-opacity duration-300 group-hover:opacity-45"
                style={{ backgroundColor: item.color }}
              />
              <div
                className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${item.color}1a`, color: item.color }}
              >
                <item.icon size={26} />
              </div>
              <h3 className="relative mt-5 text-center font-display text-lg font-semibold text-white">
                {item.name}
              </h3>
              <p className="relative mt-2 text-center text-sm leading-relaxed text-mist">
                {item.note}
              </p>

              <div className="relative mt-6 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "70%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
