import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Copy, Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import SectionHeading from "./SectionHeading";
import { profile, socialLinks, trustPoints } from "../data/portfolio";

const icons = { github: FaGithub, linkedin: FaLinkedin, mail: Mail };

export default function Contact() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard access unavailable — user can still use the mailto link
    }
  };

  return (
    <section id="contact" className="relative py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Contact"
          title="Let's build your next project"
          description="Open for freelance work — websites, web apps and AI features. The fastest way to reach me is email or LinkedIn."
          align="center"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="glass relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl p-10 text-center"
        >
          <div className="animate-blob absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
          <div
            className="animate-blob absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan/20 blur-3xl"
            style={{ animationDelay: "-9s" }}
          />

          <p className="relative font-display text-2xl font-semibold text-white sm:text-3xl">
            Have a project in mind?
          </p>
          <p className="relative mx-auto mt-3 max-w-md text-mist">
            Send a note and I'll get back to you within a day — happy to talk
            about your project, big or small.
          </p>

          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition-transform duration-300 hover:scale-105"
            >
              <Mail size={16} />
              {profile.email}
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-3 text-sm font-medium text-white transition-colors hover:border-white/30"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="relative mt-8 flex items-center justify-center gap-3">
            {socialLinks.map((social) => {
              const Icon = icons[social.icon];
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.icon === "mail" ? undefined : "_blank"}
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-mist transition-all duration-300 hover:-translate-y-1 hover:text-white hover:shadow-lg hover:shadow-violet/20"
                >
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2"
        >
          {trustPoints.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm text-mist"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
              {point}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
