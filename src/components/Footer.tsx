import { ArrowUp } from "lucide-react";
import { navLinks, profile } from "../data/portfolio";

export default function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 font-display text-sm text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet via-indigo to-cyan text-xs">
            DP
          </span>
          {profile.name}
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-mist">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#home"
          className="flex h-10 w-10 items-center justify-center rounded-full glass text-mist transition-all hover:-translate-y-1 hover:text-white"
          aria-label="Back to top"
        >
          <ArrowUp size={16} />
        </a>
      </div>
      <p className="pb-8 text-center text-xs text-mist/70">
        © {new Date().getFullYear()} {profile.name}. Built with React, TypeScript &amp; Framer Motion.
      </p>
    </footer>
  );
}
