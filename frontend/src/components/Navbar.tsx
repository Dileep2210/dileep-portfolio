import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Menu, X } from "lucide-react";
import { navLinks, profile } from "../data/portfolio";
import { useActiveSection } from "../hooks/useActiveSection";
import Magnetic from "./Magnetic";

const sectionIds = navLinks.map((l) => l.href.slice(1));

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId = useActiveSection(sectionIds);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  // Escape closes the mobile menu and hands focus back to the toggle.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
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

        <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full glass px-2 py-2 lg:flex">
          {navLinks.map((link) => {
            const isActive = activeId === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`group relative rounded-full px-4 py-1.5 text-sm transition-colors ${
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
                {!isActive && (
                  <span className="absolute inset-x-4 bottom-0.5 h-px origin-left scale-x-0 bg-white/40 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                )}
                <span className="relative">{link.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={profile.resumeUrl}
            download
            className="flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30"
          >
            <Download size={15} />
            Resume
          </a>
          <Magnetic strength={0.4}>
            <a
              href={`mailto:${profile.email}`}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-ink transition-transform duration-300 hover:scale-105"
            >
              Let's talk
            </a>
          </Magnetic>
        </div>

        <motion.button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          whileTap={{ scale: 0.9 }}
          className="glass relative overflow-hidden rounded-full p-2 text-white lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={menuOpen ? "close" : "open"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut", staggerChildren: 0.05 }}
            className="mx-6 mt-3 flex flex-col gap-1 rounded-2xl glass p-3 lg:hidden"
          >
            {navLinks.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileTap={{ scale: 0.97 }}
                className={`rounded-xl px-4 py-3 text-sm ${
                  activeId === link.href.slice(1)
                    ? "bg-white/10 text-white"
                    : "text-mist"
                }`}
              >
                {link.label}
              </motion.a>
            ))}
            <a
              href={profile.resumeUrl}
              download
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-white"
            >
              <Download size={15} />
              Resume
            </a>
            <a
              href={`mailto:${profile.email}`}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-ink"
            >
              Let's talk
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
