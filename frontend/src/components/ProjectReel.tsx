import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import ProjectPoster from "./ProjectPoster";
import type { Project } from "../lib/types";

type ProjectReelProps = {
  projects: Project[];
  direction?: "left" | "right";
  /** Seconds for one full loop — lower is faster. */
  speed?: number;
  paused?: boolean;
};

type MarqueeStyle = CSSProperties & { "--marquee-duration"?: string; "--marquee-direction"?: string };

export default function ProjectReel({ projects, direction = "left", speed = 34, paused = false }: ProjectReelProps) {
  if (projects.length === 0) return null;
  // Duplicated so the track can loop seamlessly at translateX(-50%).
  const track = [...projects, ...projects];
  const trackStyle: MarqueeStyle = {
    "--marquee-duration": `${speed}s`,
    "--marquee-direction": direction === "right" ? "reverse" : "normal",
    animationPlayState: paused ? "paused" : "running",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="group/reel reel-mask relative -mx-6 overflow-hidden px-6 py-3"
    >
      <div
        className="marquee-track flex w-max items-start gap-5 group-hover/reel:![animation-play-state:paused] group-focus-within/reel:![animation-play-state:paused]"
        style={trackStyle}
      >
        {track.map((project, i) => (
          <ProjectPoster key={`${project.id}-${i}`} project={project} ariaHidden={i >= projects.length} />
        ))}
      </div>
    </motion.div>
  );
}
