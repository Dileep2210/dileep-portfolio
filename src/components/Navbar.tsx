import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks, profile } from "../data/portfolio";
import { useActiveSection } from "../hooks/useActiveSection";
import Magnetic from "./Magnetic";

const sectionIds = navLinks.map((l) => l.href.slice(1));

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId = useActiveSection(sectionIds);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <a
          href="#home"
          className="group flex items-center gap-2 font-display text-lg font-semibold text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet via-indigo to-cyan font-display text-sm shadow-lg shadow-violet/30 transition-transform duration-300 group-hover:scale-105">
            DP
          </span>
          <span className="hidden sm:inline">
            Dileep<span className="text-gradient">.dev</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 rounded-full glass px-2 py-2 md:flex">
          {navLinks.map((link) => {
            const isActive = activeId === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                  isActive ? "text-white" : "text-mist hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-violet/70 to-cyan/50"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Magnetic strength={0.4}>
            <a
              href={`mailto:${profile.email}`}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-ink transition-transform duration-300 hover:scale-105"
            >
              Let's talk
            </a>
          </Magnetic>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="glass rounded-full p-2 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-6 mt-3 flex flex-col gap-1 rounded-2xl glass p-3 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm ${
                  activeId === link.href.slice(1)
                    ? "bg-white/10 text-white"
                    : "text-mist"
                }`}
              >
                {link.label}
              </a>
            ))}
            <a
              href={`mailto:${profile.email}`}
              onClick={() => setMenuOpen(false)}
              className="mt-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-ink"
            >
              Let's talk
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
