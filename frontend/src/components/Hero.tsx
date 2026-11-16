import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router";
import {
  SiAnthropic,
  SiFastapi,
  SiLangchain,
  SiPostgresql,
  SiPython,
  SiReact,
  SiTypescript,
  SiVite,
} from "react-icons/si";
import { TbSparkles } from "react-icons/tb";
import Magnetic from "./Magnetic";
import { iconFor } from "../lib/icons";
import type { HomepageSection, Site } from "../lib/types";

type Cta = { label?: string; href?: string };

function SmartLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return href.startsWith("/") ? (
    <Link to={href} className={className}>{children}</Link>
  ) : (
    <a href={href} className={className}>{children}</a>
  );
}

const floatingBadges = [
  { icon: SiReact, label: "React", color: "#61DAFB", className: "left-0 top-6", delay: "0s" },
  { icon: SiVite, label: "Vite", color: "#B473FA", className: "left-1/3 -top-2", delay: "-0.6s" },
  { icon: SiTypescript, label: "TypeScript", color: "#3178C6", className: "right-2 top-6", delay: "-3.6s" },
  { icon: SiPython, label: "Python", color: "#3776AB", className: "right-0 top-1/3", delay: "-2.4s" },
  { icon: SiAnthropic, label: "Claude", color: "#D97757", className: "right-0 top-2/3", delay: "-1.8s" },
  { icon: SiFastapi, label: "FastAPI", color: "#009688", className: "right-4 bottom-16", delay: "-1.2s" },
  { icon: SiPostgresql, label: "PostgreSQL", color: "#4169E1", className: "right-1/3 -bottom-2", delay: "-3s" },
  { icon: SiLangchain, label: "LangChain", color: "#3ECF8E", className: "left-0 top-1/2", delay: "-6s" },
  { icon: TbSparkles, label: "GenAI", color: "#A78BFA", className: "left-2 bottom-10", delay: "-4.8s" },
];

function useTextWidth(text: string, font: string) {
  return useMemo(() => {
    if (!text || !font) return 0;
    const canvas = (useTextWidth as { _canvas?: HTMLCanvasElement })._canvas ??=
      document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(text).width;
  }, [text, font]);
}

function RotatingWords({ words }: { words: string[] }) {
  const safeWords = words.length ? words : [""];
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState({ width: 0, basePx: 0, font: "" });

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % safeWords.length);
    }, 2600);
    return () => clearInterval(id);
  }, [safeWords.length]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const cs = getComputedStyle(el);
      const basePx = parseFloat(cs.fontSize);
      setMetrics({
        width: el.offsetWidth,
        basePx,
        font: `${cs.fontWeight} ${basePx}px ${cs.fontFamily}`,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready?.then(measure);
    return () => ro.disconnect();
  }, []);

  const word = safeWords[index % safeWords.length];
  const naturalWidth = useTextWidth(word, metrics.font);
  const fontSize =
    naturalWidth > 0 && metrics.width > 0 && naturalWidth > metrics.width
      ? (metrics.basePx * metrics.width * 0.98) / naturalWidth
      : undefined;

  return (
    <span ref={containerRef} className="block w-full">
      <AnimatePresence mode="wait">
        <motion.span
          key={word}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="inline-block whitespace-nowrap text-gradient"
          style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Hero({ site, section }: { site: Site; section?: HomepageSection }) {
  const s = site.settings;
  const data = (section?.data ?? {}) as { primary_cta?: Cta; secondary_cta?: Cta; resume_label?: string };
  const primary = { label: data.primary_cta?.label || "View My Projects", href: data.primary_cta?.href || "/projects" };
  const secondary = { label: data.secondary_cta?.label || "Hire Me", href: data.secondary_cta?.href || "/contact" };
  const resume = site.resume_url;
  const words = s.rotating_roles.length ? s.rotating_roles : [s.headline || "Full Stack Developer"];
  const isDefaultPortrait = s.profile_image_url === "/images/profile.webp";
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 font-mono text-xs text-mist"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {s.availability || s.headline}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            <span className="sr-only">{s.developer_name} — {section?.title || s.headline}. </span>
            <span aria-hidden>
              Hi, I'm {s.first_name || s.developer_name.split(" ")[0]} —
              <br />
              <RotatingWords words={words} />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="mt-6 max-w-xl text-base text-mist sm:text-lg"
          >
            {section?.subtitle || s.introduction || s.bio}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.34 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Magnetic>
              <SmartLink
                href={primary.href}
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet to-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet/30 transition-transform duration-300 hover:scale-105"
              >
                {primary.label}
                <ArrowUpRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </SmartLink>
            </Magnetic>
            <Magnetic>
              <SmartLink
                href={secondary.href}
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/30"
              >
                {secondary.label}
              </SmartLink>
            </Magnetic>
            {resume && (
              <a
                href={resume}
                download
                className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-mist transition-colors hover:text-white"
              >
                <Download size={15} aria-hidden />
                {data.resume_label || "Download Resume"}
              </a>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.46 }}
            className="mt-10 flex items-center gap-3"
          >
            {site.social_links.map((social) => {
              const Icon = iconFor(social.icon);
              return (
                <a
                  key={social.id}
                  href={social.url}
                  target={social.url.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full glass text-mist transition-all duration-300 hover:-translate-y-1 hover:text-white hover:shadow-lg hover:shadow-violet/20"
                >
                  <Icon size={18} aria-hidden />
                </a>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="relative mx-auto aspect-[4/5] w-full max-w-sm"
        >
          <div className="animate-float absolute inset-6 rounded-[3rem] bg-gradient-to-br from-violet via-indigo to-cyan opacity-30 blur-3xl" />
          <div className="absolute bottom-2 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-full bg-violet/40 blur-2xl" />

          <img
            src={s.profile_image_url || "/images/profile.webp"}
            srcSet={isDefaultPortrait ? "/images/profile-768.webp 768w, /images/profile.webp 960w" : undefined}
            sizes="(min-width: 640px) 384px, 90vw"
            width={960}
            height={1280}
            fetchPriority="high"
            decoding="async"
            alt={s.developer_name}
            className="absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-[0_25px_45px_rgba(99,102,241,0.35)]"
          />

          {floatingBadges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + i * 0.1 }}
              className={`absolute ${badge.className}`}
            >
              <div
                className="animate-float glass flex items-center gap-2 rounded-2xl px-3 py-2 shadow-lg shadow-black/20"
                style={{ animationDelay: badge.delay }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${badge.color}1a`, color: badge.color }}
                >
                  <badge.icon size={14} aria-hidden />
                </span>
                <span className="text-xs font-medium text-white/90">
                  {badge.label}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.a
        href="#about"
        aria-label="Scroll to the about section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-mist sm:flex"
      >
        Scroll
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          <ArrowDown size={16} />
        </motion.span>
      </motion.a>
    </section>
  );
}
