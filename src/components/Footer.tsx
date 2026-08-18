import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { navLinks, profile } from "../data/portfolio";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet/50 to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between"
      >
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex items-center gap-2 font-display text-sm text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet via-indigo to-cyan text-xs">
            DP
          </span>
          {profile.name}
        </motion.div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-mist">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative py-1 hover:text-white"
            >
              {link.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-violet to-cyan transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <motion.a
          href="#home"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-10 w-10 items-center justify-center rounded-full glass text-mist transition-colors hover:text-white"
          aria-label="Back to top"
        >
          <ArrowUp size={16} />
        </motion.a>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="pb-8 text-center text-xs text-mist/70"
      >
        © {new Date().getFullYear()} {profile.name}. All rights reserved.
      </motion.p>
    </footer>
  );
}
