import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Link } from "react-router";
import { iconFor } from "../lib/icons";
import type { NavItem, SocialLink } from "../lib/types";

type FooterProps = { name: string; text?: string; items: NavItem[]; socials: SocialLink[]; initials?: string };

export default function Footer({ name, text, items, socials, initials = "DP" }: FooterProps) {
  const links = items.filter((i) => i.location === "footer");
  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet/50 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between"
      >
        <div className="flex items-center gap-2 font-display text-sm text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet via-indigo to-cyan text-xs">{initials}</span>
          {name}
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-mist">
          {links.map((link) =>
            link.href.startsWith("/") ? (
              <Link key={link.id} to={link.href} className="group relative py-1 hover:text-white">
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-violet to-cyan transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </Link>
            ) : (
              <a key={link.id} href={link.href} className="py-1 hover:text-white" target={link.open_in_new_tab ? "_blank" : undefined} rel="noopener noreferrer">
                {link.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          {socials.map((s) => {
            const Icon = iconFor(s.icon);
            return (
              <a
                key={s.id}
                href={s.url}
                aria-label={s.label}
                target={s.url.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full glass text-mist transition-colors hover:text-white"
              >
                <Icon size={15} aria-hidden />
              </a>
            );
          })}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-full glass text-mist transition-colors hover:text-white"
            aria-label="Back to top"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </motion.div>
      <p className="pb-8 text-center text-xs text-mist">
        © {new Date().getFullYear()} {name}. {text || "All rights reserved."}
      </p>
    </footer>
  );
}
