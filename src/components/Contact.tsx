import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Copy, Download, Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import SectionHeading from "./SectionHeading";
import ContactForm from "./ContactForm";
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
          description="Open for freelance work — websites, web apps and AI features. The fastest way to reach me is the form below, email, or LinkedIn."
          align="center"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="glass relative mx-auto mt-14 max-w-2xl overflow-hidden rounded-3xl p-8 sm:p-10"
        >
          <div className="animate-blob absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
          <div
            className="animate-blob absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-cyan/20 blur-3xl"
            style={{ animationDelay: "-9s" }}
          />

          <p className="relative text-center font-display text-2xl font-semibold text-white sm:text-3xl">
            Have a project in mind?
          </p>
          <p className="relative mx-auto mt-3 max-w-md text-center text-mist">
            Send a note and I'll get back to you within a day — happy to talk
            about your project, big or small.
          </p>

          <div className="relative mt-8">
            <ContactForm />
          </div>

          <div className="relative mt-8 flex items-center gap-3 text-xs text-mist">
            <span className="h-px flex-1 bg-border" />
            Prefer email?
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-border px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30"
            >
              <Mail size={15} />
              {profile.email}
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={profile.resumeUrl}
              download
              className="inline-flex items-center gap-2 rounded-full glass px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30"
            >
              <Download size={15} />
              Resume
            </a>
          </div>

          <div className="relative mt-6 flex items-center justify-center gap-3">
            {socialLinks.map((social) => {
              const Icon = icons[social.icon];
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.icon === "mail" ? undefined : "_blank"}
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-mist transition-all duration-300 hover:-translate-y-1 hover:text-white hover:shadow-lg hover:shadow-violet/20"
                >
                  <Icon size={16} />
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
