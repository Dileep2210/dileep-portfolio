import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import ProjectPoster from "./ProjectPoster";
import type { Project } from "../data/portfolio";

type ProjectReelProps = {
  projects: Project[];
  /** Scroll direction — alternate reels in opposite directions for a "dual film reel" feel. */
  direction?: "left" | "right";
  /** Seconds for one full loop — lower is faster. */
  speed?: number;
};

type MarqueeStyle = CSSProperties & {
  "--marquee-duration"?: string;
  "--marquee-direction"?: string;
};

export default function ProjectReel({
  projects,
  direction = "left",
  speed = 34,
}: ProjectReelProps) {
  // Duplicated so the track can loop seamlessly at translateX(-50%).
  const track = [...projects, ...projects];

  const trackStyle: MarqueeStyle = {
    "--marquee-duration": `${speed}s`,
    "--marquee-direction": direction === "right" ? "reverse" : "normal",
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
        className="marquee-track flex w-max items-start gap-5 group-hover/reel:![animation-play-state:paused]"
        style={trackStyle}
      >
        {track.map((project, i) => (
          <ProjectPoster
            key={`${project.name}-${i}`}
            project={project}
            ariaHidden={i >= projects.length}
          />
        ))}
      </div>
    </motion.div>
  );
}
