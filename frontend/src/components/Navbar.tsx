import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Menu, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import Magnetic from "./Magnetic";
import type { NavItem } from "../lib/types";

const FALLBACK_NAV: NavItem[] = [
  { id: "home", label: "Home", href: "/", location: "header", open_in_new_tab: false },
  { id: "about", label: "About", href: "/about", location: "header", open_in_new_tab: false },
  { id: "services", label: "Services", href: "/services", location: "header", open_in_new_tab: false },
  { id: "projects", label: "Projects", href: "/projects", location: "header", open_in_new_tab: false },
  { id: "blog", label: "Blog", href: "/blog", location: "header", open_in_new_tab: false },
  { id: "contact", label: "Contact", href: "/contact", location: "header", open_in_new_tab: false },
];

type NavbarProps = { items?: NavItem[]; resumeUrl?: string | null; initials?: string; brand?: string };

function isInternal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export default function Navbar({ items, resumeUrl, initials = "DP", brand = "Dileep" }: NavbarProps) {
  const links = (items?.length ? items : FALLBACK_NAV).filter((i) => i.location === "header");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

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
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "py-3" : "py-5"}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-2 font-display text-lg font-semibold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet via-indigo to-cyan font-display text-sm shadow-lg shadow-violet/30 transition-transform duration-300 group-hover:scale-105">
            {initials}
          </span>
          <span className="hidden sm:inline">
            {brand}
            <span className="text-gradient">.dev</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full glass px-2 py-2 lg:flex">
          {links.map((link) =>
            isInternal(link.href) ? (
              <NavLink
                key={link.id}
                to={link.href}
                end={link.href === "/"}
                className={({ isActive }) =>
                  `group relative rounded-full px-4 py-1.5 text-sm transition-colors ${isActive ? "text-white" : "text-mist hover:text-white"}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-violet/70 to-cyan/50"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative">{link.label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <a
                key={link.id}
                href={link.href}
                target={link.open_in_new_tab ? "_blank" : undefined}
                rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                className="relative rounded-full px-4 py-1.5 text-sm text-mist transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {resumeUrl && (
            <a
              href={resumeUrl}
              download
              className="flex items-center gap-1.5 rounded-full glass px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30"
            >
              <Download size={15} aria-hidden />
              Resume
            </a>
          )}
          <Magnetic strength={0.4}>
            <Link
              to="/contact"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-ink transition-transform duration-300 hover:scale-105"
            >
              Hire me
            </Link>
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
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mx-6 mt-3 flex flex-col gap-1 rounded-2xl glass p-3 lg:hidden"
          >
            {links.map((link, i) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                {isInternal(link.href) ? (
                  <NavLink
                    to={link.href}
                    end={link.href === "/"}
                    className={({ isActive }) => `block rounded-xl px-4 py-3 text-sm ${isActive ? "bg-white/10 text-white" : "text-mist"}`}
                  >
                    {link.label}
                  </NavLink>
                ) : (
                  <a href={link.href} className="block rounded-xl px-4 py-3 text-sm text-mist">
                    {link.label}
                  </a>
                )}
              </motion.div>
            ))}
            {resumeUrl && (
              <a
                href={resumeUrl}
                download
                className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-white"
              >
                <Download size={15} aria-hidden />
                Resume
              </a>
            )}
            <Link to="/contact" className="rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-ink">
              Hire me
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
