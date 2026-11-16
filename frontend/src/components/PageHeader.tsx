import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="relative mx-auto max-w-6xl px-6 pb-10 pt-36">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-cyan"
      >
        {eyebrow}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-5 max-w-4xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
      >
        {title}
      </motion.h1>
      {description && (
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 max-w-2xl text-lg text-mist">
          {description}
        </motion.p>
      )}
      {children}
    </header>
  );
}
