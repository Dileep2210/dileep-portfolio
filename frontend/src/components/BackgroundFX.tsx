import { motion, useScroll, useTransform } from "framer-motion";

export default function BackgroundFX() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -160]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink"
    >
      <div className="absolute inset-0 grid-fade" />
      <motion.div
        style={{ y: y1 }}
        className="animate-blob absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-violet/30 blur-[120px]"
      />
      <motion.div
        style={{ y: y2, animationDelay: "-6s" }}
        className="animate-blob absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-cyan/20 blur-[120px]"
      />
      <motion.div
        style={{ y: y3, animationDelay: "-11s" }}
        className="animate-blob absolute bottom-0 left-1/4 h-[26rem] w-[26rem] rounded-full bg-indigo/25 blur-[120px]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-ink)_75%)]" />
      <svg className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-soft-light">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
